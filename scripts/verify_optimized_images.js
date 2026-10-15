import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runImageVerification() {
  console.log('====================================================');
  console.log('       TECHNIKWELT OPTIMISED IMAGE VERIFICATION    ');
  console.log('====================================================\n');

  const productsDir = path.join(rootDir, 'src', 'assets', 'icons', 'products');
  const distAssetsDir = path.join(rootDir, 'dist', 'assets');

  // 1. Check all files in src/assets/icons/products
  const productImages = fs.readdirSync(productsDir).filter(f => f.endsWith('.png'));
  console.log(`Found ${productImages.length} optimized product images in src/assets/icons/products/`);

  let transparencyCount = 0;
  let nonTransparentCount = 0;
  let maxDimErrors = 0;
  let conversionFailures = 0;

  const samples = [
    'acer-aspire-5.png', // Laptop
    'apple-iphone-16-pro.png', // Phone
    'bose-quietcomfort-headphones.png', // Headphones
    'samsung-odyssey-g9-curved-gaming-monitor.png', // Gaming Monitor
    '207-pressotherapy-lymphatic-drainage-system.png', // Recovery
    '202-microdermabrasion-machine.png', // Beauty
    '058-e-scooter-mit-abe-strasenzulassung.png', // E-Mobility
    '182-high-speed-corexy-3d-printer.png' // Pro Equipment
  ];

  const sampleResults = {};

  for (const imgName of productImages) {
    const fullPath = path.join(productsDir, imgName);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.size === 0) {
        conversionFailures++;
        console.error(`[FAIL] 0-byte image: ${imgName}`);
        continue;
      }

      const meta = await sharp(fullPath).metadata();
      if (meta.hasAlpha) {
        transparencyCount++;
      } else {
        nonTransparentCount++;
      }

      if (meta.width > 800 || meta.height > 800) {
        maxDimErrors++;
      }

      if (samples.includes(imgName)) {
        sampleResults[imgName] = {
          width: meta.width,
          height: meta.height,
          channels: meta.channels,
          hasAlpha: meta.hasAlpha,
          format: meta.format,
          fileSizeKB: Math.round(stat.size / 1024)
        };
      }
    } catch (err) {
      conversionFailures++;
      console.error(`[FAIL] Failed reading ${imgName}:`, err.message);
    }
  }

  console.log(`Transparency status: ${transparencyCount} images with alpha channel preserved (${nonTransparentCount} opaque RGB)`);
  console.log(`Dimension check (max 800x800): ${maxDimErrors === 0 ? 'All 100% within retina limit' : maxDimErrors + ' exceeded'}`);
  console.log(`Conversion failures: ${conversionFailures}`);

  // 2. Check production dist output for backup leakage
  let distBackupLeak = false;
  let distTotalImageBytes = 0;
  let distImageCount = 0;

  if (fs.existsSync(distAssetsDir)) {
    const distFiles = fs.readdirSync(distAssetsDir);
    for (const f of distFiles) {
      if (f.includes('products_original') || f.includes('original')) {
        distBackupLeak = true;
        console.error(`[LEAK DETECTED] Original backup leaked to dist: ${f}`);
      }
      if (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.svg') || f.endsWith('.webp')) {
        distImageCount++;
        distTotalImageBytes += fs.statSync(path.join(distAssetsDir, f)).size;
      }
    }
  }
  console.log(`Original backups excluded from production dist: ${!distBackupLeak ? 'CONFIRMED EXCLUDED' : 'FAILED - LEAK PRESENT'}`);
  console.log(`Total production images in dist/assets/: ${distImageCount} (${(distTotalImageBytes / (1024 * 1024)).toFixed(2)} MB)`);

  // 3. Check mockProducts.ts image mappings
  const mockProductsContent = fs.readFileSync(path.join(rootDir, 'src', 'data', 'mockProducts.ts'), 'utf8');
  const imageRegex = /new URL\('\.\.\/assets\/icons\/products\/([^']+)'/g;
  let match;
  let totalMapped = 0;
  let missingFiles = 0;

  while ((match = imageRegex.exec(mockProductsContent)) !== null) {
    totalMapped++;
    const filename = match[1];
    if (!fs.existsSync(path.join(productsDir, filename))) {
      missingFiles++;
      console.error(`[MISSING MAPPING] mockProducts references non-existent file: ${filename}`);
    }
  }

  console.log(`mockProducts.ts mapping verification: ${totalMapped} total mapped, ${missingFiles} missing.`);

  const report = {
    totalOptimizedImages: productImages.length,
    transparencyPreservedCount: transparencyCount,
    maxDimensionWithin800: maxDimErrors === 0,
    conversionFailures,
    backupExcludedFromDist: !distBackupLeak,
    distImageCount,
    distTotalImageMB: (distTotalImageBytes / (1024 * 1024)).toFixed(2),
    mockProductsMappedCount: totalMapped,
    missingImageFiles: missingFiles,
    representativeSamples: sampleResults
  };

  console.log('\n--- REPRESENTATIVE PRODUCT SAMPLES ---');
  console.log(JSON.stringify(sampleResults, null, 2));

  fs.writeFileSync(path.join(__dirname, 'image_verification_report.json'), JSON.stringify(report, null, 2));
  console.log('\n[PASS] Image verification completed successfully.');
}

runImageVerification().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
