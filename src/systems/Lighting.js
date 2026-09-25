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

  // Small fixed light, e.g. a laptop or phone screen in a room. Returns it so it can be switched off (light.off = true).
  addLight(x, y, r, a, tint) {
    const glow = this.scene.add.image(x, y, 'light').setScale((r * 2) / 256 * 0.5).setTint(tint).setBlendMode('ADD').setDepth(14);
    glow.noNet = true;
    const light = { x, y, r, a, glow, glowAlpha: 0.6 };
    this.lamps.push(light);
    return light;
  }

  flash(x, y, r, duration) {
    this.flashes.push({ x, y, r, start: this.scene.game.loop.time, duration });
    this.scene.netEvent?.({ k: 'lf', x, y, r, duration }); // co-op: flash on the friend's screen too
  }

  // All moving lights, as plain data (so the host can send them to the friend's device):
  //   players: [[x, y, radius, alpha]], cone: {x, y, f, range} | null, points: [[x, y, radius, alpha]]
  static sourcesFrom(s, time) {
    const players = s.players.filter((p) => p.active).map((p) => [p.x, p.y, p.local ? 120 : 95, 0.9]);
    const w = s.warden;
    const cone = w?.active && !w.stationed ? { x: w.x, y: w.y, f: w.facing, range: w.stats.range, chase: w.state === 'chase' } : null;
    const points = [];
    if (w?.active) points.push([w.x, w.y, 40, 0.6]);
    if (s.bossFight) {
      points.push([s.bossFight.desk.x, s.bossFight.desk.y, 110, 0.9]);
      for (const bk of s.bossFight.bikes) {
        if (!bk.sprite) continue;
        const a = bk.sprite.rotation; // headlight in the direction of travel
        points.push([bk.sprite.x + Math.cos(a) * 60, bk.sprite.y + Math.sin(a) * 60, 70, 0.8]);
        points.push([bk.sprite.x, bk.sprite.y, 55, 0.7]);
      }
    }
    if (s.water.bucket) points.push([s.water.bucket.x, s.water.bucket.y, 60 + Math.sin(time / 150) * 10, 0.9]);
    if (s.gang.active) points.push([s.map.phone.x, s.map.phone.y, 70 + Math.sin(time / 100) * 15, 1]);
    if (s.gang.jeep) points.push([s.gang.jeep.x, s.gang.jeep.y, 110, 1]);
    if (s.raid.guest) points.push([s.raid.guest.x, s.raid.guest.y, 50, 0.6]);
    return { players, cone, points };
  }

  update(time, src) {
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
      if (l.off) { l.glow.setAlpha(0); continue; }
      let a = l.a ?? 0.75;
      if (l.flicker) {
        const f = Math.sin(time / 90 + l.x) + Math.sin(time / 37 + l.y);
        a = f > 1.6 ? 0.1 : a;
      }
      l.glow.setAlpha(a * (l.glowAlpha ?? 0.4));
      erase(l.x, l.y, l.r, a);
    }

    for (const [x, y, r, a] of src.players) erase(x, y, r, a);
    for (const [x, y, r, a] of src.points) erase(x, y, r, a);

    // Warden torch
    if (src.cone) {
      const c = src.cone;
      this.cone.setRotation(c.f).setScale((c.range * 1.15) / 256).setAlpha(1);
      this.rt.erase(this.cone, c.x - ox, c.y - oy);
    }

    this.flashes = this.flashes.filter((f) => {
      const t = (time - f.start) / f.duration;
      if (t >= 1) return false;
      erase(f.x, f.y, f.r * (0.6 + t * 0.6), 1 - t);
      return true;
    });
  }
}
