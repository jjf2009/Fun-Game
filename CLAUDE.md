# Hostel Nights: notes for AI assistants

The owner builds this game only with AI and has no game-dev background, so keep changes simple and explain them in plain language.

- Stack: Phaser 3 + Vite, plain JavaScript (ES modules), no TypeScript, no test framework.
- `npm run dev` runs the dev server, and `npm run build` must pass before committing.
- All graphics are generated in `src/scenes/BootScene.js` (no image assets). Sounds are generated with Web Audio in `src/sfx.js`.
- Names/difficulty live in `src/config.js`. Put new tunables there.
- The map is a tile grid built in `src/map.js` (`buildMap`). NPCs move using `findPath` (BFS) via the `Npc` base class. Only the player has wall physics.
- `GameScene` owns the game state (score, lives, hidden, era) and calls `update()` on every object/system. `UIScene` just reads `GameScene` fields each frame. Banners go through `scene.banner(text, color)`.
- Hostel events (gang / warden raid / water cut) are started by `systems/EventDirector.js`.
- Visual check: build, run `npx vite preview`, and drive it with Playwright (Chromium is pre-installed). `window.game` exposes the Phaser game for debugging.
- Keep the tone light and comedic. Ragging is shown as something to escape from, never rewarded.
