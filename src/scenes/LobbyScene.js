import Phaser from 'phaser';
import { CONFIG, FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { Net } from '../net/Net.js';
import { startSession, endSession, gotoScene } from '../net/session.js';
import { isBossUnlocked } from '../storage.js';
import { enterFullscreen } from '../mobile.js';
import { makeTextBox } from '../ui/textBox.js';

// PLAY WITH A FRIEND: one player creates a room and shares the 4-letter code, the other joins with it.
export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super('Lobby');
  }

  create() {
    endSession(this.game); // leave any old room
    this.net = null;
    this.input.keyboard.clearCaptures(); // let the code box receive every letter

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0b0d1f, 0x0b0d1f, 0x2a1f4a, 0x2a1f4a, 1);
    bg.fillRect(0, 0, 960, 540);
    this.add.text(480, 55, 'PLAY WITH A FRIEND', {
      fontFamily: TITLE_FONT, fontSize: '28px', color: '#ffe066', stroke: '#3d2c00', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.image(400, 130, 'face_player').setScale(0.4);
    this.add.image(560, 130, 'face_player2').setScale(0.4);
    this.add.text(480, 130, '+', { fontFamily: TITLE_FONT, fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(480, 200, 'You and your friend are roommates. Play on two phones or PCs.\nOne of you creates a room, the other joins with the code.', {
      fontFamily: FONT, fontSize: '17px', color: '#caf0f8', align: 'center',
    }).setOrigin(0.5);

    this.status = this.add.text(480, 395, '', {
      fontFamily: FONT, fontSize: '17px', color: '#ffffff', align: 'center', wordWrap: { width: 820 },
    }).setOrigin(0.5);

    this.panel = this.add.container(0, 0);
    this.showChoice();

    this.button(90, 500, 140, 44, '← MENU', 0x6c757d, () => {
      endSession(this.game);
      this.net?.destroy();
      this.scene.start('Menu');
    }, 14);

    this.events.once('shutdown', () => this.removeCodeBox());
  }

  button(x, y, w, h, label, color, onTap, size = 18, parent = null) {
    const r = this.add.rectangle(x, y, w, h, color).setStrokeStyle(4, 0x1a1020).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y + 2, label, { fontFamily: TITLE_FONT, fontSize: `${size}px`, color: '#1a1020' }).setOrigin(0.5);
    r.on('pointerup', () => { sfx.unlock(); onTap(); });
    parent?.add([r, t]);
    return [r, t];
  }

  clearPanel() {
    this.panel.removeAll(true);
    this.removeCodeBox();
  }

  showChoice() {
    this.clearPanel();
    this.status.setText('');
    this.button(300, 300, 280, 70, 'CREATE ROOM', 0xffcc00, () => this.createRoom(), 18, this.panel);
    this.button(660, 300, 280, 70, 'JOIN ROOM', 0x80ffdb, () => this.showJoin(), 18, this.panel);
  }

  // ---------- Host ----------

  createRoom() {
    enterFullscreen(this);
    this.clearPanel();
    this.status.setText('Creating room...');
    const net = new Net();
    this.net = net;
    net.on('code', (code) => {
      this.status.setText('Tell your friend this code. Waiting for them to join...');
      const t = this.add.text(480, 305, code, {
        fontFamily: TITLE_FONT, fontSize: '56px', color: '#ffe066', stroke: '#3d2c00', strokeThickness: 10, letterSpacing: 12,
      }).setOrigin(0.5);
      this.tweens.add({ targets: t, scale: 1.06, duration: 700, yoyo: true, repeat: -1 });
      this.panel.add(t);
    });
    net.on('connected', () => {
      startSession(this.game, net);
      sfx.win();
      this.clearPanel();
      this.status.setText('✅ Your friend joined! Ready when you are.');
      const bossReady = isBossUnlocked();
      // The host picks the mode; the friend gets the same one.
      let mode = 'easy';
      const modeBtns = {};
      const pick = (m) => {
        mode = m;
        for (const [k, [r]] of Object.entries(modeBtns)) r.setAlpha(k === m ? 1 : 0.35);
      };
      modeBtns.easy = this.button(360, 262, 220, 50, 'EASY', 0x80ffdb, () => pick('easy'), 16, this.panel);
      modeBtns.hard = this.button(600, 262, 220, 50, 'HARD', 0xff6b6b, () => pick('hard'), 16, this.panel);
      pick('easy');
      const startNight = (night) => gotoScene(this, 'NightIntro', { night, score: 0, knocks: 0, mode });
      this.button(bossReady ? 360 : 480, 335, 300, 58, 'START NIGHT 1', 0xffcc00, () => startNight(1), 16, this.panel);
      if (bossReady) this.button(680, 335, 220, 58, 'BOSS NIGHT', 0xd62828, () => startNight(CONFIG.bossNight), 14, this.panel);
    });
    net.on('error', (msg) => this.fail(msg));
    net.host();
  }

  // ---------- Friend ----------

  showJoin() {
    enterFullscreen(this);
    this.clearPanel();
    this.status.setText('Type the 4-letter code from your friend.');
    this.makeCodeBox();
    this.button(480, 330, 220, 56, 'JOIN', 0x80ffdb, () => this.join(), 18, this.panel);
  }

  join() {
    const code = (this.codeBox?.value || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (code.length !== 4) {
      this.status.setText('The code has 4 letters.');
      return;
    }
    this.clearPanel();
    this.status.setText(`Joining room ${code}...`);
    const net = new Net();
    this.net = net;
    net.on('connected', () => {
      startSession(this.game, net);
      sfx.win();
      this.status.setText('✅ Connected! Waiting for your friend to start the night...');
      this.add.image(480, 300, 'player2').setScale(2);
    });
    net.on('error', (msg) => this.fail(msg));
    net.join(code);
  }

  fail(msg) {
    this.net?.destroy();
    this.net = null;
    this.clearPanel();
    this.status.setText(`⚠️ ${msg}`);
    this.button(480, 300, 220, 56, 'TRY AGAIN', 0xffcc00, () => this.showChoice(), 16, this.panel);
  }

  // A real HTML text box on top of the game, so phones show their keyboard.
  // It must live inside the full-screen element, or the browser hides it in full-screen mode.
  makeCodeBox() {
    this.codeBox = makeTextBox(this, { x: 480, y: 262, w: 220, h: 60, fontSize: 34, maxLength: 4, placeholder: 'CODE', upper: true, onEnter: () => this.join() });
  }

  removeCodeBox() {
    this.codeBox?.remove();
    this.codeBox = null;
  }
}
