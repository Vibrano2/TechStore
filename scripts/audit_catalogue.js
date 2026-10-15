import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const mockProductsPath = path.join(rootDir, 'src', 'data', 'mockProducts.ts');
const content = fs.readFileSync(mockProductsPath, 'utf-8');

// Parse the products from mockProducts.ts
let match;
const idRegex = /id:\s*['"]([^'"]+)['"]/g;
const idsInFile = [];
while ((match = idRegex.exec(content)) !== null) {
  idsInFile.push(match[1]);
}

console.log(`[Audit] Total 'id' occurrences in mockProducts.ts: ${idsInFile.length}`);

// Let's parse each product by scanning curly brace blocks or regex
const rawProductBlocks = content.split(/\n\s*\{\s*\n\s*id:\s*['"]/);

const parsedProducts = [];

for (let i = 1; i < rawProductBlocks.length; i++) {
  const block = 'id: "' + rawProductBlocks[i];
  
  const idMatch = block.match(/id:\s*['"]([^'"]+)['"]/);
  const slugMatch = block.match(/slug:\s*['"]([^'"]+)['"]/);
  const nameMatch = block.match(/name:\s*['"]([^'"]+)['"]/);
  const brandMatch = block.match(/brand:\s*['"]([^'"]+)['"]/);
  const categoryMatch = block.match(/category:\s*['"]([^'"]+)['"]/);
  const priceMatch = block.match(/price:\s*([0-9.]+)/);
  const stockMatch = block.match(/stock:\s*([0-9]+)/);
  const warrantyMatch = block.match(/warranty:\s*['"]([^'"]+)['"]/);
  const deliveryMatch = block.match(/delivery:\s*['"]([^'"]+)['"]/);
  const discountMatch = block.match(/discountPercentage:\s*([0-9]+)/);
  const isNewMatch = block.match(/isNew:\s*(true|false)/);
  
  // Extract images
  const imageMatches = [...block.matchAll(/new URL\(['"]([^'"]+)['"]/g)].map(m => m[1]);

  if (idMatch && slugMatch && nameMatch) {
    parsedProducts.push({
      id: idMatch[1],
      slug: slugMatch[1],
      name: nameMatch[1],
      brand: brandMatch ? brandMatch[1] : '',
      category: categoryMatch ? categoryMatch[1] : '',
      price: priceMatch ? parseFloat(priceMatch[1]) : 0,
      stock: stockMatch ? parseInt(stockMatch[1], 10) : 0,
      warranty: warrantyMatch ? warrantyMatch[1] : '',
      delivery: deliveryMatch ? deliveryMatch[1] : '',
      discountPercentage: discountMatch ? parseInt(discountMatch[1], 10) : undefined,
      isNew: isNewMatch ? isNewMatch[1] === 'true' : undefined,
      images: imageMatches,
      rawBlock: block,
    });
  }
}

console.log(`[Audit] Successfully parsed ${parsedProducts.length} product objects.`);

// 1. Check ID duplicates
const idCounts = {};
parsedProducts.forEach(p => {
  idCounts[p.id] = (idCounts[p.id] || 0) + 1;
});
const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);

// 2. Check Slug duplicates
const slugCounts = {};
parsedProducts.forEach(p => {
  slugCounts[p.slug] = (slugCounts[p.slug] || 0) + 1;
});
const duplicateSlugs = Object.entries(slugCounts).filter(([, count]) => count > 1);

// 3. Check Name duplicates / Product duplicates
const nameCounts = {};
parsedProducts.forEach(p => {
  const normName = p.name.toLowerCase().trim();
  nameCounts[normName] = nameCounts[normName] || [];
  nameCounts[normName].push(p);
});
const duplicateNames = Object.entries(nameCounts).filter(([, list]) => list.length > 1);

// 4. Check image files on disk
const missingImages = [];
const oversizedImages = [];
const imageAssetsDir = path.join(rootDir, 'src', 'data');

parsedProducts.forEach(p => {
  p.images.forEach(relPath => {
    // relPath is e.g. '../assets/icons/products/acer-aspire-5.png'
    const absPath = path.resolve(imageAssetsDir, relPath);
    if (!fs.existsSync(absPath)) {
      missingImages.push({ productId: p.id, slug: p.slug, relPath, absPath });
    } else {
      const stats = fs.statSync(absPath);
      if (stats.size > 500 * 1024) { // > 500 KB
        oversizedImages.push({
          productId: p.id,
          name: p.name,
          relPath,
          sizeKB: Math.round(stats.size / 1024),
          absPath
        });
      }
    }
  });
});

// 5. Incomplete fields
const incompleteProducts = [];
parsedProducts.forEach(p => {
  const issues = [];
  if (!p.name) issues.push('missing name');
  if (!p.brand) issues.push('missing brand');
  if (!p.category) issues.push('missing category');
  if (p.price === undefined || isNaN(p.price) || p.price <= 0) issues.push('invalid price');
  if (p.images.length === 0) issues.push('no images');
  if (issues.length > 0) {
    incompleteProducts.push({ id: p.id, name: p.name, issues });
  }
});

// 6. Category distribution
const categoryStats = {};
parsedProducts.forEach(p => {
  categoryStats[p.category] = (categoryStats[p.category] || 0) + 1;
});

// 7. Check e-mobility road legal claims
const emobilityProducts = parsedProducts.filter(p => {
  const cat = p.category.toLowerCase();
  const n = p.name.toLowerCase();
  return cat.includes('mobility') || cat.includes('e-scooter') || cat.includes('e-bike') || n.includes('scooter') || n.includes('e-bike') || n.includes('roller');
});

const emobilityClaims = [];
emobilityProducts.forEach(p => {
  const raw = p.rawBlock.toLowerCase();
  const hasStvzo = raw.includes('stvzo') || raw.includes('strassenzulassung') || raw.includes('straßenzulassung') || raw.includes('abe') || raw.includes('ekfv');
  emobilityClaims.push({
    id: p.id,
    name: p.name,
    category: p.category,
    hasStvzoClaim: hasStvzo,
  });
});

const report = {
  totalEntries: parsedProducts.length,
  uniqueIds: Object.keys(idCounts).length,
  duplicateIds,
  uniqueSlugs: Object.keys(slugCounts).length,
  duplicateSlugs,
  duplicateNamesCount: duplicateNames.length,
  duplicateNames: duplicateNames.map(([name, list]) => ({
    name,
    instances: list.map(p => ({ id: p.id, slug: p.slug, category: p.category, price: p.price }))
  })),
  missingImagesCount: missingImages.length,
  missingImages,
  oversizedImagesCount: oversizedImages.length,
  oversizedSample: oversizedImages.slice(0, 10),
  incompleteProductsCount: incompleteProducts.length,
  incompleteProducts,
  categoryStats,
  emobilityTotal: emobilityProducts.length,
  emobilityWithClaims: emobilityClaims.filter(c => c.hasStvzoClaim)
};

console.log('\n--- AUDIT SUMMARY ---');
console.log(`Total Products: ${report.totalEntries}`);
console.log(`Duplicate IDs: ${report.duplicateIds.length}`);
console.log(`Duplicate Slugs: ${report.duplicateSlugs.length}`);
console.log(`Duplicate Names / Variants: ${report.duplicateNamesCount}`);
console.log(`Missing Image Files: ${report.missingImagesCount}`);
console.log(`Oversized Images (>500KB): ${report.oversizedImagesCount}`);
console.log(`Incomplete Products: ${report.incompleteProductsCount}`);
console.log('\nCategories:');
console.table(report.categoryStats);

fs.writeFileSync(path.join(rootDir, 'scripts', 'catalogue_audit_report.json'), JSON.stringify(report, null, 2));
console.log('\nFull report saved to scripts/catalogue_audit_report.json');
