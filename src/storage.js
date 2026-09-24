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
