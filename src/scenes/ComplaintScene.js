import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { COMPLAINT_PROOF } from '../story/chapters.js';

// STORY Ch4: complain to Warden Sir in his office. Show him each piece of proof
// (tap it, or press 1 / 2 / 3). Once he's seen everything, he acts.
export default class ComplaintScene extends Phaser.Scene {
  constructor() {
    super('Complaint');
  }

  init(data) {
    this.onDone = data.onDone;
  }

  create() {
    this.shown = new Set();
    this.finished = false;
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.8);
    this.add.rectangle(480, 270, 860, 480, 0x1d1a2b).setStrokeStyle(4, 0xffd166);
    this.add.text(480, 58, `${CONFIG.wardenName.toUpperCase()}'S OFFICE · 3:00 AM`, { fontFamily: TITLE_FONT, fontSize: '16px', color: '#ffd166' }).setOrigin(0.5);

    this.add.rectangle(160, 170, 140, 140, 0x2d2a3e).setStrokeStyle(3, 0xffd166);
    this.warden = this.add.image(160, 170, 'face_warden').setScale(0.66);
    this.add.text(160, 256, CONFIG.wardenName.toUpperCase(), { fontFamily: FONT, fontSize: '16px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5);
    this.speech = this.add.text(260, 100, '"Hmm? Who is it at this hour? ...Come in. What happened?"', {
      fontFamily: FONT, fontSize: '19px', color: '#ffffff', wordWrap: { width: 600 }, backgroundColor: '#2d2a3e', padding: { x: 12, y: 10 },
    });

    // the evidence cards appear here as you show them
    this.table = this.add.container(0, 0);
    this.add.text(260, 290, 'Show him your proof:', { fontFamily: FONT, fontSize: '15px', color: '#adb5bd' });
    this.buttons = COMPLAINT_PROOF.map((proof, i) => {
      const x = 260 + i * 210 + 95;
      const r = this.add.rectangle(x, 450, 196, 64, 0x3a355a).setStrokeStyle(3, 0x6c757d).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, 450, `${i + 1}. ${proof.label}`, { fontFamily: FONT, fontSize: '16px', color: '#ffffff', align: 'center', wordWrap: { width: 180 } }).setOrigin(0.5);
      r.on('pointerup', () => this.show(i));
      return { r, t };
    });
    const keys = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };
    this.input.keyboard.on('keydown', (e) => { if (e.code in keys) this.show(keys[e.code]); });
  }

  show(i) {
    if (this.finished || this.shown.has(i)) return;
    this.shown.add(i);
    const proof = COMPLAINT_PROOF[i];
    sfx.camera();
    this.buttons[i].r.setFillStyle(0x1b4332).setStrokeStyle(3, 0x06d6a0).disableInteractive();
    this.buttons[i].t.setText(`✓ ${proof.label}`);
    // a little card on the desk: the faces in that piece of proof
    const cx = 260 + (this.shown.size - 1) * 210 + 95;
    const card = this.add.container(cx, 360);
    card.add(this.add.rectangle(0, 0, 186, 88, 0xf8f9fa).setStrokeStyle(3, 0x1a1020).setAngle(Phaser.Math.Between(-4, 4)));
    proof.faces.forEach((f, k) => card.add(this.add.image((k - (proof.faces.length - 1) / 2) * 52, -6, f).setScale(0.24)));
    card.add(this.add.text(0, 32, proof.caption, { fontFamily: FONT, fontSize: '12px', color: '#1a1020' }).setOrigin(0.5));
    card.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut' });
    this.table.add(card);
    this.speech.setText(proof.reply);
    this.tweens.add({ targets: this.warden, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => this.warden.setAngle(0) });
    if (this.shown.size === COMPLAINT_PROOF.length) this.finish();
  }

  finish() {
    this.finished = true;
    this.time.delayedCall(2600, () => {
      sfx.whistle();
      this.speech.setText('"ENOUGH. Photos, statements, dates... this is ragging, in MY hostel. I\'m going out there RIGHT NOW, and this goes to the anti-ragging committee first thing in the morning."');
      this.cameras.main.shake(250, 0.006);
      this.add.text(760, 298, '✓ COMPLAINT MADE', { fontFamily: TITLE_FONT, fontSize: '14px', color: '#06d6a0', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    });
    this.time.delayedCall(6800, () => {
      const cb = this.onDone;
      this.scene.stop();
      cb(true);
    });
  }
}
