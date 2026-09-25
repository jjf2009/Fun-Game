import { FONT, TITLE_FONT } from '../config.js';
import { sfx } from '../sfx.js';
import { BOARDS, leaderboardReady, savedName, cleanName, submitScore } from '../leaderboard.js';
import { makeTextBox } from './textBox.js';

// "🏆 SUBMIT SCORE" button for the end screens. Tapping it asks for your name and sends the score
// to the online TOP 10. Does nothing (no button) if the leaderboard isn't set up or the score is 0.
//   opts: { board: 'easy' | 'hard' | 'story', score, coop, w, label }
export function addSubmitButton(scene, x, y, opts) {
  if (!leaderboardReady() || !(opts.score > 0)) return null;
  const w = opts.w ?? 240;
  const btn = scene.add.rectangle(x, y, w, 48, 0x9d4edd).setStrokeStyle(3, 0x1a1020).setInteractive({ useHandCursor: true });
  const label = scene.add.text(x, y + 1, opts.label ?? '🏆 SUBMIT SCORE', { fontFamily: TITLE_FONT, fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
  let done = false;
  btn.on('pointerup', () => {
    if (done || scene.lbPanel) return;
    sfx.unlock();
    openNamePanel(scene, opts, (rank) => {
      done = true;
      btn.disableInteractive().setFillStyle(0x2a9d8f);
      label.setText(`✅ YOU ARE #${rank}`);
    });
  });
  return { btn, label };
}

function openNamePanel(scene, { board, score, coop }, onSaved) {
  const c = scene.add.container(0, 0).setDepth(100);
  scene.lbPanel = c;
  const block = scene.add.rectangle(480, 270, 960, 540, 0x000000, 0.7).setInteractive(); // stops taps reaching the screen behind
  c.add(block);
  c.add(scene.add.rectangle(480, 270, 560, 270, 0x1d1a2b).setStrokeStyle(4, 0xffd166));
  const what = BOARDS[board].lowerIsBetter ? `${Math.floor(score / 60)}:${String(Math.round(score % 60)).padStart(2, '0')}` : score;
  c.add(scene.add.text(480, 170, `🏆 ${BOARDS[board].label} TOP 10  ·  ${what}`, { fontFamily: TITLE_FONT, fontSize: '14px', color: '#ffd166' }).setOrigin(0.5));
  c.add(scene.add.text(480, 205, coop ? 'Your name (or both your names):' : 'Your name:', { fontFamily: FONT, fontSize: '17px', color: '#ffffff' }).setOrigin(0.5));
  const status = scene.add.text(480, 378, 'No real full names needed: a nickname is fine!', { fontFamily: FONT, fontSize: '14px', color: '#adb5bd' }).setOrigin(0.5);
  c.add(status);

  let sending = false;
  const close = () => {
    box.remove();
    c.destroy();
    scene.lbPanel = null;
  };
  const send = async () => {
    if (sending) return;
    const name = cleanName(box.value);
    if (!name) {
      status.setColor('#ff6b6b').setText('Type a name first.');
      return;
    }
    sending = true;
    status.setColor('#ffd166').setText('Sending...');
    try {
      const rank = await submitScore(board, name, score, !!coop);
      if (!scene.sys.isActive()) return;
      sfx.win();
      close();
      onSaved(rank);
    } catch (e) {
      sending = false;
      if (!scene.sys.isActive()) return;
      status.setColor('#ff6b6b').setText('Could not send (no internet?). Try again.');
    }
  };
  const box = makeTextBox(scene, { x: 480, y: 255, w: 380, h: 54, fontSize: 20, maxLength: 16, placeholder: 'NAME', onEnter: send });
  box.value = savedName();
  box.addEventListener('input', () => { if (!sending) status.setColor('#adb5bd').setText('No real full names needed: a nickname is fine!'); });

  const button = (bx, text, color, cb) => {
    const r = scene.add.rectangle(bx, 325, 180, 48, color).setStrokeStyle(3, 0x1a1020).setInteractive({ useHandCursor: true });
    r.on('pointerup', cb);
    c.add([r, scene.add.text(bx, 326, text, { fontFamily: TITLE_FONT, fontSize: '13px', color: '#1a1020' }).setOrigin(0.5)]);
  };
  button(385, 'SEND', 0x80ffdb, send);
  button(575, 'CANCEL', 0xadb5bd, () => { if (!sending) close(); });
}
