import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { getBest, saveBest } from '../storage.js';
import { shareText } from '../mobile.js';
import { coopEndButtons } from '../net/session.js';

// You got the boss suspended. You win!
export default class VictoryScene extends Phaser.Scene {
  constructor() {
    super('Victory');
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { score, knocks } = this.result;
    const isNewBest = saveBest(score);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1b4332, 0x1b4332, 0x0b0d1f, 0x0b0d1f, 1);
    bg.fillRect(0, 0, 960, 540);
    // sunrise
    this.add.circle(480, 560, 180, 0xffd166, 0.25);
    this.add.circle(480, 560, 120, 0xffd166, 0.35);

    // confetti
    this.add.particles(480, -10, 'spark', {
      x: { min: -480, max: 480 }, speedY: { min: 60, max: 180 }, speedX: { min: -40, max: 40 },
      lifespan: 5000, frequency: 40, rotate: { min: 0, max: 360 }, scale: { min: 0.8, max: 1.6 },
      tint: [0xff4d6d, 0xffd166, 0x80ffdb, 0x4cc9f0, 0xffffff, 0x9d4edd],
    });

    const title = this.add.text(480, 60, 'YOU SAVED THE HOSTEL!', {
      fontFamily: TITLE_FONT, fontSize: '28px', color: '#ffe066', stroke: '#3d2c00', strokeThickness: 8,
    }).setOrigin(0.5).setShadow(4, 4, '#000', 0, true, true);
    this.tweens.add({ targets: title, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(480, 108, `${CONFIG.bossName} and his gang are SUSPENDED. ${CONFIG.hostelName} is safe!`, {
      fontFamily: FONT, fontSize: '18px', color: '#ffffff', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    // The hostel cheering for you
    const cast = [['face_guest', CONFIG.guestName], ['face_warden', CONFIG.wardenName], ['face_player', 'YOU - HOSTEL HERO'], ['face_student', 'Room 112'], ['face_senior', 'Senior']];
    cast.forEach(([key, name], i) => {
      const x = 480 + (i - 2) * 160;
      const big = i === 2;
      this.add.rectangle(x, 220, big ? 130 : 100, big ? 130 : 100, 0x1d1a2b).setStrokeStyle(3, big ? 0xffd700 : 0x80ffdb);
      const face = this.add.image(x, 220, key).setScale(big ? 0.62 : 0.48);
      this.tweens.add({ targets: face, y: 208, duration: 300 + i * 40, yoyo: true, repeat: -1, ease: 'Quad.easeOut', delay: i * 90 });
      this.add.text(x, big ? 300 : 285, name, { fontFamily: FONT, fontSize: big ? '16px' : '14px', color: big ? '#ffd700' : '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    });

    this.add.text(480, 360, [`Final score: ${score}${isNewBest ? '  (NEW BEST!)' : ''}`, `Doors knocked: ${knocks}   ·   Best: ${getBest()}`].join('\n'), {
      fontFamily: FONT, fontSize: '22px', color: '#ffffff', align: 'center', lineSpacing: 6, stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    const again = this.add.rectangle(480, 440, 300, 56, 0xffcc00).setStrokeStyle(4, 0x3d2c00).setInteractive({ useHandCursor: true });
    const againLabel = this.add.text(480, 442, 'PLAY AGAIN', { fontFamily: TITLE_FONT, fontSize: '18px', color: '#1a1020' }).setOrigin(0.5);

    const share = this.add.text(480, 500, navigator.share ? 'Share your score on WhatsApp' : 'Copy score to share on WhatsApp', {
      fontFamily: FONT, fontSize: '16px', color: '#80ffdb', backgroundColor: '#00000088', padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    share.on('pointerup', () => {
      const text = `I got ${CONFIG.bossName}'s gang SUSPENDED and saved ${CONFIG.hostelName} in ${CONFIG.gameTitle} with ${score} points! Can you? ${window.location.href}`;
      shareText(text, (msg) => share.setText(msg));
    });

    sfx.win();
    this.time.delayedCall(700, () => sfx.win());
    const restart = coopEndButtons(this, this.result.mp, again, againLabel);
    this.time.delayedCall(1500, () => this.input.keyboard.once('keydown-SPACE', restart));
  }
}
