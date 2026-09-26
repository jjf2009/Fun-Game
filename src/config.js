// All the names and tunable numbers live here.
// Want to personalize the game for your hostel? Change the text below!

export const CONFIG = {
  // ---- Names (personalize these) ----
  gameTitle: 'HOSTEL NIGHTS',
  shareUrl: 'https://jjf2009.github.io/hostel-nights/', // the link put in WhatsApp shares
  itchUrl: '',                   // your itch.io page, e.g. 'https://yourname.itch.io/hostel-nights' (see ITCH.md)
  hostelName: 'GEC Boys Hostel',
  wardenName: 'Warden Sir',
  guestName: 'Bunty',            // your non-hosteller friend who sneaks in
  myRoom: 111,                   // your room number (101-116 or 201-216)

  // ---- Night ----
  nightLength: 150,              // seconds per night (11 PM -> 5 AM in game)
  oldDaysNights: 3,              // nights 1..3 = "Old Days" (no security, seniors roam)
  lives: 3,                      // (each mode below sets its own lives)

  // ---- Online leaderboard (TOP 10) ----
  // Off until you paste your Firebase web config here (see README, "Online leaderboard").
  // Example: firebase: { apiKey: '...', authDomain: '...', projectId: '...', appId: '...' },
  leaderboard: {
    firebase: {
      apiKey: 'AIzaSyAUzAy8b5Q0o7XRXeS2x6Jy1MJNsspyRr0',
      authDomain: 'gec-hostel-nights.firebaseapp.com',
      projectId: 'gec-hostel-nights',
      storageBucket: 'gec-hostel-nights.firebasestorage.app',
      messagingSenderId: '512615518040',
      appId: '1:512615518040:web:4908fb82698440a5735f2d',
    },
    top: 10,                     // how many names each board shows
  },

  // ---- Modes ----
  // EASY: the seniors are away on internship. HARD: internship is over, the seniors are back.
  // seniors: how many roam each night = min(max, base + floor(night * perNight)); 'security' = count after security arrives
  modes: {
    easy: {
      name: 'EASY', title: 'Internship Season', color: '#80ffdb',
      intro: 'The seniors are off on internship. Enjoy it while it lasts!',
      lives: 4,
      seniors: { base: 0, perNight: 0.5, max: 1, security: 0 },
      seniorSpeed: 0.9, seniorSight: 130,   // senior speed multiplier, how far they see (px)
      wardenSpeed: 0.9,                     // warden speed multiplier
      eventRate: 0.8,                       // how often hostel events happen (lower = fewer)
    },
    hard: {
      name: 'HARD', title: 'Seniors Are Back', color: '#ff6b6b',
      intro: 'Internship is over. The seniors are back... and bored.',
      lives: 3,
      seniors: { base: 3, perNight: 0.5, max: 5, security: 2 },
      seniorSpeed: 1.1, seniorSight: 190,
      wardenSpeed: 1.0,
      eventRate: 1.25,
    },
  },

  // ---- Player ----
  playerSpeed: 175,
  hideMax: 7,                    // seconds you can stay in a hiding spot
  hideReentry: 2,                // seconds before you can re-enter the same hiding spot

  // ---- Seniors ----
  seniorBreak: 12,               // after a ragging task, ALL seniors leave you alone this long (seconds)

  // ---- Knock & run ----
  knockPoints: 10,
  comboWindow: 4,                // seconds between knocks to keep the combo going
  doorCooldown: 12,

  // ---- Warden ----
  warden: { patrol: 70, chase: 135, visionRange: 170, giveUp: 3000 },
  raidDuration: 30,              // seconds to sneak your friend out during a warden check

  // ---- Outsider gang ----
  gangRaidDuration: 24,           // seconds (shorter once special security arrives)
  police: { delay: 7, delaySecurity: 4 }, // seconds for the police jeep to arrive after your call
  rebellion: { need: 4, max: 6 },         // rebels needed to charge, and the most that can join
  bombRadius: 46,

  // ---- Boss Night (the finale) ----
  bossNight: 5,                  // this night is the boss fight
  bossName: 'BIKE BHAI',         // leader of the outsider gang
  boss: {
    photoRange: 230,             // how close you must be to photograph a bike
    henchmanProof: 2,            // photos needed to suspend each henchman bike
    bossProof: 3,                // photos needed to suspend the boss
  },

  // ---- Water ----
  freshDrain: 1.25,              // freshness lost per second
  waterCutDuration: 25,
};

export const FONT = '"Pixelify Sans", monospace';       // pixel font for normal text
export const TITLE_FONT = '"Press Start 2P", monospace'; // chunky arcade font for titles

// The link to put in share messages: the itch.io page when playing on itch, otherwise the website.
export function shareLink() {
  const host = window.location.hostname;
  const onItch = host.endsWith('itch.zone') || host.endsWith('itch.io');
  return onItch && CONFIG.itchUrl ? CONFIG.itchUrl : CONFIG.shareUrl;
}
