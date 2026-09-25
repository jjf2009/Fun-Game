// Pixel-art generator: draws characters, floor tiles and furniture pixel-by-pixel on canvases.
// Everything is made in code, so there are no image files to manage.

const OUTLINE = '#1a1020';

// Deterministic random numbers so the map looks the same every time.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Creates a canvas of w x h "pixels", each drawn as a scale x scale square.
export function pixelCanvas(w, h, scale, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  const grid = Array.from({ length: h }, () => Array(w).fill(null));
  const set = (x, y, color) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < w && y < h) grid[y][x] = color;
  };
  const get = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? grid[y][x] : null);
  paint(set, get);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!grid[y][x]) continue;
      ctx.fillStyle = grid[y][x];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + amt))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
};

const disk = (set, cx, cy, r, color) => {
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
    for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) if (x * x + y * y <= r * r) set(cx + x, cy + y, color);
  }
};

// Adds a dark outline around every drawn pixel.
const outline = (set, get, w, h) => {
  const edges = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (get(x, y)) continue;
      if (get(x + 1, y) || get(x - 1, y) || get(x, y + 1) || get(x, y - 1)) edges.push([x, y]);
    }
  }
  for (const [x, y] of edges) set(x, y, OUTLINE);
};

// ---------- Characters (top-down, facing RIGHT; the game rotates them) ----------

export const PEOPLE = {
  player: { shirt: '#3a86ff', skin: '#e0ac69', hair: '#2b1b12' },
  player2: { shirt: '#ff5d8f', skin: '#c68642', hair: '#1a1a1a' }, // your friend in co-op
  warden: { shirt: '#8d6e3f', skin: '#c68642', hair: '#1d1d1d', cap: '#1d3557', size: 1.1 },
  senior: { shirt: '#d62828', skin: '#c68642', hair: '#111111', shades: true },
  gang: { shirt: '#262626', skin: '#8d5524', hair: '#111111', bandana: '#e63946' },
  student: { shirt: '#f77f00', skin: '#f1c27d', hair: '#3b2414', towel: true },
  guest: { shirt: '#2a9d8f', skin: '#e0ac69', hair: '#2b1b12', cap: '#e9c46a' },
  guard: { shirt: '#6c757d', skin: '#c68642', hair: '#111111', cap: '#343a40', size: 1.05 },
  boss: { shirt: '#1b1b1b', skin: '#c68642', hair: '#111111', bandana: '#e63946', shades: true, chain: '#ffd700', size: 1.15 },
};

// frame: 0 = standing, 1 / 2 = walking (arms swing)
export function personCanvas(p, frame) {
  const W = 22;
  const s = p.size ?? 1;
  return pixelCanvas(W, W, 2, (set, get) => {
    const cx = 10;
    const cy = 11;
    const swing = frame === 0 ? 0 : frame === 1 ? 2 : -2;
    const dark = shade(p.shirt, -0.3);

    // arms + hands
    for (const [side, dx] of [[-1, swing], [1, -swing]]) {
      const hy = cy + side * 7 * s;
      const hx = cx + 2 + dx;
      for (let t = 0; t <= 1; t += 0.25) set(cx + (hx - cx) * t, cy + side * 5 * s + (hy - cy - side * 5 * s) * t, dark);
      disk(set, hx + 1, hy, 1.2, p.skin);
    }
    // shoulders (an oval across the body)
    for (let y = -8; y <= 8; y++) {
      for (let x = -5; x <= 5; x++) {
        if ((x * x) / (4.2 * 4.2) + (y * y) / (7.6 * s * 7.6 * s) <= 1) set(cx + x, cy + y, x < -1 ? dark : p.shirt);
      }
    }
    if (p.towel) for (let y = -6; y <= 6; y++) { set(cx - 2, cy + y, '#f8f9fa'); set(cx - 3, cy + y, '#dee2e6'); }
    // head
    disk(set, cx + 1, cy, 3.6, p.hair);
    set(cx + 4, cy, p.skin); set(cx + 4, cy - 1, p.skin); set(cx + 4, cy + 1, p.skin); set(cx + 5, cy, p.skin); // nose / forehead
    set(cx - 1, cy - 1, shade(p.hair, 0.6)); // hair shine
    if (p.cap) {
      disk(set, cx + 1, cy, 3.4, p.cap);
      for (let y = -2; y <= 2; y++) { set(cx + 5, cy + y, shade(p.cap, -0.35)); set(cx + 6, cy + y, shade(p.cap, -0.35)); }
      set(cx, cy - 1, shade(p.cap, 0.4));
    }
    if (p.bandana) for (let y = -3; y <= 3; y++) { set(cx + 2, cy + y, p.bandana); set(cx - 3, cy + (y > 0 ? 1 : 0), p.bandana); }
    if (p.shades) for (let y = -2; y <= 2; y++) set(cx + 5, cy + y, '#000000');
    if (p.chain) for (let y = -3; y <= 3; y++) set(cx + 3, cy + y + (Math.abs(y) > 2 ? 0 : 1), p.chain);
    outline(set, get, W, W);
  });
}

