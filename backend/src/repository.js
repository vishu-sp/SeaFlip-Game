// Firestore is the only module that reads or writes saved player data.
import { getFirestore } from 'firebase-admin/firestore';
import { check, expire } from './engine.js';

export function repository() {
  const db = getFirestore();

  function playerDocument(uid) {
    return db.collection('players').doc(uid);
  }

  async function mutate(uid, runId, changeRun) {
    return db.runTransaction(async (transaction) => {
      const player = playerDocument(uid);
      const activeRun = player.collection('private').doc('active');

      const [runSnapshot, playerSnapshot] = await Promise.all([
        transaction.get(activeRun),
        transaction.get(player),
      ]);

      check(runSnapshot.exists, 'Start a new game first.');

      const run = runSnapshot.data();
      check(run.id === runId, 'This game was replaced. Return to the menu.');

      expire(run);
      const extra = await changeRun(run);
      run.updatedAt = Date.now();

      const stats = playerSnapshot.data() || {
        displayName: 'Diver',
        highScore: 0,
        totalScore: 0,
        played: 0,
        levelsCompleted: 0,
      };

      stats.levelsCompleted = Math.max(
        stats.levelsCompleted || 0,
        run.completed,
      );

      const runIsFinished = ['won', 'lost'].includes(run.phase);
      if (runIsFinished && !run.recorded) {
        run.recorded = true;
        stats.highScore = Math.max(stats.highScore || 0, run.score);
        stats.totalScore = (stats.totalScore || 0) + Math.max(0, run.score);
        stats.played = (stats.played || 0) + 1;

        const historyEntry = player.collection('history').doc(run.id);
        const leaderboardEntry = db.collection('leaderboard').doc(uid);

        transaction.set(historyEntry, {
          level: run.level,
          score: run.score,
          result: run.phase,
          finishedAt: run.finishedAt || Date.now(),
        });
        transaction.set(leaderboardEntry, {
          displayName: stats.displayName,
          highScore: stats.highScore,
        });
      }

      transaction.set(activeRun, run);
      transaction.set(player, stats);

      return { run, extra };
    });
  }

  async function start(uid, run) {
    await playerDocument(uid)
      .collection('private')
      .doc('active')
      .set(run);
  }

  async function profile(uid, name) {
    const player = playerDocument(uid);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(player);

      if (!snapshot.exists) {
        transaction.set(player, {
          displayName: name,
          highScore: 0,
          totalScore: 0,
          played: 0,
          levelsCompleted: 0,
        });
      }
    });

    return (await player.get()).data();
  }

  async function history(uid) {
    const snapshot = await playerDocument(uid)
      .collection('history')
      .orderBy('finishedAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map((document) => document.data());
  }

  async function leaders() {
    const snapshot = await db.collection('leaderboard')
      .orderBy('highScore', 'desc')
      .limit(10)
      .get();

    return snapshot.docs.map((document) => document.data());
  }

  return {
    mutate,
    start,
    profile,
    history,
    leaders,
  };
}
