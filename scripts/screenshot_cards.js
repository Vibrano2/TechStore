import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  // Dismiss cookie consent so cards are fully unobstructed in screenshot
  try {
    await page.click('button:has-text("Alle akzeptieren")');
  } catch {}
  await page.evaluate(() => window.scrollBy(0, 1050));
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'scripts/cards_full_preview.png' });
  console.log('Saved cards_full_preview.png');

  await browser.close();
}

main().catch(console.error);
