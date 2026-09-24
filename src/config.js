// All the names and tunable numbers live here.
// Want to personalize the game for your hostel? Change the text below!

export const CONFIG = {
  // ---- Names (personalize these) ----
  gameTitle: 'HOSTEL NIGHTS',
  hostelName: 'Boys Hostel - Block C',
  wardenName: 'Warden Sir',
  guestName: 'Bunty',            // your non-hosteller friend who sneaks in
  myRoom: 111,                   // your room number (101-116 or 201-216)

  // ---- Night ----
  nightLength: 150,              // seconds per night (11 PM -> 5 AM in game)
  oldDaysNights: 3,              // nights 1..3 = "Old Days" (no security, seniors roam)
  lives: 3,

  // ---- Player ----
  playerSpeed: 175,
  hideMax: 7,                    // seconds you can hide in your room
  hideCooldown: 8,

  // ---- Knock & run ----
  knockPoints: 10,
  comboWindow: 4,                // seconds between knocks to keep the combo going
  doorCooldown: 12,

  // ---- Warden ----
  warden: { patrol: 70, chase: 135, visionRange: 170, giveUp: 3000 },
  raidDuration: 30,              // seconds to sneak your friend out during a warden check

  // ---- Outsider gang ----
  gangRaidDuration: 15,
  bombRadius: 46,

  // ---- Water ----
  freshDrain: 1.25,              // freshness lost per second
  waterCutDuration: 25,
};

export const FONT = '"Pixelify Sans", monospace';       // pixel font for normal text
export const TITLE_FONT = '"Press Start 2P", monospace'; // chunky arcade font for titles
