// All the names and tunable numbers live here.
// Want to personalize the game for your hostel? Change the text below!

export const CONFIG = {
  // ---- Names (personalize these) ----
  gameTitle: 'HOSTEL NIGHTS',
  hostelName: 'GEC Boys Hostel',
  wardenName: 'Warden Sir',
  guestName: 'Bunty',            // your non-hosteller friend who sneaks in
  myRoom: 111,                   // your room number (101-116 or 201-216)

  // ---- Night ----
  nightLength: 150,              // seconds per night (11 PM -> 5 AM in game)
  oldDaysNights: 3,              // nights 1..3 = "Old Days" (no security, seniors roam)
  lives: 3,

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
