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

// One night in the hostel.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.night = data.night ?? 1;
    this.score = data.score ?? 0;
    this.lives = data.lives ?? CONFIG.lives;
    this.knocks = data.knocks ?? 0;
    this.era = this.night <= CONFIG.oldDaysNights ? 'old' : 'security';
    this.bossNight = this.night === CONFIG.bossNight;
  }

  create() {
    this.map = buildMap(CONFIG.myRoom);
    this.drawMap();
    const walls = this.buildWalls();
    this.physics.world.setBounds(0, 0, COLS * TILE, ROWS * TILE);

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

    // Player starts in front of their own room
    this.player = this.physics.add.sprite(this.myDoor.frontTile.x, this.myDoor.frontTile.y, 'player').setDepth(6);
    this.player.body.setCircle(13, 9, 9);
    this.dust = this.add.particles(0, 0, 'dust', {
      follow: this.player, frequency: 70, lifespan: 450, speed: { min: 5, max: 25 },
      scale: { start: 0.7, end: 0.1 }, alpha: { start: 0.35, end: 0 }, emitting: false,
    }).setDepth(4);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, walls);
    this.youLabel = this.add.text(0, 0, 'YOU', {
      fontFamily: FONT, fontSize: '12px', color: '#9bf6ff', backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(16);

    this.cameras.main.setBounds(0, 0, COLS * TILE, ROWS * TILE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.fadeIn(400);

    // Characters
    const lobby = tileCenter(11, 12);
    this.warden = new Warden(this, lobby.x, lobby.y);
    this.seniors = [];
    let seniorCount = this.era === 'old' ? Math.min(1 + Math.floor(this.night / 2), 3) : (Math.random() < 0.4 ? 1 : 0);
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
    if (this.era === 'security' && !this.bossNight) {
      const g = tileCenter(6, 14);
      this.guard = this.add.image(g.x, g.y, 'guard').setDepth(5);
      this.add.text(g.x, g.y - 26, 'SECURITY', {
        fontFamily: FONT, fontSize: '12px', color: '#dee2e6', backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(16);
    }

    // Systems
    this.gang = new GangSystem(this);
    this.water = new WaterSystem(this);
    this.raid = new RaidSystem(this);
    this.director = new EventDirector(this);
    this.lighting = new Lighting(this);
    this.bossFight = this.bossNight ? new BossFight(this) : null;

    // State
    this.timeLeft = CONFIG.nightLength;
    this.combo = 1;
    this.lastKnockAt = -99999;
    this.invulnUntil = 0;
    this.hidden = false;
    this.canHideAt = 0;
    this.inRagging = false;
    this.over = false;
    this.hint = '';

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E');
    this.input.keyboard.on('keydown-M', () => this.banner(sfx.toggleMute() ? '🔇 Sound off' : '🔊 Sound on'));
    input.reset();

    this.scene.launch('UI');
    if (this.bossNight) {
      this.time.delayedCall(600, () => this.banner(`🏍️ BOSS NIGHT! ${CONFIG.bossName}'s gang is here on 3 bikes!`, '#ff6b6b'));
      this.time.delayedCall(3800, () => this.banner('📸 Photograph them when they stop, then file complaints at the ANTI-RAGGING CELL!', '#80ffdb'));
    } else {
      this.time.delayedCall(600, () => this.banner(`NIGHT ${this.night} - Knock on doors and RUN! Survive till morning.`, '#ffe066'));
    }
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

    // Trees outside + in the courtyard corners
    for (const [x, y] of [[0, 60], [0, 330], [0, 700], [100, 900], [210, 40], [360, 890]]) ctx.drawImage(img('tree'), x, y);

    tex.refresh();
    this.add.image(0, 0, 'mapbg').setOrigin(0).setDepth(0);

    this.add.image(this.map.bell.x, this.map.bell.y, 'bell').setDepth(2);

    const label = (x, y, text, color = '#e0e0e0', size = 14) => this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setDepth(16).setAlpha(0.9);
    label(3 * TILE - 10, 12.5 * TILE, 'MAIN\nGATE', '#cccccc', 13);
    label(this.map.bell.x + 34, this.map.bell.y - 28, 'ALARM BELL', '#f4d35e', 12);
    label(8 * TILE, 12.5 * TILE, 'COURTYARD', '#b7e4c7');
    label(38 * TILE, 9 * TILE, 'BATH\nROOM', '#caf0f8', 13);
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
    if (this.over) return;
    const dt = delta / 1000;

    if (!this.bossNight) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.nightComplete();
        return;
      }
    }

    this.updatePlayer(time);
    for (const d of this.doors) d.update(time);
    this.warden.update(time);
    for (const s of this.seniors) s.update(time);
    this.gang.update(dt);
    this.raid.update(dt);
    if (this.bossFight) {
      this.bossFight.update(time, dt);
    } else {
      this.water.update(dt, time);
      this.director.update(dt);
    }
    this.lighting.update(time);

    if (time - this.lastKnockAt > CONFIG.comboWindow * 1000) this.combo = 1;
    this.youLabel.setPosition(this.player.x, this.player.y - 26);
  }

  updatePlayer(time) {
    const k = this.keys;
    let vx = input.x;
    let vy = input.y;
    if (k.A.isDown || k.LEFT.isDown) vx = -1;
    if (k.D.isDown || k.RIGHT.isDown) vx = 1;
    if (k.W.isDown || k.UP.isDown) vy = -1;
    if (k.S.isDown || k.DOWN.isDown) vy = 1;
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }

    const action = Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.E) || input.consumeAction();

    if (this.hidden) {
      this.player.setVelocity(0, 0);
      if (len > 0.3 || action || time > this.hideUntil) this.unhide(time, time > this.hideUntil);
      return;
    }

    this.player.setVelocity(vx * CONFIG.playerSpeed, vy * CONFIG.playerSpeed);
    const moving = len > 0.1;
    if (moving) {
      this.player.setRotation(Phaser.Math.Angle.RotateTo(this.player.rotation, Math.atan2(vy, vx), 0.25));
      if (!this.player.anims.isPlaying) this.player.play('player-walk');
    } else if (this.player.anims.isPlaying) {
      this.player.stop();
      this.player.setTexture('player');
    }
    this.dust.emitting = moving;
    this.updateHint();
    if (action) this.handleAction(time);
  }

  near(pt, dist) {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, pt.x, pt.y) < dist;
  }

  nearestDoor() {
    let best = null;
    let bestD = 50;
    for (const d of this.doors) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.front.x, d.front.y);
      if (dist < bestD) { best = d; bestD = dist; }
    }
    return best;
  }

  updateHint() {
    const bossHint = this.bossFight?.hint();
    if (bossHint) {
      this.hint = bossHint;
      return;
    }
    const door = this.nearestDoor();
    if (this.near(this.map.bell, 60)) this.hint = 'Ring the alarm bell';
    else if (this.near(this.myDoor.front, 50)) {
      this.hint = this.raid.state === 'inRoom' && this.raid.active ? `Get ${CONFIG.guestName} out!` : 'Hide in your room';
    } else if (door) this.hint = door.state === 'idle' ? `Knock on room ${door.roomNo}` : '';
    else if (this.water.nearTap()) this.hint = this.water.cut ? 'No water! 😩' : 'Freshening up...';
    else this.hint = '';
  }

  handleAction(time) {
    if (this.bossFight?.action(time)) return;
    if (this.near(this.map.bell, 60)) {
      this.gang.ringBell();
      return;
    }
    if (this.near(this.myDoor.front, 50)) {
      if (this.raid.active && this.raid.state === 'inRoom') this.raid.releaseGuest();
      else this.hide(time);
      return;
    }
    this.nearestDoor()?.knock(time);
  }

  // ---------- Hiding ----------

  hide(time) {
    if (time < this.canHideAt) {
      this.floatText(this.player.x, this.player.y - 30, 'Roommate locked the door!', '#aaaaaa', 12);
      return;
    }
    this.hidden = true;
    this.hideUntil = time + CONFIG.hideMax * 1000;
    this.player.setPosition(this.myDoor.front.x, this.myDoor.front.y).setAlpha(0.25);
    this.player.stop();
    this.dust.emitting = false;
    this.floatText(this.player.x, this.player.y - 30, 'Zzz... (hiding)', '#9bf6ff');
    this.hint = 'Hiding... move to come out';
  }

  unhide(time, kickedOut) {
    this.hidden = false;
    this.canHideAt = time + CONFIG.hideCooldown * 1000;
    this.player.setPosition(this.myDoor.frontTile.x, this.myDoor.frontTile.y).setAlpha(1);
    if (kickedOut) this.floatText(this.player.x, this.player.y - 30, 'Roommate: "Get out, I\'m sleeping!"', '#ffffff', 12);
  }

  // ---------- Scoring & feedback ----------

  onKnock(door) {
    const now = this.time.now;
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

  banner(text, color = '#ffffff') {
    this.game.events.emit('banner', text, color);
  }

  // Returns true if the player actually lost a life.
  hurt(reason) {
    if (this.over || this.time.now < this.invulnUntil) return false;
    this.lives--;
    this.invulnUntil = this.time.now + 2000;
    this.bossFight?.dropPhotos();
    sfx.hurt();
    this.cameras.main.shake(200, 0.01);
    this.cameras.main.flash(200, 255, 60, 60);
    this.banner(reason, '#ff6b6b');
    this.tweens.add({ targets: this.player, alpha: 0.2, duration: 120, yoyo: true, repeat: 7, onComplete: () => this.player.setAlpha(1) });
    if (this.lives <= 0) this.gameOver();
    return true;
  }

  // ---------- Ragging ----------

  startRagging(senior) {
    if (this.inRagging || this.over) return;
    this.inRagging = true;
    this.player.setVelocity(0, 0);
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
        const now = this.time.now;
        senior.letGo(now);
        if (success) {
          this.invulnUntil = now + 1500;
          this.addScore(30, 'Survived the senior!');
        } else {
          this.hurt('Ragged by a senior! You lost a life.');
        }
      },
    });
  }

  // ---------- End of night ----------

  nightComplete() {
    this.over = true;
    this.physics.pause();
    const bonus = 100 * this.night;
    this.score += bonus;
    sfx.win();
    this.banner(`☀️ MORNING! You survived Night ${this.night}!  +${bonus}`, '#ffe066');
    this.cameras.main.flash(800, 255, 240, 200);
    this.time.delayedCall(2500, () => {
      this.scene.stop('UI');
      this.scene.start('NightIntro', {
        night: this.night + 1,
        score: this.score,
        lives: Math.min(this.lives + 1, CONFIG.lives),
        knocks: this.knocks,
      });
    });
  }

  victory() {
    if (this.over) return;
    this.over = true;
    this.physics.pause();
    sfx.win();
    this.cameras.main.flash(1000, 255, 240, 200);
    this.time.delayedCall(1200, () => {
      this.scene.stop('UI');
      this.scene.start('Victory', { score: this.score, knocks: this.knocks, lives: this.lives });
    });
  }

  gameOver() {
    this.over = true;
    this.physics.pause();
    sfx.fail();
    this.time.delayedCall(1600, () => {
      this.scene.stop('UI');
      this.scene.start('GameOver', { score: this.score, night: this.night, knocks: this.knocks });
    });
  }
}
