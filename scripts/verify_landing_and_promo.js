import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Check Hero trust badges
  const trustText = await page.textContent('body');
  console.log('Contains Gewährleistung:', trustText.includes('24 Mon. Gewährleistung'));
  console.log('Contains Top-Bestseller:', trustText.includes('Top-Bestseller & Technik-Highlights'));

  // Take screenshot of landing page
  await page.screenshot({ path: 'scripts/landing_preview.png' });
  console.log('Saved landing_preview.png');

  // Wait for Promo Popup (or trigger it)
  console.log('Waiting for Promo Popup ...');
  await page.waitForTimeout(7000);

  const hasPopup = await page.isVisible('#promo-popup-title');
  console.log('Promo Popup visible:', hasPopup);

  if (hasPopup) {
    const promoTitle = await page.textContent('#promo-popup-title');
    console.log('Promo title:', promoTitle);
    await page.screenshot({ path: 'scripts/promo_popup_preview.png' });
    console.log('Saved promo_popup_preview.png');
  }

  await browser.close();
}

main().catch(console.error);
