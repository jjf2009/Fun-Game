import { CONFIG } from '../config.js';

// Co-op session helpers: keep both devices on the same screen.
//
// The host decides everything. When the host changes screen, it tells the friend to change too.

const MP_SCENES = ['Game', 'UI', 'Ragging', 'NightIntro', 'GameOver', 'Victory', 'Lobby', 'Menu'];

// Use instead of scene.scene.start() for screens that both players should see.
export function gotoScene(scene, key, data = {}) {
  const net = scene.game.net;
  if (net?.role === 'host' && net.connected) {
    net.send({ t: 'scene', key, data });
    scene.scene.start(key, { ...data, mp: 'host' });
  } else {
    scene.scene.start(key, { ...data, mp: null });
  }
}

// Called once when a co-op connection is made. Handles screen changes and disconnects.
export function startSession(game, net) {
  game.net = net;
  net.on('data', (msg) => {
    if (net.role === 'guest' && msg.t === 'scene') switchTo(game, msg.key, { ...msg.data, mp: 'guest' });
    if (msg.t === 'bye') net.lost();
  });
  net.on('closed', () => {
    if (game.net !== net) return;
    endSession(game);
    if (net.role === 'guest') {
      switchTo(game, 'Menu', { toast: 'Lost connection to your friend.' });
    } else {
      game.events.emit('banner', '👋 Your friend left. You are playing solo now.', '#ffafcc');
      game.events.emit('friend-left');
    }
  });
}

export function endSession(game) {
  const net = game.net;
  if (!net) return;
  game.net = null;
  net.send({ t: 'bye' });
  setTimeout(() => net.destroy(), 300);
}

function switchTo(game, key, data) {
  for (const k of MP_SCENES) {
    if (game.scene.isActive(k) || game.scene.isPaused(k)) game.scene.stop(k);
  }
  game.scene.start(key, data);
}

// PLAY AGAIN on the Game Over / Victory screens.
//  Solo: back to the menu. Co-op host: restart Night 1 for both. Co-op friend: wait for the host, or leave.
export function coopEndButtons(scene, mp, againBtn, againLabel) {
  const game = scene.game;
  const toMenu = () => {
    endSession(game);
    scene.scene.start('Menu');
  };
  if (mp === 'guest') {
    againLabel.setText('LEAVE');
    scene.add.text(againBtn.x, againBtn.y - 50, 'Waiting for your friend to play again...', {
      fontFamily: '"Pixelify Sans", monospace', fontSize: '16px', color: '#adb5bd',
    }).setOrigin(0.5);
    againBtn.on('pointerup', toMenu);
    return () => {}; // SPACE does nothing here; the host decides
  }
  if (mp === 'host' && game.net) {
    const restart = () => {
      if (!game.net) return toMenu();
      return gotoScene(scene, 'NightIntro', { night: 1, score: 0, lives: CONFIG.lives, knocks: 0 });
    };
    againBtn.on('pointerup', restart);
    const quit = scene.add.text(againBtn.x + againBtn.width / 2 + 60, againBtn.y, 'MENU', {
      fontFamily: '"Pixelify Sans", monospace', fontSize: '18px', color: '#ffffff', backgroundColor: '#6c757d', padding: { x: 10, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    quit.on('pointerup', toMenu);
    return restart;
  }
  againBtn.on('pointerup', toMenu);
  return toMenu;
}
