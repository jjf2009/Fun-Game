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
  engine() {
    tone(55, 0.9, { type: 'sawtooth', vol: 0.07, slideTo: 110 });
    tone(58, 0.9, { type: 'square', vol: 0.03, slideTo: 95, delay: 0.05 });
  },
  camera() {
    noise(0.08, 0.2);
    tone(2400, 0.05, { type: 'square', vol: 0.04, delay: 0.05 });
  },
  stamp() {
    tone(120, 0.25, { type: 'sine', vol: 0.4, slideTo: 50 });
    noise(0.15, 0.25);
  },
  phone() {
    for (let i = 0; i < 2; i++) {
      tone(1400, 0.35, { type: 'sine', vol: 0.06, delay: i * 0.6 });
      tone(1750, 0.35, { type: 'sine', vol: 0.05, delay: i * 0.6 });
    }
  },
  siren() {
    for (let i = 0; i < 3; i++) {
      tone(700, 0.45, { type: 'sine', vol: 0.07, slideTo: 1300, delay: i * 0.9 });
      tone(1300, 0.45, { type: 'sine', vol: 0.07, slideTo: 700, delay: i * 0.9 + 0.45 });
    }
  },
  cheer() {
    noise(0.8, 0.15);
    [300, 400, 500, 650].forEach((f, i) => tone(f, 0.25, { type: 'sawtooth', vol: 0.04, delay: i * 0.08 }));
  },
  pow() {
    noise(0.12, 0.3);
    tone(160, 0.12, { type: 'square', vol: 0.12, slideTo: 60 });
  },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, { vol: 0.06, delay: i * 0.12 })); },
  fail() { [400, 300, 200].forEach((f, i) => tone(f, 0.2, { type: 'sawtooth', vol: 0.06, delay: i * 0.15 })); },
};

// Multiplayer: the host sets sfx.onPlay so every sound is also sent to the friend's device.
sfx.onPlay = null;
for (const key of Object.keys(sfx)) {
  const desc = Object.getOwnPropertyDescriptor(sfx, key);
  if (typeof desc.value !== 'function' || ['unlock', 'toggleMute'].includes(key)) continue;
  const play = desc.value;
  sfx[key] = (...args) => {
    sfx.onPlay?.(key, args);
    return play(...args);
  };
}
