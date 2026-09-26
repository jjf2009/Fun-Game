// Builds the game and packs dist/ into hostel-nights-itch.zip for uploading to itch.io.
// Run with: npm run build:itch   (see ITCH.md)
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import AdmZip from 'adm-zip';

execSync('npx vite build', { stdio: 'inherit' });

const DIST = 'dist';
const OUT = 'hostel-nights-itch.zip';
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
};
walk(DIST);

// itch.io needs index.html at the top of the zip, fewer than 1000 files, and under 500 MB in total
const size = files.reduce((sum, f) => sum + statSync(f).size, 0);
if (!files.includes(join(DIST, 'index.html'))) throw new Error('dist/index.html is missing');
if (files.length >= 1000) throw new Error(`Too many files for itch.io: ${files.length}`);
if (size >= 500 * 1024 * 1024) throw new Error('The game is too big for itch.io (500 MB limit)');

const zip = new AdmZip();
for (const f of files) {
  const inZip = relative(DIST, f).split('\\').join('/');
  const folder = inZip.includes('/') ? inZip.slice(0, inZip.lastIndexOf('/')) : '';
  zip.addLocalFile(f, folder);
}
zip.writeZip(OUT);
console.log(`\n✅ ${OUT}: ${files.length} files, ${(size / 1024 / 1024).toFixed(1)} MB unzipped. Upload it on itch.io (see ITCH.md).`);
