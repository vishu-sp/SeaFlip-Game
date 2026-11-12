const CHORDS = [
  [110, 164.81, 220, 261.63],
  [87.31, 130.81, 174.61, 220],
  [130.81, 196, 261.63, 329.63],
  [98, 146.83, 196, 246.94],
];

const MELODY = [523.25, 659.25, 587.33, 440, 523.25, 392, 440, 587.33];
const PAD_VOLUMES = [0.24, 0.14, 0.1, 0.07];

let audioContext;
let masterVolume;
let softFilter;
let padVoices = [];
let chordTimer;
let melodyTimer;
let suspendTimer;
let chordIndex = 0;
let melodyIndex = 0;
let isPlaying = false;

function createMusic() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Background music is not supported in this browser.');
  }

  audioContext = new AudioContextClass();
  masterVolume = audioContext.createGain();
  softFilter = audioContext.createBiquadFilter();

  masterVolume.gain.value = 0;
  softFilter.type = 'lowpass';
  softFilter.frequency.value = 1400;
  softFilter.connect(masterVolume);
  masterVolume.connect(audioContext.destination);

  CHORDS[0].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const voiceVolume = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    voiceVolume.gain.value = PAD_VOLUMES[index];

    oscillator.connect(voiceVolume);
    voiceVolume.connect(softFilter);
    oscillator.start();
    padVoices.push(oscillator);
  });
}

function changeChord() {
  chordIndex = (chordIndex + 1) % CHORDS.length;

  padVoices.forEach((voice, index) => {
    voice.frequency.setTargetAtTime(
      CHORDS[chordIndex][index],
      audioContext.currentTime,
      4,
    );
  });
}

function playNextNote() {
  const note = MELODY[melodyIndex];
  const startTime = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const noteVolume = audioContext.createGain();

  melodyIndex = (melodyIndex + 1) % MELODY.length;
  oscillator.type = 'triangle';
  oscillator.frequency.value = note;

  noteVolume.gain.setValueAtTime(0.0001, startTime);
  noteVolume.gain.exponentialRampToValueAtTime(0.08, startTime + 0.15);
  noteVolume.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.4);

  oscillator.connect(noteVolume);
  noteVolume.connect(softFilter);
  oscillator.start(startTime);
  oscillator.stop(startTime + 2.5);
}

async function startMusic() {
  clearTimeout(suspendTimer);
  await audioContext.resume();

  masterVolume.gain.setTargetAtTime(0.3, audioContext.currentTime, 2);
  playNextNote();
  melodyTimer = setInterval(playNextNote, 2600);
  chordTimer = setInterval(changeChord, 16000);
  isPlaying = true;
}

function stopMusic() {
  clearInterval(melodyTimer);
  clearInterval(chordTimer);
  masterVolume.gain.setTargetAtTime(0, audioContext.currentTime, 0.5);
  isPlaying = false;

  suspendTimer = setTimeout(() => {
    if (!isPlaying) {
      audioContext.suspend();
    }
  }, 2500);
}

export async function toggleMusic() {
  if (!audioContext) {
    createMusic();
  }

  if (isPlaying) {
    stopMusic();
  } else {
    await startMusic();
  }

  return isPlaying;
}
