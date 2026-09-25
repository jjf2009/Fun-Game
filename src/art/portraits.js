// Pixel-art face portraits from the DiceBear "Pixel Art" collection (art is CC0 / public domain).
// Used in dialogs and menus. Change the options to restyle a character.
import { createAvatar } from '@dicebear/core';
import * as pixelArt from '@dicebear/pixel-art';

export const PORTRAITS = {
  face_player: { seed: 'you', hair: ['short05'], hairColor: ['28150a'], clothingColor: ['428bca'], skinColor: ['e0b687'], mouth: ['happy09'], glassesProbability: 0, beardProbability: 0, hatProbability: 0 },
  face_player2: { seed: 'friend', hair: ['short15'], hairColor: ['28150a'], clothingColor: ['ff6f69'], skinColor: ['cb9e6e'], mouth: ['happy05'], glassesProbability: 0, beardProbability: 0, hatProbability: 0 },
  face_warden: {
    seed: 'warden', hair: ['short11'], hairColor: ['28150a'], clothingColor: ['03396c'], skinColor: ['cb9e6e'], mouth: ['sad03'],
    glasses: ['light02'], glassesProbability: 100, beard: ['variant03'], beardProbability: 100, hat: ['variant04'], hatColor: ['2663a3'], hatProbability: 100,
  },
  face_senior: {
    seed: 'senior', hair: ['short18'], hairColor: ['28150a'], clothingColor: ['d11141'], skinColor: ['cb9e6e'], mouth: ['happy12'],
    glasses: ['dark01'], glassesProbability: 100, beardProbability: 0, hatProbability: 0,
  },
  face_guest: { seed: 'guest', hair: ['short02'], hairColor: ['603a14'], clothingColor: ['00b159'], skinColor: ['e0b687'], mouth: ['happy03'], hat: ['variant02'], hatColor: ['a62116'], hatProbability: 100, glassesProbability: 0, beardProbability: 0 },
  face_gang: {
    seed: 'gang', hair: ['short20'], hairColor: ['28150a'], clothingColor: ['ae0001'], skinColor: ['a26d3d'], mouth: ['sad07'],
    glasses: ['dark05'], glassesProbability: 100, beard: ['variant06'], beardProbability: 100, hat: ['variant07'], hatColor: ['2e1e05'], hatProbability: 100,
  },
  face_boss: {
    seed: 'bikebhai', hair: ['short24'], hairColor: ['28150a'], clothingColor: ['03396c'], skinColor: ['b68655'], mouth: ['happy12'],
    glasses: ['dark07'], glassesProbability: 100, beard: ['variant04'], beardProbability: 100, hat: ['variant08'], hatColor: ['a62116'], hatProbability: 100,
    accessories: ['variant04'], accessoriesColor: ['ffd700'], accessoriesProbability: 100,
  },
  face_student: { seed: 'student', hair: ['short13'], hairColor: ['603015'], clothingColor: ['ffc425'], skinColor: ['f5cfa0'], mouth: ['sad01'], glasses: ['light05'], glassesProbability: 100, beardProbability: 0, hatProbability: 0 },
};

// Converts each avatar SVG into a crisp 192x192 canvas texture.
export function loadPortraits(textures) {
  return Promise.all(Object.entries(PORTRAITS).map(([key, options]) => new Promise((resolve) => {
    const svg = createAvatar(pixelArt, { size: 192, ...options }).toString();
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 192;
      canvas.height = 192;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 192, 192);
      textures.addCanvas(key, canvas);
      resolve();
    };
    img.onerror = resolve;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  })));
}
