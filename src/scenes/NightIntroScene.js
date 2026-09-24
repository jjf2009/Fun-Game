import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';

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

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0b0d1f, 0x0b0d1f, 0x2a1f4a, 0x2a1f4a, 1);
    bg.fillRect(0, 0, 960, 540);
    this.add.text(480, 110, `NIGHT ${night}`, {
      fontFamily: TITLE_FONT, fontSize: '52px', color: '#ffe066', stroke: '#3d2c00', strokeThickness: 10,
    }).setOrigin(0.5).setShadow(4, 4, '#000', 0, true, true);
    // Who to watch out for tonight
    const faces = era === 'old' ? ['face_senior', 'face_gang', 'face_warden'] : ['face_warden', 'face_guest'];
    faces.forEach((key, i) => {
      const x = 480 + (i - (faces.length - 1) / 2) * 110;
      this.add.rectangle(x, 360, 90, 90, 0x1d1a2b).setStrokeStyle(2, 0x6c757d);
      this.add.image(x, 360, key).setScale(0.44);
    });

    const eraTitle = era === 'old'
      ? 'THE OLD DAYS · No full-time security'
      : firstSecurityNight ? 'A NEW ERA · Security has arrived!' : 'THE SECURITY ERA';
    this.add.text(480, 185, eraTitle, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: era === 'old' ? '#ff8fa3' : '#90e0ef' }).setOrigin(0.5);

    const flavor = firstSecurityNight ? FLAVOR.security[0] : Phaser.Utils.Array.GetRandom(FLAVOR[era]);
    this.add.text(480, 240, `"${flavor}"`, {
      fontFamily: FONT, fontSize: '19px', color: '#ffffff', align: 'center', wordWrap: { width: 760 },
    }).setOrigin(0.5);

    this.add.text(480, 290, `Score: ${this.data_.score}   Lives: ${'♥'.repeat(this.data_.lives)}`, {
      fontFamily: FONT, fontSize: '18px', color: '#80ffdb',
    }).setOrigin(0.5);

    const tap = this.add.text(480, 470, this.sys.game.device.input.touch ? 'Tap to begin' : 'Press SPACE or click to begin', {
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
