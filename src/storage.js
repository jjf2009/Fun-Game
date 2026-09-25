// Best score saved in the browser, one per mode (easy / hard).
// Wrapped in try/catch because some browsers block storage.
const KEY = 'hostelNights.best';

export function getBest(mode = 'easy') {
  try {
    const legacy = mode === 'easy' ? Number(localStorage.getItem(KEY)) || 0 : 0; // scores from before modes existed
    return Number(localStorage.getItem(`${KEY}.${mode}`)) || legacy;
  } catch {
    return 0;
  }
}

export function saveBest(score, mode = 'easy') {
  const best = getBest(mode);
  if (score <= best) return false;
  try {
    localStorage.setItem(`${KEY}.${mode}`, String(score));
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
