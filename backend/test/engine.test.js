import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answer,
  board,
  expire,
  flip,
  LEVELS,
  newRun,
  publicRun,
} from '../src/engine.js';
import { parsePuzzle } from '../src/fish.js';

test('each reef uses its configured answer countdown', () => {
  assert.deepEqual(
    LEVELS.map((level) => level.time),
    [15, 10, 5],
  );
});

test('every grid contains pairs and one free space on odd grids', () => {
  const expectedCardCounts = [9, 16, 25];

  for (let level = 1; level <= LEVELS.length; level += 1) {
    const cards = board(level).deck;
    const symbolCounts = {};

    for (const symbol of cards) {
      symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
    }

    assert.equal(cards.length, expectedCardCounts[level - 1]);

    for (const [symbol, count] of Object.entries(symbolCounts)) {
      assert.equal(count, symbol === 'wave' ? 1 : 2);
    }
  }
});

test('hidden cards and the puzzle answer are not sent to the browser', () => {
  const run = newRun('u', 'r');
  run.solution = 5;

  const visibleRun = publicRun(run);

  assert.equal(visibleRun.solution, undefined);
  assert.ok(
    visibleRun.cards
      .filter((card) => card.symbol)
      .every((card) => card.symbol === 'wave'),
  );
});

test('a card cannot be matched with itself or scored twice', () => {
  const run = newRun('u', 'r');
  const firstCard = run.deck.findIndex((symbol) => symbol !== 'wave');
  const matchingCard = run.deck.findIndex(
    (symbol, index) => index !== firstCard && symbol === run.deck[firstCard],
  );

  flip(run, firstCard);
  assert.throws(() => flip(run, firstCard));
  flip(run, matchingCard);
  assert.equal(run.score, 10);
  assert.throws(() => flip(run, matchingCard));
});

test('a mismatch costs 2 points and flips back after the reveal delay', () => {
  const run = newRun('u', 'r');
  const firstCard = run.deck.findIndex((symbol) => symbol !== 'wave');
  const differentCard = run.deck.findIndex(
    (symbol) => symbol !== 'wave' && symbol !== run.deck[firstCard],
  );

  flip(run, firstCard, 0);
  flip(run, differentCard, 0);
  assert.equal(run.score, -2);
  assert.throws(() => flip(run, firstCard, 100));
  assert.equal(publicRun(run, 900).cards[firstCard].symbol, null);

  flip(run, firstCard, 900);
  assert.deepEqual(run.selected, [firstCard]);
});

test('a complete run advances through all levels and keeps its score', () => {
  const run = newRun('u', 'r');

  for (let level = 1; level <= LEVELS.length; level += 1) {
    for (const symbol of new Set(run.deck)) {
      if (symbol === 'wave') {
        continue;
      }

      const matchingCards = run.deck.flatMap((cardSymbol, index) => (
        cardSymbol === symbol ? [index] : []
      ));
      matchingCards.forEach((index) => flip(run, index));
    }

    assert.equal(run.phase, 'ready');
    run.phase = 'fish';
    run.solution = 4;
    run.deadline = 1000;

    assert.equal(answer(run, 3, 10), false);
    assert.equal(answer(run, 4, 20), true);
  }

  assert.equal(run.phase, 'won');
  assert.equal(run.score, 240);
  assert.throws(() => answer(run, 4, 30));
});

test('an answer submitted after the deadline loses the run', () => {
  const run = newRun('u', 'r');
  Object.assign(run, {
    phase: 'fish',
    deadline: 50,
    solution: 4,
  });

  assert.throws(() => answer(run, 4, 50));
  assert.equal(run.phase, 'lost');
  assert.equal(expire(run, 100).phase, 'lost');
});

test('the Fish API response is parsed and invalid responses are rejected', () => {
  const puzzle = parsePuzzle({
    question: 'iVBORw0KGgo=',
    fish: 5,
    chest: 4,
  });

  assert.equal(puzzle.solution, 5);
  assert.throws(() => parsePuzzle({
    question: 'https://bad.example/image',
    fish: 5,
  }));
  assert.throws(() => parsePuzzle({
    question: 'iVBORw0KGgo=',
    fish: 'oops',
  }));
});
