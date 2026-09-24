// The hostel map is a grid of 40px tiles, built in code.
//
//  cols 0-3   : outside road (where the outsider gang stands)
//  col  4     : boundary wall with the main gate
//  cols 5-10  : courtyard (alarm bell next to the gate)
//  cols 11-12 : lobby connecting both corridors
//  cols 13-36 : 4 rows of 8 rooms, two corridors between them
//  cols 37-38 : bathroom with water taps on the right wall

export const TILE = 40;
export const COLS = 40;
export const ROWS = 25;

export const T = {
  WALL: 0, FLOOR: 1, OUTSIDE: 2, ROOM: 3, DOOR: 4, MYDOOR: 5,
  TAP: 6, BELL: 7, GATE: 8, COURTYARD: 9, BATH: 10,
};

const WALKABLE = new Set([T.FLOOR, T.COURTYARD, T.BATH]);

// Room blocks: [rowStart, rowEnd]
export const ROOM_BLOCKS = [[1, 5], [8, 11], [12, 15], [18, 23]];
// Door rows: door tile row, the corridor row in front of it, first room number
const DOOR_ROWS = [
  { row: 5, front: 6, base: 101 },
  { row: 8, front: 7, base: 109 },
  { row: 15, front: 16, base: 201 },
  { row: 18, front: 17, base: 209 },
];

let grid = [];

export function buildMap(myRoom) {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(T.WALL));
  const fill = (c0, r0, c1, r1, t) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = t;
  };

  fill(0, 0, 3, ROWS - 1, T.OUTSIDE);
  fill(5, 1, 10, 23, T.COURTYARD);
  for (const [r0, r1] of ROOM_BLOCKS) fill(11, r0, 36, r1, T.ROOM);
  fill(11, 6, 38, 7, T.FLOOR);     // corridor 1
  fill(11, 16, 38, 17, T.FLOOR);   // corridor 2
  fill(11, 6, 12, 17, T.FLOOR);    // lobby
  fill(37, 6, 38, 17, T.BATH);     // bathroom
  fill(4, 11, 4, 13, T.GATE);
  grid[9][5] = T.BELL;
  grid[11][39] = T.TAP;
  grid[12][39] = T.TAP;

  const doors = [];
  for (const spec of DOOR_ROWS) {
    for (let i = 0; i < 8; i++) {
      const col = 14 + i * 3;
      const roomNo = spec.base + i;
      const mine = roomNo === myRoom;
      grid[spec.row][col] = mine ? T.MYDOOR : T.DOOR;
      doors.push({ col, row: spec.row, frontCol: col, frontRow: spec.front, roomNo, mine });
    }
  }

  return {
    grid,
    doors,
    bell: tileCenter(5, 9),
    tap: { x: 39 * TILE, y: 12 * TILE },
    gate: tileCenter(4, 12),
  };
}

export const tileAt = (c, r) => (r >= 0 && r < ROWS && c >= 0 && c < COLS ? grid[r][c] : T.WALL);
export const isWalkable = (c, r) => WALKABLE.has(tileAt(c, r));
export const worldToTile = (x, y) => ({ col: Math.floor(x / TILE), row: Math.floor(y / TILE) });
export const tileCenter = (c, r) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });

// Breadth-first search on the tile grid. Returns tiles to walk through (excluding the start).
export function findPath(from, to) {
  if (!isWalkable(to.col, to.row)) return [];
  const key = (c, r) => r * COLS + c;
  const prev = new Map([[key(from.col, from.row), null]]);
  const queue = [from];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length) {
    const cur = queue.shift();
    if (cur.col === to.col && cur.row === to.row) {
      const path = [];
      let k = key(cur.col, cur.row);
      while (k !== key(from.col, from.row)) {
        path.unshift({ col: k % COLS, row: Math.floor(k / COLS) });
        k = prev.get(k);
      }
      return path;
    }
    for (const [dc, dr] of dirs) {
      const c = cur.col + dc;
      const r = cur.row + dr;
      const k = key(c, r);
      if (!prev.has(k) && isWalkable(c, r)) {
        prev.set(k, key(cur.col, cur.row));
        queue.push({ col: c, row: r });
      }
    }
  }
  return [];
}

export function hasLineOfSight(x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(d / 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const { col, row } = worldToTile(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
    if (!isWalkable(col, row)) return false;
  }
  return true;
}

export function randomWalkableTile(filter = () => true) {
  const options = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) if (isWalkable(c, r) && filter(c, r, grid[r][c])) options.push({ col: c, row: r });
  }
  return options[Math.floor(Math.random() * options.length)];
}
