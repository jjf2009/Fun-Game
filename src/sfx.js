// Tiny sound effects generated with the Web Audio API (no audio files needed).
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'square', vol = 0.08, slideTo = null, delay = 0 } = {}) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur, vol = 0.3, delay = 0) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  unlock() { ac(); },
  toggleMute() { muted = !muted; return muted; },
  get muted() { return muted; },
  knock() {
    tone(170, 0.07, { type: 'triangle', vol: 0.4 });
    tone(150, 0.07, { type: 'triangle', vol: 0.4, delay: 0.14 });
  },
  yell() { tone(260, 0.3, { type: 'sawtooth', vol: 0.06, slideTo: 520 }); },
  point() {
    tone(660, 0.08, { vol: 0.05 });
    tone(990, 0.1, { vol: 0.05, delay: 0.08 });
  },
  hurt() { tone(240, 0.35, { type: 'sawtooth', vol: 0.1, slideTo: 70 }); },
  boom() {
    noise(0.6, 0.5);
    tone(90, 0.45, { type: 'sine', vol: 0.3, slideTo: 30 });
  },
  whistle() {
    tone(2000, 0.12, { type: 'sine', vol: 0.07 });
    tone(2300, 0.3, { type: 'sine', vol: 0.07, delay: 0.16 });
  },
  alarm() {
    for (let i = 0; i < 4; i++) {
      tone(880, 0.12, { vol: 0.06, delay: i * 0.25 });
      tone(660, 0.12, { vol: 0.06, delay: i * 0.25 + 0.12 });
    }
  },
  splash() { noise(0.25, 0.12); },
  tick() { tone(1200, 0.03, { vol: 0.04 }); },
  note(i) { tone([392, 440, 494, 523][i % 4], 0.15, { type: 'triangle', vol: 0.12 }); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, { vol: 0.06, delay: i * 0.12 })); },
  fail() { [400, 300, 200].forEach((f, i) => tone(f, 0.2, { type: 'sawtooth', vol: 0.06, delay: i * 0.15 })); },
};
