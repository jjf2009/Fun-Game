import Phaser from 'phaser';
import { Npc } from './Npc.js';
import { CONFIG, FONT } from '../config.js';
import { tileCenter, hasLineOfSight } from '../map.js';
import { sfx } from '../sfx.js';

const HALF_CONE = Phaser.Math.DegToRad(35);
const PATROL = [
  [12, 6], [24, 7], [37, 6], [38, 12], [37, 17], [24, 16], [12, 17], [11, 12], [8, 4], [8, 20],
].map(([c, r]) => tileCenter(c, r));

// The warden patrols with a flashlight. If you step into the light, the warden chases you.
export class Warden extends Npc {
  constructor(scene, x, y) {
    super(scene, x, y, 'warden', CONFIG.wardenName.toUpperCase(), '#ffd166');
    this.state = 'patrol';
    this.raid = false;
    this.ignoreUntil = 0;
    this.lastSeen = 0;
    this.pauseUntil = 0;
    this.target = null;
    this.cone = scene.add.graphics().setDepth(3);
    this.alert = scene.add.text(x, y, '!', {
      fontFamily: FONT, fontSize: '28px', color: '#ff4d4d', stroke: '#000', strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(17).setVisible(false);
    this.pickPatrol();
  }

  get stats() {
    const n = this.scene.night;
    const w = CONFIG.warden;
    return {
      patrol: Math.min(w.patrol + n * 6 + (this.raid ? 30 : 0), 140),
      chase: Math.min(w.chase + n * 5 + (this.raid ? 10 : 0), CONFIG.playerSpeed - 8),
      range: w.visionRange + n * 6 + (this.raid ? 60 : 0),
    };
  }

  setRaid(on) {
    this.raid = on;
    if (this.state === 'patrol') this.pickPatrol();
  }

  pickPatrol() {
    const options = this.raid ? [...PATROL, this.scene.myDoor.front, this.scene.myDoor.front] : PATROL;
    let next;
    do next = Phaser.Utils.Array.GetRandom(options);
    while (next === this.target && options.length > 1);
    this.target = next;
    this.setPathTo(next.x, next.y);
  }

  canSee(x, y) {
    const d = Phaser.Math.Distance.Between(this.x, this.y, x, y);
    if (d > this.stats.range) return false;
    const diff = Phaser.Math.Angle.Wrap(Math.atan2(y - this.y, x - this.x) - this.facing);
    if (Math.abs(diff) > HALF_CONE && d > 30) return false;
    return hasLineOfSight(this.x, this.y, x, y);
  }

  // Boss Night: the warden stays at the Anti-Ragging Cell desk to take complaints.
  station() {
    this.stationed = true;
    this.facing = Math.PI / 2;
    this.setRotation(this.facing);
    this.path = [];
    this.label.setText(`${CONFIG.wardenName.toUpperCase()} (ANTI-RAGGING)`);
  }

  update(time) {
    if (this.stationed) {
      this.setVelocity(0, 0);
      this.cone.clear();
      this.alert.setVisible(false);
      return;
    }
    const s = this.scene;
    const st = this.stats;

    // Spot any player standing in the torchlight
    const seen = time > this.ignoreUntil ? s.visiblePlayers().find((pl) => this.canSee(pl.x, pl.y)) : null;
    if (seen) {
      this.targetPlayer = seen;
      if (this.state !== 'chase') {
        this.state = 'chase';
        sfx.whistle();
        s.floatText(this.x, this.y - 40, 'OYE! STOP THERE!', '#ffd166');
      }
      this.lastSeen = time;
    }

    const p = this.targetPlayer;
    if (this.state === 'chase') {
      if (!p?.active || p.hidden || p.frozen || time - this.lastSeen > CONFIG.warden.giveUp) {
        this.state = 'patrol';
        this.pickPatrol();
      } else {
        this.chase(p, st.chase, time);
        if (this.distTo(p) < 26 && s.hurt(`${CONFIG.wardenName} caught you roaming after curfew!`, p)) {
          this.ignoreUntil = time + 3500;
          this.state = 'patrol';
          this.pickPatrol();
        }
      }
    } else if (time < this.pauseUntil) {
      this.setVelocity(0, 0);
      this.facing += 0.03; // looking around
    } else if (this.moveAlong(st.patrol)) {
      this.pauseUntil = time + 900;
      this.pickPatrol();
    }

    this.alert.setPosition(this.x, this.y - 44).setVisible(this.state === 'chase');
    this.drawCone(st.range);
  }

  drawCone(range) {
    const chasing = this.state === 'chase';
    this.cone.clear();
    this.cone.fillStyle(chasing ? 0xff5555 : 0xfff1a8, chasing ? 0.2 : 0.1);
    this.cone.slice(this.x, this.y, range, this.facing - HALF_CONE, this.facing + HALF_CONE, false);
    this.cone.fillPath();
  }

  destroy(fromScene) {
    this.cone?.destroy();
    this.alert?.destroy();
    super.destroy(fromScene);
  }
}
