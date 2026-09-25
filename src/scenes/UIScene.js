import Phaser from 'phaser';
import { CONFIG, FONT } from '../config.js';
import { input } from '../controls.js';
import { addFullscreenButton } from '../mobile.js';

// The HUD drawn on top of the game: score, lives, clock, freshness, event banners
// and (on phones) the on-screen joystick + action button.
export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.gs = this.scene.get('Game');
    this.isTouch = this.sys.game.device.input.touch;
    const style = { fontFamily: FONT, fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };

    this.add.rectangle(480, 18, 960, 36, 0x000000, 0.5);
    this.nightText = this.add.text(12, 9, '', style);
    this.clockText = this.add.text(480, 9, '', { ...style, color: '#ffe066' }).setOrigin(0.5, 0);
    this.scoreText = this.add.text(948, 9, '', style).setOrigin(1, 0);
    this.add.rectangle(8, 42, 196, 58, 0x000000, 0.45).setOrigin(0).setStrokeStyle(2, 0xffffff, 0.15);
    this.hearts = Array.from({ length: 4 }, (_, i) => this.add.image(26 + i * 26, 56, 'heart').setScale(1.1));
    const drop = this.add.image(24, 84, 'drop');
    const freshBg = this.add.rectangle(40, 84, 152, 12, 0x000000, 0.7).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.3);
    this.freshBar = this.add.rectangle(41, 84, 150, 10, 0x4cc9f0).setOrigin(0, 0.5);
    this.freshParts = [drop, freshBg, this.freshBar]; // hidden in story mode (no water cuts there)
    this.comboText = this.add.text(12, 106, '', { ...style, fontSize: '14px', color: '#80ffdb' });
    this.statusText = this.add.text(948, 44, '', { ...style, fontSize: '15px', align: 'right' }).setOrigin(1, 0);
    this.hintText = this.add.text(480, this.isTouch ? 440 : 515, '', {
      ...style, fontSize: '17px', backgroundColor: '#000000aa', padding: { x: 8, y: 4 },
    }).setOrigin(0.5);

    this.slots = [false, false, false];
    this.queue = [];
    this.game.events.on('banner', this.showBanner, this);
    this.events.once('shutdown', () => this.game.events.off('banner', this.showBanner, this));

    if (this.isTouch) this.createTouchControls();
  }

  createTouchControls() {
    this.input.addPointer(2);
    addFullscreenButton(this, 780, 18);
    this.joyBase = this.add.circle(130, 420, 60, 0xffffff, 0.1).setStrokeStyle(2, 0xffffff, 0.35);
    this.joyThumb = this.add.circle(130, 420, 26, 0xffffff, 0.35);
    this.joyPointer = null;

    const btn = this.add.circle(860, 425, 52, 0xffcc00, 0.35).setStrokeStyle(3, 0xffcc00, 0.9).setInteractive();
    this.add.text(860, 425, 'ACT', { fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerdown', () => {
      input.queueAction();
      btn.setFillStyle(0xffcc00, 0.7);
    });
    btn.on('pointerup', () => btn.setFillStyle(0xffcc00, 0.35));

    this.input.on('pointerdown', (p) => {
      if (p.x < 480 && this.joyPointer === null) {
        this.joyPointer = p.id;
        this.joyBase.setPosition(p.x, p.y);
        this.joyThumb.setPosition(p.x, p.y);
      }
    });
    this.input.on('pointermove', (p) => {
      if (p.id !== this.joyPointer) return;
      let dx = p.x - this.joyBase.x;
      let dy = p.y - this.joyBase.y;
      const d = Math.hypot(dx, dy);
      if (d > 50) { dx = (dx / d) * 50; dy = (dy / d) * 50; }
      this.joyThumb.setPosition(this.joyBase.x + dx, this.joyBase.y + dy);
      input.x = Math.abs(dx) > 8 ? dx / 50 : 0;
      input.y = Math.abs(dy) > 8 ? dy / 50 : 0;
    });
    this.input.on('pointerup', (p) => {
      if (p.id !== this.joyPointer) return;
      this.joyPointer = null;
      input.x = 0;
      input.y = 0;
      this.joyBase.setPosition(130, 420);
      this.joyThumb.setPosition(130, 420);
    });
  }

  // Banners use fixed "slots" so they never overlap. Extra banners wait in a queue.
  showBanner(text, color = '#ffffff') {
    const slot = this.slots.findIndex((used) => !used);
    if (slot < 0) {
      this.queue.push([text, color]);
      return;
    }
    this.slots[slot] = true;
    const t = this.add.text(480, 128 + slot * 46, text, {
      fontFamily: FONT, fontSize: '16px', color, stroke: '#000000', strokeThickness: 5, fontStyle: 'bold',
      align: 'center', wordWrap: { width: 820 }, backgroundColor: '#00000066', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, duration: 200, yoyo: true, hold: 2600,
      onComplete: () => {
        t.destroy();
        this.slots[slot] = false;
        if (this.queue.length) this.showBanner(...this.queue.shift());
      },
    });
  }

  update() {
    const g = this.gs;
    const h = g?.hud?.();
    if (!h) return; // co-op friend: waiting for the first update from the host

    const era = h.era === 'old' ? 'The Old Days' : 'Security Era';
    const mode = CONFIG.modes[h.mode]?.name ?? '';
    this.nightText.setText(h.bossNight ? `FINAL NIGHT · ${mode}` : `NIGHT ${h.night} · ${era} · ${mode}${g.mp ? ' · CO-OP' : ''}`);
    this.scoreText.setText(`SCORE ${h.score}`);
    this.hearts.forEach((heart, i) => heart.setTexture(i < h.lives ? 'heart' : 'heartEmpty').setVisible(i < h.maxLives));
    if (h.lives !== this.lastLives) {
      if (this.lastLives !== undefined && h.lives < this.lastLives) this.tweens.add({ targets: this.hearts, scale: 1.6, duration: 120, yoyo: true });
      this.lastLives = h.lives;
    }

    // In-game clock: 11:00 PM -> 5:00 AM
    const elapsed = CONFIG.nightLength - Math.max(0, h.timeLeft);
    const mins = 23 * 60 + (elapsed / CONFIG.nightLength) * 360;
    const h24 = Math.floor(mins / 60) % 24;
    const m = Math.floor(mins % 60);
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    this.clockText.setText(h.bossNight ? '🏍️ BOSS NIGHT' : `🌙 ${h12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`);
    if (h.story) {
      this.nightText.setText(`📖 CHAPTER ${h.story.chapter} · ${h.story.title}`);
      this.clockText.setText(`🌙 ${h.story.time}`);
    }
    this.freshParts.forEach((o) => o.setVisible(!h.story));

    const f = Phaser.Math.Clamp(h.fresh, 0, 100) / 100;
    this.freshBar.width = 150 * f;
    this.freshBar.setFillStyle(f > 0.5 ? 0x4cc9f0 : f > 0.25 ? 0xffd166 : 0xff4d4d);
    this.comboText.setText(h.combo > 1 ? `COMBO x${h.combo}` : '');
    this.statusText.setText(h.status.join('\n'));

    const key = this.isTouch ? 'ACT' : 'SPACE';
    const plain = h.hidden || h.frozen || h.hint.endsWith('...') || h.hint.startsWith('Need');
    this.hintText.setText(h.hint ? (plain ? h.hint : `[${key}] ${h.hint}`) : '').setVisible(!!h.hint);
  }
}
