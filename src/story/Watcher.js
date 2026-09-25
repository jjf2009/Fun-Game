import Phaser from 'phaser';
import { Npc } from '../objects/Npc.js';
import { FONT } from '../config.js';
import { tileCenter, hasLineOfSight } from '../map.js';
import { sfx } from '../sfx.js';

const HALF = Phaser.Math.DegToRad(32);
const RANGE = 175;

// STORY: a senior ragging a junior. He watches the junior, but his sight cone sweeps around.
// If he spots you he chases you; afterwards he walks back and carries on.
// (Lives in scene.seniors, so the normal ragging / senior-break code works with him too.)
export class Watcher extends Npc {
  constructor(scene, cfg) {
    const home = tileCenter(cfg.tile[0], cfg.tile[1]);
    super(scene, home.x, home.y, 'senior', 'SENIOR', '#ff8fa3');
    this.cfg = cfg;
    this.home = home;
    this.state = 'watch';
    this.cooldownUntil = 0;
    this.photographed = false;

    // The junior being ragged, a little to the side
    this.juniorPos = { x: home.x + 46, y: home.y + (cfg.tile[1] % 2 === 0 ? 20 : -20) };
    this.baseFace = Math.atan2(this.juniorPos.y - home.y, this.juniorPos.x - home.x);
    this.facing = this.baseFace;
    this.junior = scene.add.image(this.juniorPos.x, this.juniorPos.y, cfg.junior).setDepth(5).setRotation(this.baseFace + Math.PI);
    this.juniorLabel = scene.add.text(this.juniorPos.x, this.juniorPos.y + 26, 'JUNIOR', {
      fontFamily: FONT, fontSize: '11px', color: '#caf0f8', backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(16);
    if (cfg.task === 'pushups') {
      scene.tweens.add({ targets: this.junior, scaleX: 0.8, duration: 350, yoyo: true, repeat: -1 });
    } else {
      this.noteTimer = scene.time.addEvent({
        delay: 700, loop: true,
        callback: () => scene.floatText(this.juniorPos.x + 10, this.juniorPos.y - 20, '♪', '#ffd166', 16),
      });
    }
    this.shoutTimer = scene.time.addEvent({
      delay: 3000, loop: true,
      callback: () => { if (this.state === 'watch') scene.floatText(this.x, this.y - 40, Phaser.Utils.Array.GetRandom(cfg.shout), '#ff8fa3', 13); },
    });
    this.lamp = scene.lighting.addLight(home.x + 20, home.y, 110, 0.8, 0xfff1c1); // they rag under a tube light
    this.cone = scene.add.graphics().setDepth(16);
  }

  canSee(p) {
    const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
    if (d > RANGE) return false;
    const diff = Phaser.Math.Angle.Wrap(Math.atan2(p.y - this.y, p.x - this.x) - this.facing);
    if (Math.abs(diff) > HALF && d > 36) return false;
    return hasLineOfSight(this.x, this.y, p.x, p.y);
  }

  // A camera flash nearby makes him look round
  noticeFlash(p) {
    if (this.state === 'watch' && this.distTo(p) < 120) this.facing = Math.atan2(p.y - this.y, p.x - this.x);
  }

  update(time) {
    const s = this.scene;
    if (this.holding) {
      if (this.holding.frozen) { this.setVelocity(0, 0); return; }
      this.holding = null;
    }
    const targets = s.visiblePlayers().filter((pl) => time > pl.seniorBreakUntil && time > this.cooldownUntil);
    const seen = targets.find((pl) => this.canSee(pl));

    if (this.state === 'watch') {
      this.setVelocity(0, 0);
      // Look at the junior most of the time, sometimes sweep around
      this.facing = this.baseFace + Math.sin(time / 1300 + this.home.x) * 1.4;
      if (seen) {
        this.state = 'chase';
        this.target = seen;
        this.lastSeen = time;
        sfx.whistle();
        s.floatText(this.x, this.y - 44, 'OYE! WHO\'S THERE?!', '#ff6b6b', 15);
      }
    } else if (this.state === 'chase') {
      const p = this.target;
      if (seen === p) this.lastSeen = time;
      if (!p?.active || !targets.includes(p) || time - this.lastSeen > 2500) {
        this.goBack();
      } else {
        this.chase(p, 150, time);
        if (this.distTo(p) < 26 && time > p.invulnUntil) s.startRagging(this, p);
      }
    } else if (this.state === 'return' && this.moveAlong(90)) {
      this.state = 'watch';
    }
    this.drawCone();
  }

  goBack() {
    this.state = 'return';
    this.setPathTo(this.home.x, this.home.y);
  }

  letGo(time) {
    this.holding = null;
    this.cooldownUntil = time + 6000;
    this.goBack();
  }

  drawCone() {
    const g = this.cone;
    g.clear();
    if (this.state === 'return') return;
    const chasing = this.state === 'chase';
    g.fillStyle(chasing ? 0xff3333 : 0xff8fa3, chasing ? 0.22 : 0.14);
    g.slice(this.x, this.y, RANGE, this.facing - HALF, this.facing + HALF, false);
    g.fillPath();
  }

  destroy(fromScene) {
    this.cone?.destroy();
    this.junior?.destroy();
    this.juniorLabel?.destroy();
    this.noteTimer?.remove();
    this.shoutTimer?.remove();
    super.destroy(fromScene);
  }
}
