import Phaser from 'phaser';
import { CONFIG, FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { getBest } from '../storage.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = 480;
    // Starry night background
    for (let i = 0; i < 80; i++) {
      this.add.circle(Phaser.Math.Between(0, 960), Phaser.Math.Between(0, 540), Phaser.Math.FloatBetween(0.5, 1.8), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
    }
    this.add.circle(840, 80, 36, 0xfff3b0);
    this.add.circle(826, 72, 36, 0x0d0f1a);

    this.add.text(cx, 80, CONFIG.gameTitle, {
      fontFamily: FONT, fontSize: '64px', color: '#ffe066', fontStyle: 'bold', stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(cx, 135, `Knock. Run. Survive the night at ${CONFIG.hostelName}.`, {
      fontFamily: FONT, fontSize: '16px', color: '#caf0f8',
    }).setOrigin(0.5);

    const how = [
      '🚪 Knock on doors for points, then RUN before they open',
      `🔦 Stay out of ${CONFIG.wardenName}'s flashlight`,
      `🚨 Warden check: sneak ${CONFIG.guestName} out to the main gate`,
      '💣 Outsider gang throwing bombs? Dodge the red circles & ring the bell',
      '😈 Seniors roam in the Old Days, so avoid them or do their tasks',
      '🚿 Keep fresh at the bathroom. Water cut? Find the bucket!',
    ];
    this.add.text(cx, 250, how.join('\n'), {
      fontFamily: FONT, fontSize: '15px', color: '#ffffff', lineSpacing: 8,
    }).setOrigin(0.5);

    const touch = this.sys.game.device.input.touch;
    this.add.text(cx, 360, touch ? 'Left side: move · ACT button: knock / interact' : 'WASD / Arrows: move · SPACE: knock / interact · M: mute', {
      fontFamily: FONT, fontSize: '13px', color: '#adb5bd',
    }).setOrigin(0.5);

    const btn = this.add.rectangle(cx, 430, 300, 64, 0xffcc00).setStrokeStyle(4, 0x000000).setInteractive({ useHandCursor: true });
    const label = this.add.text(cx, 430, 'START NIGHT 1', { fontFamily: FONT, fontSize: '26px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: [btn, label], scale: 1.05, duration: 600, yoyo: true, repeat: -1 });

    const best = getBest();
    if (best > 0) this.add.text(cx, 495, `Best score: ${best}`, { fontFamily: FONT, fontSize: '16px', color: '#80ffdb' }).setOrigin(0.5);

    const start = () => {
      sfx.unlock();
      sfx.knock();
      this.scene.start('NightIntro', { night: 1, score: 0, lives: CONFIG.lives, knocks: 0 });
    };
    btn.on('pointerdown', start);
    this.input.keyboard.once('keydown-SPACE', start);
    this.input.keyboard.once('keydown-ENTER', start);
  }
}
