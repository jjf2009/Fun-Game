import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { T, tileCenter, randomWalkableTile } from '../map.js';
import { sfx } from '../sfx.js';

// Freshness slowly drains. Refill it at the bathroom taps.
// During a WATER CUT the taps are dry, so you have to find the water bucket somewhere in the hostel.
export class WaterSystem {
  constructor(scene) {
    this.scene = scene;
    this.cut = false;
    this.bucket = null;
    this.splashAt = 0;
  }

  startCut() {
    this.cut = true;
    this.timeLeft = CONFIG.waterCutDuration;
    this.bucketIn = 4;
    this.scene.banner('🚱 WATER CUT! The taps are dry. Look for the water bucket!', '#4cc9f0');
  }

  nearTap(p) {
    const { tap } = this.scene.map;
    return Phaser.Math.Distance.Between(p.x, p.y, tap.x, tap.y) < 70;
  }

  // Each player has their own freshness (p.freshness).
  update(dt, time) {
    const s = this.scene;
    const drain = CONFIG.freshDrain * (1 + 0.05 * (s.night - 1)) * dt;
    for (const p of s.players) {
      if (!p.active) continue;
      p.freshness -= drain;
      if (this.nearTap(p) && !this.cut && !p.hidden) {
        p.freshness = Math.min(100, p.freshness + 45 * dt);
        if (time > this.splashAt) {
          sfx.splash();
          this.splashAt = time + 600;
        }
      }
      if (this.bucket && Phaser.Math.Distance.Between(p.x, p.y, this.bucket.x, this.bucket.y) < 30) {
        p.freshness = Math.min(100, p.freshness + 60);
        sfx.splash();
        s.addScore(20, 'Bucket bath! Refreshed!', this.bucket.x, this.bucket.y - 20);
        this.bucket.destroy();
        this.bucket = null;
      }
      if (p.freshness <= 0) {
        p.freshness = 60;
        s.hurt('🤢 You stink! Your roommate threw you out!', p);
      }
    }

    if (this.cut) {
      this.timeLeft -= dt;
      if (this.bucketIn > 0) {
        this.bucketIn -= dt;
        if (this.bucketIn <= 0) this.spawnBucket();
      }
      if (this.timeLeft <= 0) {
        this.cut = false;
        this.bucket?.destroy();
        this.bucket = null;
        s.banner('💧 Water is back!', '#4cc9f0');
      }
    }
  }

  spawnBucket() {
    const s = this.scene;
    let t;
    let tries = 0;
    do {
      t = randomWalkableTile((c, r, type) => type === T.FLOOR || type === T.COURTYARD);
      tries++;
    } while (tries < 30 && s.nearestPlayer(tileCenter(t.col, t.row).x, tileCenter(t.col, t.row).y, 350));
    const c = tileCenter(t.col, t.row);
    this.bucket = s.add.image(c.x, c.y, 'bucket').setDepth(4);
    s.tweens.add({ targets: this.bucket, y: c.y - 6, duration: 400, yoyo: true, repeat: -1 });
    s.banner('🪣 Someone left a water bucket in the hostel. Grab it!', '#4cc9f0');
  }
}
