import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { getBest, seenHowTo, markHowToSeen } from '../storage.js';
import { rng } from '../art/pixels.js';
import { enterFullscreen, addFullscreenButton, isIOS, isStandalone } from '../mobile.js';
import { endSession } from '../net/session.js';

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

  init(data) {
    this.toast = data?.toast;
  }

  create() {
    const cx = 480;
    endSession(this.game); // coming back to the menu leaves any co-op room
    this.picker = null; // the menu is reused, so forget the picker from last time
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
      'Gang bombs? Call the POLICE or start a REBELLION!',
      'Escape the seniors  ·  Stay fresh, even in a water cut',
      `Survive ${CONFIG.bossNight - 1} nights, then face ${CONFIG.bossName} on BOSS NIGHT!`,
    ];
    this.add.text(cx, 334, how.join('\n'), {
      fontFamily: FONT, fontSize: '15px', color: '#ffffff', align: 'center', lineSpacing: 3, stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    const touch = this.sys.game.device.input.touch;
    let controls = touch ? 'Left side: move  ·  ACT button: knock / interact' : 'WASD / Arrows: move  ·  SPACE: knock / interact  ·  M: mute';
    if (touch && isIOS() && !isStandalone()) controls += '\niPhone tip: Share → "Add to Home Screen" for full screen';
    this.add.text(cx, 414, controls, {
      align: 'center',
      fontFamily: FONT, fontSize: '14px', color: '#adb5bd', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    const btn = this.add.rectangle(cx - 305, 462, 280, 56, 0xffcc00).setStrokeStyle(4, 0x3d2c00).setInteractive({ useHandCursor: true });
    const label = this.add.text(cx - 305, 464, '▶ PLAY', { fontFamily: TITLE_FONT, fontSize: '18px', color: '#1a1020' }).setOrigin(0.5);
    this.tweens.add({ targets: [btn, label], scale: 1.05, duration: 600, yoyo: true, repeat: -1 });
    const story = this.add.rectangle(cx, 462, 280, 56, 0xff9f1c).setStrokeStyle(4, 0x3d2c00).setInteractive({ useHandCursor: true });
    this.add.text(cx, 464, '📖 STORY', { fontFamily: TITLE_FONT, fontSize: '16px', color: '#1a1020' }).setOrigin(0.5);
    story.on('pointerup', () => {
      sfx.unlock();
      this.scene.start('StoryMenu');
    });
    const coop = this.add.rectangle(cx + 305, 462, 280, 56, 0x80ffdb).setStrokeStyle(4, 0x1a1020).setInteractive({ useHandCursor: true });
    this.add.text(cx + 305, 464, '👥 WITH A FRIEND', { fontFamily: TITLE_FONT, fontSize: '13px', color: '#1a1020' }).setOrigin(0.5);
    coop.on('pointerup', () => {
      sfx.unlock();
      this.scene.start('Lobby');
    });
    if (this.toast) {
      const t = this.add.text(cx, 142, this.toast, {
        fontFamily: FONT, fontSize: '16px', color: '#ffffff', backgroundColor: '#d62828', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setDepth(10);
      this.tweens.add({ targets: t, alpha: 0, delay: 3500, duration: 800 });
    }

    const bests = ['easy', 'hard'].map((m) => [m, getBest(m)]).filter(([, b]) => b > 0);
    if (bests.length) {
      this.add.text(cx, 515, `BEST · ${bests.map(([m, b]) => `${CONFIG.modes[m].name} ${b}`).join('  ·  ')}`, {
        fontFamily: FONT, fontSize: '16px', color: '#80ffdb', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);
    }

    if (touch) addFullscreenButton(this, 40, 30);

    // Online TOP 10
    const topBtn = this.add.rectangle(90, 516, 160, 36, 0x9d4edd).setStrokeStyle(3, 0x1a1020).setInteractive({ useHandCursor: true });
    this.add.text(90, 517, '🏆 TOP 10', { fontFamily: TITLE_FONT, fontSize: '11px', color: '#ffffff' }).setOrigin(0.5);
    topBtn.on('pointerup', () => this.scene.start('Leaderboard'));

    // First time: show "How to play", then the mode picker
    const start = () => {
      if (seenHowTo()) this.showModePicker(1);
      else this.openHowTo(() => this.showModePicker(1));
    };
    btn.on('pointerup', start);

    const help = this.add.rectangle(870, 516, 150, 36, 0x1d3557).setStrokeStyle(3, 0x80ffdb).setInteractive({ useHandCursor: true });
    this.add.text(870, 517, '❓ HOW TO PLAY', { fontFamily: TITLE_FONT, fontSize: '10px', color: '#ffffff' }).setOrigin(0.5);
    help.on('pointerup', () => this.openHowTo());

    this.input.keyboard.once('keydown-SPACE', start);
    this.input.keyboard.once('keydown-ENTER', start);
  }

  // The menu waits (paused) underneath while the pages are open
  openHowTo(then) {
    if (this.picker) return;
    sfx.unlock();
    markHowToSeen();
    this.scene.pause();
    this.scene.launch('HowTo', {
      onDone: () => {
        this.scene.resume();
        then?.();
      },
    });
  }

  // EASY or HARD? Starts Night 1 (or Boss Night) in the chosen mode.
  showModePicker(night) {
    if (this.picker) return;
    sfx.unlock();
    const c = this.add.container(0, 0).setDepth(50);
    this.picker = c;
    const shade = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.8).setInteractive(); // blocks clicks behind
    c.add(shade);
    c.add(this.add.text(480, 60, night === CONFIG.bossNight ? 'BOSS NIGHT · CHOOSE A MODE' : 'CHOOSE A MODE', {
      fontFamily: TITLE_FONT, fontSize: '22px', color: '#ffe066', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5));

    const go = (mode) => {
      enterFullscreen(this);
      if (night === CONFIG.bossNight) sfx.engine(); else sfx.knock();
      this.scene.start('NightIntro', { night, score: 0, knocks: 0, mode });
    };
    [['easy', 270, 0x1b4332, ['face_player', 'face_warden']], ['hard', 690, 0x3a0610, ['face_senior', 'face_senior', 'face_senior']]].forEach(([mode, x, bg, faces]) => {
      const m = CONFIG.modes[mode];
      const color = Phaser.Display.Color.HexStringToColor(m.color).color;
      const card = this.add.rectangle(x, 280, 360, 330, bg).setStrokeStyle(4, color).setInteractive({ useHandCursor: true });
      c.add(card);
      c.add(this.add.text(x, 145, m.name, { fontFamily: TITLE_FONT, fontSize: '30px', color: m.color, stroke: '#000', strokeThickness: 6 }).setOrigin(0.5));
      c.add(this.add.text(x, 185, m.title, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
      faces.forEach((f, i) => c.add(this.add.image(x + (i - (faces.length - 1) / 2) * 70, 250, f).setScale(0.32)));
      c.add(this.add.text(x, 330, `"${m.intro}"`, {
        fontFamily: FONT, fontSize: '15px', color: '#caf0f8', align: 'center', wordWrap: { width: 320 },
      }).setOrigin(0.5));
      const sc = m.seniors;
      c.add(this.add.text(x, 385, `${'♥'.repeat(m.lives)}  ·  ${sc.max === 0 ? 'no' : `${sc.base || 0}–${sc.max}`} seniors`, {
        fontFamily: FONT, fontSize: '16px', color: m.color,
      }).setOrigin(0.5));
      const best = getBest(mode);
      c.add(this.add.text(x, 418, best ? `Best: ${best}` : 'No score yet', { fontFamily: FONT, fontSize: '15px', color: '#adb5bd' }).setOrigin(0.5));
      card.on('pointerup', () => go(mode));
    });
    c.add(this.add.text(480, 480, this.sys.game.device.input.touch ? 'Tap a mode to start' : 'Click a mode, or press E (Easy) / H (Hard)', {
      fontFamily: FONT, fontSize: '16px', color: '#adb5bd',
    }).setOrigin(0.5));
    const close = this.add.text(900, 40, '✕', { fontFamily: FONT, fontSize: '32px', color: '#ffffff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    c.add(close);
    const closePicker = () => { c.destroy(); this.picker = null; };
    close.on('pointerup', closePicker);
    this.input.keyboard.once('keydown-E', () => this.picker === c && go('easy'));
    this.input.keyboard.once('keydown-H', () => this.picker === c && go('hard'));
    this.input.keyboard.once('keydown-ESC', () => this.picker === c && closePicker());
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
