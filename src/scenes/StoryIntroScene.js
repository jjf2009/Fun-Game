import Phaser from 'phaser';
import { FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { CHAPTERS } from '../story/chapters.js';

// STORY: the card before each chapter.
//  Page 1 (if you just finished a chapter): how it ended.  Page 2: the new chapter's intro.
//  If you got caught too often, it says so and lets you retry.
export default class StoryIntroScene extends Phaser.Scene {
  constructor() {
    super('StoryIntro');
  }

  init(data) {
    this.d = data;
  }

  create() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0b0d1f, 0x0b0d1f, 0x1f2a4a, 0x1f2a4a, 1);
    bg.fillRect(0, 0, 960, 540);
    this.page = this.add.container(0, 0);
    this.cameras.main.fadeIn(400);
    const outro = this.d.outroOf ? CHAPTERS[this.d.outroOf]?.outro : null;
    if (outro?.length) this.showOutro(outro);
    else this.showCard();
  }

  text(x, y, str, style) {
    const t = this.add.text(x, y, str, { fontFamily: FONT, color: '#ffffff', align: 'center', ...style }).setOrigin(0.5);
    this.page.add(t);
    return t;
  }

  tapPrompt(label) {
    const t = this.text(480, 490, `${label}  ${this.sys.game.device.input.touch ? '(tap)' : '(SPACE / click)'}`, { fontSize: '18px', color: '#adb5bd' });
    this.tweens.add({ targets: t, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
  }

  // Wait for a tap/key (with a short delay so the previous tap doesn't count)
  onNext(fn) {
    this.time.delayedCall(600, () => {
      const go = () => {
        this.input.off('pointerup', go);
        this.input.keyboard.off('keydown-SPACE', go);
        this.input.keyboard.off('keydown-ENTER', go);
        fn();
      };
      this.input.on('pointerup', go);
      this.input.keyboard.on('keydown-SPACE', go);
      this.input.keyboard.on('keydown-ENTER', go);
    });
  }

  showOutro(lines) {
    this.text(480, 80, `CHAPTER ${this.d.outroOf} COMPLETE`, { fontFamily: TITLE_FONT, fontSize: '22px', color: '#80ffdb' });
    lines.forEach((l, i) => {
      const t = this.text(480, 170 + i * 50, l, { fontSize: '21px', wordWrap: { width: 820 }, color: l.startsWith('"') ? '#ffd166' : '#ffffff' });
      t.setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, delay: 300 + i * 700, duration: 500 });
    });
    this.tapPrompt('Continue');
    this.onNext(() => {
      this.page.removeAll(true);
      this.showCard();
    });
  }

  showCard() {
    const n = this.d.chapter;
    const ch = CHAPTERS[n];
    this.text(480, 48, 'STORY · SPEAK UP', { fontSize: '16px', color: '#adb5bd' });
    this.text(480, 100, `CHAPTER ${n}`, { fontFamily: TITLE_FONT, fontSize: '40px', color: '#ffe066', stroke: '#3d2c00', strokeThickness: 8 });
    this.text(480, 150, ch.title, { fontFamily: TITLE_FONT, fontSize: '20px', color: '#caf0f8' });
    if (this.d.failed) {
      this.text(480, 195, 'You got caught too many times. Try again!', { fontSize: '19px', color: '#ff6b6b', fontStyle: 'bold' });
      sfx.fail();
    }
    this.text(480, 262, ch.card.join('\n'), { fontSize: '19px', lineSpacing: 8, wordWrap: { width: 820 } });
    ch.faces.forEach((f, i) => {
      const x = 480 + (i - (ch.faces.length - 1) / 2) * 100;
      this.page.add(this.add.rectangle(x, 385, 84, 84, 0x1d1a2b).setStrokeStyle(2, 0x6c757d));
      this.page.add(this.add.image(x, 385, f).setScale(0.4));
    });
    this.text(940 - 60, 30, `🌙 ${ch.time}`, { fontSize: '16px', color: '#ffd166' });
    this.tapPrompt(this.d.failed ? 'Try again' : 'Begin');
    this.onNext(() => {
      sfx.knock();
      this.scene.start('Game', {
        story: n, mode: 'easy', lives: 3, score: 0, knocks: 0,
        storyTime: this.d.storyTime ?? 0, fullRun: this.d.fullRun ?? false,
      });
    });
  }
}

