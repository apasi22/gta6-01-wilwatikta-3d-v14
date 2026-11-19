// audio.js — suara prosedural WebAudio: radio gamelan, mesin, sirene, tembakan.
// Tanpa file audio sama sekali; semua bunyi disintesis saat dimainkan.

'use strict';

let ctx = null;
let radioTimer = 0;
let radioOn = false;
let radioStation = 0;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;

// Skala pelog sederhana (nada gamelan) untuk melodi radio.
const PELOG = [0, 2, 3, 5, 7, 8, 10];

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

// Satu tuts bonang: sine + harmonic cepat padam.
function pluck(freq, when, dur, vol) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  o2.type = 'triangle'; o2.frequency.value = freq * 2.01;
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  o.connect(g); o2.connect(g2); g2.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.start(when); o2.start(when);
  o.stop(when + dur + 0.05); o2.stop(when + dur + 0.05);
}

// Melodi radio: pola berulang, nada dasar berubah per stasiun.
export function radioTick(dt) {
  if (!radioOn) return;
  const c = ensureCtx();
  if (!c) return;
  radioTimer -= dt;
  if (radioTimer > 0) return;
  radioTimer = 0.42;
  const base = [196, 220, 174.6][radioStation % 3];
  const step = Math.floor(Math.random() * 8);
  const deg = PELOG[step % PELOG.length] + 12 * Math.floor(step / 7);
  const freq = base * Math.pow(2, deg / 12);
  pluck(freq, c.currentTime, 0.9, 0.12);
  if (Math.random() < 0.3) pluck(base / 2, c.currentTime, 1.4, 0.08);
}

export function setRadio(on, station) {
  radioOn = on;
  radioStation = station;
  ensureCtx();
}

// Mesin mobil: sawtooth rendah, frekuensi ikut kecepatan.
export function engineTick(speedKmh, driving) {
  const c = ensureCtx();
  if (!c) return;
  if (driving && speedKmh > 1) {
    if (!engineOsc) {
      engineOsc = c.createOscillator();
      engineGain = c.createGain();
      engineOsc.type = 'sawtooth';
      engineGain.gain.value = 0.0;
      engineOsc.connect(engineGain);
      engineGain.connect(c.destination);
      engineOsc.start();
    }
    engineOsc.frequency.value = 55 + speedKmh * 1.1;
    engineGain.gain.value = 0.035;
  } else if (engineOsc) {
    engineGain.gain.value = 0.0;
  }
}

// Sirene WPD: dua nada bergantian.
export function sirenTick(on, t) {
  const c = ensureCtx();
  if (!c) return;
  if (on) {
    if (!sirenOsc) {
      sirenOsc = c.createOscillator();
      sirenGain = c.createGain();
      sirenOsc.type = 'sine';
      sirenGain.gain.value = 0.0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(c.destination);
      sirenOsc.start();
    }
    sirenOsc.frequency.value = Math.floor(t * 1.4) % 2 === 0 ? 720 : 540;
    sirenGain.gain.value = 0.02;
  } else if (sirenOsc) {
    sirenGain.gain.value = 0.0;
  }
}

// Tembakan: noise burst singkat.
export function gunshot() {
  const c = ensureCtx();
  if (!c) return;
  const dur = 0.12;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = 0.25;
  src.connect(g); g.connect(c.destination);
  src.start();
}

// Bunyi koin / hadiah misi: dua nada naik.
export function chime() {
  const c = ensureCtx();
  if (!c) return;
  pluck(660, c.currentTime, 0.5, 0.15);
  pluck(990, c.currentTime + 0.12, 0.7, 0.15);
}