// A top-down motorbike (facing RIGHT) with 3 riders on it: triple seat!
export function bikeCanvas(riders) {
  const W = 40;
  const H = 22;
  return pixelCanvas(W, H, 2, (set, get) => {
    const cy = 11;
    // wheels
    for (const wx of [3, 34]) for (let x = 0; x < 5; x++) for (let y = -1; y <= 1; y++) set(wx + x, cy + y, '#111111');
    // body / seat
    for (let x = 6; x < 34; x++) for (let y = -2; y <= 2; y++) set(x, cy + y, y === -2 ? '#9d0208' : '#6a040f');
    for (let x = 27; x < 33; x++) for (let y = -3; y <= 3; y++) set(x, cy + y, '#adb5bd'); // tank
    for (let y = -7; y <= 7; y++) set(34, cy + y, '#343a40'); // handlebar
    set(34, cy - 7, '#111111'); set(34, cy + 7, '#111111');
    set(38, cy, '#fff3b0'); set(39, cy, '#fff3b0'); // headlight
    for (let x = 4; x < 9; x++) set(x, cy + 3, '#6c757d'); // exhaust
    // riders, front to back
    riders.forEach((p, i) => {
      const rx = 27 - i * 8;
      for (let y = -6; y <= 6; y++) for (let x = -3; x <= 3; x++) {
        if ((x * x) / 9 + (y * y) / 36 <= 1) set(rx + x, cy + y, x < 0 ? shade(p.shirt, -0.3) : p.shirt);
      }
      if (i === 0) { set(rx + 4, cy - 6, p.skin); set(rx + 4, cy + 6, p.skin); } // hands on the handlebar
      disk(set, rx + 1, cy, 2.6, p.hair);
      if (p.bandana) for (let y = -2; y <= 2; y++) set(rx + 2, cy + y, p.bandana);
      if (p.shades) for (let y = -2; y <= 2; y++) set(rx + 4, cy + y, '#000000');
      if (p.chain) { set(rx + 3, cy - 2, p.chain); set(rx + 3, cy + 2, p.chain); set(rx + 4, cy, p.chain); }
    });
    outline(set, get, W, H);
  });
}

// ---------- Floor tiles (40x40 px = 20x20 pixels at scale 2) ----------

function noiseTile(seed, base, spots, paintExtra) {
  const r = rng(seed);
  return pixelCanvas(20, 20, 2, (set) => {
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const v = r();
        let color = base;
        for (const [chance, c] of spots) if (v < chance) { color = c; break; }
        set(x, y, color);
      }
    }
    paintExtra?.(set, r);
  });
}

export function tileCanvases() {
  const tiles = {};
  // corridor: terrazzo floor with grout lines
  tiles.floor = [0, 1, 2].map((i) => noiseTile(11 + i, '#817a93', [[0.06, '#948da6'], [0.1, '#6f6882'], [0.12, '#a39cb4']], (set) => {
    for (let k = 0; k < 20; k++) { set(k, 0, '#6a637c'); set(0, k, '#6a637c'); }
  }));
  // courtyard grass
  tiles.grass = [0, 1, 2, 3].map((i) => noiseTile(21 + i, '#3f5a36', [[0.08, '#4e6e42'], [0.14, '#34502d'], [0.16, '#5f8450']], (set, r) => {
    for (let k = 0; k < 3; k++) { const x = Math.floor(r() * 18); const y = Math.floor(r() * 17); set(x, y, '#6b9a55'); set(x, y + 1, '#557d45'); }
    if (r() < 0.25) { const x = Math.floor(r() * 18); const y = Math.floor(r() * 18); set(x, y, '#f4d35e'); set(x + 1, y, '#ffffff'); }
  }));
  // outside grass (darker)
  tiles.outside = [0, 1].map((i) => noiseTile(31 + i, '#23321f', [[0.1, '#2c3d27'], [0.15, '#1c291a']]));
  // road
  tiles.road = [0, 1].map((i) => noiseTile(41 + i, '#2f2f33', [[0.12, '#3a3a3f'], [0.18, '#27272b']]));
  // bathroom tiles
  tiles.bath = [pixelCanvas(20, 20, 2, (set) => {
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      const grout = x % 10 === 0 || y % 10 === 0;
      set(x, y, grout ? '#3d6f86' : ((Math.floor(x / 10) + Math.floor(y / 10)) % 2 ? '#6fb0cc' : '#7cc0dc'));
    }
    set(3, 3, '#a8e0f5'); set(13, 13, '#a8e0f5');
  })];
  // room floor: wooden planks
  tiles.wood = [0, 1].map((i) => noiseTile(51 + i, '#5b4636', [[0.1, '#654e3c'], [0.14, '#4f3c2e']], (set) => {
    for (let x = 0; x < 20; x++) { set(x, 4, '#3e2f24'); set(x, 9, '#3e2f24'); set(x, 14, '#3e2f24'); set(x, 19, '#3e2f24'); }
    set(6 + i * 5, 2, '#3e2f24'); set(15 - i * 4, 7, '#3e2f24'); set(3 + i * 7, 12, '#3e2f24'); set(11, 17, '#3e2f24');
  }));
  // brick wall
  tiles.wall = [pixelCanvas(20, 20, 2, (set) => {
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      const row = Math.floor(y / 5);
      const mortar = y % 5 === 0 || (x + (row % 2) * 5) % 10 === 0;
      set(x, y, mortar ? '#1f1a2b' : (row % 2 ? '#3b3350' : '#40375a'));
    }
  })];
  return tiles;
}

