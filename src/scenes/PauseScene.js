import Phaser from 'phaser';
import { FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { endSession } from '../net/session.js';

// Pause menu (⏸ button, ESC or P). Solo: the game is frozen underneath.
// Co-op: the game keeps running, because your friend is still playing.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  init(data) {
    this.d = data;
  }

  create() {
    const { coop, story } = this.d;
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.7).setInteractive(); // blocks taps on the game
    this.add.rectangle(480, 270, 420, 400, 0x1d1a2b).setStrokeStyle(4, 0xffd166);
    this.add.text(480, 110, 'PAUSED', { fontFamily: TITLE_FONT, fontSize: '28px', color: '#ffe066', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    if (coop) {
      this.add.text(480, 148, 'Co-op: the night goes on, your friend keeps playing!', { fontFamily: FONT, fontSize: '14px', color: '#ffafcc' }).setOrigin(0.5);
    }

    const button = (y, label, color, cb) => {
      const r = this.add.rectangle(480, y, 300, 52, color).setStrokeStyle(3, 0x1a1020).setInteractive({ useHandCursor: true });
      const t = this.add.text(480, y + 1, label, { fontFamily: TITLE_FONT, fontSize: '14px', color: '#1a1020' }).setOrigin(0.5);
      r.on('pointerup', () => { sfx.tick(); cb(); });
      return t;
    };
    button(200, '▶ RESUME', 0xffcc00, () => this.resume());
    const soundLabel = () => (sfx.muted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON');
    const sound = button(265, soundLabel(), 0x80ffdb, () => { sfx.toggleMute(); sound.setText(soundLabel()); });
    button(330, '❓ HOW TO PLAY', 0xcaf0f8, () => this.howTo());
    button(410, story ? '✕ QUIT TO STORY MENU' : '✕ QUIT TO MENU', 0xff8fa3, () => this.quit());

    // Wait a moment so the key that opened the menu doesn't close it again
    this.time.delayedCall(250, () => {
      this.input.keyboard.on('keydown-ESC', () => this.resume());
      this.input.keyboard.on('keydown-P', () => this.resume());
    });
  }

  resume() {
    const cb = this.d.onResume;
    this.scene.stop();
    cb?.();
  }

  howTo() {
    this.scene.pause();
    this.scene.launch('HowTo', { onDone: () => this.scene.resume() });
    this.scene.bringToTop('HowTo');
  }

  quit() {
    if (this.d.coop) endSession(this.game);
    for (const k of ['Game', 'UI']) this.scene.stop(k);
    this.scene.start(this.d.story ? 'StoryMenu' : 'Menu');
  }
}
