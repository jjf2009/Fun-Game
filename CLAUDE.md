# Hostel Nights: notes for AI assistants

The owner builds this game only with AI and has no game-dev background, so keep changes simple and explain them in plain language.

- Stack: Phaser 3 + Vite, plain JavaScript (ES modules), no TypeScript, no test framework.
- `npm run dev` runs the dev server, and `npm run build` must pass before committing.
- Graphics: sprites/tiles/furniture are generated as pixel art in `src/art/pixels.js`, portraits come from DiceBear pixel-art (`src/art/portraits.js`, CC0), and fonts come from Fontsource (`FONT`, `TITLE_FONT` in config). All textures are created in `BootScene`. Character textures are `<key>`, `<key>_1`, `<key>_2`, with a `<key>-walk` animation, facing RIGHT (rotate to face movement). Sounds are generated with Web Audio in `src/sfx.js`.
- Lighting (`systems/Lighting.js`) is a screen-sized RenderTexture at depth 15. Anything that must stay readable at night (labels, warnings, float texts) needs depth > 15.
- Names/difficulty live in `src/config.js`. Put new tunables there.
- The map is a tile grid built in `src/map.js` (`buildMap`). NPCs move using `findPath` (BFS) via the `Npc` base class. Only the player has wall physics.
- `GameScene` owns the game state (score, lives, hidden, era) and calls `update()` on every object/system. `UIScene` just reads `GameScene` fields each frame. Banners go through `scene.banner(text, color)`.
- Hostel events (gang / warden raid / water cut) are started by `systems/EventDirector.js`.
- Boss Night (`CONFIG.bossNight`) is the finale: `GameScene.bossNight` disables the timer/director/water/seniors and runs `systems/BossFight.js` (bikes, photos → complaints → suspensions → `GameScene.victory()` → `VictoryScene`). Bomb throwing/explosions are shared in `systems/bombs.js`.
- Keep villains fictional: no real names or features of real students.
- Visual check: build, run `npx vite preview`, and drive it with Playwright (Chromium is pre-installed). `window.game` exposes the Phaser game for debugging.
- Keep the tone light and comedic. Ragging is shown as something to escape from, never rewarded.
