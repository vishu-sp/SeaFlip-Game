// Event-driven controller. The server owns rules; this module owns presentation timing.
import { api } from './api.js';
import { $, show, notice, renderCards } from './ui.js';

const LEVEL_NAMES = ['Coral Cove', 'Pearl Lagoon', 'Midnight Reef'];
const FINISHED_PHASES = new Set(['won', 'lost']);

let activeRun = null;
let busy = false;
let timerTick = null;
let revealTimer = null;
let serverOffset = 0;
let generation = 0;

function stopTimers() {
  clearInterval(timerTick);
  clearTimeout(revealTimer);
}

function setPhaseVisibility(run) {
  $('cardPhase').hidden = run.phase !== 'cards';
  $('readyPhase').hidden = !['ready', 'loaded'].includes(run.phase);
  $('apiPhase').hidden = run.phase !== 'fish';
  $('resultPhase').hidden = !FINISHED_PHASES.has(run.phase);
}

function renderHud(run) {
  $('hudLevel').textContent = `LEVEL 0${run.level}`;
  $('hudScore').textContent = `${run.score} points`;
  $('hudTimer').textContent = '';
  $('gameTitle').textContent = LEVEL_NAMES[run.level - 1] ?? 'Unknown reef';
}

function refreshResultScreen(run) {
  $('resultTitle').textContent = run.phase === 'won' ? 'Ocean mastered!' : 'Time to dive again';
  const introText = run.phase === 'won'
    ? 'All three reefs completed. '
    : 'Your next game starts at Level 1 with zero points. ';
  $('resultCopy').textContent = `${introText}Final score: ${run.score}`;
}

function startFishTimer(run) {
  let isSyncing = false;

  const updateTimer = () => {
    const remainingSeconds = Math.max(0, Math.ceil((run.deadline - Date.now() - serverOffset) / 1000));
    $('hudTimer').textContent = `${remainingSeconds}s`;
    $('timeBar').style.width = `${(100 * remainingSeconds) / run.time}%`;
    $('timeBar').classList.toggle('low', remainingSeconds <= 10);

    if (remainingSeconds === 0 && !busy && !isSyncing) {
      isSyncing = true;
      action('').finally(() => {
        isSyncing = false;
      });
    }
  };

  updateTimer();
  timerTick = setInterval(updateTimer, 200);
}

function renderCardStage(run) {
  renderCards(run, (index) => action('/flip', { index }));
  const pairsFound = run.cards.filter((card) => card.matched && card.symbol !== 'wave').length / 2;
  $('hudMatches').textContent = `${pairsFound} / ${Math.floor(run.cards.length / 2)} pairs found`;

  if (run.revealUntil > run.serverNow) {
    revealTimer = setTimeout(() => action(''), run.revealUntil - run.serverNow + 80);
  }
}

function renderRun(next) {
  stopTimers();
  activeRun = next;
  serverOffset = next.serverNow - Date.now();
  notice('');

  renderHud(next);
  setPhaseVisibility(next);

  if (next.phase === 'cards') {
    renderCardStage(next);
  }

  if (next.phase === 'fish') {
    $('fishImg').src = next.image;
    startFishTimer(next);
  }

  if (FINISHED_PHASES.has(next.phase)) {
    refreshResultScreen(next);
  }
}

export async function start() {
  stopTimers();
  generation += 1;
  activeRun = await api('/runs', {});
  $('grid').replaceChildren();
  show('game');
  renderRun(activeRun);
}

export async function leave() {
  if (activeRun && !FINISHED_PHASES.has(activeRun.phase)) {
    await api(`/runs/${activeRun.id}/abandon`, {});
  }

  stopTimers();
  generation += 1;
  activeRun = null;
  show('menu');
}

async function action(endpoint, body = {}) {
  if (busy || !activeRun) {
    return;
  }

  busy = true;
  const currentGeneration = generation;

  try {
    const next = await api(`/runs/${activeRun.id}${endpoint}`, endpoint === '' ? undefined : body);
    if (currentGeneration === generation) {
      renderRun(next);
      if (next.correct === false && next.phase === 'fish') {
        notice('Not quite. Take another look and try again.');
      }
    }
  } catch (error) {
    notice(error.message);
  } finally {
    busy = false;
  }
}

export const submit = () => {
  const rawAnswer = $('answer').value;
  if (!rawAnswer.trim()) {
    notice('Enter your answer first.');
    return;
  }

  action('/answer', { answer: Number(rawAnswer) });
  $('answer').value = '';
};

export async function puzzle() {
  if (busy || !activeRun) {
    return;
  }

  busy = true;
  const currentGeneration = generation;
  notice('Bringing your Fish API puzzle to the surface…');

  try {
    const nextPuzzle = await api(`/runs/${activeRun.id}/puzzle`, {});
    if (currentGeneration !== generation) {
      return;
    }

    await new Promise((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => reject(new Error('Image did not load. Retry the puzzle.')), 10000);

      image.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      image.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Image could not load. Please retry.'));
      };

      image.src = nextPuzzle.image;
    });

    if (currentGeneration !== generation) {
      return;
    }

    const startedRun = await api(`/runs/${activeRun.id}/begin`, {});
    renderRun(startedRun);
    $('answer').focus();
    notice('Find the number represented by the fish.');
  } catch (error) {
    notice(error.message);
  } finally {
    busy = false;
  }
}

// GET refresh uses undefined body; all state-changing requests use POST.
export function stop() {
  stopTimers();
  generation += 1;
  activeRun = null;
}
