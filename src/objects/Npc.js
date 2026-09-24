import Phaser from 'phaser';
import { findPath, tileCenter, worldToTile, hasLineOfSight } from '../map.js';
import { FONT } from '../config.js';

// Base class for every computer-controlled character.
// Characters walk tile-to-tile along paths found with findPath(), so they never walk through walls.
export class Npc extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, key, label, labelColor = '#ffffff') {
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5);
    this.baseKey = key;
    this.path = [];
    this.repathAt = 0;
    this.facing = 0;
    this.label = scene.add
      .text(x, y - 26, label, {
        fontFamily: FONT, fontSize: '12px', color: labelColor,
        backgroundColor: '#000000aa', padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(16);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.label.setPosition(this.x, this.y - 26);
    const { x: vx, y: vy } = this.body.velocity;
    const moving = Math.abs(vx) + Math.abs(vy) > 5;
    if (moving) {
      this.facing = Phaser.Math.Angle.RotateTo(this.facing, Math.atan2(vy, vx), 0.15);
      if (!this.anims.isPlaying) this.play(`${this.baseKey}-walk`);
    } else if (this.anims.isPlaying) {
      this.stop();
      this.setTexture(this.baseKey);
    }
    this.setRotation(this.facing);
  }

  setPathTo(x, y) {
    this.path = findPath(worldToTile(this.x, this.y), worldToTile(x, y));
  }

  // Walks along the current path. Returns true once the destination is reached.
  moveAlong(speed) {
    if (!this.path.length) {
      this.setVelocity(0, 0);
      return true;
    }
    const next = tileCenter(this.path[0].col, this.path[0].row);
    const dx = next.x - this.x;
    const dy = next.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) {
      this.path.shift();
      if (!this.path.length) {
        this.setVelocity(0, 0);
        return true;
      }
      return false;
    }
    this.setVelocity((dx / d) * speed, (dy / d) * speed);
    return false;
  }

  chase(target, speed, time) {
    if (time > this.repathAt) {
      this.setPathTo(target.x, target.y);
      this.repathAt = time + 300;
    }
    if (this.path.length <= 1 || hasLineOfSight(this.x, this.y, target.x, target.y)) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.setVelocity((dx / d) * speed, (dy / d) * speed);
    } else {
      this.moveAlong(speed);
    }
  }

  distTo(obj) {
    return Phaser.Math.Distance.Between(this.x, this.y, obj.x, obj.y);
  }

  destroy(fromScene) {
    this.label?.destroy();
    super.destroy(fromScene);
  }
}
