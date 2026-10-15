import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getDirectorySize(dirPath) {
  let totalBytes = 0;
  let fileCount = 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      totalBytes += stat.size;
      fileCount++;
    }
  }
  return { totalBytes, fileCount, totalMB: (totalBytes / (1024 * 1024)).toFixed(2) };
}

const productIconsDir = path.join(rootDir, 'src', 'assets', 'icons', 'products');
const distAssetsDir = path.join(rootDir, 'dist', 'assets');

console.log('=== ASSET SIZE MEASUREMENT ===');
if (fs.existsSync(productIconsDir)) {
  const iconStats = getDirectorySize(productIconsDir);
  console.log(`Source Product Images: ${iconStats.fileCount} files, ${iconStats.totalMB} MB`);
}

if (fs.existsSync(distAssetsDir)) {
  const distFiles = fs.readdirSync(distAssetsDir);
  let jsBytes = 0;
  let cssBytes = 0;
  let imgBytes = 0;
  for (const f of distFiles) {
    const full = path.join(distAssetsDir, f);
    const sz = fs.statSync(full).size;
    if (f.endsWith('.js')) jsBytes += sz;
    else if (f.endsWith('.css')) cssBytes += sz;
    else imgBytes += sz;
  }
  console.log(`Dist JavaScript: ${(jsBytes / 1024).toFixed(1)} KB`);
  console.log(`Dist CSS: ${(cssBytes / 1024).toFixed(1)} KB`);
  console.log(`Dist Images: ${(imgBytes / (1024 * 1024)).toFixed(2)} MB`);
}

// Check sharp or similar installed
try {
  await import('sharp');
  console.log('Sharp image optimization library: AVAILABLE');
} catch {
  console.log('Sharp image optimization library: NOT INSTALLED');
}
