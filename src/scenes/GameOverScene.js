import Phaser from 'phaser';
import { CONFIG, FONT } from '../config.js';
import { getBest, saveBest } from '../storage.js';

const TITLES = [
  [0, 'Innocent Fresher'],
  [300, 'Corridor Menace'],
  [800, 'Door Knocking Legend'],
  [1500, 'Warden\'s Worst Nightmare'],
  [3000, 'Hostel God'],
];

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { score, night, knocks } = this.result;
    const isNewBest = saveBest(score);
    const title = TITLES.filter(([min]) => score >= min).pop()[1];

    this.add.text(480, 90, 'SUSPENDED FROM HOSTEL!', {
      fontFamily: FONT, fontSize: '44px', color: '#ff4d6d', fontStyle: 'bold', stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(480, 150, `Rank: ${title}`, { fontFamily: FONT, fontSize: '22px', color: '#ffe066' }).setOrigin(0.5);

    const lines = [
      `Score: ${score}${isNewBest ? '  (NEW BEST!)' : ''}`,
      `Nights survived: ${night - 1}`,
      `Doors knocked: ${knocks}`,
      `Best score: ${getBest()}`,
    ];
    this.add.text(480, 250, lines.join('\n'), {
      fontFamily: FONT, fontSize: '20px', color: '#ffffff', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);

    const again = this.add.rectangle(480, 380, 280, 60, 0xffcc00).setStrokeStyle(4, 0x000000).setInteractive({ useHandCursor: true });
    this.add.text(480, 380, 'PLAY AGAIN', { fontFamily: FONT, fontSize: '24px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);

    const share = this.add.text(480, 450, 'Copy score to share on WhatsApp', {
      fontFamily: FONT, fontSize: '16px', color: '#80ffdb', backgroundColor: '#00000088', padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    share.on('pointerdown', () => {
      const text = `I scored ${score} in ${CONFIG.gameTitle} (${title}) and survived ${night - 1} nights at ${CONFIG.hostelName}! Beat me: ${window.location.href}`;
      navigator.clipboard?.writeText(text).then(() => share.setText('Copied! Paste it in the group 😎'), () => share.setText(text));
    });

    const restart = () => this.scene.start('Menu');
    again.on('pointerdown', restart);
    this.time.delayedCall(600, () => this.input.keyboard.once('keydown-SPACE', restart));
  }
}
