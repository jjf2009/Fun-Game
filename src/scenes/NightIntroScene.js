import Phaser from 'phaser';
import { CONFIG, FONT } from '../config.js';

const FLAVOR = {
  old: [
    'No full-time security yet. Seniors rule the corridors after 10 PM.',
    'The outsider gang was spotted near the boundary wall again...',
    `Rumour: ${CONFIG.wardenName} is doing surprise checks for non-hostellers tonight.`,
    'The water tank was empty since morning. Nobody knows why.',
  ],
  security: [
    'A security guard now sits at the main gate. The gang thinks twice.',
    `The anti-ragging squad is active. But ${CONFIG.wardenName} is stricter than ever.`,
    'New rule: no guests after 9 PM. Nobody follows it.',
    'Mess food was terrible again. Everyone is awake and angry.',
  ],
};

// The "Night N" story card between nights.
export default class NightIntroScene extends Phaser.Scene {
  constructor() {
    super('NightIntro');
  }

  init(data) {
    this.data_ = data;
  }

  create() {
    const { night } = this.data_;
    const era = night <= CONFIG.oldDaysNights ? 'old' : 'security';
    const firstSecurityNight = night === CONFIG.oldDaysNights + 1;

    this.add.text(480, 140, `NIGHT ${night}`, {
      fontFamily: FONT, fontSize: '72px', color: '#ffe066', fontStyle: 'bold', stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5);

    const eraTitle = era === 'old'
      ? 'THE OLD DAYS · No full-time security'
      : firstSecurityNight ? 'A NEW ERA · Security has arrived!' : 'THE SECURITY ERA';
    this.add.text(480, 220, eraTitle, { fontFamily: FONT, fontSize: '22px', color: era === 'old' ? '#ff8fa3' : '#90e0ef' }).setOrigin(0.5);

    const flavor = firstSecurityNight ? FLAVOR.security[0] : Phaser.Utils.Array.GetRandom(FLAVOR[era]);
    this.add.text(480, 290, `"${flavor}"`, {
      fontFamily: FONT, fontSize: '17px', color: '#ffffff', align: 'center', wordWrap: { width: 760 },
    }).setOrigin(0.5);

    this.add.text(480, 360, `Score: ${this.data_.score}   Lives: ${'♥'.repeat(this.data_.lives)}`, {
      fontFamily: FONT, fontSize: '18px', color: '#80ffdb',
    }).setOrigin(0.5);

    const tap = this.add.text(480, 450, this.sys.game.device.input.touch ? 'Tap to begin' : 'Press SPACE or click to begin', {
      fontFamily: FONT, fontSize: '20px', color: '#adb5bd',
    }).setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    this.cameras.main.fadeIn(400);
    this.started = false;
    const go = () => {
      if (this.started) return;
      this.started = true;
      this.scene.start('Game', this.data_);
    };
    // Small delay so a tap from the previous screen doesn't skip this card.
    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', go);
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-ENTER', go);
    });
  }
}
