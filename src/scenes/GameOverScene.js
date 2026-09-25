import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { getBest, saveBest } from '../storage.js';
import { shareText } from '../mobile.js';
import { coopEndButtons } from '../net/session.js';
import { addSubmitButton } from '../ui/submitScore.js';

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
    const mode = this.result.mode ?? 'easy';
    const isNewBest = saveBest(score, mode);
    const title = TITLES.filter(([min]) => score >= min).pop()[1];

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2a0f1a, 0x2a0f1a, 0x0b0d1f, 0x0b0d1f, 1);
    bg.fillRect(0, 0, 960, 540);
    this.add.text(480, 60, 'SUSPENDED FROM HOSTEL!', {
      fontFamily: TITLE_FONT, fontSize: '26px', color: '#ff4d6d', stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(480, 105, `Rank: ${title}`, { fontFamily: FONT, fontSize: '24px', color: '#ffe066', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.rectangle(170, 250, 170, 170, 0x1d1a2b).setStrokeStyle(3, 0xffd166);
    this.add.image(170, 250, 'face_warden').setScale(0.82);
    this.add.text(170, 355, `${CONFIG.wardenName}:\n"Pack your bags!"`, {
      fontFamily: FONT, fontSize: '16px', color: '#ffd166', align: 'center',
    }).setOrigin(0.5);

    const lines = [
      `Score: ${score}${isNewBest ? '  (NEW BEST!)' : ''}`,
      `Nights survived: ${night - 1}`,
      `Doors knocked: ${knocks}`,
      `Best (${CONFIG.modes[mode].name}): ${getBest(mode)}`,
    ];
    this.add.text(560, 240, lines.join('\n'), {
      fontFamily: FONT, fontSize: '24px', color: '#ffffff', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);

    const again = this.add.rectangle(560, 390, 300, 60, 0xffcc00).setStrokeStyle(4, 0x3d2c00).setInteractive({ useHandCursor: true });
    const againLabel = this.add.text(560, 392, 'PLAY AGAIN', { fontFamily: TITLE_FONT, fontSize: '18px', color: '#1a1020' }).setOrigin(0.5);

    const share = this.add.text(560, 460, navigator.share ? 'Share your score on WhatsApp' : 'Copy score to share on WhatsApp', {
      fontFamily: FONT, fontSize: '16px', color: '#80ffdb', backgroundColor: '#00000088', padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    share.on('pointerup', () => {
      const text = `I scored ${score} in ${CONFIG.gameTitle} (${title}) and survived ${night - 1} nights at ${CONFIG.hostelName}! Beat me: ${window.location.href}`;
      shareText(text, (msg) => share.setText(msg));
    });

    addSubmitButton(this, 170, 440, { board: mode, score, coop: !!this.result.mp });

    const restart = coopEndButtons(this, this.result.mp, again, againLabel);
    this.time.delayedCall(600, () => this.input.keyboard.on('keydown-SPACE', () => !this.lbPanel && restart()));
  }
}
