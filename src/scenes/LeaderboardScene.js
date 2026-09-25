import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { BOARDS, leaderboardReady, topScores } from '../leaderboard.js';
import { formatTime } from './StoryMenuScene.js';

// The online TOP 10, with a tab for each board (EASY / HARD / STORY).
export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  init(data) {
    this.board = data.board ?? 'easy';
  }

  create() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0b0d1f, 0x0b0d1f, 0x2d1b4e, 0x2d1b4e, 1);
    bg.fillRect(0, 0, 960, 540);
    this.add.text(480, 44, '🏆 TOP 10', { fontFamily: TITLE_FONT, fontSize: '28px', color: '#ffe066', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);

    this.tabs = Object.entries(BOARDS).map(([key, b], i) => {
      const x = 480 + (i - 1) * 190;
      const r = this.add.rectangle(x, 100, 170, 44, 0x1d1a2b).setStrokeStyle(3, 0x6c757d).setInteractive({ useHandCursor: true });
      const t = this.add.text(x, 101, b.label, { fontFamily: TITLE_FONT, fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
      r.on('pointerup', () => this.show(key));
      return { key, r, t };
    });
    this.list = this.add.container(0, 0);
    this.note = this.add.text(480, 300, '', { fontFamily: FONT, fontSize: '18px', color: '#adb5bd', align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5);

    const back = this.add.text(80, 500, '← MENU', { fontFamily: TITLE_FONT, fontSize: '14px', color: '#ffffff', backgroundColor: '#6c757d', padding: { x: 10, y: 8 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Menu'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
    this.input.keyboard.on('keydown-LEFT', () => this.step(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.step(1));
    this.show(this.board);
  }

  step(d) {
    const keys = Object.keys(BOARDS);
    this.show(keys[(keys.indexOf(this.board) + d + keys.length) % keys.length]);
  }

  async show(board) {
    this.board = board;
    for (const { key, r, t } of this.tabs) {
      r.setFillStyle(key === board ? 0xffcc00 : 0x1d1a2b).setStrokeStyle(3, key === board ? 0x3d2c00 : 0x6c757d);
      t.setColor(key === board ? '#1a1020' : '#ffffff');
    }
    this.list.removeAll(true);
    if (!leaderboardReady()) {
      this.note.setText('The online leaderboard is not set up yet.\n\n(Whoever runs this game: add your Firebase config to CONFIG.leaderboard in src/config.js. See the README.)');
      return;
    }
    this.note.setText('Loading...');
    let rows;
    try {
      rows = await topScores(board);
    } catch {
      if (this.board === board && this.sys.isActive()) this.note.setText('Could not load the scores. Check your internet and try again.');
      return;
    }
    if (this.board !== board || !this.sys.isActive()) return; // switched tab / left while loading
    this.note.setText(rows.length ? '' : BOARDS[board].lowerIsBetter ? 'No times yet. Finish the whole story to be the first!' : 'No scores yet. Be the first!');
    this.list.add(this.add.text(480, 138, BOARDS[board].lowerIsBetter ? 'Fastest full story runs' : `Highest scores in ${CONFIG.modes[board].name} mode`, {
      fontFamily: FONT, fontSize: '15px', color: '#adb5bd',
    }).setOrigin(0.5));
    const medals = ['🥇', '🥈', '🥉'];
    rows.forEach((row, i) => {
      const y = 172 + i * 31;
      const color = i === 0 ? '#ffd700' : i < 3 ? '#ffe8a3' : '#ffffff';
      const style = { fontFamily: FONT, fontSize: '20px', color };
      this.list.add(this.add.rectangle(480, y, 560, 28, 0xffffff, i % 2 ? 0.04 : 0.09));
      this.list.add(this.add.text(230, y, medals[i] ?? `${i + 1}.`, style).setOrigin(0, 0.5));
      this.list.add(this.add.text(290, y, `${row.name}${row.coop ? ' 👥' : ''}`, style).setOrigin(0, 0.5));
      this.list.add(this.add.text(730, y, BOARDS[board].lowerIsBetter ? formatTime(row.score) : String(row.score), style).setOrigin(1, 0.5));
    });
  }
}
