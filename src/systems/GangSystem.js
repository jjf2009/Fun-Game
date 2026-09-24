import Phaser from 'phaser';
import { CONFIG, FONT } from '../config.js';
import { TILE } from '../map.js';
import { sfx } from '../sfx.js';
import { pickTarget, throwBomb } from './bombs.js';

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
    const { m } = Phaser.Utils.Array.GetRandom(this.members);
    const { x, y } = pickTarget(s);
    s.tweens.add({ targets: m, scale: 1.25, duration: 120, yoyo: true }); // throwing motion
    throwBomb(s, m.x, m.y, x, y);
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
