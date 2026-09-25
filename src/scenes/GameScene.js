import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { TILE, COLS, ROWS, T, ROOM_BLOCKS, buildMap, isWalkable, tileCenter, randomWalkableTile } from '../map.js';
import { input } from '../controls.js';
import { sfx } from '../sfx.js';
import { Warden } from '../objects/Warden.js';
import { Senior } from '../objects/Senior.js';
import { Door } from '../objects/Door.js';
import { GangSystem } from '../systems/GangSystem.js';
import { WaterSystem } from '../systems/WaterSystem.js';
import { RaidSystem } from '../systems/RaidSystem.js';
import { EventDirector } from '../systems/EventDirector.js';
import { Lighting } from '../systems/Lighting.js';
import { BossFight } from '../systems/BossFight.js';
import { RoomManager } from '../systems/RoomManager.js';
import { HostNet } from '../net/HostNet.js';
import { GuestMirror } from '../net/GuestMirror.js';
import { gotoScene } from '../net/session.js';

const SNORES = ['"Zzz... 5 more minutes..."', '"Zzz... not my duty..."', '"Zzz... who is it..."', '"ZZZZZ..."'];

// One night in the hostel.
//  Solo:  this.mp = null, one player.
//  Co-op: this.mp = 'host' runs the real game with two players and streams it to the friend,
//         this.mp = 'guest' only mirrors what the host sends (see src/net/).
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.night = data.night ?? 1;
    this.score = data.score ?? 0;
    this.mode = data.mode === 'hard' ? 'hard' : 'easy';
    this.modeCfg = CONFIG.modes[this.mode];
    this.lives = data.lives ?? this.modeCfg.lives;
    this.knocks = data.knocks ?? 0;
    this.era = this.night <= CONFIG.oldDaysNights ? 'old' : 'security';
    this.bossNight = this.night === CONFIG.bossNight;
    this.mp = data.mp ?? null;
    this.mirror = null;
    this.hostNet = null;
  }

  create() {
    this.map = buildMap(CONFIG.myRoom);
    this.drawMap();
    this.walls = this.buildWalls();
    this.physics.world.setBounds(0, 0, COLS * TILE, ROWS * TILE);
    this.lighting = new Lighting(this);
    this.rooms = new RoomManager(this); // people in the rooms (built the same way on both co-op devices)
    this.over = false;
    this.players = [];

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E');
    // ACTION key: listen for the key-down event so even a super quick tap is never missed
    this.input.keyboard.on('keydown-SPACE', () => input.queueAction());
    this.input.keyboard.on('keydown-E', () => input.queueAction());
    this.input.keyboard.on('keydown-M', () => this.game.events.emit('banner', sfx.toggleMute() ? '🔇 Sound off' : '🔊 Sound on', '#ffffff'));
    input.reset();
    this.cameras.main.setBounds(0, 0, COLS * TILE, ROWS * TILE);
    this.cameras.main.fadeIn(400);

    // The friend's device: just mirror the host's game
    if (this.mp === 'guest') {
      this.mirror = new GuestMirror(this);
      this.scene.launch('UI');
      return;
    }
    // From here on, everything created is streamed to the friend (co-op host only)
    if (this.mp === 'host' && this.game.net?.connected) this.hostNet = new HostNet(this);

    // Doors
    this.doors = [];
    for (const d of this.map.doors) {
      if (d.mine) {
        const c = tileCenter(d.col, d.row);
        const dirY = d.frontRow - d.row;
        this.myDoor = { ...d, front: { x: c.x, y: c.y + (dirY * TILE) / 2 }, frontTile: tileCenter(d.frontCol, d.frontRow) };
      } else {
        this.doors.push(new Door(this, d));
      }
    }

    // Players start in front of their room (in co-op you are roommates!)
    const start = this.myDoor.frontTile;
    this.player = this.addPlayer(0, start.x, start.y, true);
    if (this.hostNet) this.addPlayer(1, start.x + 40, start.y, false);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Characters
    const lobby = tileCenter(11, 12);
    this.warden = new Warden(this, lobby.x, lobby.y);
    this.seniors = [];
    // EASY: seniors are away on internship. HARD: they're back, and there are lots of them.
    const sc = this.modeCfg.seniors;
    let seniorCount = this.era === 'old' ? Math.min(sc.max, sc.base + Math.floor(this.night * sc.perNight)) : sc.security;
    if (this.bossNight) {
      // On Boss Night the warden sits at the Anti-Ragging Cell desk, and there are no seniors.
      seniorCount = 0;
      const desk = tileCenter(11, 6);
      this.warden.setPosition(desk.x - 10, desk.y + 4);
      this.warden.station();
    }
    for (let i = 0; i < seniorCount; i++) {
      const t = randomWalkableTile((c) => c > 14 && Math.abs(c - this.myDoor.col) > 6);
      const c = tileCenter(t.col, t.row);
      this.seniors.push(new Senior(this, c.x, c.y));
    }
    this.addGuard();

    // Systems
    this.gang = new GangSystem(this);
    this.water = new WaterSystem(this);
    this.raid = new RaidSystem(this);
    this.director = new EventDirector(this);
    this.bossFight = this.bossNight ? new BossFight(this) : null;

    // State
    this.timeLeft = CONFIG.nightLength;
    this.combo = 1;
    this.lastKnockAt = -99999;
    this.hideSpots = this.makeHideSpots();
    this.inRagging = false;

    this.scene.launch('UI');
    if (this.bossNight) {
      this.time.delayedCall(600, () => this.banner(`🏍️ BOSS NIGHT! ${CONFIG.bossName}'s gang is here on 3 bikes!`, '#ff6b6b'));
      this.time.delayedCall(3800, () => this.banner('📸 Photograph them when they stop, then file complaints at the ANTI-RAGGING CELL!', '#80ffdb'));
    } else {
      this.time.delayedCall(600, () => this.banner(`NIGHT ${this.night} - Knock on doors and RUN! Survive till morning.`, '#ffe066'));
    }
  }

  // Real game time in ms. (The scene clock, this.time.now, freezes while the scene is
  // paused for a ragging task, so it is stale right after resuming. Don't use it for timers.)
  get now() {
    return this.game.loop.time;
  }

  // ---------- Players ----------

  // pid 0 = host / solo player (blue), pid 1 = co-op friend (pink).
  addPlayer(pid, x, y, local) {
    const key = pid === 0 ? 'player' : 'player2';
    const p = this.physics.add.sprite(x, y, key).setDepth(6);
    p.body.setCircle(13, 9, 9);
    p.setCollideWorldBounds(true);
    if (local) this.physics.add.collider(p, this.walls);
    Object.assign(p, {
      pid, key, local, hidden: false, hideSpot: null, hideUntil: 0, invulnUntil: 0,
      seniorBreakUntil: 0, frozen: false, freshness: 100, photos: [0, 0, 0], hint: '',
    });
    p.dust = this.add.particles(0, 0, 'dust', {
      follow: p, frequency: 70, lifespan: 450, speed: { min: 5, max: 25 },
      scale: { start: 0.7, end: 0.1 }, alpha: { start: 0.35, end: 0 }, emitting: false,
    }).setDepth(4);
    p.label = this.add.text(x, y - 26, local ? 'YOU' : 'FRIEND', {
      fontFamily: FONT, fontSize: '12px', color: pid === 0 ? '#9bf6ff' : '#ffafcc', backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(16);
    if (this.hostNet) {
      if (local) p.label.netAlt = 'FRIEND'; // the friend sees the host labelled FRIEND
      else { p.noNet = true; p.label.noNet = true; } // the friend draws their own character
    }
    this.players.push(p);
    return p;
  }

  // Players that enemies can see/catch (not hidden, not busy with a senior)
  visiblePlayers() {
    return this.players.filter((p) => p.active && !p.hidden && !p.frozen);
  }

  nearestVisiblePlayer(x, y, maxDist = Infinity) {
    return this.closest(this.visiblePlayers(), x, y, maxDist);
  }

  nearestPlayer(x, y, maxDist = Infinity) {
    return this.closest(this.players.filter((p) => p.active), x, y, maxDist);
  }

  closest(list, x, y, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const p of list) {
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d < bestD) { best = p; bestD = d; }
    }
    return best;
  }

  // Moves a player; for the co-op friend the new position is sent to their device.
  teleport(p, x, y) {
    p.setPosition(x, y);
    if (!p.local) this.hostNet?.teleport(x, y);
  }

  // Old Days: the college guard sleeps at the gate. Security Era: special security, wide awake.
  addGuard() {
    if (this.bossNight) return;
    const g = tileCenter(6, 14);
    const asleep = this.era === 'old';
    this.guard = this.add.image(g.x, g.y, 'guard').setDepth(5).setRotation(asleep ? 0.6 : 0);
    this.guard.asleep = asleep;
    this.add.text(g.x, g.y - 28, asleep ? 'COLLEGE SECURITY (asleep)' : 'SPECIAL SECURITY', {
      fontFamily: FONT, fontSize: '12px', color: asleep ? '#adb5bd' : '#dee2e6', backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(16);
    if (asleep) {
      const z = this.add.text(g.x + 14, g.y - 14, 'Zzz', { fontFamily: FONT, fontSize: '14px', color: '#caf0f8', stroke: '#000', strokeThickness: 3 }).setDepth(16);
      this.tweens.add({ targets: z, y: g.y - 34, alpha: 0, duration: 1600, repeat: -1 });
    }
  }

  // ---------- Effects that only one player's device should see ----------

  netEvent(e) {
    this.hostNet?.event(e);
  }

  shakeAll(duration, intensity) {
    this.cameras.main.shake(duration, intensity);
    this.netEvent({ k: 'shake', d: duration, i: intensity });
  }

  fxFlash(p, duration, r, g, b) {
    if (p.local) this.cameras.main.flash(duration, r, g, b);
    else this.netEvent({ k: 'flash', d: duration, r, g, b });
  }

  fxHurt(p) {
    if (p.local) {
      this.cameras.main.shake(200, 0.01);
      this.cameras.main.flash(200, 255, 60, 60);
    } else {
      this.netEvent({ k: 'hurt' });
    }
    this.tweens.add({ targets: p, alpha: 0.2, duration: 120, yoyo: true, repeat: 7, onComplete: () => p.setAlpha(p.hidden ? 0.25 : 1) });
  }

  // ---------- Map drawing ----------

  drawMap() {
    // The whole map is painted once onto one big canvas (fast to render every frame).
    const W = COLS * TILE;
    const H = ROWS * TILE;
    if (this.textures.exists('mapbg')) this.textures.remove('mapbg');
    const tex = this.textures.createCanvas('mapbg', W, H);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    const tiles = this.registry.get('tiles');
    const img = (key) => this.textures.get(key).getSourceImage();
    const grid = this.map.grid;
    const pick = (arr, c, r) => arr[(c * 7 + r * 13) % arr.length];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let set;
        switch (grid[r][c]) {
          case T.OUTSIDE: set = c >= 1 && c <= 2 ? tiles.road : tiles.outside; break;
          case T.COURTYARD: case T.BELL: set = tiles.grass; break;
          case T.FLOOR: set = tiles.floor; break;
          case T.BATH: set = tiles.bath; break;
          case T.ROOM: case T.DOOR: case T.MYDOOR: set = tiles.wood; break;
          default: set = tiles.wall;
        }
        ctx.drawImage(pick(set, c, r), c * TILE, r * TILE);
      }
    }

    // Road markings
    ctx.fillStyle = 'rgba(230,230,230,0.55)';
    for (let y = 10; y < H; y += 60) ctx.fillRect(TILE * 2 - 3, y, 6, 30);

    // Rooms: walls, bed, desk, cupboard
    for (const [r0, r1] of ROOM_BLOCKS) {
      for (let i = 0; i < 8; i++) {
        const x = (13 + i * 3) * TILE;
        const y = r0 * TILE;
        const h = (r1 - r0 + 1) * TILE;
        const flip = i % 2 === 1;
        ctx.drawImage(img('bed'), flip ? x + 3 * TILE - 40 : x + 8, y + h / 2 - 26);
        ctx.drawImage(img('desk'), flip ? x + 8 : x + 3 * TILE - 32, y + 8);
        ctx.drawImage(img('almirah'), flip ? x + 8 : x + 3 * TILE - 28, y + h - 40);
        ctx.fillStyle = '#1a1522';
        ctx.fillRect(x, y, 3 * TILE, 5); ctx.fillRect(x, y + h - 5, 3 * TILE, 5);
        ctx.fillRect(x, y, 5, h); ctx.fillRect(x + 3 * TILE - 5, y, 5, h);
      }
    }

    // Warden office blocks
    ctx.fillStyle = 'rgba(20,16,30,0.55)';
    ctx.fillRect(11 * TILE, TILE, 2 * TILE, 5 * TILE);
    ctx.fillRect(11 * TILE, 18 * TILE, 2 * TILE, 6 * TILE);
    ctx.drawImage(img('desk'), 11 * TILE + 26, 2 * TILE);

    // Doors (drawn on the room's edge facing the corridor)
    for (const d of this.map.doors) {
      const x = d.col * TILE;
      const y = d.row * TILE;
      const down = d.frontRow > d.row;
      ctx.drawImage(img(d.mine ? 'mydoor' : 'door'), x + 4, down ? y + TILE - 10 : y);
      const label = d.mine ? `${d.roomNo} YOU` : `${d.roomNo}`;
      this.add.text(x + TILE / 2, down ? y + TILE - 18 : y + 18, label, {
        fontFamily: TITLE_FONT, fontSize: '8px', color: d.mine ? '#9bf6ff' : '#e8d5b7', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(1);
    }

    // Boundary wall + gate
    ctx.fillStyle = '#5a5a6e'; ctx.fillRect(4 * TILE, 0, TILE, H);
    ctx.fillStyle = '#6d6d85';
    for (let y = 0; y < H; y += 20) ctx.fillRect(4 * TILE + ((y / 20) % 2) * 10, y, 18, 8);
    ctx.fillStyle = '#26222f'; ctx.fillRect(4 * TILE, 11 * TILE, TILE, 3 * TILE);
    ctx.fillStyle = '#9d9d9d';
    for (let y = 11 * TILE + 4; y < 14 * TILE; y += 10) ctx.fillRect(4 * TILE + 3, y, TILE - 6, 3);
    ctx.fillRect(4 * TILE + 18, 11 * TILE, 4, 3 * TILE);

    // Taps
    for (const r of [11, 12]) ctx.drawImage(img('tap'), 39 * TILE - 14, r * TILE + 14);
    // Bathroom stall (second hiding spot)
    ctx.fillStyle = '#2a9d8f'; ctx.fillRect(39 * TILE - 2, 15 * TILE + 2, 10, TILE - 4);
    ctx.fillStyle = '#1d6f65'; ctx.fillRect(39 * TILE - 2, 15 * TILE + 2, 3, TILE - 4);
    ctx.fillStyle = '#ffd166'; ctx.fillRect(39 * TILE + 3, 15.5 * TILE - 2, 3, 4);

    // Trees outside + in the courtyard corners
    for (const [x, y] of [[0, 60], [0, 330], [0, 700], [100, 900], [210, 40], [360, 890]]) ctx.drawImage(img('tree'), x, y);

    tex.refresh();
    this.add.image(0, 0, 'mapbg').setOrigin(0).setDepth(0);

    this.add.image(this.map.phone.x, this.map.phone.y - 6, 'phone').setDepth(2).setScale(1.2);

    const label = (x, y, text, color = '#e0e0e0', size = 14) => this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setDepth(16).setAlpha(0.9);
    label(3 * TILE - 10, 12.5 * TILE, 'MAIN\nGATE', '#cccccc', 13);
    label(this.map.phone.x + 34, this.map.phone.y - 34, 'POLICE PHONE', '#9bf6ff', 12);
    label(8 * TILE, 12.5 * TILE, 'COURTYARD', '#b7e4c7');
    label(38 * TILE, 9 * TILE, 'BATH\nROOM', '#caf0f8', 13);
    label(38 * TILE - 4, 14.4 * TILE, 'STALL\n(hide)', '#9bf6ff', 11);
    label(12 * TILE, 3.5 * TILE, 'WARDEN\nOFFICE', '#aaaaaa', 12);
    label(24.5 * TILE, 0.5 * TILE, CONFIG.hostelName.toUpperCase(), '#ffe066', 15);
    label(2 * TILE, 1 * TILE, 'OUTSIDE', '#888888', 12);
  }

  // Invisible physics walls: every non-walkable tile, merged into horizontal strips.
  buildWalls() {
    const walls = this.physics.add.staticGroup();
    for (let r = 0; r < ROWS; r++) {
      let start = -1;
      for (let c = 0; c <= COLS; c++) {
        const solid = c < COLS && !isWalkable(c, r);
        if (solid && start < 0) start = c;
        if (!solid && start >= 0) {
          const w = (c - start) * TILE;
          walls.add(this.add.rectangle(start * TILE + w / 2, r * TILE + TILE / 2, w, TILE).setVisible(false));
          start = -1;
        }
      }
    }
    return walls;
  }

  // ---------- Main loop ----------

  update(time, delta) {
    if (this.mirror) {
      this.mirror.update(time, delta);
      return;
    }
    if (this.over) {
      this.hostNet?.update(time);
      return;
    }
    const dt = delta / 1000;

    if (!this.bossNight) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.nightComplete();
        return;
      }
    }

    this.updateLocalPlayer(time);
    this.hostNet?.applyRemoteInput(time);
    for (const d of this.doors) d.update(time);
    this.warden.update(time);
    for (const s of this.seniors) s.update(time);
    this.gang.update(dt, time);
    this.raid.update(dt);
    if (this.bossFight) {
      this.bossFight.update(time, dt);
    } else {
      this.water.update(dt, time);
      this.director.update(dt);
    }
    for (const p of this.players) {
      p.label.setPosition(p.x, p.y - 26);
      p.hint = this.computeHint(p, time);
    }
    this.lighting.update(time, Lighting.sourcesFrom(this, time));

    if (time - this.lastKnockAt > CONFIG.comboWindow * 1000) this.combo = 1;
    this.hostNet?.update(time);
  }

  // Keyboard + touch joystick. Returns { vx, vy, len, action }.
  readInput() {
    const k = this.keys;
    let vx = input.x;
    let vy = input.y;
    if (k.A.isDown || k.LEFT.isDown) vx = -1;
    if (k.D.isDown || k.RIGHT.isDown) vx = 1;
    if (k.W.isDown || k.UP.isDown) vy = -1;
    if (k.S.isDown || k.DOWN.isDown) vy = 1;
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    const action = input.consumeAction();
    return { vx, vy, len, action };
  }

  // Moves a sprite with the controls: walking animation, facing, dust. Used by host and friend.
  static walk(p, vx, vy, len) {
    p.setVelocity(vx * CONFIG.playerSpeed, vy * CONFIG.playerSpeed);
    const moving = len > 0.1;
    if (moving) {
      p.setRotation(Phaser.Math.Angle.RotateTo(p.rotation, Math.atan2(vy, vx), 0.25));
      if (!p.anims.isPlaying) p.play(`${p.texture.key.split('_')[0]}-walk`);
    } else if (p.anims.isPlaying) {
      p.stop();
      p.setTexture(p.key);
    }
    p.dust.emitting = moving;
    return moving;
  }

  updateLocalPlayer(time) {
    const p = this.player;
    const { vx, vy, len, action } = this.readInput();
    if (p.frozen) {
      p.setVelocity(0, 0);
      return;
    }
    if (p.hidden) {
      p.setVelocity(0, 0);
      if (len > 0.3 || action || time > p.hideUntil) this.unhide(time, time > p.hideUntil, p);
      return;
    }
    GameScene.walk(p, vx, vy, len);
    if (action) this.handleAction(time, p);
  }

  near(p, pt, dist) {
    return Phaser.Math.Distance.Between(p.x, p.y, pt.x, pt.y) < dist;
  }

  nearestDoor(p) {
    let best = null;
    let bestD = 50;
    for (const d of this.doors) {
      const dist = Phaser.Math.Distance.Between(p.x, p.y, d.front.x, d.front.y);
      if (dist < bestD) { best = d; bestD = dist; }
    }
    return best;
  }

  nearGuard(p) {
    return this.guard && this.near(p, this.guard, 55);
  }

  computeHint(p, time) {
    if (p.frozen) return 'A senior has got you!';
    if (p.hidden) return `Hiding in ${p.hideSpot.name}: ${Math.ceil((p.hideUntil - time) / 1000)}s (move to come out)`;
    const bossHint = this.bossFight?.hint(p);
    if (bossHint) return bossHint;
    if (this.near(p, this.map.phone, 60)) return this.gang.phoneHint();
    const rebelHint = this.gang.rebellionHint(p);
    if (rebelHint) return rebelHint;
    const spot = this.nearHideSpot(p);
    if (spot) {
      if (spot.room && this.raid.active && this.raid.state === 'inRoom') return `Get ${CONFIG.guestName} out!`;
      return time < spot.readyAt ? '' : `Hide in ${spot.name}`;
    }
    const door = this.nearestDoor(p);
    if (door) {
      if (door.state !== 'idle') return '';
      return this.gang.active && !this.bossNight ? `✊ Wake up room ${door.roomNo} for the rebellion` : `Knock on room ${door.roomNo}`;
    }
    if (this.nearGuard(p) && this.guard.asleep) return 'Wake up the security guard';
    if (this.water.nearTap(p)) return this.water.cut ? 'No water! 😩' : 'Freshening up...';
    return '';
  }

  handleAction(time, p) {
    if (p.frozen) return;
    if (this.bossFight?.action(time, p)) return;
    if (this.near(p, this.map.phone, 60)) {
      this.gang.callPolice(p);
      return;
    }
    if (this.gang.tryRebellion(p)) return;
    const spot = this.nearHideSpot(p);
    if (spot) {
      if (spot.room && this.raid.active && this.raid.state === 'inRoom') this.raid.releaseGuest(p);
      else this.hide(time, spot, p);
      return;
    }
    const door = this.nearestDoor(p);
    if (door) {
      door.knock(time);
      return;
    }
    if (this.nearGuard(p) && this.guard.asleep) {
      this.floatText(this.guard.x, this.guard.y - 40, Phaser.Utils.Array.GetRandom(SNORES), '#caf0f8', 13);
    }
  }

  // ---------- Hiding ----------

  // Two hiding spots: your own room and the bathroom stall. Both are always available.
  makeHideSpots() {
    return [
      {
        name: 'your room', room: true, readyAt: 0,
        front: this.myDoor.front, stand: this.myDoor.frontTile,
        kickMsg: 'Roommate: "Get out, I\'m sleeping!"',
      },
      {
        name: 'the bathroom stall', room: false, readyAt: 0,
        front: { x: 39 * TILE, y: 15.5 * TILE }, stand: tileCenter(38, 15),
        kickMsg: 'Someone is banging on the stall door!',
      },
    ];
  }

  nearHideSpot(p) {
    return this.hideSpots.find((spot) => this.near(p, spot.front, 50)) ?? null;
  }

  hide(time, spot, p) {
    if (time < spot.readyAt) return;
    p.hidden = true;
    p.hideSpot = spot;
    p.hideUntil = time + CONFIG.hideMax * 1000;
    this.teleport(p, spot.front.x, spot.front.y);
    p.setVelocity(0, 0).setAlpha(0.25);
    p.stop();
    p.dust.emitting = false;
    this.floatText(p.x, p.y - 30, spot.room ? 'Zzz... (hiding)' : 'Shh... (hiding)', '#9bf6ff');
  }

  unhide(time, kickedOut, p) {
    const spot = p.hideSpot;
    p.hidden = false;
    spot.readyAt = time + CONFIG.hideReentry * 1000;
    this.teleport(p, spot.stand.x, spot.stand.y);
    p.setAlpha(1);
    if (kickedOut) this.floatText(p.x, p.y - 30, spot.kickMsg, '#ffffff', 12);
  }

  // ---------- Scoring & feedback ----------

  onKnock(door) {
    const now = this.now;
    this.combo = now - this.lastKnockAt < CONFIG.comboWindow * 1000 ? Math.min(this.combo + 1, 5) : 1;
    this.lastKnockAt = now;
    this.knocks++;
    const pts = CONFIG.knockPoints * this.combo;
    this.addScore(pts, this.combo > 1 ? `x${this.combo} COMBO!` : null, door.front.x, door.front.y - 45);
  }

  addScore(pts, msg, x = this.player.x, y = this.player.y - 40) {
    this.score += pts;
    sfx.point();
    this.floatText(x, y, `+${pts}${msg ? `  ${msg}` : ''}`, '#80ffdb', 14);
  }

  floatText(x, y, text, color = '#ffffff', size = 14) {
    const t = this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000', strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1400, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
  }

  // Banner for everyone (in co-op the friend can get different text).
  banner(text, color = '#ffffff', friendText = text) {
    this.game.events.emit('banner', text, color);
    this.netEvent({ k: 'banner', text: friendText, color });
  }

  // Banner about one player: "you" for them, "Friend:" for the other.
  bannerFor(p, text, color) {
    if (!this.hostNet) return this.banner(text, color);
    if (p.local) return this.banner(text, color, `Friend: ${text}`);
    return this.banner(`Friend: ${text}`, color, text);
  }

  // Returns true if the player actually lost a life. Lives are shared in co-op.
  hurt(reason, p = this.player) {
    if (this.over || this.now < p.invulnUntil) return false;
    this.lives--;
    p.invulnUntil = this.now + 2000;
    this.bossFight?.dropPhotos(p);
    sfx.hurt();
    this.fxHurt(p);
    this.bannerFor(p, reason, '#ff6b6b');
    if (this.lives <= 0) this.gameOver();
    return true;
  }

  // ---------- Ragging ----------

  startRagging(senior, p) {
    if (this.over || p.frozen || this.inRagging) return;
    p.setVelocity(0, 0);
    if (!this.hostNet) {
      // Solo: pause the whole game while you do the task
      this.inRagging = true;
      this.scene.pause();
      this.scene.pause('UI');
      this.scene.launch('Ragging', {
        night: this.night,
        onDone: (success) => {
          this.scene.resume();
          this.scene.resume('UI');
          this.input.keyboard.resetKeys();
          input.reset();
          this.inRagging = false;
          this.finishRagging(p, success);
        },
      });
      return;
    }
    // Co-op: the game keeps running. The caught player is frozen with the senior while
    // they do the task on their own device.
    p.frozen = true;
    senior.holding = p;
    this.bannerFor(p, '😈 A senior caught you! Finish the task!', '#ff8fa3');
    if (p.local) {
      this.scene.launch('Ragging', { night: this.night, overlay: true, onDone: (ok) => this.finishRagging(p, ok) });
    } else {
      this.hostNet.send({ t: 'rag', night: this.night });
    }
  }

  finishRagging(p, success) {
    if (!p.active || !p.frozen && this.hostNet) return;
    p.frozen = false;
    const now = this.now;
    // Senior break: every senior leaves you alone for a while, so two seniors can't chain-rag you.
    p.seniorBreakUntil = now + CONFIG.seniorBreak * 1000;
    for (const s of this.seniors) if (!s.holding || s.holding === p) s.letGo(now);
    if (success) {
      p.invulnUntil = now + 1500;
      this.addScore(30, 'Survived the senior!', p.x, p.y - 40);
    } else {
      this.hurt('Ragged by a senior! You lost a life.', p);
    }
  }

  // ---------- HUD data (the UI scene draws this; in co-op the friend gets theirs over the network) ----------

  hudFor(p) {
    const time = this.now;
    const status = [];
    if (this.bossFight) {
      for (const bk of this.bossFight.bikes) {
        const done = bk.state === 'suspended' || bk.state === 'gone';
        const carried = this.bossFight.teamCarried(bk);
        const boxes = '■'.repeat(Math.min(bk.proof, bk.need)) + '▣'.repeat(Math.max(0, Math.min(carried, bk.need - bk.proof)))
          + '□'.repeat(Math.max(0, bk.need - bk.proof - carried));
        status.push(done ? `${bk.name}  ✅ SUSPENDED` : `${bk.name}  ${boxes}`);
      }
      status.push(`📸 Photos in your phone: ${this.bossFight.photosOf(p)}`);
      if (this.bossFight.rage) status.push(`😡 ${CONFIG.bossName} IS FURIOUS`);
    }
    if (this.raid.active) {
      status.push(`🚨 WARDEN CHECK ${Math.ceil(this.raid.timeLeft)}s`);
      status.push(this.raid.state === 'inRoom' ? `Get ${CONFIG.guestName} out of room ${CONFIG.myRoom}` : `Take ${CONFIG.guestName} to the MAIN GATE`);
    }
    if (this.gang.active) {
      if (this.gang.police) status.push(`🚓 Police arriving: ${Math.max(0, Math.ceil(this.gang.police.left))}s`);
      else status.push('💣 GANG ATTACK: call police or rebel!');
      if (this.gang.rebels.length) status.push(`✊ Rebels: ${this.gang.rebels.length}/${CONFIG.rebellion.need}`);
    }
    if (this.water.cut) status.push(`🚱 WATER CUT ${Math.ceil(this.water.timeLeft)}s`);
    const breakLeft = Math.ceil((p.seniorBreakUntil - time) / 1000);
    if (breakLeft > 0 && this.seniors.length) status.push(`😇 Seniors off your back: ${breakLeft}s`);
    if (p.freshness < 30 && !this.water.cut && !this.bossNight) status.push('Freshness low! Go to the bathroom');
    if (this.hostNet && this.players[1]) {
      const friend = p.local ? this.players[1] : this.players[0];
      if (friend.frozen) status.push('😈 Your friend is stuck with a senior!');
    }
    return {
      night: this.night, era: this.era, bossNight: this.bossNight, score: this.score, lives: this.lives,
      mode: this.mode, maxLives: this.modeCfg.lives,
      timeLeft: this.timeLeft, combo: this.combo, fresh: p.freshness, hint: p.hint, hidden: p.hidden,
      frozen: p.frozen, status,
    };
  }

  hud() {
    return this.mirror ? this.mirror.hud : this.hudFor(this.player);
  }

  // ---------- End of night (the host moves both devices to the next screen) ----------

  leave(key, data) {
    this.scene.stop('UI');
    this.scene.stop('Ragging');
    gotoScene(this, key, data);
  }

  nightComplete() {
    this.over = true;
    this.physics.pause();
    const bonus = 100 * this.night;
    this.score += bonus;
    sfx.win();
    this.banner(`☀️ MORNING! You survived Night ${this.night}!  +${bonus}`, '#ffe066');
    this.cameras.main.flash(800, 255, 240, 200);
    this.time.delayedCall(2500, () => this.leave('NightIntro', {
      night: this.night + 1,
      score: this.score,
      lives: Math.min(this.lives + 1, this.modeCfg.lives),
      knocks: this.knocks,
      mode: this.mode,
    }));
  }

  victory() {
    if (this.over) return;
    this.over = true;
    this.physics.pause();
    sfx.win();
    this.cameras.main.flash(1000, 255, 240, 200);
    this.time.delayedCall(1200, () => this.leave('Victory', { score: this.score, knocks: this.knocks, lives: this.lives, mode: this.mode }));
  }

  gameOver() {
    this.over = true;
    this.physics.pause();
    sfx.fail();
    this.time.delayedCall(1600, () => this.leave('GameOver', { score: this.score, night: this.night, knocks: this.knocks, mode: this.mode }));
  }
}
