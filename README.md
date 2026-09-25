# 🌙 Hostel Nights

A top-down browser game about college hostel life. Knock on doors at 2 AM and run, dodge the warden's flashlight, sneak your non-hosteller friend out during a surprise check, survive the outsider gang's bomb attacks, escape the seniors, and stay fresh through the water cuts.

Plays in any browser on **PC (keyboard)** and **phones (touch joystick)**.

### ▶️ [Play now: jjf2009.github.io/hostel-nights](https://jjf2009.github.io/hostel-nights/)

## 📱 Play on your phone

- Open [the game link](https://jjf2009.github.io/hostel-nights/) in Chrome (Android) or Safari (iPhone) and **turn your phone sideways**.
- **Left side of the screen** = joystick (drag anywhere on the left half). **ACT** button = knock / interact.
- Tap **⛶** (top of the screen) for full screen on Android.
- **Install it like an app:** Android: Chrome menu → *Add to Home screen*. iPhone: Share → *Add to Home Screen*. It then opens full screen, in landscape, with its own icon.
- The share button on the results screen opens your phone's share sheet, so you can send your score straight to WhatsApp.

## Two modes

Tap **PLAY** and choose:

| | 🟢 EASY: *Internship Season* | 🔴 HARD: *Seniors Are Back* |
|---|---|---|
| Story | The seniors are away on internship | Internship is over, and the seniors are back (and bored) |
| Seniors | 0–1 | 3–5, and they spot you from further away |
| Warden | a bit slower | full speed |
| Hostel events | fewer | more often |
| Lives | 4 | 3 |

Each mode keeps its own best score. In co-op, the host picks the mode. All the numbers are in `CONFIG.modes` in `src/config.js`.

## How to play

| Thing | What to do |
|---|---|
| 🚪 **Knock & run** | Press **SPACE** (or **ACT**) near a door. It opens in ~2 seconds, so RUN. Knock quickly one after another for a combo (up to x5). |
| 🔦 **Warden** | Patrols with a flashlight. If you step into the light, the warden chases you. Break line of sight or hide in your room. |
| 🚨 **Warden check** | Once per night, your friend Bunty is in your room! Go to your door, press ACT, and lead them to the **main gate** without the flashlight seeing them. |
| 💣 **Outsider gang** | They throw bombs over the wall. Red circles show where each one will land. Fight back two ways:<br>📞 **Call the police** from the phone box by the gate. The jeep arrives a few seconds later.<br>✊ **Rebellion:** knock on doors to wake students up (they join you instead of chasing you). Gather 4 rebels, lead them to the main gate, press ACT and charge! |
| 😈 **Seniors** | Roam in the Old Days (Nights 1–3). If one catches you, do their silly task (push-ups, anthem, intro) fast or lose a life. Afterwards **all** seniors leave you alone for 12 seconds. |
| 🚿 **Freshness** | Drains over time. Refill at the bathroom taps. During a **water cut**, find the water bucket. |
| 🛏️ **Hide** | Two hiding spots, always available: **your room** and the **bathroom stall**. Press ACT there to hide for up to 7 seconds. |

Each night runs from 11 PM to 5 AM (~2.5 minutes). Survive to earn a bonus and one life back.

**The story:** in the Old Days (Nights 1–3) the college security guard sleeps at the gate, so the seniors do whatever they want. Night 4 explains what changed: after an event, a junior was dragged out of the hostel and beaten up by seniors, and the college finally brought in **special security**. From then on there are fewer gang attacks and fewer seniors, but a stricter warden.

> Ragging is a crime. If it happens to you or a friend, report it: **National Anti-Ragging Helpline 1800-180-5522** (toll free).

## 👥 Play with a friend (online co-op)

1. Both open the game (phone or PC) and tap **WITH A FRIEND**.
2. One of you taps **CREATE ROOM** and reads out the 4-letter code.
3. The other taps **JOIN ROOM** and types the code.
4. The host taps **START NIGHT 1**. You're roommates: lives and score are shared.

Tips: co-op connects the two devices directly (peer-to-peer, using the free PeerJS service), so no game server is needed. Some college Wi-Fi networks block it; if it won't connect, try mobile data. If a senior catches one of you, only that player does the task, and the other keeps playing.

### 🏍️ Boss Night (Night 5, the finale)

The outsider gang's leader **Bike Bhai** arrives with his gang on **3 bikes, triple seat**, and bombs the hostel.

1. When a bike **stops** at the wall, get close and press SPACE/ACT to **take a photo** (proof).
2. Run to the **ANTI-RAGGING CELL** desk (by the Warden Office) and **file a complaint**.
3. 2 photos suspend each henchman bike, and 3 suspend Bike Bhai. Getting hit breaks your phone, so you lose any photos you haven't filed!
4. Once both henchman bikes are suspended, Bike Bhai gets **furious**. Get him suspended and **you save the hostel**!

After you reach Boss Night once, the menu has a **BOSS NIGHT** button so you can replay it.

## Run it on your computer

You need [Node.js](https://nodejs.org) (version 18 or newer).

```bash
git clone https://github.com/jjf2009/hostel-nights.git
cd hostel-nights
npm install
npm run dev
```

Then open the link it prints (usually http://localhost:5173). `npm run dev` also shows a "Network" link. Open it on your phone (same Wi-Fi) to test touch controls.

## Put it online (free) with GitHub Pages

1. Merge this code into the `main` branch.
2. On GitHub, open **Settings → Pages**, and under **Build and deployment → Source** choose **GitHub Actions**.
3. Every push to `main` now publishes the game to `https://<your-username>.github.io/<repo-name>/` (for this repo: https://jjf2009.github.io/hostel-nights/). Share that link in the hostel group!

## Make it YOUR hostel

Open **`src/config.js`** and change:

- `hostelName`: your hostel/block name
- `wardenName`: what everyone calls the warden
- `guestName`: your non-hosteller friend
- `myRoom`: your room number
- `bossNight`, `bossName`: which night is the finale and the gang leader's name
- numbers such as `nightLength`, `lives`, and speeds to make it easier or harder

Story lines between nights are in `src/scenes/NightIntroScene.js`, and the angry-student yells are in `src/objects/Door.js`.

## Art & credits

All art is free to use:

- **Character portraits**: [DiceBear "Pixel Art"](https://www.dicebear.com/styles/pixel-art/) (CC0, public domain), generated in `src/art/portraits.js`. Change the options there to restyle a face.
- **In-game sprites, tiles, furniture**: pixel art generated in code in `src/art/pixels.js` (colors for each character are in `PEOPLE`).
- **Fonts**: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) and [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (SIL Open Font License), via Fontsource.
- **Lighting**: night darkness, tube lights and the warden's torch are in `src/systems/Lighting.js`.

Want real sprite packs? [Kenney.nl](https://kenney.nl/assets) has thousands of free CC0 assets (for example "Top-down Shooter" or "RPG Urban Pack"). Put the PNGs in `public/assets/` and load them in `src/scenes/BootScene.js`.

## Project layout

```
src/
  config.js            names + difficulty numbers
  map.js               hostel layout (tile grid) + path finding
  scenes/              screens: Menu, NightIntro, Game, UI (HUD), Ragging, GameOver
  objects/             characters: Warden, Senior, Door (+ angry student), Npc (shared base)
  systems/             Gang (bombs), Water, Raid (warden check), EventDirector, Lighting
  art/                 pixel-art generator + DiceBear portraits
  net/                 online co-op: Net (PeerJS), HostNet (host streams the game), GuestMirror (friend's view), session
  sfx.js               sound effects generated in code
```

Built with [Phaser 3](https://phaser.io) and [Vite](https://vitejs.dev). Made for fun, with AI.
