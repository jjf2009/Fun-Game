import Phaser from 'phaser';
import { FONT } from '../config.js';
import { TILE, ROOM_BLOCKS, tileCenter } from '../map.js';
import { rng, RESIDENTS } from '../art/pixels.js';

// The people who live in the rooms.
// Each room gets a resident who is sleeping, studying, on the phone, playing music, or out (empty room).
// When you knock, they get up and walk to the door; after chasing you they walk back.
//
// Co-op: both devices build the same rooms from the same random seed (night + mode), so nothing
// needs to be sent except "room X got up / went back" (see wake/goHome, sent via scene.netEvent).

const ACTIVITIES = [['sleep', 45], ['study', 25], ['phone', 20], ['music', 10]];

export class RoomManager {
  constructor(scene) {
    this.s = scene;
    this.rooms = new Map();
    const rand = rng(scene.night * 97 + (scene.mode === 'hard' ? 13 : 0) + 7);
    // EASY: lots of seniors are away on internship, so many rooms are empty
    const emptyChance = scene.mode === 'hard' ? 0.1 : 0.35;

    for (const d of scene.map.doors) {
      if (d.mine) continue;
      const [r0, r1] = ROOM_BLOCKS.find(([a, b]) => d.row >= a && d.row <= b);
      const i = (d.col - 14) / 3;
      const x0 = (13 + i * 3) * TILE;
      const y0 = r0 * TILE;
      const h = (r1 - r0 + 1) * TILE;
      const flip = i % 2 === 1;
      const look = Math.floor(rand() * RESIDENTS.length);
      let activity = 'empty';
      if (rand() >= emptyChance) {
        let roll = rand() * 100;
        activity = ACTIVITIES.find(([, w]) => (roll -= w) < 0)?.[0] ?? 'sleep';
      }
      const room = {
        no: d.roomNo, look, key: `res${look}`, activity, flip, state: activity === 'empty' ? 'empty' : 'home',
        bed: { x: flip ? x0 + 3 * TILE - 40 : x0 + 8, y: y0 + h / 2 - 26 },
        desk: { x: flip ? x0 + 8 : x0 + 3 * TILE - 32, y: y0 + 8 },
        center: { x: x0 + 1.5 * TILE, y: y0 + h / 2 },
        door: tileCenter(d.col, d.row),
        extras: [],
        seed: rand(),
      };
      this.rooms.set(d.roomNo, room);
      if (activity !== 'empty') this.showAtHome(room);
    }
  }

  isEmpty(no) {
    return this.rooms.get(no)?.activity === 'empty';
  }

  keyFor(no) {
    return this.rooms.get(no)?.key ?? 'student';
  }

  // Draws the resident doing their thing at home.
  showAtHome(room) {
    const s = this.s;
    this.clearVisual(room);
    const add = (o) => { o.noNet = true; room.extras.push(o); return o; };
    switch (room.activity) {
      case 'sleep': {
        room.sprite = add(s.add.image(room.bed.x, room.bed.y, `${room.key}_sleep`).setOrigin(0).setDepth(2));
        const z = add(s.add.text(room.bed.x + 22, room.bed.y + 4, 'z', {
          fontFamily: FONT, fontSize: '13px', color: '#caf0f8', stroke: '#000', strokeThickness: 3,
        }).setDepth(16));
        s.tweens.add({ targets: z, y: room.bed.y - 16, alpha: 0, duration: 1800, repeat: -1, delay: room.seed * 1500 });
        break;
      }
      case 'study': {
        const x = room.flip ? room.desk.x + 38 : room.desk.x - 14;
        room.sprite = add(s.add.image(x, room.desk.y + 18, room.key).setDepth(2).setRotation(room.flip ? Math.PI : 0));
        room.light = s.lighting.addLight(room.desk.x + 12, room.desk.y + 12, 34, 0.7, 0x9bf6ff); // laptop glow
        break;
      }
      case 'phone': {
        room.sprite = add(s.add.image(room.bed.x + 16, room.bed.y + 30, room.key).setDepth(2).setRotation(room.seed * Math.PI * 2));
        room.light = s.lighting.addLight(room.bed.x + 16, room.bed.y + 30, 26, 0.55, 0xdee2ff); // phone screen
        break;
      }
      case 'music': {
        room.sprite = add(s.add.image(room.center.x, room.center.y + 10, room.key).setDepth(2).setRotation(-Math.PI / 2));
        const note = add(s.add.text(room.center.x + 10, room.center.y - 10, '♪', {
          fontFamily: FONT, fontSize: '16px', color: '#ffd166', stroke: '#000', strokeThickness: 3,
        }).setDepth(16));
        s.tweens.add({ targets: note, y: room.center.y - 34, x: room.center.x + 22, alpha: 0, duration: 1400, repeat: -1 });
        s.tweens.add({ targets: room.sprite, angle: '+=8', duration: 300, yoyo: true, repeat: -1 }); // grooving
        break;
      }
      default:
    }
    if (room.light) room.light.off = false;
  }

  clearVisual(room) {
    for (const o of room.extras) {
      this.s.tweens.killTweensOf(o);
      o.destroy();
    }
    room.extras = [];
    room.sprite = null;
    if (room.light) room.light.off = true;
  }

  // Knock knock: the resident gets up and walks to the door.
  wake(no) {
    const room = this.rooms.get(no);
    if (!room || room.state !== 'home') return;
    room.state = 'out';
    this.s.netEvent({ k: 'occ', a: 'wake', no });
    const from = room.sprite ? { x: room.sprite.x + (room.activity === 'sleep' ? 16 : 0), y: room.sprite.y + (room.activity === 'sleep' ? 20 : 0) } : room.center;
    this.clearVisual(room);
    this.walk(room, from, room.door, () => this.clearVisual(room));
  }

  // Back from chasing you (or from the rebellion): walk from the door back to bed/desk.
  goHome(no) {
    const room = this.rooms.get(no);
    if (!room || room.state !== 'out') return;
    room.state = 'home';
    this.s.netEvent({ k: 'occ', a: 'home', no });
    const to = room.activity === 'sleep' ? { x: room.bed.x + 16, y: room.bed.y + 26 } : room.center;
    this.walk(room, room.door, to, () => this.showAtHome(room));
  }

  walk(room, from, to, done) {
    const s = this.s;
    const w = s.add.sprite(from.x, from.y, room.key).setDepth(3).play(`${room.key}-walk`);
    w.noNet = true;
    w.setRotation(Math.atan2(to.y - from.y, to.x - from.x));
    room.extras.push(w);
    s.tweens.add({
      targets: w, x: to.x, y: to.y, duration: Phaser.Math.Clamp(Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y) * 8, 300, 900),
      onComplete: done,
    });
  }

  // Co-op friend: apply what the host did
  applyNet(e) {
    if (e.a === 'wake') this.wake(e.no);
    else if (e.a === 'home') this.goHome(e.no);
  }
}
