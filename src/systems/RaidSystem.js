import Phaser from 'phaser';
import { CONFIG, FONT } from '../config.js';
import { sfx } from '../sfx.js';

// WARDEN CHECK: the warden is checking rooms for non-hostellers, and your friend is in your room!
// Go to your room, get your friend out, and sneak them to the main gate without the warden's flashlight seeing them.
export class RaidSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.used = false; // Bunty only sneaks in once per night
    this.guest = null;
  }

  start() {
    const s = this.scene;
    const duration = Math.min(CONFIG.raidDuration, s.timeLeft - 3);
    if (duration < 12 || this.used) return false;
    this.used = true;
    this.active = true;
    this.timeLeft = duration;
    this.state = 'inRoom';
    s.warden.setRaid(true);
    sfx.whistle();
    s.banner(`🚨 WARDEN CHECK! ${CONFIG.guestName} (a non-hosteller) is in your room. Sneak them out to the gate!`, '#ffd166');
    this.marker = s.add.text(s.myDoor.front.x, s.myDoor.front.y - 30, `${CONFIG.guestName} is inside!`, {
      fontFamily: FONT, fontSize: '13px', color: '#000', backgroundColor: '#ffd166', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(17);
    s.tweens.add({ targets: this.marker, y: this.marker.y - 8, duration: 350, yoyo: true, repeat: -1 });
    return true;
  }

  releaseGuest(p) {
    const s = this.scene;
    if (this.state !== 'inRoom') return;
    this.state = 'follow';
    this.leader = p; // Bunty follows whoever got him out
    this.marker.destroy();
    this.trail = [];
    this.guest = s.physics.add.sprite(s.myDoor.front.x, s.myDoor.front.y + (s.myDoor.frontTile.y > s.myDoor.front.y ? 10 : -10), 'guest').setDepth(5);
    this.label = s.add.text(this.guest.x, this.guest.y - 26, CONFIG.guestName.toUpperCase(), {
      fontFamily: FONT, fontSize: '12px', color: '#80ffdb', backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(16);
    sfx.point();
    s.floatText(this.guest.x, this.guest.y - 40, 'Bhai, get me out of here!', '#80ffdb');
  }

  update(dt) {
    if (!this.active) return;
    const s = this.scene;
    this.timeLeft -= dt;

    if (this.state === 'follow') {
      // The friend follows your footsteps (a trail of your past positions).
      const p = this.leader;
      const last = this.trail[this.trail.length - 1];
      if (!last || Phaser.Math.Distance.Between(last.x, last.y, p.x, p.y) > 4) this.trail.push({ x: p.x, y: p.y });
      if (this.trail.length > 60) this.trail.shift();
      const target = this.trail[Math.max(0, this.trail.length - 9)];
      const dx = target.x - this.guest.x;
      const dy = target.y - this.guest.y;
      const d = Math.hypot(dx, dy);
      if (d > 5) {
        this.guest.setVelocity((dx / d) * 200, (dy / d) * 200).setRotation(Math.atan2(dy, dx));
        if (!this.guest.anims.isPlaying) this.guest.play('guest-walk');
      } else {
        this.guest.setVelocity(0, 0).stop();
      }
      this.label.setPosition(this.guest.x, this.guest.y - 26);

      if (Phaser.Math.Distance.Between(this.guest.x, this.guest.y, s.map.gate.x, s.map.gate.y) < 80) {
        s.addScore(150, `${CONFIG.guestName} escaped! LEGEND!`, this.guest.x, this.guest.y - 30);
        sfx.win();
        this.end(`✅ ${CONFIG.guestName} got out safely. The warden found nothing!`, '#95d5b2');
        return;
      }
      if (s.warden.canSee(this.guest.x, this.guest.y)) {
        s.hurt(`🚨 Caught with a non-hosteller! ₹500 fine!`, this.leader);
        this.end(`${CONFIG.guestName} was sent home by ${CONFIG.wardenName}.`, '#ff6b6b');
        return;
      }
    }

    if (this.timeLeft <= 0) {
      s.hurt(`🚨 ${CONFIG.wardenName} found ${CONFIG.guestName} with you!`, this.leader ?? s.players[0]);
      this.end('The warden check is over.', '#ff6b6b');
    }
  }

  end(msg, color) {
    const s = this.scene;
    this.active = false;
    this.state = 'done';
    s.warden.setRaid(false);
    this.marker?.destroy();
    if (this.guest) {
      const g = this.guest;
      const l = this.label;
      g.setVelocity(0, 0);
      s.tweens.add({ targets: [g, l], alpha: 0, duration: 600, onComplete: () => { g.destroy(); l.destroy(); } });
    }
    this.guest = null;
    s.banner(msg, color);
  }
}
