import Phaser from 'phaser';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/press-start-2p/400.css';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import NightIntroScene from './scenes/NightIntroScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import RaggingScene from './scenes/RaggingScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import VictoryScene from './scenes/VictoryScene.js';
import LobbyScene from './scenes/LobbyScene.js';

function startGame() {
  // ?renderer=canvas forces the simpler canvas renderer (handy for slow devices and automated tests)
  const renderer = new URLSearchParams(window.location.search).get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO;
  const game = new Phaser.Game({
    type: renderer,
    parent: 'game',
    width: 960,
    height: 540,
    backgroundColor: '#0d0f1a',
    pixelArt: true,
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    scene: [BootScene, MenuScene, NightIntroScene, GameScene, UIScene, RaggingScene, GameOverScene, VictoryScene, LobbyScene],
  });
  // Handy for debugging in the browser console.
  window.game = game;
}

// Wait for the pixel fonts, otherwise the first texts would use a fallback font.
Promise.all([
  document.fonts.load('16px "Pixelify Sans"'),
  document.fonts.load('bold 16px "Pixelify Sans"'),
  document.fonts.load('16px "Press Start 2P"'),
]).catch(() => {}).finally(startGame);
