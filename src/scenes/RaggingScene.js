import Phaser from 'phaser';
import { FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';

// A senior caught you! Finish a quick silly task before time runs out, or lose a life.
// Tasks: push-ups (tap fast), hostel anthem (press arrows in order), self-introduction (timing).
const ARROWS = [
  { dir: 'LEFT', sym: '←', keys: ['ArrowLeft', 'KeyA'] },
  { dir: 'UP', sym: '↑', keys: ['ArrowUp', 'KeyW'] },
  { dir: 'DOWN', sym: '↓', keys: ['ArrowDown', 'KeyS'] },
  { dir: 'RIGHT', sym: '→', keys: ['ArrowRight', 'KeyD'] },
];

export default class RaggingScene extends Phaser.Scene {
  constructor() {
    super('Ragging');
  }

  init(data) {
    this.onDone = data.onDone;
    this.face = data.face ?? 'face_player';
    this.night = data.night ?? 1;
    this.title = data.title ?? 'CAUGHT BY A SENIOR!';
  }

  create() {
    this.done = false;
    this.elapsed = 0;
    this.onKey = () => {};

    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.72);
    this.add.rectangle(480, 270, 760, 440, 0x1d1a2b).setStrokeStyle(4, 0xd62828);
    this.add.text(480, 76, this.title, {
      fontFamily: TITLE_FONT, fontSize: '20px', color: '#ff6b6b', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.rectangle(210, 200, 150, 150, 0x2d2a3e).setStrokeStyle(3, 0xd62828);
    this.seniorImg = this.add.image(210, 200, 'face_senior').setScale(0.72);
    this.add.text(210, 290, 'SENIOR', { fontFamily: FONT, fontSize: '16px', color: '#ff8fa3', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: this.seniorImg, angle: { from: -3, to: 3 }, duration: 400, yoyo: true, repeat: -1 });
    this.playerImg = this.add.image(210, 385, this.face).setScale(0.42);

    this.speech = this.add.text(320, 120, '', {
      fontFamily: FONT, fontSize: '19px', color: '#ffffff', wordWrap: { width: 480 },
      backgroundColor: '#2d2a3e', padding: { x: 10, y: 8 },
    });

    this.timerBg = this.add.rectangle(480, 470, 640, 14, 0x000000).setStrokeStyle(2, 0x555555);
    this.timerBar = this.add.rectangle(160, 470, 640, 14, 0xffd166).setOrigin(0, 0.5);

    this.input.keyboard.on('keydown', (e) => {
      if (!e.repeat && !this.done) this.onKey(e.code);
    });

    const task = Phaser.Utils.Array.GetRandom(['pushups', 'anthem', 'intro']);
    if (task === 'pushups') this.setupPushups();
    else if (task === 'anthem') this.setupAnthem();
    else this.setupIntro();
  }

  say(text) {
    this.speech.setText(text);
  }

  button(x, y, label, w, h, cb, size = 20) {
    const r = this.add.rectangle(x, y, w, h, 0xffcc00).setStrokeStyle(3, 0x000000).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y, label, { fontFamily: FONT, fontSize: `${size}px`, color: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
    r.on('pointerdown', () => {
      if (this.done) return;
      this.tweens.add({ targets: [r, t], scale: 0.92, duration: 60, yoyo: true });
      cb();
    });
    return r;
  }

  // ----- Task 1: push-ups -----
  setupPushups() {
    this.need = Math.min(10 + this.night * 2, 22);
    this.count = 0;
    this.limit = 5;
    this.say(`"Oye fresher! Give me ${this.need} push-ups. NOW!"\n\nTap the button (or SPACE) as fast as you can!`);
    this.info = this.add.text(560, 280, `0 / ${this.need}`, { fontFamily: FONT, fontSize: '40px', color: '#ffe066' }).setOrigin(0.5);
    const pushup = () => {
      this.count++;
      sfx.tick();
      this.info.setText(`${this.count} / ${this.need}`);
      this.tweens.add({ targets: this.playerImg, scaleY: 1.4, duration: 60, yoyo: true });
      if (this.count >= this.need) this.finish(true, '"Hmm. Not bad, fresher. Now get lost!"');
    };
    this.button(560, 380, 'PUSH-UP!', 300, 70, pushup);
    this.onKey = (code) => { if (code === 'Space' || code === 'Enter') pushup(); };
  }

  // ----- Task 2: sing the hostel anthem -----
  setupAnthem() {
    this.seq = Array.from({ length: 5 }, () => Phaser.Utils.Array.GetRandom(ARROWS));
    this.idx = 0;
    this.limit = Math.max(4.5, 7 - this.night * 0.3);
    this.say('"Sing the hostel anthem! Loudly!"\n\nHit the notes in order (arrow keys or buttons). A wrong note restarts!');
    this.notes = this.seq.map((a, i) => this.add.text(400 + i * 80, 270, a.sym, {
      fontFamily: FONT, fontSize: '48px', color: '#ffffff', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5));
    const press = (dir) => {
      if (dir === this.seq[this.idx].dir) {
        sfx.note(this.idx);
        this.notes[this.idx].setColor('#06d6a0');
        this.idx++;
        if (this.idx === this.seq.length) this.finish(true, '"Wah! Future Arijit Singh. You may go."');
      } else {
        sfx.hurt();
        this.idx = 0;
        this.notes.forEach((n) => n.setColor('#ffffff'));
        this.cameras.main.shake(120, 0.006);
      }
    };
    ARROWS.forEach((a, i) => this.button(410 + i * 100, 385, a.sym, 80, 70, () => press(a.dir), 40));
    this.onKey = (code) => {
      const a = ARROWS.find((x) => x.keys.includes(code));
      if (a) press(a.dir);
    };
  }

  // ----- Task 3: introduce yourself (timing) -----
  setupIntro() {
    this.limit = 7;
    this.tries = 2;
    this.say('"Introduce yourself properly! Name, branch, hometown..."\n\nSpeak when the marker is in the GREEN zone!');
    this.barX = 330;
    this.barW = 460;
    this.add.rectangle(this.barX, 280, this.barW, 30, 0x333333).setOrigin(0, 0.5);
    const zoneW = Math.max(50, 95 - this.night * 5);
    this.zoneX = this.barX + Phaser.Math.Between(80, this.barW - zoneW - 20);
    this.zoneW = zoneW;
    this.add.rectangle(this.zoneX, 280, zoneW, 30, 0x06d6a0).setOrigin(0, 0.5);
    this.marker = this.add.rectangle(this.barX, 280, 6, 44, 0xffffff);
    this.markerDir = 1;
    this.markerSpeed = 320 + this.night * 30;
    this.triesText = this.add.text(560, 325, 'Tries left: 2', { fontFamily: FONT, fontSize: '16px', color: '#aaaaaa' }).setOrigin(0.5);
    const speak = () => {
      const x = this.marker.x;
      if (x >= this.zoneX && x <= this.zoneX + this.zoneW) {
        this.finish(true, '"Good. Respect your seniors. Now go."');
      } else {
        this.tries--;
        sfx.hurt();
        this.triesText.setText(`Tries left: ${this.tries}`);
        this.cameras.main.shake(120, 0.006);
        if (this.tries <= 0) this.finish(false, '"LOUDER! I can\'t hear you!"');
      }
    };
    this.button(560, 390, 'SAY IT!', 260, 70, speak);
    this.onKey = (code) => { if (code === 'Space' || code === 'Enter') speak(); };
  }

  update(time, delta) {
    if (this.done) return;
    this.elapsed += delta / 1000;
    const frac = Math.max(0, 1 - this.elapsed / this.limit);
    this.timerBar.width = 640 * frac;
    this.timerBar.setFillStyle(frac > 0.3 ? 0xffd166 : 0xff4d4d);

    if (this.marker) {
      this.marker.x += this.markerDir * this.markerSpeed * (delta / 1000);
      if (this.marker.x > this.barX + this.barW) { this.marker.x = this.barX + this.barW; this.markerDir = -1; }
      if (this.marker.x < this.barX) { this.marker.x = this.barX; this.markerDir = 1; }
    }

    if (frac <= 0) this.finish(false, '"Too slow, fresher!"');
  }

  finish(success, msg) {
    if (this.done) return;
    this.done = true;
    this.say(msg);
    if (success) sfx.win(); else sfx.fail();
    this.add.text(480, 440, success ? 'ESCAPED!' : 'YOU LOST A LIFE', {
      fontFamily: FONT, fontSize: '26px', color: success ? '#06d6a0' : '#ff4d4d', fontStyle: 'bold', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5);
    this.time.delayedCall(1300, () => {
      const cb = this.onDone;
      this.scene.stop();
      cb(success);
    });
  }
}
