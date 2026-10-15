import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://127.0.0.1:4173';

async function measurePagePerformance(page, url, pageName) {
  console.log(`\n--- Measuring ${pageName} (${url}) ---`);

  const requests = [];
  let totalBytes = 0;
  const bytesByType = {
    document: 0,
    script: 0,
    stylesheet: 0,
    image: 0,
    font: 0,
    other: 0
  };

  const cdpSession = await page.context().newCDPSession(page);

  // Apply Documented Mobile Network & CPU Profile:
  // Mobile Profile: "Fast 3G" (1.6 Mbps down, 750 kbps up, 150ms RTT) + 4x CPU Throttling
  await cdpSession.send('Network.enable');
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150, // ms
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps in bytes/s (200 KB/s)
    uploadThroughput: 750 * 1024 / 8 // 750 kbps in bytes/s
  });
  await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  page.on('response', async (response) => {
    try {
      const headers = response.headers();
      const resourceType = response.request().resourceType();
      let size = 0;
      if (headers['content-length']) {
        size = parseInt(headers['content-length'], 10);
      } else {
        const buffer = await response.body().catch(() => null);
        size = buffer ? buffer.length : 0;
      }
      totalBytes += size;
      if (bytesByType[resourceType] !== undefined) {
        bytesByType[resourceType] += size;
      } else {
        bytesByType.other += size;
      }
      requests.push({
        url: response.url().replace(BASE_URL, ''),
        type: resourceType,
        status: response.status(),
        size
      });
    } catch {
      // response might be closed
    }
  });

  // Navigate and collect timing
  const startNav = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  const loadDurationMs = Date.now() - startNav;

  // Wait a moment for dynamic rendering and metrics
  await page.waitForTimeout(1000);

  // Collect Performance Timing & Web Vitals
  const performanceMetrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const navTiming = performance.getEntriesByType('navigation')[0] || {};
      const paintEntries = performance.getEntriesByType('paint');
      let fcp = 0;
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          fcp = entry.startTime;
        }
      }

      // Collect layout shifts
      let cls = 0;
      const shiftEntries = performance.getEntriesByType('layout-shift');
      for (const entry of shiftEntries) {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      }

      resolve({
        ttfb: navTiming.responseStart ? Math.round(navTiming.responseStart - navTiming.requestStart) : null,
        domInteractive: navTiming.domInteractive ? Math.round(navTiming.domInteractive) : null,
        domContentLoaded: navTiming.domContentLoadedEventEnd ? Math.round(navTiming.domContentLoadedEventEnd) : null,
        loadEventEnd: navTiming.loadEventEnd ? Math.round(navTiming.loadEventEnd) : null,
        fcp: Math.round(fcp),
        cls: Number(cls.toFixed(4))
      });
    });
  });

  console.log(`Navigation Duration (simulated mobile): ${loadDurationMs}ms`);
  console.log(`Total Requests: ${requests.length}`);
  console.log(`Total Transferred: ${(totalBytes / 1024).toFixed(1)} KB`);
  console.log(`  - HTML: ${(bytesByType.document / 1024).toFixed(1)} KB`);
  console.log(`  - JavaScript: ${(bytesByType.script / 1024).toFixed(1)} KB`);
  console.log(`  - CSS: ${(bytesByType.stylesheet / 1024).toFixed(1)} KB`);
  console.log(`  - Images: ${(bytesByType.image / 1024).toFixed(1)} KB`);
  console.log(`Web Vitals & Timing:`);
  console.log(`  - TTFB: ${performanceMetrics.ttfb} ms`);
  console.log(`  - DOM Content Loaded: ${performanceMetrics.domContentLoaded} ms`);
  console.log(`  - First Contentful Paint (FCP): ${performanceMetrics.fcp} ms`);
  console.log(`  - Cumulative Layout Shift (CLS): ${performanceMetrics.cls}`);

  return {
    pageName,
    url,
    totalRequests: requests.length,
    totalBytesKB: Number((totalBytes / 1024).toFixed(1)),
    bytesByTypeKB: {
      html: Number((bytesByType.document / 1024).toFixed(1)),
      js: Number((bytesByType.script / 1024).toFixed(1)),
      css: Number((bytesByType.stylesheet / 1024).toFixed(1)),
      images: Number((bytesByType.image / 1024).toFixed(1)),
      other: Number((bytesByType.other / 1024).toFixed(1))
    },
    performanceMetrics,
    loadDurationMs
  };
}

async function runProductionPreviewMeasurements() {
  console.log('====================================================');
  console.log('  TECHNIKWELT PRODUCTION PREVIEW PERFORMANCE AUDIT  ');
  console.log('====================================================');
  console.log('Emulation Profile: Mobile (390x844), Fast 3G (1.6Mbps / 150ms RTT), 4x CPU Slowdown\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    });
    const page = await context.newPage();

    const homeResults = await measurePagePerformance(page, `${BASE_URL}/`, 'Homepage');
    
    // Create fresh context for category measurement to measure initial category load
    const categoryContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    });
    const categoryPage = await categoryContext.newPage();
    const categoryResults = await measurePagePerformance(categoryPage, `${BASE_URL}/category/gaming`, 'Category (Gaming)');

    const fullReport = {
      timestamp: new Date().toISOString(),
      profile: {
        device: 'Mobile (390x844)',
        network: 'Fast 3G (1.6 Mbps Down, 750 kbps Up, 150ms RTT)',
        cpu: '4x Throttling'
      },
      homepage: homeResults,
      category: categoryResults
    };

    fs.writeFileSync(path.join(__dirname, 'preview_performance_report.json'), JSON.stringify(fullReport, null, 2));
    console.log('\n====================================================');
    console.log('  AUDIT FINISHED - REPORT SAVED TO preview_performance_report.json');
    console.log('====================================================\n');
  } finally {
    await browser.close();
  }
}

runProductionPreviewMeasurements().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
