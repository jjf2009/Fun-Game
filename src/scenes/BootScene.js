import Phaser from 'phaser';
import { PEOPLE, RESIDENTS, personCanvas, sleeperCanvas, bikeCanvas, tileCanvases, propCanvases, lightCanvas, coneCanvas } from '../art/pixels.js';
import { loadPortraits } from '../art/portraits.js';
import { FONT } from '../config.js';

// Creates every picture the game uses (pixel-art sprites, tiles, portraits) before the menu starts.
// To use real image files later, load them here, e.g. this.load.image('player', 'assets/player.png').
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.add.text(480, 270, 'Loading hostel...', { fontFamily: FONT, fontSize: '24px', color: '#ffe066' }).setOrigin(0.5);

    // Characters: <key> = standing, <key>_1 / <key>_2 = walking frames
    for (const [key, look] of Object.entries(PEOPLE)) {
      this.textures.addCanvas(key, personCanvas(look, 0));
      this.textures.addCanvas(`${key}_1`, personCanvas(look, 1));
      this.textures.addCanvas(`${key}_2`, personCanvas(look, 2));
      this.anims.create({
        key: `${key}-walk`,
        frames: [{ key: `${key}_1` }, { key }, { key: `${key}_2` }, { key }],
        frameRate: 9,
        repeat: -1,
      });
    }

    // People who live in the rooms: res0..res5 (+ walking frames) and a sleeping-in-bed picture each
    RESIDENTS.forEach((look, i) => {
      const key = `res${i}`;
      this.textures.addCanvas(key, personCanvas(look, 0));
      this.textures.addCanvas(`${key}_1`, personCanvas(look, 1));
      this.textures.addCanvas(`${key}_2`, personCanvas(look, 2));
      this.textures.addCanvas(`${key}_sleep`, sleeperCanvas(look));
      this.anims.create({ key: `${key}-walk`, frames: [{ key: `${key}_1` }, { key }, { key: `${key}_2` }, { key }], frameRate: 9, repeat: -1 });
    });

    // Boss Night bikes (3 riders each)
    this.textures.addCanvas('bike', bikeCanvas([PEOPLE.gang, PEOPLE.gang, PEOPLE.gang]));
    this.textures.addCanvas('bike_boss', bikeCanvas([PEOPLE.boss, PEOPLE.gang, PEOPLE.gang]));

    const tiles = tileCanvases();
    this.registry.set('tiles', tiles);
    for (const [key, canvas] of Object.entries(propCanvases())) this.textures.addCanvas(key, canvas);
    this.textures.addCanvas('light', lightCanvas());
    this.textures.addCanvas('cone', coneCanvas());

    this.makeTexture('shadow', 96, (g) => {
      g.fillStyle(0xff0000, 0.22); g.fillCircle(48, 48, 46);
      g.lineStyle(3, 0xff3333, 0.9); g.strokeCircle(48, 48, 44);
      g.lineStyle(2, 0xff3333, 0.6); g.lineBetween(48, 30, 48, 66); g.lineBetween(30, 48, 66, 48);
    });
    this.makeTexture('spark', 6, (g) => { g.fillStyle(0xffffff); g.fillRect(0, 0, 6, 6); });
    this.makeTexture('dust', 8, (g) => { g.fillStyle(0xd8d0e8); g.fillCircle(4, 4, 4); });

    loadPortraits(this.textures).then(() => this.scene.start('Menu'));
  }

  makeTexture(key, size, draw) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
