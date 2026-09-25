import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { EMAIL_PARTS } from '../story/chapters.js';

// STORY Ch4: write the anti-ragging complaint. Tick what goes in, then SEND.
// Proof (photos, statements, dates) makes it strong. Your name is optional: it can be anonymous.
export default class EmailScene extends Phaser.Scene {
  constructor() {
    super('Email');
  }

  init(data) {
    this.onDone = data.onDone;
  }

  create() {
    this.sent = false;
    this.on = {};
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.8);
    // a "computer window"
    this.add.rectangle(480, 275, 820, 480, 0xe9ecef).setStrokeStyle(4, 0x1b263b);
    this.add.rectangle(480, 52, 820, 34, 0x1b263b);
    this.add.text(90, 52, '✉️  New message', { fontFamily: FONT, fontSize: '16px', color: '#ffffff' }).setOrigin(0, 0.5);
    const line = (y, label, value) => {
      this.add.text(90, y, label, { fontFamily: FONT, fontSize: '16px', color: '#6c757d' }).setOrigin(0, 0.5);
      this.add.text(180, y, value, { fontFamily: FONT, fontSize: '16px', color: '#1b263b' }).setOrigin(0, 0.5);
      this.add.rectangle(480, y + 16, 780, 1, 0xadb5bd);
    };
    line(90, 'To:', 'Anti-Ragging Committee, college');
    line(125, 'Subject:', `Ragging in ${CONFIG.hostelName} (corridors 1 & 2, at night)`);

    this.add.text(90, 165, 'What goes in the complaint? Tap to add or remove:', { fontFamily: FONT, fontSize: '16px', color: '#1b263b', fontStyle: 'bold' });
    this.rows = EMAIL_PARTS.map((part, i) => {
      const y = 212 + i * 50;
      const box = this.add.rectangle(480, y, 780, 42, 0xffffff).setStrokeStyle(2, 0xadb5bd).setInteractive({ useHandCursor: true });
      const tick = this.add.text(110, y, '☐', { fontFamily: FONT, fontSize: '24px', color: '#1b263b' }).setOrigin(0.5);
      this.add.text(140, y, part.label, { fontFamily: FONT, fontSize: '18px', color: '#1b263b' }).setOrigin(0, 0.5);
      box.on('pointerup', () => this.toggle(part.id));
      this.on[part.id] = false;
      return { part, box, tick };
    });

    this.tip = this.add.text(480, 418, '', {
      fontFamily: FONT, fontSize: '16px', color: '#b5179e', align: 'center', wordWrap: { width: 760 },
    }).setOrigin(0.5);

    const send = this.add.rectangle(760, 478, 200, 50, 0x2a9d8f).setStrokeStyle(3, 0x1b263b).setInteractive({ useHandCursor: true });
    this.add.text(760, 480, 'SEND ➤', { fontFamily: TITLE_FONT, fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
    send.on('pointerup', () => this.trySend());
    this.add.text(90, 478, 'Keys: 1-4 to tick, ENTER to send', { fontFamily: FONT, fontSize: '14px', color: '#6c757d' }).setOrigin(0, 0.5);

    const keys = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
    this.input.keyboard.on('keydown', (e) => {
      if (e.code in keys) this.toggle(EMAIL_PARTS[keys[e.code]].id);
      if (e.code === 'Enter') this.trySend();
    });
  }

  toggle(id) {
    if (this.sent || this.confirming) return;
    this.on[id] = !this.on[id];
    sfx.tick();
    for (const { part, box, tick } of this.rows) {
      tick.setText(this.on[part.id] ? '☑' : '☐');
      box.setFillStyle(this.on[part.id] ? 0xd8f3dc : 0xffffff);
    }
    this.tip.setText(id === 'name' && this.on.name ? 'Tip: you don\'t have to add your name. Complaints can be anonymous.' : '');
  }

  trySend() {
    if (this.sent || this.confirming) return;
    const missing = EMAIL_PARTS.filter((p) => p.needed && !this.on[p.id]);
    if (missing.length) {
      sfx.fail();
      this.tip.setText(`Add the proof! ${missing.map((m) => m.label.split(' ').slice(1).join(' ')).join(', ')}: without it, it's just your word against theirs.`);
      return;
    }
    if (this.on.name) {
      this.confirmName();
      return;
    }
    this.send();
  }

  // Your name is ticked: remind them it's okay to stay anonymous
  confirmName() {
    this.confirming = true;
    const c = this.add.container(0, 0);
    c.add(this.add.rectangle(480, 290, 600, 200, 0x1d1a2b).setStrokeStyle(4, 0xffd166));
    c.add(this.add.text(480, 235, 'Your name is in the complaint.\nYou can stay anonymous. Remove it?', {
      fontFamily: FONT, fontSize: '19px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5));
    const btn = (x, label, color, cb) => {
      const r = this.add.rectangle(x, 330, 240, 50, color).setInteractive({ useHandCursor: true });
      c.add(r);
      c.add(this.add.text(x, 330, label, { fontFamily: FONT, fontSize: '17px', color: '#1a1020', fontStyle: 'bold' }).setOrigin(0.5));
      r.on('pointerup', cb);
    };
    btn(345, 'REMOVE MY NAME', 0x80ffdb, () => {
      c.destroy();
      this.confirming = false;
      this.toggle('name');
      this.send();
    });
    btn(615, 'SEND WITH NAME', 0xffd166, () => {
      c.destroy();
      this.confirming = false;
      this.send();
    });
  }

  send() {
    this.sent = true;
    sfx.point();
    this.tip.setColor('#2a9d8f').setText(this.on.name ? 'Sending...' : 'Sending anonymously...');
    this.time.delayedCall(900, () => {
      this.tip.setText('✅ SENT to the Anti-Ragging Committee.');
      sfx.win();
    });
    this.time.delayedCall(2300, () => {
      const cb = this.onDone;
      this.scene.stop();
      cb(true);
    });
  }
}
