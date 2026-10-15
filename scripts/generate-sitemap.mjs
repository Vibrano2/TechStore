import fs from 'fs';
import path from 'path';

const mockProductsPath = path.resolve('src/data/mockProducts.ts');
const content = fs.readFileSync(mockProductsPath, 'utf8');
const slugMatches = [...content.matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]);

const baseUrl = 'https://technikwelt.shop';
const today = new Date().toISOString().split('T')[0];

const staticRoutes = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: 'category/all', priority: '0.9', changefreq: 'daily' },
  { path: 'angebote', priority: '0.9', changefreq: 'daily' },
  { path: 'category/smartphones', priority: '0.8', changefreq: 'weekly' },
  { path: 'category/computer', priority: '0.8', changefreq: 'weekly' },
  { path: 'category/gaming', priority: '0.8', changefreq: 'weekly' },
  { path: 'category/tv-video', priority: '0.8', changefreq: 'weekly' },
  { path: 'category/audio', priority: '0.8', changefreq: 'weekly' },
  { path: 'category/e-mobility', priority: '0.8', changefreq: 'weekly' },
  { path: 'category/smart-home', priority: '0.8', changefreq: 'weekly' },
  { path: 'category/haushalt', priority: '0.8', changefreq: 'weekly' },
  { path: 'category/recovery', priority: '0.8', changefreq: 'weekly' },
  { path: 'category/zubehor', priority: '0.8', changefreq: 'weekly' },
  { path: 'impressum', priority: '0.4', changefreq: 'monthly' },
  { path: 'datenschutz', priority: '0.4', changefreq: 'monthly' },
  { path: 'agb', priority: '0.4', changefreq: 'monthly' },
  { path: 'widerruf', priority: '0.4', changefreq: 'monthly' },
  { path: 'warranty', priority: '0.5', changefreq: 'monthly' },
  { path: 'contact', priority: '0.5', changefreq: 'monthly' }
];

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

for (const r of staticRoutes) {
  xml += '  <url>\n';
  xml += `    <loc>${baseUrl}${r.path ? `/${r.path}` : ''}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += `    <changefreq>${r.changefreq}</changefreq>\n`;
  xml += `    <priority>${r.priority}</priority>\n`;
  xml += '  </url>\n';
}

for (const slug of slugMatches) {
  xml += '  <url>\n';
  xml += `    <loc>${baseUrl}/product/${slug}</loc>\n`;
  xml += `    <lastmod>${today}</lastmod>\n`;
  xml += '    <changefreq>weekly</changefreq>\n';
  xml += '    <priority>0.7</priority>\n';
  xml += '  </url>\n';
}

xml += '</urlset>\n';

fs.writeFileSync(path.resolve('public/sitemap.xml'), xml, 'utf8');
console.log(`Generated sitemap.xml with ${staticRoutes.length + slugMatches.length} URLs.`);
