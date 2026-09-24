import Phaser from 'phaser';
import { CONFIG, FONT } from '../config.js';
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
    this.player.body.setCircle(13, 4, 4);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, walls);
    this.youLabel = this.add.text(0, 0, 'YOU', {
      fontFamily: FONT, fontSize: '11px', color: '#9bf6ff', backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(7);

    this.cameras.main.setBounds(0, 0, COLS * TILE, ROWS * TILE);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.fadeIn(400);

    // Characters
    const lobby = tileCenter(11, 12);
    this.warden = new Warden(this, lobby.x, lobby.y);
    this.seniors = [];
    const seniorCount = this.era === 'old' ? Math.min(1 + Math.floor(this.night / 2), 3) : (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < seniorCount; i++) {
      const t = randomWalkableTile((c) => c > 14 && Math.abs(c - this.myDoor.col) > 6);
      const c = tileCenter(t.col, t.row);
      this.seniors.push(new Senior(this, c.x, c.y));
    }
    if (this.era === 'security') {
      const g = tileCenter(6, 14);
      this.guard = this.add.image(g.x, g.y, 'guard').setDepth(5);
      this.add.text(g.x, g.y - 26, 'SECURITY', {
        fontFamily: FONT, fontSize: '11px', color: '#dee2e6', backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(7);
    }

    // Systems
    this.gang = new GangSystem(this);
    this.water = new WaterSystem(this);
    this.raid = new RaidSystem(this);
    this.director = new EventDirector(this);

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
    this.time.delayedCall(600, () => this.banner(`NIGHT ${this.night} - Knock on doors and RUN! Survive till morning.`, '#ffe066'));
  }

  // ---------- Map drawing ----------

  drawMap() {
    const g = this.add.graphics().setDepth(0);
    const grid = this.map.grid;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE;
        const y = r * TILE;
        const checker = (r + c) % 2 === 0;
        switch (grid[r][c]) {
          case T.OUTSIDE: g.fillStyle(checker ? 0x1b2618 : 0x1d2a1a); break;
          case T.COURTYARD: case T.BELL: g.fillStyle(checker ? 0x3a4a33 : 0x36452f); break;
          case T.FLOOR: g.fillStyle(checker ? 0x7a738d : 0x716a84); break;
          case T.BATH: g.fillStyle(checker ? 0x5b8ea6 : 0x52839a); break;
          case T.ROOM: case T.DOOR: case T.MYDOOR: g.fillStyle(0x3f3346); break;
          default: g.fillStyle(0x221d30);
        }
        g.fillRect(x, y, TILE, TILE);
      }
    }

    // Road outside
    g.fillStyle(0x2b2b2b); g.fillRect(20, 0, 110, ROWS * TILE);
    g.fillStyle(0xdddddd, 0.5);
    for (let y = 10; y < ROWS * TILE; y += 60) g.fillRect(72, y, 6, 30);

    // Rooms: outlines, beds and room numbers
    for (const [r0, r1] of ROOM_BLOCKS) {
      for (let i = 0; i < 8; i++) {
        const x = (13 + i * 3) * TILE;
        const y = r0 * TILE;
        const h = (r1 - r0 + 1) * TILE;
        g.lineStyle(3, 0x1a1522); g.strokeRect(x, y, 3 * TILE, h);
        g.fillStyle(0x5c4b6b); g.fillRect(x + 8, y + h / 2 - 14, 30, 28);   // bed
        g.fillStyle(0xe9ecef, 0.8); g.fillRect(x + 10, y + h / 2 - 10, 10, 20); // pillow
        g.fillStyle(0x6d597a); g.fillRect(x + 3 * TILE - 34, y + h / 2 - 10, 24, 20); // study table
      }
    }
    // Warden office blocks
    g.fillStyle(0x2f2a3d); g.fillRect(11 * TILE, TILE, 2 * TILE, 5 * TILE);
    g.fillRect(11 * TILE, 18 * TILE, 2 * TILE, 6 * TILE);

    // Doors
    for (const d of this.map.doors) {
      const x = d.col * TILE;
      const y = d.row * TILE;
      const down = d.frontRow > d.row;
      g.fillStyle(d.mine ? 0x2e86ab : 0x8b5a2b);
      g.fillRect(x + 4, down ? y + TILE - 10 : y, TILE - 8, 10);
      const label = d.mine ? `${d.roomNo}\nYOU` : `${d.roomNo}`;
      this.add.text(x + TILE / 2, down ? y + 10 : y + TILE - 10, label, {
        fontFamily: FONT, fontSize: '10px', color: d.mine ? '#9bf6ff' : '#d4c1a1', align: 'center',
      }).setOrigin(0.5).setDepth(1);
    }

    // Boundary wall + gate
    g.fillStyle(0x5a5a6e); g.fillRect(4 * TILE, 0, TILE, ROWS * TILE);
    g.fillStyle(0x221d30); g.fillRect(4 * TILE, 11 * TILE, TILE, 3 * TILE);
    g.lineStyle(3, 0x9d9d9d);
    for (let y = 11 * TILE + 6; y < 14 * TILE; y += 10) g.lineBetween(4 * TILE + 4, y, 5 * TILE - 4, y);

    // Alarm bell
    const b = this.map.bell;
    g.fillStyle(0x6c584c); g.fillRect(b.x - 3, b.y - 4, 6, 22);
    g.fillStyle(0xf4d35e); g.fillTriangle(b.x - 12, b.y + 4, b.x + 12, b.y + 4, b.x, b.y - 14);
    g.fillCircle(b.x, b.y + 5, 4);

    // Taps
    g.fillStyle(0xadb5bd);
    for (const r of [11, 12]) g.fillRect(39 * TILE - 12, r * TILE + 14, 16, 8);

    // Corridor lights for a night-time feel
    g.fillStyle(0xffe9a8, 0.05);
    for (let c = 14; c < 38; c += 5) for (const r of [7, 17]) g.fillCircle(c * TILE, r * TILE, 80);

    const label = (x, y, text, color = '#e0e0e0', size = 13) => this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1).setAlpha(0.85);
    label(3 * TILE, 12.5 * TILE, 'MAIN\nGATE', '#cccccc', 11);
    label(b.x + 30, b.y - 26, 'ALARM BELL', '#f4d35e', 11);
    label(8 * TILE, 12.5 * TILE, 'COURTYARD');
    label(38 * TILE, 9 * TILE, 'BATH\nROOM', '#caf0f8', 12);
    label(12 * TILE, 3.5 * TILE, 'WARDEN\nOFFICE', '#aaaaaa', 11);
    label(24.5 * TILE, 0.5 * TILE, CONFIG.hostelName.toUpperCase(), '#ffe066', 14);
    label(2 * TILE, 1 * TILE, 'OUTSIDE', '#777777', 11);
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

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.nightComplete();
      return;
    }

    this.updatePlayer(time);
    for (const d of this.doors) d.update(time);
    this.warden.update(time);
    for (const s of this.seniors) s.update(time);
    this.gang.update(dt);
    this.water.update(dt, time);
    this.raid.update(dt);
    this.director.update(dt);

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
    const door = this.nearestDoor();
    if (this.near(this.map.bell, 60)) this.hint = 'Ring the alarm bell';
    else if (this.near(this.myDoor.front, 50)) {
      this.hint = this.raid.state === 'inRoom' && this.raid.active ? `Get ${CONFIG.guestName} out!` : 'Hide in your room';
    } else if (door) this.hint = door.state === 'idle' ? `Knock on room ${door.roomNo}` : '';
    else if (this.water.nearTap()) this.hint = this.water.cut ? 'No water! 😩' : 'Freshening up...';
    else this.hint = '';
  }

  handleAction(time) {
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
