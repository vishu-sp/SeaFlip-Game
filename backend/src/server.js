// Firebase token verification establishes who is making each request.
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repository } from './repository.js';
import {
  answer,
  check,
  flip,
  LEVELS,
  newRun,
  publicRun,
} from './engine.js';
import { fetchPuzzle } from './fish.js';

const app = express();
const frontendFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../frontend',
);

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const repo = repository();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'script-src': ["'self'", 'https://www.gstatic.com'],
      'connect-src': [
        "'self'",
        'https://*.googleapis.com',
        'https://*.firebaseapp.com',
        'https://securetoken.googleapis.com',
      ],
      'img-src': ["'self'", 'data:'],
      'style-src': ["'self'", "'unsafe-inline'"],
      'upgrade-insecure-requests': null,
    },
  },
}));
app.use(express.json({ limit: '8kb' }));

app.get('/api/config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    appId: process.env.FIREBASE_APP_ID,
  });
});

app.use('/api', rateLimit({
  windowMs: 60_000,
  limit: 240,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

// All API routes below this point require a valid Firebase sign-in token.
app.use('/api', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');

  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) {
      return res.status(401).json({ error: 'Please sign in.' });
    }

    req.user = await getAuth().verifyIdToken(token, true);
    next();
  } catch {
    res.status(401).json({
      error: 'Your session has expired. Sign in again.',
    });
  }
});

app.get('/api/profile', async (req, res) => {
  const user = req.user;
  const displayName = (user.name || 'Ocean Diver').slice(0, 30);
  res.json(await repo.profile(user.uid, displayName));
});

app.get('/api/history', async (req, res) => {
  res.json(await repo.history(req.user.uid));
});

app.get('/api/leaderboard', async (req, res) => {
  res.json(await repo.leaders());
});

app.post('/api/runs', async (req, res) => {
  const displayName = (req.user.name || 'Ocean Diver').slice(0, 30);
  await repo.profile(req.user.uid, displayName);

  const run = newRun(req.user.uid, randomUUID());
  await repo.start(req.user.uid, run);
  res.json(publicRun(run));
});

app.get('/api/runs/:id', async (req, res) => {
  const { run } = await repo.mutate(req.user.uid, req.params.id, () => {});
  res.json(publicRun(run));
});

app.post('/api/runs/:id/flip', async (req, res) => {
  const { run } = await repo.mutate(
    req.user.uid,
    req.params.id,
    (currentRun) => flip(currentRun, req.body.index),
  );
  res.json(publicRun(run));
});

app.post(
  '/api/runs/:id/puzzle',
  rateLimit({ windowMs: 60_000, limit: 12 }),
  async (req, res) => {
    const initial = await repo.mutate(
      req.user.uid,
      req.params.id,
      (run) => check(
        ['ready', 'loaded', 'fish'].includes(run.phase),
        'Match all pairs first.',
      ),
    );

    if (initial.run.phase !== 'ready') {
      return res.json(publicRun(initial.run));
    }

    let puzzle;
    try {
      puzzle = await fetchPuzzle();
    } catch {
      return res.status(503).json({
        error: 'The Fish API is unavailable. Please retry; your score is safe.',
      });
    }

    const { run } = await repo.mutate(
      req.user.uid,
      req.params.id,
      (currentRun) => {
        if (currentRun.phase === 'ready') {
          Object.assign(currentRun, puzzle);
          currentRun.phase = 'loaded';
        }
      },
    );

    res.json(publicRun(run));
  },
);

app.post('/api/runs/:id/begin', async (req, res) => {
  const { run } = await repo.mutate(
    req.user.uid,
    req.params.id,
    (currentRun) => {
      check(
        ['loaded', 'fish', 'lost'].includes(currentRun.phase),
        'Load the puzzle first.',
      );

      if (currentRun.phase === 'loaded') {
        currentRun.phase = 'fish';
        currentRun.deadline = Date.now() + LEVELS[currentRun.level - 1].time * 1000;
      }
    },
  );

  res.json(publicRun(run));
});

app.post('/api/runs/:id/answer', async (req, res) => {
  const { run, extra } = await repo.mutate(
    req.user.uid,
    req.params.id,
    (currentRun) => (
      currentRun.phase === 'lost'
        ? false
        : answer(currentRun, req.body.answer)
    ),
  );

  res.json({ ...publicRun(run), correct: extra });
});

app.post('/api/runs/:id/abandon', async (req, res) => {
  const { run } = await repo.mutate(
    req.user.uid,
    req.params.id,
    (currentRun) => {
      if (!['won', 'lost'].includes(currentRun.phase)) {
        currentRun.phase = 'lost';
        currentRun.finishedAt = Date.now();
      }
    },
  );

  res.json(publicRun(run));
});

app.use(express.static(frontendFolder));

app.use((error, req, res, next) => {
  console.error(error.code || error.message);
  res.status(error.status || 500).json({
    error: error.status
      ? error.message
      : 'Server connection failed. Check Firebase configuration and retry.',
  });
});

const portArgumentIndex = process.argv.indexOf('--port');
const portFromArgument = portArgumentIndex >= 0
  ? process.argv[portArgumentIndex + 1]
  : process.env.PORT;
const port = Number(portFromArgument) || 3000;

app.listen(port, () => {
  console.log(`SeafoodFlip Challenge: http://localhost:${port}`);
});
