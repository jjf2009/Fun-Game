import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { shareText } from '../mobile.js';
import { sfx } from '../sfx.js';
import { ENDING, REAL_HELP } from '../story/chapters.js';
import { saveStoryTime, storyBestTime } from '../storage.js';
import { formatTime } from './StoryMenuScene.js';
import { addSubmitButton } from '../ui/submitScore.js';

// STORY ending: what happened after the complaint, then real-world help.
export default class StoryEndScene extends Phaser.Scene {
  constructor() {
    super('StoryEnd');
  }

  init(data) {
    this.d = data;
  }

  create() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0b0d1f, 0x0b0d1f, 0x1b4332, 0x1b4332, 1);
    bg.fillRect(0, 0, 960, 540);
    this.page = this.add.container(0, 0);
    this.step = 0;
    this.isNewBest = this.d.fullRun ? saveStoryTime(this.d.storyTime) : false;
    sfx.win();
    this.showStep();
  }

  onNext(fn) {
    this.time.delayedCall(700, () => {
      const go = () => {
        this.input.off('pointerup', go);
        this.input.keyboard.off('keydown-SPACE', go);
        fn();
      };
      this.input.on('pointerup', go);
      this.input.keyboard.on('keydown-SPACE', go);
    });
  }

  showStep() {
    this.page.removeAll(true);
    if (this.step < ENDING.length) {
      const [title, body] = ENDING[this.step];
      const t = this.add.text(480, 150, title, { fontFamily: TITLE_FONT, fontSize: '26px', color: '#80ffdb' }).setOrigin(0.5);
      const b = this.add.text(480, 280, body, { fontFamily: FONT, fontSize: '22px', color: '#ffffff', align: 'center', lineSpacing: 10, wordWrap: { width: 820 } }).setOrigin(0.5);
      const hint = this.add.text(480, 480, 'tap / SPACE', { fontFamily: FONT, fontSize: '16px', color: '#adb5bd' }).setOrigin(0.5);
      this.page.add([t, b, hint]);
      b.setAlpha(0);
      this.tweens.add({ targets: b, alpha: 1, duration: 800 });
      this.step++;
      this.onNext(() => this.showStep());
      return;
    }
    this.showFinal();
  }

  showFinal() {
    const c = this.page;
    c.add(this.add.text(480, 50, 'YOU SPOKE UP.', { fontFamily: TITLE_FONT, fontSize: '32px', color: '#ffe066', stroke: '#3d2c00', strokeThickness: 8 }).setOrigin(0.5));
    ['face_j1', 'face_j2', 'face_player', 'face_j3', 'face_j4'].forEach((f, i) => {
      const img = this.add.image(480 + (i - 2) * 95, 128, f).setScale(i === 2 ? 0.45 : 0.36);
      c.add(img);
      this.tweens.add({ targets: img, y: 120, duration: 400 + i * 60, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    });
    if (this.d.fullRun) {
      const best = storyBestTime();
      c.add(this.add.text(480, 190, `Your time: ${formatTime(this.d.storyTime)}${this.isNewBest ? '  (NEW BEST!)' : `  ·  Best: ${formatTime(best)}`}`, {
        fontFamily: FONT, fontSize: '18px', color: '#80ffdb',
      }).setOrigin(0.5));
    }
    const share = this.add.text(480, 226, navigator.share ? '📲 Share the story on WhatsApp' : '📋 Copy a message to share on WhatsApp', {
      fontFamily: FONT, fontSize: '16px', color: '#80ffdb', backgroundColor: '#00000088', padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    share.on('pointerup', () => {
      const time = this.d.fullRun ? ` in ${formatTime(this.d.storyTime)}` : '';
      shareText(`✊ I finished "Speak Up" in Hostel Nights${time}: clicked photos of the ragging, convinced the juniors and complained to the warden.\nPlay it 👉 ${CONFIG.shareUrl}`, (msg) => share.setText(msg));
    });
    c.add(share);
    c.add(this.add.rectangle(480, 352, 820, 186, 0x000000, 0.45).setStrokeStyle(2, 0xffd166));
    c.add(this.add.text(480, 352, REAL_HELP.join('\n'), {
      fontFamily: FONT, fontSize: '17px', color: '#ffffff', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5));
    // A full run can go on the online STORY board (fastest time wins)
    const submit = this.d.fullRun ? addSubmitButton(this, 340, 490, { board: 'story', score: Math.round(this.d.storyTime), w: 260, label: '🏆 SUBMIT TIME' }) : null;
    if (submit) c.add([submit.btn, submit.label]);
    const mx = submit ? 620 : 480;
    const btn = this.add.rectangle(mx, 490, 260, 50, 0xffcc00).setStrokeStyle(4, 0x3d2c00).setInteractive({ useHandCursor: true });
    c.add(btn);
    c.add(this.add.text(mx, 492, 'MENU', { fontFamily: TITLE_FONT, fontSize: '16px', color: '#1a1020' }).setOrigin(0.5));
    btn.on('pointerup', () => this.scene.start('Menu'));
    this.events.emit('final-shown');
  }
}
