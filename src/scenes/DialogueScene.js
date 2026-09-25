import Phaser from 'phaser';
import { FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';

// STORY: talking to a scared junior. Pick what to say (tap, or press 1 / 2 / 3).
// Kind, honest answers convince them; pushy ones get the door slammed.
export default class DialogueScene extends Phaser.Scene {
  constructor() {
    super('Dialogue');
  }

  init(data) {
    this.d = data;
  }

  create() {
    const { name, room, face, talk, onDone } = this.d;
    this.done = false;
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.75);
    this.add.rectangle(480, 270, 800, 460, 0x1d1a2b).setStrokeStyle(4, 0xffd166);

    this.add.rectangle(185, 175, 150, 150, 0x2d2a3e).setStrokeStyle(3, 0xffd166);
    this.add.image(185, 175, face).setScale(0.72);
    this.add.text(185, 268, name.toUpperCase(), { fontFamily: TITLE_FONT, fontSize: '14px', color: '#ffd166' }).setOrigin(0.5);
    this.add.text(185, 292, `Room ${room} · Junior`, { fontFamily: FONT, fontSize: '14px', color: '#adb5bd' }).setOrigin(0.5);

    this.speech = this.add.text(290, 90, talk.fear, {
      fontFamily: FONT, fontSize: '20px', color: '#ffffff', wordWrap: { width: 540 }, backgroundColor: '#2d2a3e', padding: { x: 12, y: 10 },
    });
    this.add.text(290, 190, 'What do you say?', { fontFamily: FONT, fontSize: '15px', color: '#adb5bd' });

    this.buttons = talk.choices.map((c, i) => {
      const y = 245 + i * 72;
      const r = this.add.rectangle(578, y, 556, 60, 0x3a355a).setStrokeStyle(3, 0x6c757d).setInteractive({ useHandCursor: true });
      const t = this.add.text(318, y, `${i + 1}.  ${c.text}`, { fontFamily: FONT, fontSize: '17px', color: '#ffffff', wordWrap: { width: 520 } }).setOrigin(0, 0.5);
      r.on('pointerover', () => !this.done && r.setFillStyle(0x4a4570));
      r.on('pointerout', () => !this.done && r.setFillStyle(0x3a355a));
      r.on('pointerup', () => this.choose(i));
      return { r, t };
    });
    const keys = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };
    this.input.keyboard.on('keydown', (e) => {
      if (e.code in keys) this.choose(keys[e.code]);
    });
    this.onDone = onDone;
    this.talk = talk;
  }

  choose(i) {
    if (this.done) return;
    this.done = true;
    const c = this.talk.choices[i];
    this.buttons.forEach(({ r }, j) => r.setAlpha(j === i ? 1 : 0.35));
    this.buttons[i].r.setFillStyle(c.good ? 0x1b4332 : 0x5c1a1a).setStrokeStyle(3, c.good ? 0x06d6a0 : 0xff6b6b);
    this.speech.setText(c.reply);
    if (c.good) sfx.win(); else sfx.fail();
    this.add.text(480, 478, c.good ? '✓ STATEMENT GIVEN' : '✗ THEY SHUT THE DOOR', {
      fontFamily: TITLE_FONT, fontSize: '16px', color: c.good ? '#06d6a0' : '#ff6b6b', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.time.delayedCall(2200, () => {
      const cb = this.onDone;
      this.scene.stop();
      cb(c.good);
    });
  }
}
