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

// Story mode progress: the highest chapter you can play (1..5, 5 = finished) and your best full-story time.
const STORY_KEY = 'hostelNights.storyChapter';
const STORY_TIME_KEY = 'hostelNights.storyBestTime';

export function storyProgress() {
  try {
    return Number(localStorage.getItem(STORY_KEY)) || 1;
  } catch {
    return 1;
  }
}

export function unlockChapter(n) {
  try {
    if (n > storyProgress()) localStorage.setItem(STORY_KEY, String(n));
  } catch {
    // ignore
  }
}

export function storyBestTime() {
  try {
    return Number(localStorage.getItem(STORY_TIME_KEY)) || 0;
  } catch {
    return 0;
  }
}

// Returns true if this is a new best (fastest) time
export function saveStoryTime(seconds) {
  const best = storyBestTime();
  if (best && seconds >= best) return false;
  try {
    localStorage.setItem(STORY_TIME_KEY, String(Math.round(seconds)));
  } catch {
    // ignore
  }
  return true;
}

// "How to play" is shown automatically only the first time
const HOWTO_KEY = 'hostelNights.seenHowTo';

export function seenHowTo() {
  try {
    return localStorage.getItem(HOWTO_KEY) === '1';
  } catch {
    return true;
  }
}

export function markHowToSeen() {
  try {
    localStorage.setItem(HOWTO_KEY, '1');
  } catch {
    // ignore
  }
}
