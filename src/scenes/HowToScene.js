import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';

// "How to play": 3 short pages for first-time players. Opens on the first PLAY, from the menu
// link, and from the pause menu. Calls onDone when closed.
export default class HowToScene extends Phaser.Scene {
  constructor() {
    super('HowTo');
  }

  init(data) {
    this.onDone = data.onDone;
  }

  create() {
    const touch = this.sys.game.device.input.touch;
    const act = touch ? 'the ACT button' : 'SPACE';
    const move = touch ? 'the joystick (left side of the screen)' : 'WASD or the arrow keys';
    this.pages = [
      ['KNOCK & RUN', [
        ['face_player', `Move with ${move}. Stand at a door and press ${act} to KNOCK. Every knock is points!`],
        ['face_student', 'Someone angry comes out. RUN! Knock fast for a COMBO.'],
        ['bed', `Hide in YOUR room (${CONFIG.myRoom}) or the bathroom when things get hot.`],
      ]],
      ['WATCH OUT', [
        ['face_warden', `${CONFIG.wardenName} patrols with a torch. Stay out of the light, or you lose a life.`],
        ['face_senior', 'Seniors roam at night. If one catches you, you get a silly "task". Escape and run!'],
        ['drop', 'Water cuts happen. Keep an eye on your freshness bar and grab the bucket.'],
      ]],
      ['HOSTEL EVENTS', [
        ['face_gang', 'Outsiders throw bombs! Call the POLICE on the phone, or knock doors to start a REBELLION.'],
        ['face_guest', `Warden check! Sneak ${CONFIG.guestName} (your non-hosteller friend) out to the gate.`],
        ['face_boss', `Survive 4 nights, then face ${CONFIG.bossName} on BOSS NIGHT. Photograph the gang and file complaints!`],
      ]],
    ];
    this.add.rectangle(480, 270, 960, 540, 0x0b0d1f, 1).setInteractive(); // covers (and blocks) whatever is behind
    this.page = this.add.container(0, 0);
    this.i = 0;
    this.show();

    const skip = this.add.text(900, 36, 'SKIP ✕', { fontFamily: FONT, fontSize: '18px', color: '#ffffff', backgroundColor: '#6c757d', padding: { x: 8, y: 5 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    skip.on('pointerup', () => this.close());
    this.time.delayedCall(250, () => {
      this.input.on('pointerup', (_p, over) => { if (!over.includes(skip)) this.next(); });
      this.input.keyboard.on('keydown-SPACE', () => this.next());
      this.input.keyboard.on('keydown-ENTER', () => this.next());
      this.input.keyboard.on('keydown-RIGHT', () => this.next());
      this.input.keyboard.on('keydown-LEFT', () => { if (this.i > 0) { this.i--; this.show(); } });
      this.input.keyboard.on('keydown-ESC', () => this.close());
    });
  }

  show() {
    this.page.removeAll(true);
    const [title, rows] = this.pages[this.i];
    this.page.add(this.add.text(480, 60, `HOW TO PLAY · ${title}`, { fontFamily: TITLE_FONT, fontSize: '22px', color: '#ffe066', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5));
    rows.forEach(([img, text], r) => {
      const y = 160 + r * 110;
      this.page.add(this.add.rectangle(170, y, 90, 90, 0x1d1a2b).setStrokeStyle(2, 0x80ffdb));
      const pic = this.add.image(170, y, img);
      pic.setScale(Math.min(80 / pic.width, 80 / pic.height));
      this.page.add(pic);
      this.page.add(this.add.text(240, y, text, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', wordWrap: { width: 640 }, lineSpacing: 4 }).setOrigin(0, 0.5));
    });
    const last = this.i === this.pages.length - 1;
    this.page.add(this.add.text(480, 500, `${this.i + 1} / ${this.pages.length}    ${last ? "Let's go!" : 'Next'} ${touch(this) ? '(tap)' : '(SPACE / click)'}`, {
      fontFamily: FONT, fontSize: '17px', color: '#adb5bd',
    }).setOrigin(0.5));
  }

  next() {
    sfx.tick();
    if (this.i < this.pages.length - 1) {
      this.i++;
      this.show();
    } else {
      this.close();
    }
  }

  close() {
    const cb = this.onDone;
    this.scene.stop();
    cb?.();
  }
}

const touch = (scene) => scene.sys.game.device.input.touch;
