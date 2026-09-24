import { Npc } from './Npc.js';
import { tileCenter, randomWalkableTile, hasLineOfSight } from '../map.js';

// Seniors wander around. If one catches you, you get pulled into a silly "ragging task".
export class Senior extends Npc {
  constructor(scene, x, y) {
    super(scene, x, y, 'senior', 'SENIOR', '#ff8fa3');
    this.state = 'wander';
    this.cooldownUntil = 0;
    this.lastSeen = 0;
    this.wander();
  }

  wander() {
    const t = randomWalkableTile();
    const c = tileCenter(t.col, t.row);
    this.setPathTo(c.x, c.y);
  }

  update(time) {
    const s = this.scene;
    const p = s.player;
    const n = s.night;
    const wanderSpeed = 60 + n * 4;
    const chaseSpeed = Math.min(120 + n * 6, 160);

    const canSee = !s.hidden && time > this.cooldownUntil && this.distTo(p) < 150
      && hasLineOfSight(this.x, this.y, p.x, p.y);
    if (canSee) {
      if (this.state !== 'chase') s.floatText(this.x, this.y - 40, 'OYE FRESHER! COME HERE!', '#ff8fa3');
      this.state = 'chase';
      this.lastSeen = time;
    }

    if (this.state === 'chase') {
      if (s.hidden || time - this.lastSeen > 2500) {
        this.state = 'wander';
        this.wander();
      } else {
        this.chase(p, chaseSpeed, time);
        if (this.distTo(p) < 26 && time > s.invulnUntil) s.startRagging(this);
      }
    } else if (this.moveAlong(wanderSpeed)) {
      this.wander();
    }
  }

  letGo(time) {
    this.cooldownUntil = time + 8000;
    this.state = 'wander';
    this.wander();
  }
}
