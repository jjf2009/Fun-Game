import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { tileCenter, randomWalkableTile } from '../map.js';
import { sfx } from '../sfx.js';

// Shared bomb code used by the outsider gang and by the Boss Night bikes.

// Picks where a bomb should land: near a player in range (random one in co-op), otherwise a random spot.
export function pickTarget(scene, spread = 50, maxX = 1100, maxCol = 27) {
  const inRange = scene.visiblePlayers().filter((p) => p.x < maxX);
  if (inRange.length) {
    const p = Phaser.Utils.Array.GetRandom(inRange);
    return { x: p.x + Phaser.Math.Between(-spread, spread), y: p.y + Phaser.Math.Between(-spread, spread) };
  }
  const t = randomWalkableTile((c) => c < maxCol);
  return tileCenter(t.col, t.row);
}

// Throws a bomb in an arc from (sx, sy) to (tx, ty). A red circle warns where it will land.
export function throwBomb(scene, sx, sy, tx, ty, flight = 1150, hurtMsg) {
  const shadow = scene.add.image(tx, ty, 'shadow').setScale(0.3).setAlpha(0.9).setDepth(16);
  scene.tweens.add({ targets: shadow, scale: 1, duration: flight });
  const bomb = scene.add.image(sx, sy, 'bomb').setDepth(17);
  scene.tweens.addCounter({
    from: 0, to: 1, duration: flight,
    onUpdate: (tw) => {
      const t = tw.getValue();
      bomb.setPosition(sx + (tx - sx) * t, sy + (ty - sy) * t - Math.sin(Math.PI * t) * 160);
      bomb.setAngle(t * 720);
    },
    onComplete: () => {
      bomb.destroy();
      shadow.destroy();
      explode(scene, tx, ty, hurtMsg);
    },
  });
}

export function explode(scene, x, y, hurtMsg = '💥 BOOM! Hit by the outsider gang!') {
  const s = scene;
  sfx.boom();
  s.shakeAll(180, 0.008);
  s.lighting.flash(x, y, 170, 450);
  s.netEvent({ k: 'boom', x, y });
  const flash = s.add.circle(x, y, CONFIG.bombRadius, 0xffd166, 0.8).setDepth(17).setBlendMode('ADD');
  s.tweens.add({ targets: flash, scale: 1.5, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
  explosionParticles(s, x, y);
  // scorch mark
  const scorch = s.add.circle(x, y, 18, 0x000000, 0.35).setDepth(1);
  s.tweens.add({ targets: scorch, alpha: 0, delay: 4000, duration: 2000, onComplete: () => scorch.destroy() });
  for (const p of s.visiblePlayers()) {
    if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < CONFIG.bombRadius) s.hurt(hurtMsg, p);
  }
}

// Fire + smoke (particles are not synced in co-op, so the friend's device calls this itself).
export function explosionParticles(s, x, y) {
  const fire = s.add.particles(x, y, 'spark', {
    speed: { min: 60, max: 260 }, lifespan: { min: 250, max: 600 }, scale: { start: 1.6, end: 0 },
    tint: [0xffd166, 0xff6b35, 0xffffff, 0xe63946], blendMode: 'ADD', emitting: false,
  }).setDepth(18);
  fire.explode(28);
  const smoke = s.add.particles(x, y, 'dust', {
    speed: { min: 10, max: 50 }, lifespan: 900, scale: { start: 1.5, end: 3 }, alpha: { start: 0.5, end: 0 },
    tint: 0x555555, emitting: false,
  }).setDepth(17);
  smoke.explode(10);
  s.time.delayedCall(1000, () => { fire.destroy(); smoke.destroy(); });
}
