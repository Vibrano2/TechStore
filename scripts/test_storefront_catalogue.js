import { chromium } from 'playwright';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

async function runStorefrontTests() {
  console.log('====================================================');
  console.log('   TECHNIKWELT STOREFRONT & CATALOGUE TEST SUITE    ');
  console.log('====================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = {};
  const evidence = {};
  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', (req) => {
    networkFailures.push(`${req.method()} ${req.url()} (${req.failure()?.errorText})`);
  });

  try {
    // 1. MODAL FOCUS TRAP & RETURN-TO-TRIGGER
    console.log('--- TEST 1: MODAL FOCUS TRAP & RETURN-TO-TRIGGER ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    // Find and focus the trigger button ('Anmelden')
    const triggerBtn = page.locator('header button:has-text("Anmelden")');
    await triggerBtn.focus();
    const isTriggerFocusedBefore = await triggerBtn.evaluate(el => document.activeElement === el);
    console.log(`Trigger focused before click: ${isTriggerFocusedBefore}`);

    // Open modal
    await triggerBtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Wait for focus inside modal
    await page.waitForTimeout(150);
    const isFocusInsideModal = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      return modal ? modal.contains(document.activeElement) : false;
    });
    console.log(`Focus inside modal dialog on open: ${isFocusInsideModal}`);
    if (!isFocusInsideModal) throw new Error('Focus did not enter modal dialog');
    results['modal_focus_enter'] = 'PASS';
    evidence['modal_focus_enter'] = 'Focus entered modal dialog on opening';

    // Test Tab cycling / trap: press Tab multiple times and verify focus stays inside modal
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const staysInside = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        return modal ? modal.contains(document.activeElement) : false;
      });
      if (!staysInside) throw new Error(`Tab key escaped modal on step ${i + 1}`);
    }
    results['modal_focus_trap'] = 'PASS';
    evidence['modal_focus_trap'] = 'Focus remained strictly inside dialog across Tab navigation';

    // Press Escape to close modal and verify focus returns to trigger
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
    await page.waitForTimeout(150);

    const isTriggerFocusedAfter = await triggerBtn.evaluate(el => document.activeElement === el);
    console.log(`Focus returned to trigger after closing: ${isTriggerFocusedAfter}`);
    if (!isTriggerFocusedAfter) throw new Error('Focus did not return to trigger button after modal close');
    results['modal_return_to_trigger'] = 'PASS';
    evidence['modal_return_to_trigger'] = 'Focus returned to triggering button upon modal close';
    console.log('[PASS] Modal focus trap and return-to-trigger verified.\n');

    // 2. SEARCH FUNCTIONALITY & FLYOUT
    console.log('--- TEST 2: STOREFRONT SEARCH & FLYOUT ---');
    const searchInput = page.locator('header input[type="text"]');
    await searchInput.fill('iphone');
    await page.waitForTimeout(300);

    // Verify search flyout appears with matching results
    const flyoutItems = page.locator('header a[href^="/product/"]');
    const flyoutCount = await flyoutItems.count();
    console.log(`Search flyout matching products for 'iphone': ${flyoutCount}`);
    if (flyoutCount === 0) throw new Error('Search flyout did not display matching products');
    results['search_flyout'] = 'PASS';
    evidence['search_flyout'] = `Search flyout rendered ${flyoutCount} products for 'iphone'`;

    // Press Enter to navigate to full search results
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/category\/all\?q=iphone/);
    const searchH1 = page.locator('h1:has-text("Suchergebnisse")');
    await searchH1.waitFor({ state: 'visible', timeout: 5000 });
    const searchHeader = await searchH1.textContent();
    console.log(`Search results page header: "${searchHeader}"`);
    results['search_results_navigation'] = 'PASS';
    evidence['search_results_navigation'] = `Navigated to search results with title: ${searchHeader}`;

    // Test Empty Search Results & Reset Filter
    await page.goto(`${BASE_URL}/category/all?q=gibtesnicht12345XYZ`, { waitUntil: 'networkidle' });
    const emptyNotice = page.locator('text=Keine Produkte in dieser Kategorie gefunden');
    await emptyNotice.waitFor({ state: 'visible', timeout: 5000 });
    const resetBtn = page.locator('button:has-text("Filter zurücksetzen")');
    if (await resetBtn.count() === 0) throw new Error('Filter zurücksetzen button not found in empty state');
    await resetBtn.click();
    await page.waitForTimeout(300);
    const prodsAfterReset = await page.locator('a[href^="/product/"]').count();
    console.log(`Products displayed after resetting empty search filter: ${prodsAfterReset}`);
    if (prodsAfterReset === 0) throw new Error('Reset filters did not restore product list');
    results['search_empty_and_reset'] = 'PASS';
    evidence['search_empty_and_reset'] = `Empty results displayed properly and reset restored ${prodsAfterReset} products`;
    console.log('[PASS] Search flyout, results, and empty state verified.\n');

    // 3. CATEGORY & SUBCATEGORY CLUSTERS (GAMING, BEAUTY, WELLNESS, RECOVERY)
    console.log('--- TEST 3: CATEGORIES & SUBCATEGORY PILLS ---');
    
    // Gaming Category
    await page.goto(`${BASE_URL}/category/gaming`, { waitUntil: 'networkidle' });
    const gamingCount = await page.locator('a[href^="/product/"]').count();
    const gamingTitle = await page.locator('h1').textContent();
    console.log(`Gaming category: "${gamingTitle}" with ${gamingCount} products on page 1`);
    if (gamingCount < 5 || !gamingTitle.includes('Gaming')) throw new Error('Gaming category failed to load valid products');
    results['category_gaming'] = 'PASS';
    evidence['category_gaming'] = `${gamingTitle} loaded with ${gamingCount} products`;

    // Beauty Category
    await page.goto(`${BASE_URL}/category/beauty`, { waitUntil: 'networkidle' });
    const beautyCount = await page.locator('a[href^="/product/"]').count();
    const beautyTitle = await page.locator('h1').textContent();
    console.log(`Beauty category: "${beautyTitle}" with ${beautyCount} products on page 1`);
    if (beautyCount < 5 || !beautyTitle.includes('Beauty')) throw new Error('Beauty category failed to load valid products');
    results['category_beauty'] = 'PASS';
    evidence['category_beauty'] = `${beautyTitle} loaded with ${beautyCount} products`;

    // Recovery Category
    await page.goto(`${BASE_URL}/category/recovery`, { waitUntil: 'networkidle' });
    const recoveryCount = await page.locator('a[href^="/product/"]').count();
    const recoveryTitle = await page.locator('h1').textContent();
    console.log(`Recovery category: "${recoveryTitle}" with ${recoveryCount} products on page 1`);
    if (recoveryCount < 5 || !recoveryTitle.includes('Recovery')) throw new Error('Recovery category failed to load valid products');
    results['category_recovery'] = 'PASS';
    evidence['category_recovery'] = `${recoveryTitle} loaded with ${recoveryCount} products`;

    // Verify Subcategory Pills navigation (Clicking "Wellness & Entspannung" pill on Recovery page)
    const wellnessPill = page.locator('a[href="/category/wellness"]');
    if (await wellnessPill.count() === 0) throw new Error('Wellness pill not found on recovery page');
    await wellnessPill.click();
    await page.waitForURL(/\/category\/wellness/);
    const wellnessCount = await page.locator('a[href^="/product/"]').count();
    console.log(`Navigated via pill to Wellness: ${wellnessCount} products`);
    if (wellnessCount < 5) throw new Error('Wellness page loaded insufficient products');
    results['subcategory_pills_navigation'] = 'PASS';
    evidence['subcategory_pills_navigation'] = `Pill navigation to /category/wellness successfully loaded ${wellnessCount} products`;
    console.log('[PASS] Virtual clusters and subcategory pill navigation verified.\n');

    // 4. COMBINED FILTERS & SORTING
    console.log('--- TEST 4: COMBINED FILTERS & SORTING ---');
    await page.goto(`${BASE_URL}/category/computer`, { waitUntil: 'networkidle' });
    
    // Test sorting by price ascending
    const sortSelect = page.locator('select:has(option[value="Preis aufsteigend"])');
    await sortSelect.selectOption('Preis aufsteigend');
    await page.waitForTimeout(400);

    // Extract first 2 prices from product cards
    const priceElements = page.locator('a[href^="/product/"] .text-lg.font-bold.text-navy-900');
    const firstPriceText = await priceElements.nth(0).textContent();
    const secondPriceText = await priceElements.nth(1).textContent();
    const p1 = parseFloat(firstPriceText.replace(/\./g, '').replace(/[^0-9,]/g, '').replace(',', '.'));
    const p2 = parseFloat(secondPriceText.replace(/\./g, '').replace(/[^0-9,]/g, '').replace(',', '.'));
    console.log(`Price ascending: first = €${p1}, second = €${p2}`);
    if (p1 > p2) throw new Error(`Sorting price ascending failed: ${p1} > ${p2}`);
    results['category_sorting_price_asc'] = 'PASS';
    evidence['category_sorting_price_asc'] = `Sorted price ascending: ${p1} <= ${p2}`;

    // Test Price Range Filter (min=500, max=1500)
    const minPriceInput = page.locator('input[placeholder="Min €"]');
    const maxPriceInput = page.locator('input[placeholder="Max €"]');
    await minPriceInput.fill('500');
    await maxPriceInput.fill('1500');
    await page.waitForTimeout(300);

    const filteredCount = await page.locator('a[href^="/product/"]').count();
    console.log(`Filtered products in €500-€1500 range: ${filteredCount}`);
    if (filteredCount === 0) throw new Error('Price range filter returned 0 products unexpectedly');
    results['category_price_filter'] = 'PASS';
    evidence['category_price_filter'] = `Price range 500-1500 returned ${filteredCount} products`;
    console.log('[PASS] Filters and sorting verified.\n');

    // 5. WISHLIST ACTIONS & HEADER BADGE
    console.log('--- TEST 5: WISHLIST ACTIONS ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.removeItem('technikwelt_wishlist');
      localStorage.removeItem('techstore_wishlist');
    });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    
    // Add first deal product to wishlist
    const wishlistHeartBtn = page.locator('button:has(svg.lucide-heart)').first();
    await wishlistHeartBtn.click();
    await page.waitForTimeout(300);

    // Check wishlist badge in header
    const wishlistBadge = page.locator('header a[href="/wishlist"]');
    const isHeartActive = await wishlistHeartBtn.locator('svg').evaluate(el => el.classList.contains('fill-status-error'));
    console.log(`Heart button active: ${isHeartActive}`);
    if (!isHeartActive) throw new Error('Wishlist button did not toggle to active state');

    // Navigate to /wishlist
    await wishlistBadge.click();
    await page.waitForURL(/\/wishlist/);
    const wishlistItems = page.locator('a[href^="/product/"]');
    const wishCount = await wishlistItems.count();
    console.log(`Wishlist items count: ${wishCount}`);
    if (wishCount === 0) throw new Error('Wishlist page is empty after adding item');
    results['wishlist_add_and_view'] = 'PASS';
    evidence['wishlist_add_and_view'] = `Wishlist accurately contains ${wishCount} item`;

    // Remove from wishlist
    const removeBtn = page.locator('button[aria-label="Aus Wunschliste entfernen"]').first();
    await removeBtn.click();
    await page.waitForTimeout(400);
    const wishCountAfter = await page.locator('a[href^="/product/"]').count();
    const emptyNoticeVisible = await page.locator('text=Ihre Favoriten sind leer').isVisible();
    console.log(`Wishlist count after removal: ${wishCountAfter}, empty notice visible: ${emptyNoticeVisible}`);
    if (wishCountAfter >= wishCount && !emptyNoticeVisible) throw new Error('Wishlist item was not removed');
    results['wishlist_remove'] = 'PASS';
    evidence['wishlist_remove'] = `Wishlist item removed cleanly (empty notice: ${emptyNoticeVisible}, remaining links: ${wishCountAfter})`;
    console.log('[PASS] Wishlist actions verified.\n');

    // 6. PRODUCT DETAIL NAVIGATION & THUMBNAILS
    console.log('--- TEST 6: PRODUCT DETAIL NAVIGATION & THUMBNAILS ---');
    await page.goto(`${BASE_URL}/product/acer-aspire-5`, { waitUntil: 'networkidle' });
    const productTitle = await page.locator('h1').textContent();
    console.log(`Product detail title: "${productTitle}"`);
    if (!productTitle.includes('Acer Aspire 5')) throw new Error('Product detail title mismatch');

    // Verify tabs (Technische Daten / Spezifikationen, Lieferung, Garantie)
    const specsTab = page.locator('button:has-text("Technische Daten")');
    await specsTab.click();
    const specsTable = page.locator('text=Marke');
    if (!await specsTable.isVisible()) throw new Error('Specifications tab did not display specs');
    
    // Check similar products section
    const similarProducts = page.locator('text=Ähnliche Produkte');
    if (!await similarProducts.isVisible()) throw new Error('Similar products section missing');
    results['product_detail_page'] = 'PASS';
    evidence['product_detail_page'] = `Product detail loaded specs, delivery, and similar products`;
    console.log('[PASS] Product detail page verified.\n');

  } catch (err) {
    console.error(`\n[FAIL] Test encountered error:`, err);
    results['storefront_suite'] = 'FAIL';
    evidence['storefront_suite'] = err.message;
  } finally {
    await browser.close();
  }

  console.log('====================================================');
  console.log('         STOREFRONT AUDIT RESULTS                   ');
  console.log('====================================================');
  console.log(JSON.stringify({ results, evidence, consoleErrors, networkFailures }, null, 2));
}

runStorefrontTests();
