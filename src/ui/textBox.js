// A real HTML text box placed on top of the game canvas (Phaser has no text input).
// It follows the canvas when the screen changes (full screen, rotation, phone keyboard opening).
//   x, y, w, h are in game coordinates (960 x 540). Returns the <input>; call remove() to get rid of it.
export function makeTextBox(scene, { x, y, w, h, fontSize, maxLength, placeholder = '', upper = false, onEnter }) {
  const box = document.createElement('input');
  Object.assign(box, { maxLength, placeholder, autocomplete: 'off', spellcheck: false });
  if (upper) box.autocapitalize = 'characters';
  Object.assign(box.style, {
    position: 'fixed', textAlign: 'center', fontFamily: '"Press Start 2P", monospace', textTransform: upper ? 'uppercase' : 'none',
    color: '#1a1020', background: '#fff3b0', border: '4px solid #1a1020', borderRadius: '6px', zIndex: 5,
    userSelect: 'text', webkitUserSelect: 'text', touchAction: 'manipulation', boxSizing: 'border-box',
  });
  box.addEventListener('keydown', (e) => {
    e.stopPropagation(); // typing (e.g. SPACE) must not reach the game's key controls
    if (e.key === 'Enter') onEnter?.();
  });
  const place = () => {
    const home = document.fullscreenElement ?? document.body;
    if (box.parentElement !== home) home.appendChild(box);
    const canvas = scene.game.canvas.getBoundingClientRect();
    const k = canvas.width / 960;
    Object.assign(box.style, {
      left: `${canvas.left + (x - w / 2) * k}px`, top: `${canvas.top + (y - h / 2) * k}px`,
      width: `${w * k}px`, height: `${h * k}px`, fontSize: `${fontSize * k}px`,
    });
  };
  place();
  document.addEventListener('fullscreenchange', place);
  scene.scale.on('resize', place);
  const timer = setTimeout(() => { place(); box.focus(); }, 150);
  box.remove = () => {
    clearTimeout(timer);
    document.removeEventListener('fullscreenchange', place);
    scene.scale.off('resize', place);
    Element.prototype.remove.call(box);
  };
  scene.events.once('shutdown', () => box.remove());
  return box;
}
