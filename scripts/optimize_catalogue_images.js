import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const productsDir = path.join(rootDir, 'src', 'assets', 'icons', 'products');
const originalsDir = path.join(rootDir, 'src', 'assets', 'icons', 'products_original');

if (!fs.existsSync(originalsDir)) {
  fs.mkdirSync(originalsDir, { recursive: true });
}

const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.png'));

console.log(`[Optimize] Found ${files.length} PNG product images.`);

let totalOriginalBytes = 0;
let totalOptimizedBytes = 0;
let processedCount = 0;

for (const file of files) {
  const srcPath = path.join(productsDir, file);
  const backupPath = path.join(originalsDir, file);
  
  const originalStats = fs.statSync(srcPath);
  totalOriginalBytes += originalStats.size;

  // 1. Preserve original
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(srcPath, backupPath);
  }

  // 2. Optimize image if > 400KB
  if (originalStats.size > 400 * 1024) {
    const tempOut = path.join(productsDir, `_temp_${file}`);
    try {
      await sharp(backupPath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9, effort: 7 })
        .toFile(tempOut);
      
      const newStats = fs.statSync(tempOut);
      fs.copyFileSync(tempOut, srcPath);
      fs.unlinkSync(tempOut);
      totalOptimizedBytes += newStats.size;
      processedCount++;
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
      if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
      totalOptimizedBytes += originalStats.size;
    }
  } else {
    totalOptimizedBytes += originalStats.size;
  }
}

const origMB = (totalOriginalBytes / (1024 * 1024)).toFixed(2);
const optMB = (totalOptimizedBytes / (1024 * 1024)).toFixed(2);
const savedMB = ((totalOriginalBytes - totalOptimizedBytes) / (1024 * 1024)).toFixed(2);
const percent = (((totalOriginalBytes - totalOptimizedBytes) / totalOriginalBytes) * 100).toFixed(1);

console.log(`\n=== OPTIMIZATION COMPLETE ===`);
console.log(`Processed: ${processedCount} oversized images (all preserved in products_original/)`);
console.log(`Original total: ${origMB} MB`);
console.log(`Optimized total: ${optMB} MB`);
console.log(`Saved: ${savedMB} MB (${percent}% reduction)`);
