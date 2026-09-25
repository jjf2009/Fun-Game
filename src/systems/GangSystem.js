import Phaser from 'phaser';
import { CONFIG, FONT } from '../config.js';
import { TILE } from '../map.js';
import { sfx } from '../sfx.js';
import { pickTarget, throwBomb } from './bombs.js';
import { Rebel } from '../objects/Rebel.js';

const POWS = ['POW!', 'BAM!', 'THWACK!', 'SPLASH!', 'SLIPPER!', 'BONK!'];

// The outsider gang stands outside the boundary wall and throws firecracker bombs into the hostel.
// A red circle shows where each bomb will land. Two ways to fight back:
//  1. CALL THE POLICE from the phone box by the gate. The jeep takes a few seconds to arrive.
//  2. REBELLION: knock on doors to wake students up. With enough rebels, lead them to the gate
//     and charge the outsiders together!
export class GangSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.members = [];
    this.rebels = [];
    this.police = null;
    this.jeep = null;
  }

  start() {
    const s = this.scene;
    const security = s.era === 'security';
    this.active = true;
    this.timeLeft = CONFIG.gangRaidDuration * (security ? 0.6 : 1);
    this.interval = Math.max(0.5, 1.2 - s.night * 0.08) * (security ? 1.4 : 1);
    this.throwTimer = 1.2;
    this.police = null;

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

    s.banner('💣 OUTSIDER GANG ATTACK! Call the POLICE from the gate phone, or wake rooms up for a REBELLION!', '#ff6b6b');
    if (security && s.guard) {
      s.time.delayedCall(1500, () => {
        sfx.whistle();
        s.floatText(s.guard.x, s.guard.y - 40, 'OYE! BHAAGO!', '#ffffff');
        s.banner('Special security is on it, the attack will be short.', '#adb5bd');
      });
    }
  }

  update(dt, time) {
    for (const r of this.rebels) r.update(time);
    if (this.jeep) this.jeepLights(time);
    if (!this.active) return;
    this.timeLeft -= dt;
    this.throwTimer -= dt;
    if (this.throwTimer <= 0) {
      this.throwBomb();
      this.throwTimer = this.interval;
    }
    if (this.police && !this.police.arrived) {
      this.police.left -= dt;
      if (this.police.left <= 0) this.policeArrive();
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

  // ---------- Police ----------

  phoneHint() {
    if (!this.active) return 'Police phone (only for emergencies!)';
    if (this.police) return this.police.arrived ? '' : `Police arriving in ${Math.ceil(this.police.left)}s...`;
    return '📞 CALL THE POLICE';
  }

  callPolice() {
    const s = this.scene;
    const { x, y } = s.map.phone;
    if (!this.active) {
      sfx.fail();
      s.score = Math.max(0, s.score - 20);
      s.floatText(x, y - 30, 'Police: "Stop prank calling!"  -20', '#aaaaaa', 14);
      return;
    }
    if (this.police) {
      s.floatText(x, y - 30, 'The police are already on the way!', '#aaaaaa', 13);
      return;
    }
    const delay = s.era === 'security' ? CONFIG.police.delaySecurity : CONFIG.police.delay;
    this.police = { left: delay, arrived: false };
    sfx.phone();
    s.floatText(x, y - 30, '"Hello, police? They\'re bombing our hostel!"', '#9bf6ff', 13);
    s.banner(`📞 Police called! They arrive in ${delay} seconds. Hold on!`, '#9bf6ff');
  }

  policeArrive() {
    const s = this.scene;
    this.police.arrived = true;
    const ys = this.members.map(({ m }) => m.y);
    const targetY = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 500;
    this.jeep?.destroy(); this.jeepRed?.destroy(); this.jeepBlue?.destroy();
    this.jeep = s.add.image(95, -60, 'police').setDepth(7).setRotation(Math.PI / 2).setScale(1.3);
    this.jeepRed = s.add.image(95, -60, 'light').setDepth(8).setScale(0.35).setTint(0xff2020).setBlendMode('ADD');
    this.jeepBlue = s.add.image(95, -60, 'light').setDepth(8).setScale(0.35).setTint(0x2060ff).setBlendMode('ADD');
    const jeep = this.jeep;
    sfx.siren();
    s.tweens.add({
      targets: jeep, y: targetY, duration: 1300, ease: 'Cubic.easeOut',
      onComplete: () => {
        s.floatText(jeep.x + 60, jeep.y - 40, 'POLICE! STOP RIGHT THERE!', '#9bf6ff', 16);
        if (this.active) {
          s.addScore(50, 'Police chased them away!', s.map.phone.x, s.map.phone.y - 40);
          this.end('🚓 The police chased the gang away!');
        }
        s.time.delayedCall(2500, () => {
          s.tweens.add({
            targets: jeep, y: 25 * TILE + 80, duration: 1500, ease: 'Cubic.easeIn',
            onComplete: () => {
              if (this.jeep !== jeep) return;
              jeep.destroy(); this.jeepRed.destroy(); this.jeepBlue.destroy();
              this.jeep = null;
            },
          });
        });
      },
    });
  }

  jeepLights(time) {
    const on = Math.floor(time / 180) % 2 === 0;
    this.jeepRed.setPosition(this.jeep.x - 6, this.jeep.y).setAlpha(on ? 1 : 0.15);
    this.jeepBlue.setPosition(this.jeep.x + 6, this.jeep.y).setAlpha(on ? 0.15 : 1);
  }

  // ---------- Rebellion ----------

  addRebel(door) {
    const s = this.scene;
    if (this.rebels.length >= CONFIG.rebellion.max) {
      s.floatText(door.front.x, door.front.y - 30, 'Enough people! Go to the gate!', '#06d6a0', 13);
      return;
    }
    this.rebels.push(new Rebel(s, door.frontTile.x, door.frontTile.y, this.rebels.length, s.rooms?.keyFor(door.roomNo)));
    s.addScore(10, null, door.front.x, door.front.y - 50);
    if (this.rebels.length === CONFIG.rebellion.need) s.banner('✊ Enough rebels! Lead them to the MAIN GATE and charge!', '#06d6a0');
  }

  nearGate(p) {
    const g = this.scene.map.gate;
    return Phaser.Math.Distance.Between(p.x, p.y, g.x, g.y) < 120;
  }

  rebellionHint(p) {
    if (!this.active || !this.rebels.length || !this.nearGate(p)) return null;
    const need = CONFIG.rebellion.need - this.rebels.length;
    return need <= 0 ? `✊ START THE REBELLION! (${this.rebels.length} rebels)` : `Need ${need} more rebel${need > 1 ? 's' : ''}! Knock on doors`;
  }

  // Returns true if the action was used for the rebellion.
  tryRebellion(p) {
    if (!this.active || !this.rebels.length || !this.nearGate(p)) return false;
    if (this.rebels.length < CONFIG.rebellion.need) {
      this.scene.floatText(p.x, p.y - 40, 'Not enough people yet! Knock on more doors', '#06d6a0', 13);
      return true;
    }
    this.rebellion();
    return true;
  }

  rebellion() {
    const s = this.scene;
    const rebels = this.rebels;
    const members = this.members;
    this.rebels = [];
    sfx.cheer();
    s.shakeAll(300, 0.01);
    s.banner('✊ REBELLION! The whole hostel charges out of the gate!', '#06d6a0');
    const bonus = 200 + 25 * rebels.length;
    rebels.forEach((r, i) => {
      const target = members.length ? members[i % members.length].m : { x: 90, y: r.y };
      s.time.delayedCall(i * 120, () => r.charge(target, () => {
        sfx.pow();
        s.floatText(target.x, target.y - 30, Phaser.Utils.Array.GetRandom(POWS), '#ffe066', 18);
        if (target.active) s.tweens.add({ targets: target, angle: 360, duration: 400 });
      }));
    });
    s.time.delayedCall(1300, () => {
      s.addScore(bonus, 'HOSTEL UNITY!', s.map.gate.x + 80, s.map.gate.y - 40);
      if (this.active) this.end('The outsiders ran for their lives! ✊ Hostel unity!');
      s.time.delayedCall(1200, () => rebels.forEach((r) => r.goHome()));
    });
  }

  end(msg) {
    const s = this.scene;
    this.active = false;
    for (const { m, label } of this.members) {
      s.tweens.add({ targets: [m, label], x: -60, duration: 800, onComplete: () => { m.destroy(); label.destroy(); } });
    }
    this.members = [];
    // Rebels who didn't get to charge go back to bed
    for (const r of this.rebels) r.goHome();
    this.rebels = [];
    if (this.police && !this.police.arrived) this.police = null;
    s.banner(msg, '#95d5b2');
  }
}
