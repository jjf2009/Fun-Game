import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { unlockBoss } from '../storage.js';
import { gotoScene } from '../net/session.js';

const FLAVOR = {
  old: [
    'The college security guard is at the gate... fast asleep, as usual.',
    'The guards sleep. The seniors don\'t. They rule the corridors after 10 PM.',
    'The outsider gang was spotted near the boundary wall again...',
    `Rumour: ${CONFIG.wardenName} is doing surprise checks for non-hostellers tonight.`,
    'The water tank was empty since morning. Nobody knows why.',
  ],
  security: [
    'Special security guards the gate now. They actually stay awake.',
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
    if (night === CONFIG.bossNight) {
      this.bossCard();
      return;
    }
    if (firstSecurityNight) {
      this.storyCard();
      return;
    }
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

    const eraTitle = era === 'old' ? 'THE OLD DAYS · The guards sleep, the seniors rule' : 'THE SECURITY ERA';
    this.add.text(480, 185, eraTitle, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: era === 'old' ? '#ff8fa3' : '#90e0ef' }).setOrigin(0.5);

    const flavor = night === 1 ? FLAVOR.old[0] : Phaser.Utils.Array.GetRandom(FLAVOR[era]);
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

    this.waitForStart(tap);
  }

  // Night 4: why special security came to the hostel. Told plainly, not as a joke.
  storyCard() {
    this.add.text(480, 56, 'WHAT CHANGED', {
      fontFamily: TITLE_FONT, fontSize: '26px', color: '#caf0f8', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);
    const story = [
      'Back then, the college security guards slept through the night.',
      'With nobody watching, the seniors did whatever they wanted.',
      '',
      'Then one night, after an event, a junior was dragged out',
      'of the hostel and beaten up by seniors.',
      '',
      'After that, the college finally brought in SPECIAL SECURITY.',
    ];
    this.add.text(480, 205, story.join('\n'), {
      fontFamily: FONT, fontSize: '20px', color: '#ffffff', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);
    this.add.image(480, 345, 'guard').setScale(2.2);
    this.add.text(480, 388, `NIGHT ${this.data_.night} · A NEW ERA`, { fontFamily: TITLE_FONT, fontSize: '16px', color: '#90e0ef' }).setOrigin(0.5);
    this.add.text(480, 414, 'Ragging is a crime. If it happens to you or a friend, report it:', {
      fontFamily: FONT, fontSize: '15px', color: '#ffd166', align: 'center',
    }).setOrigin(0.5);
    this.add.text(480, 440, 'ANTI-RAGGING HELPLINE 1800-180-5522 (FREE)', {
      fontFamily: TITLE_FONT, fontSize: '11px', color: '#ffd166', align: 'center',
    }).setOrigin(0.5);
    const tap = this.add.text(480, 485, this.sys.game.device.input.touch ? 'Tap to begin' : 'Press SPACE or click to begin', {
      fontFamily: FONT, fontSize: '20px', color: '#adb5bd',
    }).setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    this.waitForStart(tap);
  }

  // The finale: the outsider gang's boss arrives on 3 bikes.
  bossCard() {
    unlockBoss();
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x3a0610, 0x3a0610, 0x0b0d1f, 0x0b0d1f, 1);
    bg.fillRect(0, 0, 960, 540);
    this.time.delayedCall(300, () => sfx.engine());

    this.add.text(480, 60, 'BOSS NIGHT', {
      fontFamily: TITLE_FONT, fontSize: '48px', color: '#ff4d6d', stroke: '#2a0008', strokeThickness: 10,
    }).setOrigin(0.5).setShadow(4, 4, '#000', 0, true, true);

    this.add.rectangle(200, 250, 190, 190, 0x1d1a2b).setStrokeStyle(4, 0xffd700);
    const face = this.add.image(200, 250, 'face_boss').setScale(0.92);
    this.tweens.add({ targets: face, angle: { from: -2, to: 2 }, duration: 500, yoyo: true, repeat: -1 });
    this.add.text(200, 365, CONFIG.bossName, { fontFamily: TITLE_FONT, fontSize: '16px', color: '#ffd700', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    this.add.text(200, 390, 'Leader of the outsider gang', { fontFamily: FONT, fontSize: '15px', color: '#adb5bd' }).setOrigin(0.5);

    const story = [
      `"They're back... ${CONFIG.bossName} and his gang,`,
      '3 bikes, TRIPLE SEAT, bombs in their pockets.',
      'Tonight they want to blow up the hostel."',
      '',
      '📸  Photograph each bike when it stops at the wall',
      '📝  File anti-ragging complaints at the ANTI-RAGGING CELL',
      '⛔  Get all 3 bikes SUSPENDED to save the hostel!',
    ];
    this.add.text(330, 150, story.join('\n'), {
      fontFamily: FONT, fontSize: '19px', color: '#ffffff', lineSpacing: 8, stroke: '#000', strokeThickness: 3,
    });

    // the three bikes rolling across the bottom
    ['bike', 'bike_boss', 'bike'].forEach((key, i) => {
      const b = this.add.image(-100 - i * 150, 430, key).setScale(key === 'bike_boss' ? 2.2 : 2);
      this.tweens.add({ targets: b, x: 1100 - i * 150, duration: 4200, repeat: -1, delay: i * 150 });
    });

    this.add.text(480, 505, `Score: ${this.data_.score}   Lives: ${'♥'.repeat(this.data_.lives)}`, {
      fontFamily: FONT, fontSize: '16px', color: '#80ffdb',
    }).setOrigin(0.5);
    const tap = this.add.text(480, 480, this.sys.game.device.input.touch ? 'Tap to face them' : 'Press SPACE to face them', {
      fontFamily: FONT, fontSize: '20px', color: '#ffd166',
    }).setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    this.waitForStart(tap);
  }

  waitForStart(tap) {
    this.cameras.main.fadeIn(400);
    // Co-op friend: the host decides when the night starts
    if (this.data_.mp === 'guest') {
      tap.setText('Waiting for your friend to start...');
      return;
    }
    this.started = false;
    const go = () => {
      if (this.started) return;
      this.started = true;
      const { mp, ...data } = this.data_;
      gotoScene(this, 'Game', data);
    };
    // Small delay so a tap from the previous screen doesn't skip this card.
    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', go);
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-ENTER', go);
    });
  }
}
