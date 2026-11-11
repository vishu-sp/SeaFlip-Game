// AI-assisted extension of the supplied frontend. See docs/ATTRIBUTION.md.
// Cohesive, framework-independent game rules; no HTTP, DOM or database dependencies.
import { randomInt } from 'node:crypto';

export const LEVELS = [
  { size: 3, time: 60, name: 'Coral Cove' },
  { size: 4, time: 45, name: 'Pearl Lagoon' },
  { size: 5, time: 30, name: 'Midnight Reef' },
];

export const SYMBOLS = [
  'fish', 'tropical', 'puffer', 'crab', 'shrimp', 'octopus',
  'shell', 'starfish', 'jelly', 'whale', 'shark', 'turtle',
];

const FREE_SPACE = 'wave';

export function check(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
}

function shuffle(items) {
  const deck = [...items];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

export function board(level) {
  check(Number.isInteger(level) && level >= 1 && level <= LEVELS.length, 'Level out of range.');

  const config = LEVELS[level - 1];
  const pairsNeeded = Math.floor((config.size * config.size) / 2);
  const deck = SYMBOLS.slice(0, pairsNeeded).flatMap((symbol) => [symbol, symbol]);

  if (config.size % 2 === 1) {
    deck.splice(Math.floor(deck.length / 2), 0, FREE_SPACE);
  }

  return {
    deck: shuffle(deck),
    matched: [],
    selected: [],
    phase: 'cards',
    revealUntil: 0,
  };
}

export function newRun(uid, id, now = Date.now()) {
  return {
    uid,
    id,
    level: 1,
    score: 0,
    completed: 0,
    createdAt: now,
    updatedAt: now,
    ...board(1),
  };
}

export function expire(run, now = Date.now()) {
  if (run.phase === 'fish' && now >= run.deadline) {
    run.phase = 'lost';
    run.finishedAt = now;
  }
  return run;
}

function isPlayableCard(run, index) {
  return run.deck[index] !== FREE_SPACE
    && !run.matched.includes(index)
    && !run.selected.includes(index);
}

export function flip(run, index, now = Date.now()) {
  check(run.phase === 'cards', 'The card stage is not active.');
  check(now >= run.revealUntil, 'Wait for the cards to turn back.');

  if (run.selected.length === 2) {
    run.selected = [];
  }

  check(Number.isInteger(index) && index >= 0 && index < run.deck.length, 'Invalid card.');
  check(isPlayableCard(run, index), 'Choose a hidden card.');

  run.selected.push(index);

  if (run.selected.length !== 2) {
    return run;
  }

  const [firstIndex, secondIndex] = run.selected;

  if (run.deck[firstIndex] === run.deck[secondIndex]) {
    run.score += 10;
    run.matched.push(firstIndex, secondIndex);
    run.selected = [];
  } else {
    run.score -= 2;
    run.revealUntil = now + 850;
  }

  const pairTotal = Math.floor(run.deck.length / 2) * 2;
  if (run.matched.length === pairTotal) {
    run.phase = 'ready';
  }

  return run;
}

export function answer(run, value, now = Date.now()) {
  expire(run, now);
  check(run.phase === 'fish', 'This puzzle has ended.');
  check(Number.isInteger(value) && value >= 0 && value <= 999, 'Enter a whole number from 0 to 999.');

  if (value !== run.solution) {
    return false;
  }

  run.completed = run.level;

  if (run.level === 3) {
    run.phase = 'won';
    run.finishedAt = now;
    return true;
  }

  run.level += 1;
  Object.assign(run, board(run.level));
  delete run.image;
  delete run.solution;
  delete run.deadline;
  return true;
}

export function publicRun(run, now = Date.now()) {
  const visible = new Set([
    ...run.matched,
    ...(now < run.revealUntil || run.selected.length === 1 ? run.selected : []),
  ]);

  return {
    id: run.id,
    level: run.level,
    score: run.score,
    completed: run.completed,
    phase: run.phase,
    size: LEVELS[run.level - 1].size,
    time: LEVELS[run.level - 1].time,
    serverNow: now,
    deadline: run.deadline ?? null,
    revealUntil: run.revealUntil,
    cards: run.deck.map((symbol, index) => ({
      index,
      symbol: symbol === FREE_SPACE || visible.has(index) ? symbol : null,
      matched: run.matched.includes(index) || symbol === FREE_SPACE,
    })),
    image: ['loaded', 'fish'].includes(run.phase) ? run.image : null,
  };
}

