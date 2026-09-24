import Phaser from 'phaser';
import { CONFIG, FONT } from '../config.js';
import { TILE, tileCenter, randomWalkableTile } from '../map.js';
import { sfx } from '../sfx.js';

// The outsider gang stands outside the boundary wall and throws firecracker bombs into the hostel.
// A red circle shows where each bomb will land. Ring the alarm bell near the gate to chase them away.
export class GangSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.members = [];
  }

  start() {
    const s = this.scene;
    const security = s.era === 'security';
    this.active = true;
    this.timeLeft = CONFIG.gangRaidDuration * (security ? 0.6 : 1);
    this.interval = Math.max(0.5, 1.2 - s.night * 0.08) * (security ? 1.4 : 1);
    this.throwTimer = 1.2;

    const count = security ? 2 : Math.min(3 + Math.floor(s.night / 2), 5);
    for (let i = 0; i < count; i++) {
      const y = Phaser.Math.Between(3, 21) * TILE;
      const m = s.add.sprite(-40, y, 'gang').setDepth(5).play('gang-walk');
      const label = s.add.text(-40, y - 26, 'OUTSIDER', {
        fontFamily: FONT, fontSize: '12px', color: '#ff6b6b', backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(16);
      const x = Phaser.Math.Between(40, 130);
      s.tweens.add({ targets: m, x, duration: 700, onComplete: () => { m.stop(); m.setTexture('gang'); } });
      s.tweens.add({ targets: label, x, duration: 700 });
      this.members.push({ m, label });
    }

    s.banner('💣 OUTSIDER GANG ATTACK! Dodge the red circles. Ring the bell at the gate!', '#ff6b6b');
    if (security) {
      s.time.delayedCall(1500, () => {
        sfx.whistle();
        s.floatText(s.guard.x, s.guard.y - 40, 'OYE! BHAAGO!', '#ffffff');
        s.banner('Security guard is on it, the attack will be short.', '#adb5bd');
      });
    }
  }

  update(dt) {
    if (!this.active) return;
    this.timeLeft -= dt;
    this.throwTimer -= dt;
    if (this.throwTimer <= 0) {
      this.throwBomb();
      this.throwTimer = this.interval;
    }
    if (this.timeLeft <= 0) this.end('The gang ran away... for now.');
  }

  throwBomb() {
    const s = this.scene;
    const p = s.player;
    const { m } = Phaser.Utils.Array.GetRandom(this.members);
    let tx;
    let ty;
    if (p.x < 1100 && !s.hidden) {
      tx = p.x + Phaser.Math.Between(-50, 50);
      ty = p.y + Phaser.Math.Between(-50, 50);
    } else {
      const t = randomWalkableTile((c) => c < 27);
      ({ x: tx, y: ty } = tileCenter(t.col, t.row));
    }

    const flight = 1150;
    const shadow = s.add.image(tx, ty, 'shadow').setScale(0.3).setAlpha(0.9).setDepth(16);
    s.tweens.add({ targets: m, scale: 1.25, duration: 120, yoyo: true }); // throwing motion
    s.tweens.add({ targets: shadow, scale: 1, duration: flight });
    const bomb = s.add.image(m.x, m.y, 'bomb').setDepth(17);
    const sx = m.x;
    const sy = m.y;
    s.tweens.addCounter({
      from: 0, to: 1, duration: flight,
      onUpdate: (tw) => {
        const t = tw.getValue();
        bomb.setPosition(sx + (tx - sx) * t, sy + (ty - sy) * t - Math.sin(Math.PI * t) * 160);
        bomb.setAngle(t * 720);
      },
      onComplete: () => {
        bomb.destroy();
        shadow.destroy();
        this.explode(tx, ty);
      },
    });
  }

  explode(x, y) {
    const s = this.scene;
    sfx.boom();
    s.cameras.main.shake(180, 0.008);
    s.lighting.flash(x, y, 170, 450);
    const flash = s.add.circle(x, y, CONFIG.bombRadius, 0xffd166, 0.8).setDepth(17).setBlendMode('ADD');
    s.tweens.add({ targets: flash, scale: 1.5, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
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
    // scorch mark
    const scorch = s.add.circle(x, y, 18, 0x000000, 0.35).setDepth(1);
    s.tweens.add({ targets: scorch, alpha: 0, delay: 4000, duration: 2000, onComplete: () => scorch.destroy() });
    if (!s.hidden && Phaser.Math.Distance.Between(x, y, s.player.x, s.player.y) < CONFIG.bombRadius) {
      s.hurt('💥 BOOM! Hit by the outsider gang!');
    }
  }

  ringBell() {
    const s = this.scene;
    sfx.alarm();
    s.cameras.main.flash(150, 255, 220, 120);
    if (!this.active) {
      s.floatText(s.map.bell.x, s.map.bell.y - 30, 'False alarm... nobody here', '#aaaaaa');
      return;
    }
    s.addScore(50, 'ALARM! The gang ran away!', s.map.bell.x, s.map.bell.y - 30);
    this.end('You rang the alarm, the whole hostel came out!');
  }

  end(msg) {
    const s = this.scene;
    this.active = false;
    for (const { m, label } of this.members) {
      s.tweens.add({ targets: [m, label], x: -60, duration: 800, onComplete: () => { m.destroy(); label.destroy(); } });
    }
    this.members = [];
    s.banner(msg, '#95d5b2');
  }
}
