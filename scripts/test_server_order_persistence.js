import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5174';

async function runOrderPersistenceTests() {
  console.log('====================================================');
  console.log(' TECHNIKWELT SERVER-SIDE ORDER PERSISTENCE TEST SUITE');
  console.log('====================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('[TechnikWelt')) {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('requestfailed', req => {
    console.log('NETWORK FAILED:', req.method(), req.url(), req.failure()?.errorText);
  });

  const results = {};
  const evidence = {};

  try {
    // -------------------------------------------------------------
    // TEST 1: UNAUTHENTICATED GUEST CHECKOUT WITH SERVER PERSISTENCE
    // -------------------------------------------------------------
    console.log('--- TEST 1: GUEST CHECKOUT & BACKEND PERSISTENCE ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    // Ensure demo mode is false and storage is clean
    await page.evaluate(() => {
      localStorage.clear();
      window.__TECHSTORE_DEMO_AUTH__ = false;
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Navigate to a product page and add to cart
    await page.goto(`${BASE_URL}/product/p1`, { waitUntil: 'networkidle' });
    const addToCartBtn = page.locator('button:has-text("In den Warenkorb")');
    await addToCartBtn.click();
    console.log('Added product p1 to cart');

    // Go to checkout
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle' });

    // Step 1: Contact info
    await page.fill('#checkout-email', 'gast-kunde@technikwelt-test.de');
    await page.click('button:has-text("Weiter zur Lieferadresse")');

    // Step 2: Shipping address
    await page.fill('#checkout-firstname', 'Johannes');
    await page.fill('#checkout-lastname', 'Gutenberg');
    await page.fill('#checkout-street', 'Rheinstraße 45');
    await page.fill('#checkout-postal', '55116');
    await page.fill('#checkout-city', 'Mainz');
    await page.click('button:has-text("Weiter zur Versandart")');

    // Step 3: Shipping method (Standard)
    await page.click('button:has-text("Weiter zur Zahlung")');

    // Step 4: Payment and place order
    const placeOrderBtn = page.locator('button[type="submit"]:has-text("Kostenpflichtig bestellen")');
    await placeOrderBtn.click();

    // Wait for order confirmation page
    await page.waitForSelector('h1:has-text("Vielen Dank für Ihre Bestellung")', { state: 'visible', timeout: 10000 });
    console.log('Order confirmation page reached!');

    // Read generated backend order number
    const confirmationText = await page.textContent('body');
    const orderMatch = confirmationText.match(/TS-2026\d{4}-[A-Z0-9]+/);
    const backendOrderId = orderMatch ? orderMatch[0] : null;
    console.log(`Captured server-issued Order ID: ${backendOrderId}`);

    const isGuestOrderValid = Boolean(backendOrderId && backendOrderId.startsWith('TS-2026'));
    results['guest_checkout_persisted'] = isGuestOrderValid;
    evidence['guest_order_id'] = backendOrderId;

    // -------------------------------------------------------------
    // TEST 2: AUTHENTICATED USER CHECKOUT & ACCOUNT ORDER HISTORY
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: AUTHENTICATED CHECKOUT & LIVE ORDER HISTORY ---');
    const authEmail = `kundetest-${Date.now()}@technikwelt.de`;

    // Open Auth modal and sign in via Django live OTP
    const signInBtn = page.locator('header button:has-text("Anmelden")');
    await signInBtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    await page.fill('[role="dialog"] input[type="email"]', authEmail);
    await page.click('[role="dialog"] button[type="submit"]');

    // Wait for OTP step and insert server code
    await page.waitForSelector('#otp-digit-1', { state: 'visible', timeout: 8000 });
    await page.locator('[role="dialog"] button:has-text("Einfügen")').click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 8000 });
    console.log(`User logged in with server session: ${authEmail}`);

    // Add another product to cart (p2)
    await page.goto(`${BASE_URL}/product/p2`, { waitUntil: 'networkidle' });
    await page.locator('button:has-text("In den Warenkorb")').click();

    // Go to checkout
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle' });

    // Step 1: Email auto-filled from session, click Next
    await page.click('button:has-text("Weiter zur Lieferadresse")');

    // Step 2: Fill address
    await page.fill('#checkout-firstname', 'Clara');
    await page.fill('#checkout-lastname', 'Schumann');
    await page.fill('#checkout-street', 'Inselstraße 18');
    await page.fill('#checkout-postal', '04103');
    await page.fill('#checkout-city', 'Leipzig');
    await page.click('button:has-text("Weiter zur Versandart")');

    // Step 3: Select Express Shipping (9.99 EUR)
    const expressRadio = page.locator('input[value="express"]');
    await expressRadio.check();
    await page.click('button:has-text("Weiter zur Zahlung")');

    // Step 4: Place order
    await page.locator('button[type="submit"]:has-text("Kostenpflichtig bestellen")').click();

    // Wait for confirmation
    await page.waitForSelector('h1:has-text("Vielen Dank für Ihre Bestellung")', { state: 'visible', timeout: 10000 });
    const authConfirmText = await page.textContent('body');
    const authOrderMatch = authConfirmText.match(/TS-2026\d{4}-[A-Z0-9]+/);
    const authOrderId = authOrderMatch ? authOrderMatch[0] : null;
    console.log(`Captured Authenticated Server Order ID: ${authOrderId}`);

    // -------------------------------------------------------------
    // TEST 3: VERIFY ORDER APPEARS IN USER ACCOUNT HISTORY
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: VERIFY ORDERS IN ACCOUNT DASHBOARD ---');
    await page.goto(`${BASE_URL}/account`, { waitUntil: 'networkidle' });

    // Click on "Bestellungen" (Orders tab)
    await page.click('button:has-text("Bestellungen")');
    await page.waitForTimeout(500);

    // Verify order ID is rendered in the order list
    const orderCard = page.locator(`text=${authOrderId}`);
    await orderCard.waitFor({ state: 'visible', timeout: 5000 });
    console.log(`Successfully verified Order ${authOrderId} in Account order history!`);

    // Verify order status badge and tracking details
    const orderCardElement = page.locator('.border.border-neutral-200.rounded-xl.p-5', { hasText: authOrderId }).first();
    const orderStatus = await orderCardElement.textContent();
    console.log(`Order status card snippet: ${orderStatus.substring(0, 100).replace(/\s+/g, ' ')}...`);

    const hasTrackingOrShipping = orderStatus.includes('Expressversand') || orderStatus.includes('DHL') || orderStatus.includes('In Bearbeitung');

    results['auth_checkout_persisted'] = Boolean(authOrderId);
    results['account_history_rendered'] = hasTrackingOrShipping;
    evidence['auth_order_id'] = authOrderId;

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

  const allPassed = results['guest_checkout_persisted'] && results['auth_checkout_persisted'] && results['account_history_rendered'];
  if (!allPassed) {
    console.error('\n❌ ONE OR MORE TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL SERVER-SIDE ORDER PERSISTENCE TESTS PASSED!');
    process.exit(0);
  }
}

runOrderPersistenceTests();
