let ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!ctx) {
    ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  type: OscillatorType,
  startT: number,
  duration: number,
  vol: number,
  freqEnd?: number,
) {
  const c = ac();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startT);
  if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(freqEnd, startT + duration);
  g.gain.setValueAtTime(vol, startT);
  g.gain.exponentialRampToValueAtTime(0.0001, startT + duration);
  osc.start(startT);
  osc.stop(startT + duration + 0.01);
}

// ── Music loop ─────────────────────────────────────────────────────────────
let musicPlaying  = false;
let musicBPM      = 135;
let nextBeatTime  = 0;
let currentBeat   = 0;
let schedulerLoop: ReturnType<typeof setTimeout> | null = null;

const LOOK_AHEAD   = 0.12;  // seconds
const SCHEDULER_MS = 60;    // ms between scheduler runs

// Runs on 16th-note grid (beat % 16). beatDur = quarter-note / 4.
function playBeat(beat: number, t: number) {
  const b = beat % 16;

  // Kick: beats 1 and 3 (b=0, b=8), plus syncopated upbeat kick at "and of 2" (b=6)
  if (b === 0 || b === 8) {
    tone(75, 'sine', t, 0.18, 0.22, 36);   // punch
    tone(48, 'sine', t, 0.14, 0.14, 28);   // sub bass layer
  }
  if (b === 6) {
    tone(72, 'sine', t, 0.11, 0.16, 38);   // syncopated kick (slightly lighter)
  }

  // Hi-hats on every 16th note — stronger on 8th-note positions
  const hhGain = (b % 2 === 0) ? 0.048 : 0.022;
  tone(4400, 'square', t, hhGain, 0.025);

  // Open hi-hat accent on 8th-note offbeats (b=2, 6, 10, 14)
  if (b % 4 === 2) {
    tone(6200, 'square', t, 0.028, 0.055);
  }

  // Snare: beats 2 and 4 (b=4, b=12)
  if (b === 4 || b === 12) {
    tone(200, 'sawtooth', t + 0.006, 0.07, 0.09, 185);
    tone(160, 'square',   t,          0.04, 0.05);  // body crack
  }
}

function runScheduler() {
  if (!musicPlaying) return;
  const c = ac();
  const bpm = musicBPM;
  const beatDur = 60 / bpm / 4;  // 16th-note duration
  while (nextBeatTime < c.currentTime + LOOK_AHEAD) {
    playBeat(currentBeat, nextBeatTime);
    nextBeatTime += beatDur;
    currentBeat++;
  }
  schedulerLoop = setTimeout(runScheduler, SCHEDULER_MS);
}

export function startMusic() {
  if (musicPlaying) return;
  if (schedulerLoop !== null) { clearTimeout(schedulerLoop); schedulerLoop = null; }
  const c = ac();
  musicPlaying  = true;
  musicBPM      = 135;
  currentBeat   = 0;
  nextBeatTime  = c.currentTime + 0.05;
  runScheduler();
}

export function stopMusic() {
  musicPlaying = false;
  if (schedulerLoop !== null) { clearTimeout(schedulerLoop); schedulerLoop = null; }
}

export function setMusicBPM(bpm: number) {
  musicBPM = Math.round(bpm);
}

export function playPop(combo: number) {
  try {
    const c = ac();
    const t = c.currentTime;
    const pitch = 480 + combo * 55;
    tone(pitch * 1.5, 'sine', t, 0.04, 0.32, pitch * 0.8);
    tone(pitch * 0.6, 'triangle', t + 0.03, 0.08, 0.12);
  } catch {}
}

export function playComboUp(level: number) {
  try {
    const c = ac();
    const t = c.currentTime;
    const base = 330 * Math.pow(1.055, level * 3);
    [0, 4, 7].forEach((semi, i) => {
      tone(base * Math.pow(2, semi / 12), 'triangle', t + i * 0.065, 0.2, 0.13);
    });
  } catch {}
}

export function playMiss() {
  try {
    const c = ac();
    const t = c.currentTime;
    tone(260, 'sawtooth', t, 0.28, 0.11, 75);
  } catch {}
}

export function playStart() {
  try {
    const c = ac();
    const t = c.currentTime;
    [261.63, 329.63, 392, 523.25].forEach((f, i) => {
      tone(f, 'triangle', t + i * 0.1, 0.28, 0.15);
    });
  } catch {}
}

export function playEnd(score: number) {
  try {
    const c = ac();
    const t = c.currentTime;
    if (score >= 80) {
      [523.25, 659.25, 784, 1046.5].forEach((f, i) => {
        tone(f, 'triangle', t + i * 0.1, 0.32, 0.18);
      });
    } else {
      [440, 349.23, 293.66, 220].forEach((f, i) => {
        tone(f, 'sine', t + i * 0.13, 0.3, 0.14);
      });
    }
  } catch {}
}

export function playTick() {
  try {
    const c = ac();
    const t = c.currentTime;
    tone(900, 'square', t, 0.055, 0.07);
  } catch {}
}

export function playGold() {
  try {
    const c = ac();
    const t = c.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      tone(f, 'triangle', t + i * 0.08, 0.26, 0.15);
    });
    tone(1046.5, 'triangle', t + 0.28, 0.18, 0.12);
  } catch {}
}

export function playBomb() {
  try {
    const c = ac();
    const t = c.currentTime;
    tone(300, 'sawtooth', t,       0.40, 0.18, 40);
    tone(120, 'square',   t + 0.05, 0.14, 0.09);
  } catch {}
}

export function playIce() {
  try {
    const c = ac();
    const t = c.currentTime;
    [1046.5, 1318.51, 1567.98].forEach((f, i) => {
      tone(f, 'sine', t + i * 0.05, 0.38, 0.09);
    });
  } catch {}
}

export function playFrenzy() {
  try {
    const c = ac();
    const t = c.currentTime;
    [130.81, 196.00, 261.63].forEach(f => {
      tone(f, 'sawtooth', t, 0.55, 0.11);
    });
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
      tone(f, 'triangle', t + 0.08 + i * 0.06, 0.22, 0.10);
    });
  } catch {}
}
