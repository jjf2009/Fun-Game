import Phaser from 'phaser';
import { Npc } from './Npc.js';

const TINTS = [0xffffff, 0xb5e48c, 0xffd6a5, 0xcaffbf, 0xbde0fe, 0xffc6ff];
const SHOUTS = ['OUTSIDERS?! I\'M COMING!', 'NOT IN OUR HOSTEL!', 'GET THE BUCKETS!', 'SLIPPERS READY!', 'CHALO BHAI!'];

// A hosteller woken up during a gang attack. Follows the nearest player until the rebellion starts.
export class Rebel extends Npc {
  constructor(scene, x, y, index) {
    super(scene, x, y, 'student', 'REBEL', '#06d6a0');
    this.setTint(Phaser.Utils.Array.GetRandom(TINTS));
    this.index = index;
    this.charging = false;
    scene.floatText(x, y - 40, Phaser.Utils.Array.GetRandom(SHOUTS), '#06d6a0', 14);
  }

  update(time) {
    if (this.charging) return;
    const s = this.scene;
    const leader = s.nearestPlayer(this.x, this.y);
    if (!leader) {
      this.setVelocity(0, 0);
      return;
    }
    // Each rebel keeps its own spot around the leader, so they don't all stack up.
    const angle = (this.index / 6) * Math.PI * 2;
    const spot = { x: leader.x + Math.cos(angle) * 45, y: leader.y + Math.sin(angle) * 45 };
    if (this.distTo(spot) < 20) this.setVelocity(0, 0);
    else this.chase(spot, 190, time);
  }

  // Run out through the gate at an outsider.
  charge(target, onHit) {
    const s = this.scene;
    this.charging = true;
    this.path = [];
    this.setVelocity(0, 0);
    this.play('student-walk');
    this.setRotation(Math.atan2(target.y - this.y, target.x - this.x));
    s.tweens.add({
      targets: this, x: target.x + 20, y: target.y, duration: Phaser.Math.Between(650, 950), ease: 'Quad.easeIn',
      onComplete: () => onHit?.(),
    });
  }

  goHome() {
    const s = this.scene;
    this.charging = true;
    this.body?.setVelocity(0, 0);
    s.tweens.add({ targets: [this, this.label], alpha: 0, duration: 700, onComplete: () => this.destroy() });
  }
}
