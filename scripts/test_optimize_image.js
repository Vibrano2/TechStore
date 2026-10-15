import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const testImg = path.join(rootDir, 'src', 'assets', 'icons', 'products', '027-portable-mini-projector.png');
const outImg = path.join(rootDir, 'scripts', 'test_out.png');

console.log('Original size:', (fs.statSync(testImg).size / 1024).toFixed(1), 'KB');

const metadata = await sharp(testImg).metadata();
console.log('Original dimensions:', metadata.width, 'x', metadata.height, 'hasAlpha:', metadata.hasAlpha);

await sharp(testImg)
  .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
  .png({ compressionLevel: 9, effort: 7 })
  .toFile(outImg);

console.log('Optimized size:', (fs.statSync(outImg).size / 1024).toFixed(1), 'KB');
const outMeta = await sharp(outImg).metadata();
console.log('Optimized dimensions:', outMeta.width, 'x', outMeta.height, 'hasAlpha:', outMeta.hasAlpha);
fs.unlinkSync(outImg);
