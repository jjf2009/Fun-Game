import Phaser from 'phaser';
import { FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { CHAPTERS } from '../story/chapters.js';
import { storyProgress, storyBestTime } from '../storage.js';
import { enterFullscreen } from '../mobile.js';

export const formatTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

// STORY MODE menu: start the story from the beginning, or replay any chapter you've unlocked.
export default class StoryMenuScene extends Phaser.Scene {
  constructor() {
    super('StoryMenu');
  }

  create() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0b0d1f, 0x0b0d1f, 0x1f2a4a, 0x1f2a4a, 1);
    bg.fillRect(0, 0, 960, 540);
    const progress = storyProgress();

    this.add.text(480, 50, '📖 STORY: SPEAK UP', { fontFamily: TITLE_FONT, fontSize: '26px', color: '#ffe066', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.add.text(480, 98, 'The seniors rule the hostel at night. Nobody ever says anything.\nClick photos, convince the juniors, and complain to the warden.', {
      fontFamily: FONT, fontSize: '17px', color: '#caf0f8', align: 'center',
    }).setOrigin(0.5);

    const start = (n, fullRun) => {
      enterFullscreen(this);
      sfx.unlock();
      sfx.knock();
      this.scene.start('StoryIntro', { chapter: n, storyTime: 0, fullRun });
    };

    // NEW STORY (a full run from chapter 1 counts for your best time)
    const btn = this.add.rectangle(480, 170, 320, 54, 0xffcc00).setStrokeStyle(4, 0x3d2c00).setInteractive({ useHandCursor: true });
    this.add.text(480, 172, progress > 1 ? 'START OVER' : 'START STORY', { fontFamily: TITLE_FONT, fontSize: '16px', color: '#1a1020' }).setOrigin(0.5);
    btn.on('pointerup', () => start(1, true));

    this.add.text(480, 222, 'or replay a chapter:', { fontFamily: FONT, fontSize: '15px', color: '#adb5bd' }).setOrigin(0.5);
    for (let n = 1; n <= 4; n++) {
      const x = 480 + (n - 2.5) * 200;
      const open = n <= progress;
      const card = this.add.rectangle(x, 320, 180, 150, open ? 0x1d1a2b : 0x111111).setStrokeStyle(3, open ? 0x80ffdb : 0x444444);
      this.add.text(x, 272, `CHAPTER ${n}`, { fontFamily: TITLE_FONT, fontSize: '12px', color: open ? '#ffe066' : '#666666' }).setOrigin(0.5);
      this.add.text(x, 312, open ? CHAPTERS[n].title : '🔒', { fontFamily: TITLE_FONT, fontSize: open ? '13px' : '28px', color: open ? '#ffffff' : '#666666' }).setOrigin(0.5);
      this.add.text(x, 358, open ? (n < progress ? '✅ done' : '▶ play') : 'locked', { fontFamily: FONT, fontSize: '15px', color: open ? '#80ffdb' : '#666666' }).setOrigin(0.5);
      if (open) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerup', () => start(n, false));
      }
    }

    const best = storyBestTime();
    const finished = progress > 4;
    this.add.text(480, 430, finished ? `✅ Story complete!${best ? `  Best full-story time: ${formatTime(best)}` : ''}` : 'Finish all 4 chapters to see the ending.', {
      fontFamily: FONT, fontSize: '16px', color: '#ffd166',
    }).setOrigin(0.5);

    const back = this.add.text(80, 500, '← MENU', { fontFamily: TITLE_FONT, fontSize: '14px', color: '#ffffff', backgroundColor: '#6c757d', padding: { x: 10, y: 8 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Menu'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
    this.input.keyboard.once('keydown-SPACE', () => start(Math.min(progress, 4), progress === 1));
  }
}
