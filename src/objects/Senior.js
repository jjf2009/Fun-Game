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
    const n = s.night;
    const wanderSpeed = 60 + n * 4;
    const chaseSpeed = Math.min(120 + n * 6, 160);

    // Holding a player who is doing a ragging task (co-op: the game keeps running)
    if (this.holding) {
      if (this.holding.frozen) {
        this.setVelocity(0, 0);
        return;
      }
      this.holding = null;
    }

    // Players this senior can pick on: visible, and not on a "senior break"
    const targets = s.visiblePlayers().filter((pl) => time > pl.seniorBreakUntil);
    const seen = time > this.cooldownUntil
      ? targets.find((pl) => this.distTo(pl) < 150 && hasLineOfSight(this.x, this.y, pl.x, pl.y))
      : null;
    if (seen) {
      if (this.state !== 'chase') s.floatText(this.x, this.y - 40, 'OYE FRESHER! COME HERE!', '#ff8fa3');
      this.state = 'chase';
      this.target = seen;
      this.lastSeen = time;
    }

    if (this.state === 'chase') {
      const p = this.target;
      if (!p?.active || !targets.includes(p) || time - this.lastSeen > 2500) {
        this.state = 'wander';
        this.wander();
      } else {
        this.chase(p, chaseSpeed, time);
        if (this.distTo(p) < 26 && time > p.invulnUntil) s.startRagging(this, p);
      }
    } else if (this.moveAlong(wanderSpeed)) {
      this.wander();
    }
  }

  letGo(time) {
    this.holding = null;
    this.cooldownUntil = time + 8000;
    this.state = 'wander';
    this.wander();
  }
}
