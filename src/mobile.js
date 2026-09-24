import { FONT } from './config.js';

// Phone helpers: full screen, landscape lock, native share sheet.

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia?.('(display-mode: fullscreen)').matches
  || window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

// Must be called from a tap (browsers only allow full screen after a user gesture).
export function enterFullscreen(scene) {
  if (!scene.sys.game.device.input.touch) return;
  try {
    if (!scene.scale.isFullscreen && scene.scale.fullscreen.available) scene.scale.startFullscreen();
    screen.orientation?.lock?.('landscape').catch(() => {});
  } catch {
    // not supported (e.g. iPhone Safari): "Add to Home Screen" gives full screen instead
  }
}

// Small ⛶ button that toggles full screen (only shown where the browser supports it).
export function addFullscreenButton(scene, x, y) {
  if (!scene.scale.fullscreen.available) return null;
  const btn = scene.add.text(x, y, '⛶', {
    fontFamily: FONT, fontSize: '26px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 6, y: 0 },
  }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(50);
  btn.on('pointerup', () => {
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    else enterFullscreen(scene);
  });
  return btn;
}

// Opens the phone's share sheet (WhatsApp etc.), or copies the text on PC.
export function shareText(text, onDone) {
  if (navigator.share) {
    navigator.share({ title: 'Hostel Nights', text }).then(() => onDone?.('Shared! 😎'), () => {});
    return;
  }
  navigator.clipboard?.writeText(text).then(() => onDone?.('Copied! Paste it in the group 😎'), () => onDone?.(text));
}
