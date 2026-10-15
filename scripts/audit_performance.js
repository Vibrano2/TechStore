import { chromium } from 'playwright';

async function auditRoute(url, isMobile = false) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: isMobile ? { width: 375, height: 667 } : { width: 1440, height: 900 },
    userAgent: isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    isMobile: isMobile,
    hasTouch: isMobile,
  });

  const page = await context.newPage();

  // Setup performance observers before navigation
  await page.addInitScript(() => {
    window.__perf = {
      lcp: 0,
      lcpElement: '',
      cls: 0,
      tbt: 0,
      longTasks: [],
    };

    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          window.__perf.lcp = lastEntry.startTime;
          window.__perf.lcpElement = lastEntry.element ? (lastEntry.element.tagName + '.' + (lastEntry.element.className || '')) : '';
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__perf.cls += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {}

    try {
      const longTaskObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const blockingDuration = entry.duration - 50;
          if (blockingDuration > 0) {
            window.__perf.tbt += blockingDuration;
            window.__perf.longTasks.push(entry.duration);
          }
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {}
  });

  let totalTransferBytes = 0;
  let requestCount = 0;
  let imageBytes = 0;
  let jsBytes = 0;
  let cssBytes = 0;

  page.on('response', async (res) => {
    try {
      requestCount++;
      const headers = res.headers();
      const length = parseInt(headers['content-length'] || '0', 10);
      const urlStr = res.url();
      totalTransferBytes += length;

      if (urlStr.match(/\.(png|jpg|jpeg|webp|avif|svg)(\?.*)?$/i)) {
        imageBytes += length;
      } else if (urlStr.match(/\.(js|mjs)(\?.*)?$/i)) {
        jsBytes += length;
      } else if (urlStr.match(/\.css(\?.*)?$/i)) {
        cssBytes += length;
      }
    } catch {}
  });

  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000); // Wait for idle and observers
  const totalLoadTime = Date.now() - startTime;

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];

    return {
      ttfb: nav.responseStart ? (nav.responseStart - nav.requestStart) : 0,
      fcp: fcpEntry ? fcpEntry.startTime : 0,
      domInteractive: nav.domInteractive || 0,
      domContentLoaded: nav.domContentLoadedEventEnd || 0,
      loadComplete: nav.loadEventEnd || 0,
      lcp: window.__perf.lcp || 0,
      lcpElement: window.__perf.lcpElement || 'none',
      cls: window.__perf.cls || 0,
      tbt: window.__perf.tbt || 0,
      longTaskCount: (window.__perf.longTasks || []).length,
    };
  });

  await browser.close();

  return {
    url,
    device: isMobile ? 'Mobile (iPhone 375x667)' : 'Desktop (1440x900)',
    totalLoadTime,
    requests: requestCount,
    totalTransferKB: Math.round(totalTransferBytes / 1024),
    imageKB: Math.round(imageBytes / 1024),
    jsKB: Math.round(jsBytes / 1024),
    cssKB: Math.round(cssBytes / 1024),
    ...metrics,
  };
}

async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:5173';
  console.log(`Running Performance Audit on ${baseUrl} ...\n`);
  
  const desktopHome = await auditRoute(`${baseUrl}/`, false);
  console.log('--- DESKTOP HOMEPAGE ---');
  console.log(desktopHome);

  const mobileHome = await auditRoute(`${baseUrl}/`, true);
  console.log('\n--- MOBILE HOMEPAGE ---');
  console.log(mobileHome);

  const desktopCategory = await auditRoute(`${baseUrl}/category/smartphones`, false);
  console.log('\n--- DESKTOP CATEGORY (/category/smartphones) ---');
  console.log(desktopCategory);

  const desktopProduct = await auditRoute(`${baseUrl}/product/apple-iphone-17-pro`, false);
  console.log('\n--- DESKTOP PRODUCT DETAIL ---');
  console.log(desktopProduct);

  const desktopCart = await auditRoute(`${baseUrl}/cart`, false);
  console.log('\n--- DESKTOP CART ---');
  console.log(desktopCart);

  const desktopCheckout = await auditRoute(`${baseUrl}/checkout`, false);
  console.log('\n--- DESKTOP CHECKOUT ---');
  console.log(desktopCheckout);
}

main().catch(console.error);