// ---------- Furniture & items ----------

export function propCanvases() {
  const props = {};
  props.bed = pixelCanvas(16, 26, 2, (set) => {
    for (let y = 0; y < 26; y++) for (let x = 0; x < 16; x++) set(x, y, '#6b4f3a');
    for (let y = 2; y < 24; y++) for (let x = 2; x < 14; x++) set(x, y, '#e9ecef');
    for (let y = 9; y < 24; y++) for (let x = 2; x < 14; x++) set(x, y, (x + y) % 6 < 3 ? '#4361ee' : '#3a56d4'); // blanket
    for (let y = 3; y < 8; y++) for (let x = 4; x < 12; x++) set(x, y, '#ffffff'); // pillow
  });
  props.desk = pixelCanvas(12, 18, 2, (set) => {
    for (let y = 0; y < 18; y++) for (let x = 0; x < 12; x++) set(x, y, '#8b5e3c');
    for (let y = 1; y < 17; y++) set(0, y, '#6f4a2f');
    for (let y = 3; y < 10; y++) for (let x = 3; x < 9; x++) set(x, y, '#222831'); // laptop
    for (let y = 4; y < 9; y++) for (let x = 4; x < 8; x++) set(x, y, '#4cc9f0');
    for (let y = 12; y < 16; y++) for (let x = 3; x < 7; x++) set(x, y, '#e63946'); // book
    set(9, 13, '#ffd166'); set(9, 14, '#ffd166'); // cup
  });
  props.almirah = pixelCanvas(10, 16, 2, (set) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 10; x++) set(x, y, '#9aa0a6');
    for (let y = 0; y < 16; y++) set(5, y, '#5f6368');
    set(4, 8, '#ffd166'); set(6, 8, '#ffd166');
  });
  props.door = pixelCanvas(16, 5, 2, (set) => {
    for (let y = 0; y < 5; y++) for (let x = 0; x < 16; x++) set(x, y, y === 0 ? '#a0703f' : '#8b5a2b');
    for (let x = 0; x < 16; x++) set(x, 4, '#5c3a1b');
    set(12, 2, '#ffd166');
  });
  props.mydoor = pixelCanvas(16, 5, 2, (set) => {
    for (let y = 0; y < 5; y++) for (let x = 0; x < 16; x++) set(x, y, y === 0 ? '#4ea8de' : '#2e86ab');
    for (let x = 0; x < 16; x++) set(x, 4, '#1b4965');
    set(12, 2, '#ffd166');
  });
  props.bomb = pixelCanvas(10, 10, 2, (set, get) => {
    disk(set, 4.5, 5.5, 3.5, '#222222');
    set(3, 4, '#555555');
    set(7, 2, '#8d6e3f'); set(8, 1, '#ffd166'); set(9, 0, '#ff6b35');
    outline(set, get, 10, 10);
  });
  props.bucket = pixelCanvas(14, 14, 2, (set, get) => {
    for (let y = 5; y < 13; y++) for (let x = 2 + (y - 5) / 4; x < 12 - (y - 5) / 4; x++) set(x, y, '#4361ee');
    for (let x = 2; x < 12; x++) { set(x, 4, '#4cc9f0'); set(x, 5, '#90e0ef'); }
    for (let x = 3; x < 11; x++) set(x, 1, '#adb5bd');
    set(2, 2, '#adb5bd'); set(11, 2, '#adb5bd'); set(2, 3, '#adb5bd'); set(11, 3, '#adb5bd');
    outline(set, get, 14, 14);
  });
  props.phone = pixelCanvas(12, 18, 2, (set, get) => {
    for (let y = 3; y < 17; y++) for (let x = 1; x < 11; x++) set(x, y, '#1d3557');
    for (let y = 5; y < 10; y++) for (let x = 3; x < 9; x++) set(x, y, '#e9ecef'); // sign
    for (let x = 4; x < 8; x++) set(x, 7, '#e63946');
    for (let y = 11; y < 15; y++) for (let x = 3; x < 9; x++) set(x, y, '#457b9d');
    set(5, 12, '#111111'); set(6, 12, '#111111'); set(5, 13, '#111111'); // receiver
    for (let x = 3; x < 9; x++) set(x, 2, '#adb5bd');
    set(5, 0, '#e63946'); set(6, 0, '#e63946'); set(5, 1, '#e63946'); set(6, 1, '#e63946'); // light
    outline(set, get, 12, 18);
  });
  // Police jeep, top-down, facing RIGHT
  props.police = pixelCanvas(40, 22, 2, (set, get) => {
    for (const [wx, wy] of [[6, 1], [30, 1], [6, 18], [30, 18]]) for (let x = 0; x < 6; x++) for (let y = 0; y < 3; y++) set(wx + x, wy + y, '#111111');
    for (let x = 2; x < 38; x++) for (let y = 3; y < 19; y++) set(x, y, '#f8f9fa');
    for (let x = 2; x < 38; x++) { set(x, 10, '#1d4ed8'); set(x, 11, '#1d4ed8'); }
    for (let x = 25; x < 31; x++) for (let y = 5; y < 17; y++) set(x, y, '#1b263b'); // windscreen
    for (let x = 8; x < 13; x++) for (let y = 5; y < 17; y++) set(x, y, '#1b263b'); // rear window
    for (let y = 5; y < 11; y++) { set(18, y, '#e63946'); set(19, y, '#e63946'); } // light bar
    for (let y = 11; y < 17; y++) { set(18, y, '#3a86ff'); set(19, y, '#3a86ff'); }
    set(37, 5, '#fff3b0'); set(37, 16, '#fff3b0');
    outline(set, get, 40, 22);
  });
  props.tap = pixelCanvas(8, 6, 2, (set) => {
    for (let x = 0; x < 8; x++) set(x, 2, '#adb5bd');
    set(0, 1, '#adb5bd'); set(0, 3, '#adb5bd'); set(6, 3, '#ced4da'); set(6, 4, '#ced4da');
  });
  props.tree = pixelCanvas(24, 24, 2, (set, get) => {
    disk(set, 12, 12, 10, '#2d6a4f');
    disk(set, 10, 10, 7, '#40916c');
    disk(set, 8, 8, 3, '#52b788');
    outline(set, get, 24, 24);
  });
  props.heart = pixelCanvas(9, 8, 2, (set, get) => {
    const rows = ['.xx...xx.', 'xxxx.xxxx', 'xxxxxxxxx', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....'];
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === 'x' && set(x, y, '#ff4d6d')));
    set(1, 1, '#ffb3c1'); set(2, 1, '#ffb3c1');
  });
  props.heartEmpty = pixelCanvas(9, 8, 2, (set) => {
    const rows = ['.xx...xx.', 'x..x.x..x', 'x...x...x', 'x.......x', '.x.....x.', '..x...x..', '...x.x...', '....x....'];
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === 'x' && set(x, y, '#6c757d')));
  });
  props.drop = pixelCanvas(7, 9, 2, (set, get) => {
    const rows = ['...x...', '..xxx..', '..xxx..', '.xxxxx.', 'xxxxxxx', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..'];
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === 'x' && set(x, y, '#4cc9f0')));
    set(2, 5, '#caf0f8');
  });
  return props;
}

// Soft round light, used to "cut holes" in the darkness.
export function lightCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

// Flashlight beam: a soft cone pointing right, starting at the left-middle.
export function coneCanvas(len = 256, halfAngle = 0.61) {
  const h = Math.ceil(Math.tan(halfAngle) * len * 2);
  const c = document.createElement('canvas');
  c.width = len;
  c.height = h;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(0, h / 2, 0, 0, h / 2, len);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(len, h / 2 - Math.tan(halfAngle) * len);
  ctx.lineTo(len, h / 2 + Math.tan(halfAngle) * len);
  ctx.closePath();
  ctx.fill();
  return c;
}
