import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { T, tileCenter, randomWalkableTile } from '../map.js';
import { sfx } from '../sfx.js';

// Freshness slowly drains. Refill it at the bathroom taps.
// During a WATER CUT the taps are dry, so you have to find the water bucket somewhere in the hostel.
export class WaterSystem {
  constructor(scene) {
    this.scene = scene;
    this.freshness = 100;
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

  nearTap() {
    const { player, map } = this.scene;
    return Phaser.Math.Distance.Between(player.x, player.y, map.tap.x, map.tap.y) < 70;
  }

  update(dt, time) {
    const s = this.scene;
    this.freshness -= CONFIG.freshDrain * (1 + 0.05 * (s.night - 1)) * dt;

    if (this.nearTap() && !this.cut) {
      this.freshness = Math.min(100, this.freshness + 45 * dt);
      if (time > this.splashAt) {
        sfx.splash();
        this.splashAt = time + 600;
      }
    }

    if (this.cut) {
      this.timeLeft -= dt;
      if (this.bucketIn > 0) {
        this.bucketIn -= dt;
        if (this.bucketIn <= 0) this.spawnBucket();
      }
      if (this.bucket && Phaser.Math.Distance.Between(s.player.x, s.player.y, this.bucket.x, this.bucket.y) < 30) {
        this.freshness = Math.min(100, this.freshness + 60);
        sfx.splash();
        s.addScore(20, 'Bucket bath! Refreshed!', this.bucket.x, this.bucket.y - 20);
        this.bucket.destroy();
        this.bucket = null;
      }
      if (this.timeLeft <= 0) {
        this.cut = false;
        this.bucket?.destroy();
        this.bucket = null;
        s.banner('💧 Water is back!', '#4cc9f0');
      }
    }

    if (this.freshness <= 0) {
      this.freshness = 60;
      s.hurt('🤢 You stink! Your roommate threw you out!');
    }
  }

  spawnBucket() {
    const s = this.scene;
    let t;
    let tries = 0;
    do {
      t = randomWalkableTile((c, r, type) => type === T.FLOOR || type === T.COURTYARD);
      tries++;
    } while (tries < 30 && Phaser.Math.Distance.Between(tileCenter(t.col, t.row).x, tileCenter(t.col, t.row).y, s.player.x, s.player.y) < 350);
    const c = tileCenter(t.col, t.row);
    this.bucket = s.add.image(c.x, c.y, 'bucket').setDepth(4);
    s.tweens.add({ targets: this.bucket, y: c.y - 6, duration: 400, yoyo: true, repeat: -1 });
    s.banner('🪣 Someone left a water bucket in the hostel. Grab it!', '#4cc9f0');
  }
}
