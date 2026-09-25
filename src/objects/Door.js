import Phaser from 'phaser';
import { Npc } from './Npc.js';
import { CONFIG } from '../config.js';
import { TILE, tileCenter } from '../map.js';
import { sfx } from '../sfx.js';

const YELLS = ['WHO IS THERE?!', 'NOT AGAIN!!', 'I HAVE AN EXAM!', "I'LL FIND YOU!", 'OYE!!', 'STOP IT YAAR!'];

// A room door you can knock on. After a moment, an angry student comes out and chases you.
export class Door {
  constructor(scene, d) {
    this.scene = scene;
    Object.assign(this, d);
    const c = tileCenter(d.col, d.row);
    const dirY = d.frontRow - d.row;
    this.front = { x: c.x, y: c.y + (dirY * TILE) / 2 };
    this.frontTile = tileCenter(d.frontCol, d.frontRow);
    this.state = 'idle';
    this.student = null;
    this.light = scene.add.circle(this.front.x + 14, this.front.y - dirY * 6, 4, 0xffd166).setDepth(16).setVisible(false);
  }

  knock(time) {
    if (this.state !== 'idle') {
      this.scene.floatText(this.front.x, this.front.y - 20, 'Already knocked!', '#aaaaaa', 12);
      return false;
    }
    this.state = 'knocked';
    this.openAt = time + Phaser.Math.Between(1300, 2300);
    this.light.setVisible(true).setFillStyle(0xffd166);
    sfx.knock();
    // During a gang attack, knocking wakes students up to join the rebellion instead
    this.rally = this.scene.gang.active && !this.scene.bossNight;
    if (this.rally) this.openAt = time + 700;
    this.scene.floatText(this.front.x, this.front.y - 20, this.rally ? 'WAKE UP! OUTSIDERS!' : 'KNOCK KNOCK!', '#ffe066');
    this.scene.onKnock(this);
    return true;
  }

  update(time) {
    if (this.state === 'knocked') {
      this.light.setAlpha(Math.sin(time / 80) > 0 ? 1 : 0.3);
      if (time >= this.openAt) this.open(time);
    } else if (this.state === 'cooldown' && time >= this.readyAt) {
      this.state = 'idle';
      this.light.setVisible(false);
    }
    this.student?.update(time);
  }

  open(time) {
    const s = this.scene;
    this.state = 'open';
    if (this.rally && s.gang.active) {
      this.light.setAlpha(1).setFillStyle(0x06d6a0);
      s.gang.addRebel(this);
      this.close(time);
      return;
    }
    this.light.setAlpha(1).setFillStyle(0xff4d4d);
    sfx.yell();
    s.floatText(this.front.x, this.front.y - 30, Phaser.Utils.Array.GetRandom(YELLS), '#ff6b6b', 15);
    if (!s.nearestVisiblePlayer(this.front.x, this.front.y, 280)) {
      s.addScore(5, 'Clean getaway!', this.front.x, this.front.y - 50);
      this.close(time);
      return;
    }
    this.student = new AngryStudent(s, this.frontTile.x, this.frontTile.y, this, time);
  }

  close(time) {
    this.student = null;
    this.state = 'cooldown';
    this.readyAt = time + CONFIG.doorCooldown * 1000;
    this.light.setFillStyle(0x666666);
  }
}

class AngryStudent extends Npc {
  constructor(scene, x, y, door, time) {
    super(scene, x, y, 'student', `ROOM ${door.roomNo}`, '#ffb703');
    this.door = door;
    const n = scene.night;
    this.speed = Math.min(115 + n * 6, 165);
    this.chaseUntil = time + Math.min(2200 + n * 150, 4000);
    this.returning = false;
  }

  update(time) {
    const s = this.scene;
    if (!this.returning) {
      const p = s.nearestVisiblePlayer(this.x, this.y);
      if (time > this.chaseUntil || !p) {
        this.returning = true;
        this.setPathTo(this.door.frontTile.x, this.door.frontTile.y);
      } else {
        this.chase(p, this.speed, time);
        if (this.distTo(p) < 24 && s.hurt(`Room ${this.door.roomNo} caught you! Slipper to the face!`, p)) {
          this.returning = true;
          this.setPathTo(this.door.frontTile.x, this.door.frontTile.y);
        }
      }
    } else if (this.moveAlong(this.speed * 0.7)) {
      this.door.close(time);
      this.destroy();
    }
  }
}
