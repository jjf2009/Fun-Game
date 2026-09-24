// Best score saved in the browser. Wrapped in try/catch because some browsers block storage.
const KEY = 'hostelNights.best';

export function getBest() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  const best = getBest();
  if (score <= best) return false;
  try {
    localStorage.setItem(KEY, String(score));
  } catch {
    // ignore
  }
  return true;
}

// Remembers that the player has reached Boss Night, so the menu can offer a replay button.
const BOSS_KEY = 'hostelNights.bossUnlocked';

export function isBossUnlocked() {
  try {
    return localStorage.getItem(BOSS_KEY) === '1';
  } catch {
    return false;
  }
}

export function unlockBoss() {
  try {
    localStorage.setItem(BOSS_KEY, '1');
  } catch {
    // ignore
  }
}
