// AI-assisted revision of uploaded main.js. Events connect cohesive modules.
import * as Auth from './auth.js';
import { api } from './api.js';
import { $, show, notice, table } from './ui.js';
import * as Game from './game.js';
import { ART } from './art.js';
import { toggleMusic } from './music.js';

let authMode = 'login';
let isSubmittingAuth = false;

async function runSafely(callback) {
  try {
    await callback();
  } catch (error) {
    notice(error.message);
  }
}

function setAuthMode(mode) {
  authMode = mode;
  $('nameField').hidden = mode !== 'register';
  $('authBtn').textContent = mode === 'login' ? 'Dive in →' : 'Create account →';
  $('tabLogin').classList.toggle('active', mode === 'login');
  $('tabRegister').classList.toggle('active', mode === 'register');
  $('password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
}

async function submitAuthForm() {
  isSubmittingAuth = true;
  $('authBtn').disabled = true;

  try {
    const email = $('email').value.trim();
    const password = $('password').value;

    if (authMode === 'register') {
      const playerName = $('displayName').value.trim();
      if (playerName.length < 2) {
        throw new Error('Enter a player name with at least two characters.');
      }

      await Auth.register(playerName, email, password);
    } else {
      await Auth.login(email, password);
    }

    $('password').value = '';
    await api('/profile');
    show('menu');
    notice('');
  } finally {
    isSubmittingAuth = false;
    $('authBtn').disabled = false;
  }
}

async function resetPassword() {
  const email = $('email').value.trim();
  if (!email) {
    throw new Error('Enter your email address first.');
  }

  await Auth.reset(email);
  notice('If this address has an account, a reset email will arrive shortly.');
}

async function signOut() {
  await Auth.logout();
  Game.stop();
  show('login');
}

function goToScreen(screenId) {
  notice('');
  show(screenId);
}

async function startGame(button) {
  button.disabled = true;

  try {
    await Game.start();
  } finally {
    button.disabled = false;
  }
}

async function changeMusicSetting() {
  const musicIsPlaying = await toggleMusic();
  const button = $('musicToggle');

  button.setAttribute('aria-pressed', String(musicIsPlaying));
  button.textContent = musicIsPlaying ? '♫ Music on' : '♫ Music off';
}

async function loadProfile(screenId) {
  const profile = await api('/profile');
  $('welcome').textContent = `Ready for another adventure, ${profile.displayName}?`;

  if (screenId === 'profile') {
    table('profileTable', ['Player profile', 'Your progress'], [
      ['Name', profile.displayName],
      ['Highest score', profile.highScore],
      ['Total score', profile.totalScore],
      ['Games finished', profile.played],
      ['Levels completed', `${profile.levelsCompleted} / 3`],
    ]);
  }
}

async function loadLeaderboard() {
  const players = await api('/leaderboard');
  const rows = players.map((player, index) => [
    index + 1,
    player.displayName,
    player.highScore,
  ]);

  table('lbTable', ['Rank', 'Diver', 'Best'], rows);
  $('lbEmpty').hidden = players.length > 0;
}

async function loadHistory() {
  const history = await api('/history');
  const rows = history.map((dive) => [
    new Date(dive.finishedAt).toLocaleDateString(),
    dive.level,
    dive.score,
    dive.result,
  ]);

  table('histTable', ['Date', 'Level', 'Score', 'Result'], rows);
  $('histEmpty').hidden = history.length > 0;
}

async function updateScreenData(screenId) {
  if (screenId === 'menu' || screenId === 'profile') {
    await loadProfile(screenId);
  }

  if (screenId === 'leaderboard') {
    await loadLeaderboard();
  }

  if (screenId === 'history') {
    await loadHistory();
  }
}

function addArtwork() {
  document.querySelectorAll('[data-art]').forEach((element) => {
    element.innerHTML = ART[element.dataset.art];
  });
}

function addBubbles() {
  for (let index = 0; index < 18; index += 1) {
    const bubble = document.createElement('i');
    const size = 12 + index;

    bubble.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${10 + index}s;
      animation-delay: -${index}s;
    `;

    $('sea').append(bubble);
  }
}

function addSwimmingFish() {
  const fishToShow = [
    { symbol: 'fish', top: '16%', width: 58, duration: 42, delay: -8, direction: 'right' },
    { symbol: 'tropical', top: '38%', width: 76, duration: 55, delay: -31, direction: 'left' },
    { symbol: 'whale', top: '64%', width: 84, duration: 60, delay: -19, direction: 'right' },
    { symbol: 'jelly', top: '82%', width: 54, duration: 48, delay: -37, direction: 'left' },
  ];

  for (const fish of fishToShow) {
    const swimmer = document.createElement('div');
    swimmer.className = `swimming-fish swim-${fish.direction}`;
    swimmer.style.top = fish.top;
    swimmer.style.width = `${fish.width}px`;
    swimmer.style.animationDuration = `${fish.duration}s`;
    swimmer.style.animationDelay = `${fish.delay}s`;
    swimmer.innerHTML = ART[fish.symbol];
    $('sea').append(swimmer);
  }
}

function initializePage() {
  $('tabLogin').onclick = () => setAuthMode('login');
  $('tabRegister').onclick = () => setAuthMode('register');

  $('authForm').onsubmit = (event) => {
    event.preventDefault();
    runSafely(submitAuthForm);
  };

  $('resetBtn').onclick = () => runSafely(resetPassword);
  $('logoutBtn').onclick = () => runSafely(signOut);
  $('musicToggle').onclick = () => runSafely(changeMusicSetting);

  document.querySelectorAll('[data-go]').forEach((button) => {
    button.onclick = () => goToScreen(button.dataset.go);
  });

  document.querySelectorAll('[data-start]').forEach((button) => {
    button.onclick = () => runSafely(() => startGame(button));
  });

  $('leaveBtn').onclick = () => runSafely(Game.leave);
  $('puzzleBtn').onclick = Game.puzzle;

  $('answerForm').onsubmit = (event) => {
    event.preventDefault();
    Game.submit();
  };

  document.addEventListener('screenchange', (event) => {
    runSafely(() => updateScreenData(event.detail));
  });

  addArtwork();
  addBubbles();
  addSwimmingFish();

  show('login');
  initializeAuth();
}

async function initializeAuth() {
  try {
    await Auth.initAuth((user) => {
      if (isSubmittingAuth) {
        return;
      }

      if (user) {
        show('menu');
      } else {
        Game.stop();
        show('login');
      }
    });
  } catch (error) {
    notice(error.message);
    $('authBtn').disabled = true;
  }
}

initializePage();
