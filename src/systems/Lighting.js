import Phaser from 'phaser';
import { TILE } from '../map.js';

// Night-time darkness. Every frame the screen is filled with a dark layer, then
// soft "holes" are erased where there is light: the player, corridor tube lights,
// the warden's torch, the bathroom, the bell, explosions...
export class Lighting {
  constructor(scene) {
    this.scene = scene;
    const cam = scene.cameras.main;
    // Nights get a little darker as the game goes on.
    this.darkness = Math.min(0.6 + scene.night * 0.03, 0.75);
    this.rt = scene.add.renderTexture(0, 0, cam.width, cam.height).setOrigin(0).setScrollFactor(0).setDepth(15);
    this.light = scene.make.image({ key: 'light', add: false });
    this.cone = scene.make.image({ key: 'cone', add: false }).setOrigin(0, 0.5);
    this.flashes = [];

    // Tube lights along both corridors, some of them flicker (classic hostel).
    this.lamps = [];
    for (let c = 14; c < 38; c += 5) {
      for (const r of [7, 17]) this.lamps.push({ x: c * TILE, y: r * TILE, r: 95, flicker: Math.random() < 0.3 });
    }
    this.lamps.push({ x: 38 * TILE, y: 12 * TILE, r: 150 }); // bathroom
    this.lamps.push({ x: 12 * TILE, y: 12 * TILE, r: 120 }); // lobby
    this.lamps.push({ x: 6 * TILE, y: 12.5 * TILE, r: 140 }); // gate lamp
    this.lamps.push({ x: 7 * TILE, y: 4 * TILE, r: 90 });
    this.lamps.push({ x: 7 * TILE, y: 21 * TILE, r: 90 });

    // Glow sprites so the lamps look like actual lights, not just brighter floor.
    for (const l of this.lamps) {
      l.glow = scene.add.image(l.x, l.y, 'light').setScale(0.22).setTint(0xfff1c1).setAlpha(0.35).setBlendMode('ADD').setDepth(14);
    }
  }

  flash(x, y, r, duration) {
    this.flashes.push({ x, y, r, start: this.scene.time.now, duration });
  }

  update(time) {
    const s = this.scene;
    const cam = s.cameras.main;
    const ox = cam.scrollX;
    const oy = cam.scrollY;
    const view = new Phaser.Geom.Rectangle(ox - 200, oy - 200, cam.width + 400, cam.height + 400);

    this.rt.clear();
    this.rt.fill(0x070818, this.darkness);

    const erase = (x, y, r, alpha = 1) => {
      if (!view.contains(x, y)) return;
      this.light.setScale((r * 2) / 256).setAlpha(alpha);
      this.rt.erase(this.light, x - ox, y - oy);
    };

    for (const l of this.lamps) {
      let a = 0.75;
      if (l.flicker) {
        const f = Math.sin(time / 90 + l.x) + Math.sin(time / 37 + l.y);
        a = f > 1.6 ? 0.1 : 0.75;
      }
      l.glow.setAlpha(a * 0.4);
      erase(l.x, l.y, l.r, a);
    }

    erase(s.player.x, s.player.y, 120, 0.9);

    // Warden torch
    const w = s.warden;
    if (w?.active) {
      const range = w.stats.range;
      this.cone.setRotation(w.facing).setScale((range * 1.15) / 256).setAlpha(1);
      this.rt.erase(this.cone, w.x - ox, w.y - oy);
      erase(w.x, w.y, 40, 0.6);
    }

    if (s.water.bucket) erase(s.water.bucket.x, s.water.bucket.y, 60 + Math.sin(time / 150) * 10, 0.9);
    if (s.gang.active) erase(s.map.bell.x, s.map.bell.y, 70 + Math.sin(time / 100) * 15, 1);
    if (s.raid.guest) erase(s.raid.guest.x, s.raid.guest.y, 50, 0.6);

    this.flashes = this.flashes.filter((f) => {
      const t = (time - f.start) / f.duration;
      if (t >= 1) return false;
      erase(f.x, f.y, f.r * (0.6 + t * 0.6), 1 - t);
      return true;
    });
  }
}
