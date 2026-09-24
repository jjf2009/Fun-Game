import Phaser from 'phaser';

// Draws all the character and item pictures in code, so no image files are needed.
// To use real pixel art later, load images here with this.load.image('player', 'assets/player.png').
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    // Top-down people: shoulders (body color) + head, with a detail on top.
    this.makePerson('player', 0x3a86ff, 0xf1c27d, (g, c) => {
      g.fillStyle(0x222222); g.fillCircle(c, c - 3, 5); // hair
    });
    this.makePerson('warden', 0x8d6e3f, 0xe0ac69, (g, c) => {
      g.fillStyle(0x1d3557); g.fillCircle(c, c, 7); // cap
      g.fillStyle(0x0b1a2e); g.fillRect(c - 7, c + 3, 14, 3); // cap brim
    }, 17);
    this.makePerson('senior', 0xd62828, 0xc68642, (g, c) => {
      g.fillStyle(0x111111); g.fillCircle(c, c - 2, 6);
      g.fillStyle(0x000000); g.fillRect(c - 6, c, 12, 3); // sunglasses
    });
    this.makePerson('gang', 0x1b1b1b, 0x8d5524, (g, c) => {
      g.fillStyle(0xe63946); g.fillRect(c - 8, c - 3, 16, 4); // bandana
    });
    this.makePerson('student', 0xf77f00, 0xf1c27d, (g, c) => {
      g.fillStyle(0xffffff); g.fillRect(c - 12, c + 5, 24, 5); // towel
    });
    this.makePerson('guest', 0x2a9d8f, 0xe0ac69, (g, c) => {
      g.fillStyle(0xe9c46a); g.fillCircle(c, c - 2, 6); // cap
    });
    this.makePerson('guard', 0x6c757d, 0xc68642, (g, c) => {
      g.fillStyle(0x343a40); g.fillCircle(c, c, 7);
    }, 16);

    this.makeTexture('bomb', 20, (g) => {
      g.fillStyle(0x111111); g.fillCircle(10, 11, 8);
      g.lineStyle(2, 0x8d6e3f); g.lineBetween(10, 3, 14, 0);
      g.fillStyle(0xffd166); g.fillCircle(15, 1, 2);
    });
    this.makeTexture('shadow', 96, (g) => {
      g.fillStyle(0xff0000, 0.25); g.fillCircle(48, 48, 46);
      g.lineStyle(3, 0xff3333, 0.9); g.strokeCircle(48, 48, 44);
    });
    this.makeTexture('bucket', 30, (g) => {
      g.fillStyle(0x4361ee); g.fillRect(6, 8, 18, 18);
      g.fillStyle(0x4cc9f0); g.fillEllipse(15, 8, 20, 7);
      g.lineStyle(2, 0xdddddd); g.strokeCircle(15, 8, 11);
    });
    this.makeTexture('spark', 8, (g) => {
      g.fillStyle(0xffd166); g.fillCircle(4, 4, 4);
    });

    this.scene.start('Menu');
  }

  makeTexture(key, size, draw) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  makePerson(key, body, skin, extra, radius = 14) {
    const size = radius * 2 + 6;
    const c = size / 2;
    this.makeTexture(key, size, (g) => {
      g.fillStyle(0x000000, 0.35); g.fillEllipse(c, c + 3, radius * 2, radius * 1.5); // shadow
      g.fillStyle(body); g.fillCircle(c, c, radius);
      g.lineStyle(2, 0x000000, 0.6); g.strokeCircle(c, c, radius);
      g.fillStyle(skin); g.fillCircle(c, c, radius * 0.55);
      extra(g, c);
    });
  }
}
