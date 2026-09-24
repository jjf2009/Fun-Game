# 🌙 Hostel Nights

A top-down browser game about college hostel life. Knock on doors at 2 AM and run, dodge the warden's flashlight, sneak your non-hosteller friend out during a surprise check, survive the outsider gang's bomb attacks, escape the seniors, and stay fresh through the water cuts.

Plays in any browser on **PC (keyboard)** and **phones (touch joystick)**.

## How to play

| Thing | What to do |
|---|---|
| 🚪 **Knock & run** | Press **SPACE** (or **ACT**) near a door. It opens in ~2 seconds, so RUN. Knock quickly one after another for a combo (up to x5). |
| 🔦 **Warden** | Patrols with a flashlight. If you step into the light, the warden chases you. Break line of sight or hide in your room. |
| 🚨 **Warden check** | Your friend is in your room! Go to your door, press ACT, and lead them to the **main gate** without the flashlight seeing them. |
| 💣 **Outsider gang** | They throw bombs over the wall. Red circles show where each one will land. Ring the **alarm bell** by the gate to scare them off. |
| 😈 **Seniors** | Roam in the Old Days (Nights 1–3). If one catches you, do their silly task (push-ups, anthem, intro) fast or lose a life. |
| 🚿 **Freshness** | Drains over time. Refill at the bathroom taps. During a **water cut**, find the water bucket. |
| 🛏️ **Hide** | Press ACT at your own door to hide for a few seconds. |

Each night runs from 11 PM to 5 AM (~2.5 minutes). Survive to earn a bonus and one life back. From Night 4, **security arrives**: fewer gang attacks and fewer seniors, but a stricter warden.

## Run it on your computer

You need [Node.js](https://nodejs.org) (version 18 or newer).

```bash
npm install
npm run dev
```

Then open the link it prints (usually http://localhost:5173). `npm run dev` also shows a "Network" link. Open it on your phone (same Wi-Fi) to test touch controls.

## Put it online (free) with GitHub Pages

1. Merge this code into the `main` branch.
2. On GitHub, open **Settings → Pages**, and under **Build and deployment → Source** choose **GitHub Actions**.
3. Every push to `main` now publishes the game to `https://<your-username>.github.io/<repo-name>/`. Share that link in the hostel group!

## Make it YOUR hostel

Open **`src/config.js`** and change:

- `hostelName`: your hostel/block name
- `wardenName`: what everyone calls the warden
- `guestName`: your non-hosteller friend
- `myRoom`: your room number
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
  sfx.js               sound effects generated in code
```

Built with [Phaser 3](https://phaser.io) and [Vite](https://vitejs.dev). Made for fun, with AI.
