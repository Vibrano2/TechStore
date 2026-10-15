import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const iconsDir = path.join(rootDir, 'src', 'assets', 'icons');
const origDir = path.join(iconsDir, 'original');

if (!fs.existsSync(origDir)) {
  fs.mkdirSync(origDir, { recursive: true });
}

const files = fs.readdirSync(iconsDir).filter(f => f.endsWith('.png') && fs.statSync(path.join(iconsDir, f)).isFile());

console.log(`Found ${files.length} category icon files.`);

for (const f of files) {
  const p = path.join(iconsDir, f);
  const origP = path.join(origDir, f);
  
  if (!fs.existsSync(origP)) {
    fs.copyFileSync(p, origP);
  }
  
  const temp = path.join(iconsDir, `_temp_${f}`);
  await sharp(origP)
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 7 })
    .toFile(temp);
  
  fs.copyFileSync(temp, p);
  fs.unlinkSync(temp);
  console.log(`Optimized ${f}: ${(fs.statSync(p).size / 1024).toFixed(1)} KB (was ${(fs.statSync(origP).size / 1024).toFixed(1)} KB)`);
}
