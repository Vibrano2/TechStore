import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const mockProductsPath = path.join(rootDir, 'src', 'data', 'mockProducts.ts');
const content = fs.readFileSync(mockProductsPath, 'utf-8');

const blocks = content.split(/\n\s*\{\s*\n\s*id:\s*['"]/);
const prods = [];

for (let i = 1; i < blocks.length; i++) {
  const b = 'id: "' + blocks[i];
  const id = (b.match(/id:\s*['"]([^'"]+)['"]/) || [])[1] || '';
  const slug = (b.match(/slug:\s*['"]([^'"]+)['"]/) || [])[1] || '';
  const name = (b.match(/name:\s*['"]([^'"]+)['"]/) || [])[1] || '';
  const brand = (b.match(/brand:\s*['"]([^'"]+)['"]/) || [])[1] || '';
  const category = (b.match(/category:\s*['"]([^'"]+)['"]/) || [])[1] || '';
  const shortDescription = (b.match(/shortDescription:\s*['"]([^'"]+)['"]/) || [])[1] || '';
  const description = (b.match(/description:\s*['"]([^'"]+)['"]/) || [])[1] || '';
  const price = parseFloat((b.match(/price:\s*([0-9.]+)/) || [])[1] || '0');
  prods.push({ id, slug, name, brand, category, shortDescription, description, price });
}

console.log(`Parsed ${prods.length} products`);

// Check Gaming cluster
const gaming = prods.filter(p => {
  const t = (p.name + ' ' + p.description + ' ' + p.slug).toLowerCase();
  return t.includes('gaming') || t.includes('switch') || t.includes('ps5') || t.includes('xbox') || t.includes('controller') || t.includes('gamepad') || t.includes('stream deck');
});

// Check Beauty cluster
const beauty = prods.filter(p => {
  const t = (p.name + ' ' + p.description + ' ' + p.slug).toLowerCase();
  return t.includes('beauty') || t.includes('facial') || t.includes('led mask') || t.includes('ipl') || t.includes('haartrockner') || t.includes('hair') || t.includes('gesichts');
});

// Check Wellness & Recovery cluster
const wellness = prods.filter(p => {
  const t = (p.name + ' ' + p.description + ' ' + p.slug).toLowerCase();
  return t.includes('massage') || t.includes('wellness') || t.includes('entspannung') || t.includes('mat');
});

const recovery = prods.filter(p => {
  const t = (p.name + ' ' + p.description + ' ' + p.slug).toLowerCase();
  return t.includes('recovery') || t.includes('compression') || t.includes('kompression') || t.includes('ice bath') || t.includes('chiller') || t.includes('lymph') || t.includes('therapie');
});

console.log(`\nCluster counts:`);
console.log(`- Gaming: ${gaming.length}`);
console.log(`- Beauty: ${beauty.length}`);
console.log(`- Wellness: ${wellness.length}`);
console.log(`- Recovery: ${recovery.length}`);

console.log('\nSample Gaming Products:');
gaming.slice(0, 5).forEach(p => console.log(`  [${p.id}] ${p.name} (${p.category})`));

console.log('\nSample Beauty Products:');
beauty.slice(0, 5).forEach(p => console.log(`  [${p.id}] ${p.name} (${p.category})`));

console.log('\nSample Recovery Products:');
recovery.slice(0, 5).forEach(p => console.log(`  [${p.id}] ${p.name} (${p.category})`));
