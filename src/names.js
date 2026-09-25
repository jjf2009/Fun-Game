// Random funny names for the leaderboard, so nobody has to type (or can type) anything rude.
// Each device keeps its name; players can roll a new one with the 🎲 button.
// Firebase only accepts names made from these words: if you change the lists, update the
// name.matches(...) line in firestore.rules to match, and publish the rules again.
const ADJ = ['Sleepy', 'Hungry', 'Sneaky', 'Lazy', 'Loud', 'Brave', 'Chill', 'Silent', 'Speedy', 'Tiny', 'Mighty', 'Jolly', 'Rowdy', 'Snoozy', 'Cheeky', 'Midnight', 'Lucky', 'Fuzzy'];
const NOUN = ['Fresher', 'Topper', 'Owl', 'Maggi', 'Chai', 'Ninja', 'Rebel', 'Panda', 'Tiger', 'Mango', 'Samosa', 'Bucket', 'Pillow', 'Slipper', 'Knocker', 'Bunker', 'Parotta', 'Goat'];
const KEY = 'hostelNights.playerName';
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// e.g. "Sleepy Maggi 42" (always 16 characters or fewer, the leaderboard's limit)
export function randomName() {
  for (;;) {
    const name = `${pick(ADJ)} ${pick(NOUN)} ${10 + Math.floor(Math.random() * 90)}`;
    if (name.length <= 16) return name;
  }
}

// Same check as the name.matches(...) rule in firestore.rules
export function isRandomName(name) {
  return new RegExp(`^(${ADJ.join('|')}) (${NOUN.join('|')}) [1-9][0-9]$`).test(name) && name.length <= 16;
}

export function playerName() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && isRandomName(saved)) return saved; // ignore old typed names
    const name = randomName();
    localStorage.setItem(KEY, name);
    return name;
  } catch {
    return randomName();
  }
}

export function newPlayerName() {
  const name = randomName();
  try { localStorage.setItem(KEY, name); } catch { /* ignore */ }
  return name;
}
