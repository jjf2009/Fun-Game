import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { getBest } from '../storage.js';
import { rng } from '../art/pixels.js';

const CAST = [
  ['face_player', 'YOU', '#9bf6ff'],
  ['face_warden', CONFIG.wardenName.toUpperCase(), '#ffd166'],
  ['face_senior', 'SENIOR', '#ff8fa3'],
  ['face_guest', CONFIG.guestName.toUpperCase(), '#80ffdb'],
  ['face_gang', 'OUTSIDER', '#ff6b6b'],
];

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = 480;
    this.drawSkyline();

    const title = this.add.text(cx, 62, CONFIG.gameTitle, {
      fontFamily: TITLE_FONT, fontSize: '44px', color: '#ffe066', stroke: '#3d2c00', strokeThickness: 10,
    }).setOrigin(0.5);
    title.setShadow(4, 4, '#000000', 0, true, true);
    this.tweens.add({ targets: title, y: 68, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(cx, 112, `Knock. Run. Survive the night at ${CONFIG.hostelName}.`, {
      fontFamily: FONT, fontSize: '18px', color: '#caf0f8', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Cast of characters (pixel-art portraits)
    CAST.forEach(([key, name, color], i) => {
      const x = cx + (i - 2) * 130;
      const card = this.add.rectangle(x, 205, 104, 124, 0x1d1a2b, 0.9).setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color);
      const face = this.add.image(x, 195, key).setScale(0.48);
      this.add.text(x, 254, name, { fontFamily: FONT, fontSize: '14px', color, fontStyle: 'bold' }).setOrigin(0.5);
      this.tweens.add({ targets: [card, face], y: '-=5', duration: 700 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    const how = [
      'Knock on doors & RUN  ·  Stay out of the torchlight',
      `Warden check? Sneak ${CONFIG.guestName} out to the gate`,
      'Gang bombs? Dodge the red circles & ring the bell',
      'Escape the seniors  ·  Stay fresh, even in a water cut',
    ];
    this.add.text(cx, 330, how.join('\n'), {
      fontFamily: FONT, fontSize: '16px', color: '#ffffff', align: 'center', lineSpacing: 6, stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    const touch = this.sys.game.device.input.touch;
    this.add.text(cx, 398, touch ? 'Left side: move  ·  ACT button: knock / interact' : 'WASD / Arrows: move  ·  SPACE: knock / interact  ·  M: mute', {
      fontFamily: FONT, fontSize: '14px', color: '#adb5bd', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    const btn = this.add.rectangle(cx, 455, 330, 60, 0xffcc00).setStrokeStyle(4, 0x3d2c00).setInteractive({ useHandCursor: true });
    const label = this.add.text(cx, 457, 'START NIGHT 1', { fontFamily: TITLE_FONT, fontSize: '18px', color: '#1a1020' }).setOrigin(0.5);
    this.tweens.add({ targets: [btn, label], scale: 1.05, duration: 600, yoyo: true, repeat: -1 });

    const best = getBest();
    if (best > 0) this.add.text(cx, 510, `BEST SCORE: ${best}`, { fontFamily: FONT, fontSize: '16px', color: '#80ffdb', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);

    const start = () => {
      sfx.unlock();
      sfx.knock();
      this.scene.start('NightIntro', { night: 1, score: 0, lives: CONFIG.lives, knocks: 0 });
    };
    btn.on('pointerdown', start);
    this.input.keyboard.once('keydown-SPACE', start);
    this.input.keyboard.once('keydown-ENTER', start);
  }

  // Night sky with stars, a moon, and the hostel building with random lit windows.
  drawSkyline() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0b0d1f, 0x0b0d1f, 0x2a1f4a, 0x2a1f4a, 1);
    g.fillRect(0, 0, 960, 540);
    const r = rng(7);
    for (let i = 0; i < 90; i++) {
      const star = this.add.rectangle(r() * 960, r() * 300, 2, 2, 0xffffff, 0.3 + r() * 0.7);
      this.tweens.add({ targets: star, alpha: 0.1, duration: 800 + r() * 2000, yoyo: true, repeat: -1, delay: r() * 2000 });
    }
    this.add.circle(860, 70, 34, 0xfff3b0);
    this.add.circle(848, 62, 34, 0x0f1025);

    // Building silhouette at the bottom
    g.fillStyle(0x151226);
    g.fillRect(0, 430, 960, 110);
    g.fillRect(60, 380, 360, 160);
    g.fillRect(540, 390, 360, 150);
    for (const [bx, by, cols, rows] of [[80, 395, 11, 4], [560, 405, 11, 4]]) {
      for (let c = 0; c < cols; c++) {
        for (let rw = 0; rw < rows; rw++) {
          const lit = r() < 0.35;
          const w = this.add.rectangle(bx + c * 30 + 8, by + rw * 34 + 8, 14, 18, lit ? 0xffd166 : 0x2a2540, lit ? 0.9 : 1).setOrigin(0);
          if (lit && r() < 0.3) this.tweens.add({ targets: w, alpha: 0.2, duration: 200, yoyo: true, repeat: -1, repeatDelay: 1500 + r() * 4000 });
        }
      }
    }
  }
}
