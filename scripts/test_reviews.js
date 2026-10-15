import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5174';

async function runReviewsTests() {
  console.log('====================================================');
  console.log(' TECHNIKWELT PRODUCT REVIEWS VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('[TechnikWelt')) {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  const results = {};
  const evidence = {};

  try {
    // -------------------------------------------------------------
    // TEST 1: PRODUCT DETAIL REVIEWS TAB & BREAKDOWN RENDERING
    // -------------------------------------------------------------
    console.log('--- TEST 1: REVIEWS TAB & STAR BREAKDOWN RENDERING ---');
    await page.goto(`${BASE_URL}/product/p1`, { waitUntil: 'networkidle' });

    // Click on the review count in the header to jump to reviews
    const reviewHeaderBtn = page.locator('button:has-text("Bewertungen")').first();
    await reviewHeaderBtn.click();
    await page.waitForTimeout(400);

    // Verify reviews tab is active
    const reviewsTabActive = page.locator('#product-tabs button:has-text("Bewertungen")');
    await reviewsTabActive.waitFor({ state: 'visible', timeout: 5000 });
    const tabClass = await reviewsTabActive.getAttribute('class');
    console.log('Reviews tab activated:', tabClass?.includes('text-electric-500'));

    // Verify aggregate score and UWG §5b Abs. 3 legal notice
    await page.waitForSelector('text=Echtheitsprüfung gem. § 5b Abs. 3 UWG', { state: 'visible', timeout: 5000 });
    console.log('Verified German UWG §5b Abs. 3 legal authenticity notice!');

    // Verify star distribution bars exist
    const fiveStarRow = page.locator('[data-testid="star-filter-5"]');
    await fiveStarRow.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Verified rating distribution bars are visible!');

    results['tab_and_breakdown_rendered'] = true;

    // -------------------------------------------------------------
    // TEST 2: STAR RATING FILTER TOGGLE
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: STAR RATING FILTER TOGGLE ---');
    await fiveStarRow.click();
    await page.waitForTimeout(400);

    const filterToolbar = page.locator('text=Gefiltert nach: 5 Sterne');
    await filterToolbar.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Star filter activated: 5 Sterne');

    // Reset filter
    const resetFilterBtn = page.locator('button:has-text("Filter aufheben")');
    await resetFilterBtn.click();
    await page.waitForTimeout(300);
    const isFilterReset = await filterToolbar.isHidden();
    console.log('Star filter reset:', isFilterReset);

    results['star_filter_toggle'] = isFilterReset;

    // -------------------------------------------------------------
    // TEST 3: HELPFUL VOTE INCREMENT
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: HELPFUL VOTE INTERACTION ---');
    const helpfulBtn = page.locator('button:has-text("Hilfreich")').first();
    await helpfulBtn.waitFor({ state: 'visible', timeout: 5000 });
    await helpfulBtn.click();
    await page.waitForTimeout(400);

    const thanksBtn = page.locator('button:has-text("Danke!")').first();
    await thanksBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Helpful vote recorded successfully!');

    results['helpful_vote_recorded'] = true;

    // -------------------------------------------------------------
    // TEST 4: SUBMIT NEW REVIEW & VERIFIED BUYER BADGE
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: SUBMIT REVIEW & VERIFIED BUYER VERIFICATION ---');
    const writeReviewBtn = page.locator('button:has-text("Bewertung schreiben")').first();
    await writeReviewBtn.click();

    // Verify dialog opened
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Review submission modal opened!');

    const testTitle = `Top Laptop für TechnikWelt Test ${Date.now()}`;
    await page.fill('#review-title', testTitle);
    await page.fill('#review-comment', 'Ausgezeichnete Qualität, leise Lüftung und sehr schnelle Bearbeitung bei TechnikWelt. Absolut zufrieden!');
    await page.fill('#review-author', 'Maximilian Prüfer');
    // gast-kunde@technikwelt-test.de was our previous test purchaser for p1
    await page.fill('#review-email', 'gast-kunde@technikwelt-test.de');

    // Click submit
    const submitBtn = page.locator('[role="dialog"] button:has-text("Bewertung absenden")');
    await submitBtn.click();

    // Wait for success feedback in modal
    await page.waitForSelector('text=Vielen Dank für Ihre Bewertung', { state: 'visible', timeout: 8000 });
    console.log('Review submission success confirmation received!');

    // Wait for modal to close
    await dialog.waitFor({ state: 'hidden', timeout: 8000 });

    // Verify the newly created review appears in the review list
    const newReviewCard = page.locator(`text=${testTitle}`);
    await newReviewCard.waitFor({ state: 'visible', timeout: 5000 });
    console.log(`Newly created review card "${testTitle}" is visible in the reviews list!`);

    // Verify "Verifizierter Kauf" badge
    const cardContainer = page.locator('.bg-white.rounded-xl.border', { hasText: testTitle }).first();
    const verifiedBadge = cardContainer.locator('text=Verifizierter Kauf');
    const isVerifiedPresent = await verifiedBadge.isVisible();
    console.log(`Verified Buyer badge presence: ${isVerifiedPresent ? 'YES (Verified Purchase)' : 'NO'}`);

    results['review_submitted_and_rendered'] = true;
    results['verified_buyer_badge_verified'] = isVerifiedPresent;
    evidence['submitted_title'] = testTitle;

  } catch (err) {
    console.error('Test execution failed:', err);
    results['error'] = err.message;
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log('              TEST SUMMARY REPORT                   ');
  console.log('====================================================');
  console.log(JSON.stringify({ results, evidence }, null, 2));

  const allPassed =
    results['tab_and_breakdown_rendered'] &&
    results['star_filter_toggle'] &&
    results['helpful_vote_recorded'] &&
    results['review_submitted_and_rendered'] &&
    results['verified_buyer_badge_verified'];

  if (!allPassed) {
    console.error('\n❌ ONE OR MORE REVIEWS TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL PRODUCT REVIEWS TESTS PASSED!');
    process.exit(0);
  }
}

runReviewsTests();
