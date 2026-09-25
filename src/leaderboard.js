import { CONFIG } from './config.js';

// Online TOP 10, stored in Firebase Firestore (free tier).
// Three boards: EASY and HARD (highest score wins) and STORY (fastest full run wins, in seconds).
// Add ?leaderboard=mock to the URL to test with a fake board saved in this browser only.

export const BOARDS = {
  easy: { label: 'EASY', lowerIsBetter: false },
  hard: { label: 'HARD', lowerIsBetter: false },
  story: { label: 'STORY', lowerIsBetter: true },
};

const MOCK = new URLSearchParams(window.location.search).get('leaderboard') === 'mock';

export const leaderboardReady = () => MOCK || !!CONFIG.leaderboard.firebase;

// Keep names short and plain (names come from src/names.js, this is just a safety net).
function cleanName(name) {
  return (name || '').replace(/[^\p{L}\p{N} _.&'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
}

// Firebase is only downloaded the first time the leaderboard is used.
let fb = null;
function firestore() {
  fb ??= Promise.all([import('firebase/app'), import('firebase/firestore/lite')]).then(([app, fs]) => ({
    fs, db: fs.getFirestore(app.initializeApp(CONFIG.leaderboard.firebase)),
  }));
  return fb;
}

const withTimeout = (promise) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
]);

// ---- fake board for testing (?leaderboard=mock) ----
const mockKey = (board) => `hostelNights.mockBoard.${board}`;
const mockRead = (board) => { try { return JSON.parse(localStorage.getItem(mockKey(board))) || []; } catch { return []; } };
const better = (board) => (a, b) => (BOARDS[board].lowerIsBetter ? a.score - b.score : b.score - a.score);

// The top entries of a board: [{ name, score, coop }]
export async function topScores(board) {
  if (MOCK) return mockRead(board).sort(better(board)).slice(0, CONFIG.leaderboard.top);
  const { fs, db } = await firestore();
  const q = fs.query(fs.collection(db, `scores_${board}`), fs.orderBy('score', BOARDS[board].lowerIsBetter ? 'asc' : 'desc'), fs.limit(CONFIG.leaderboard.top));
  const snap = await withTimeout(fs.getDocs(q));
  return snap.docs.map((d) => d.data());
}

// Adds a score and returns your rank on that board (1 = top).
export async function submitScore(board, rawName, score, coop = false) {
  const name = cleanName(rawName);
  score = Math.round(score);
  const lower = BOARDS[board].lowerIsBetter;
  if (MOCK) {
    const list = mockRead(board);
    list.push({ name, score, coop });
    localStorage.setItem(mockKey(board), JSON.stringify(list));
    return list.filter((e) => (lower ? e.score < score : e.score > score)).length + 1;
  }
  const { fs, db } = await firestore();
  const col = fs.collection(db, `scores_${board}`);
  await withTimeout(fs.addDoc(col, { name, score, coop, at: fs.serverTimestamp() }));
  const ahead = await withTimeout(fs.getCount(fs.query(col, fs.where('score', lower ? '<' : '>', score))));
  return ahead.data().count + 1;
}
