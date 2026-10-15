import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:5174';

async function runInvoiceAndEmailTests() {
  console.log('====================================================');
  console.log(' TECHNIKWELT INVOICE & EMAIL VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  const results = {};
  const evidence = {};

  try {
    // -------------------------------------------------------------
    // TEST 1: GUEST CHECKOUT -> INVOICE CARD & PDF DOWNLOAD
    // -------------------------------------------------------------
    console.log('--- TEST 1: GUEST CHECKOUT WITH PDF INVOICE DOWNLOAD ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    await page.evaluate(() => {
      localStorage.clear();
      window.__TECHSTORE_DEMO_AUTH__ = false;
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Add product to cart
    await page.goto(`${BASE_URL}/product/p1`, { waitUntil: 'networkidle' });
    await page.locator('button:has-text("In den Warenkorb")').click();
    console.log('Added product p1 to cart');

    // Go to checkout
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle' });

    const guestEmail = `gast-${Date.now()}@technikwelt-test.de`;
    await page.fill('#checkout-email', guestEmail);
    await page.click('button:has-text("Weiter zur Lieferadresse")');

    await page.fill('#checkout-firstname', 'Sophie');
    await page.fill('#checkout-lastname', 'Scholl');
    await page.fill('#checkout-street', 'Ludwigstraße 22');
    await page.fill('#checkout-postal', '80539');
    await page.fill('#checkout-city', 'München');
    await page.click('button:has-text("Weiter zur Versandart")');

    await page.click('button:has-text("Weiter zur Zahlung")');

    const placeOrderBtn = page.locator('button[type="submit"]:has-text("Kostenpflichtig bestellen")');
    await placeOrderBtn.click();

    // Wait for confirmation page
    await page.waitForSelector('h1:has-text("Vielen Dank für Ihre Bestellung")', { state: 'visible', timeout: 10000 });
    console.log('Order confirmation page reached!');

    // Read order ID
    const bodyText = await page.textContent('body');
    const orderMatch = bodyText.match(/TS-2026\d{4}-[A-Z0-9]+/);
    const orderId = orderMatch ? orderMatch[0] : null;
    console.log(`Captured server Order ID: ${orderId}`);

    // Verify invoice card presence
    const invoiceCard = page.locator('text=Offizielle Rechnung (§14 UStG)');
    await invoiceCard.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Verified GoBD/§14 UStG invoice notice card on confirmation page!');

    // Trigger PDF download
    const downloadInvoiceBtn = page.locator('button:has-text("Rechnung (PDF) herunterladen")');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      downloadInvoiceBtn.click(),
    ]);

    const suggestedFilename = download.suggestedFilename();
    console.log(`Captured download event: ${suggestedFilename}`);

    const downloadPath = path.join(process.cwd(), 'scripts', suggestedFilename);
    await download.saveAs(downloadPath);

    const stats = fs.statSync(downloadPath);
    console.log(`Saved PDF invoice locally: ${stats.size} bytes`);

    // Verify PDF header %PDF-
    const pdfBuffer = fs.readFileSync(downloadPath);
    const isPdfHeaderValid = pdfBuffer.slice(0, 5).toString('ascii').startsWith('%PDF');
    console.log(`PDF header verification: ${isPdfHeaderValid ? 'VALID (%PDF-)' : 'INVALID'}`);

    results['guest_invoice_downloaded'] = Boolean(stats.size > 2000 && isPdfHeaderValid);
    evidence['guest_order_id'] = orderId;
    evidence['guest_invoice_filename'] = suggestedFilename;
    evidence['guest_invoice_bytes'] = stats.size;

    // Clean up downloaded test file
    fs.unlinkSync(downloadPath);

    // -------------------------------------------------------------
    // TEST 2: RESEND CONFIRMATION EMAIL ACTION
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: RESEND CONFIRMATION EMAIL TRIGGER ---');
    const resendBtn = page.locator('button:has-text("Bestellbestätigung erneut senden")');
    await resendBtn.click();

    await page.waitForSelector('text=Bestellbestätigung wurde erfolgreich versendet', { state: 'visible', timeout: 8000 });
    console.log('Successfully received confirmation email dispatched banner!');
    results['resend_email_triggered'] = true;

    // -------------------------------------------------------------
    // TEST 3: AUTHENTICATED USER ORDER HISTORY INVOICE DOWNLOAD
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: ACCOUNT ORDER HISTORY INVOICE DOWNLOAD ---');
    const authEmail = `alex-${Date.now()}@technikwelt.de`;

    // Sign in
    await page.locator('header button:has-text("Anmelden")').click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    await page.fill('[role="dialog"] input[type="email"]', authEmail);
    await page.click('[role="dialog"] button[type="submit"]');

    await page.waitForSelector('#otp-digit-1', { state: 'visible', timeout: 8000 });
    await page.locator('[role="dialog"] button:has-text("Einfügen")').click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 8000 });
    console.log(`Logged in user: ${authEmail}`);

    // Add product p2 and place order
    await page.goto(`${BASE_URL}/product/p2`, { waitUntil: 'networkidle' });
    await page.locator('button:has-text("In den Warenkorb")').click();

    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Weiter zur Lieferadresse")');

    await page.fill('#checkout-firstname', 'Alexander');
    await page.fill('#checkout-lastname', 'von Humboldt');
    await page.fill('#checkout-street', 'Unter den Linden 6');
    await page.fill('#checkout-postal', '10117');
    await page.fill('#checkout-city', 'Berlin');
    await page.click('button:has-text("Weiter zur Versandart")');
    await page.click('button:has-text("Weiter zur Zahlung")');

    await page.locator('button[type="submit"]:has-text("Kostenpflichtig bestellen")').click();
    await page.waitForSelector('h1:has-text("Vielen Dank für Ihre Bestellung")', { state: 'visible', timeout: 10000 });

    const authConfirmText = await page.textContent('body');
    const authOrderMatch = authConfirmText.match(/TS-2026\d{4}-[A-Z0-9]+/);
    const authOrderId = authOrderMatch ? authOrderMatch[0] : null;
    console.log(`Captured auth order ID: ${authOrderId}`);

    // Navigate to Account -> Bestellungen
    await page.goto(`${BASE_URL}/account`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Bestellungen")');
    await page.waitForTimeout(500);

    const orderRow = page.locator('.border.border-neutral-200.rounded-xl.p-5', { hasText: authOrderId }).first();
    await orderRow.waitFor({ state: 'visible', timeout: 5000 });

    // Click "Rechnung (PDF)" button in the card
    const invoiceBtn = orderRow.locator('button:has-text("Rechnung (PDF)")');
    const [authDownload] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      invoiceBtn.click(),
    ]);

    const authInvoiceFilename = authDownload.suggestedFilename();
    console.log(`Account invoice downloaded: ${authInvoiceFilename}`);

    const authDownloadPath = path.join(process.cwd(), 'scripts', authInvoiceFilename);
    await authDownload.saveAs(authDownloadPath);
    const authStats = fs.statSync(authDownloadPath);
    console.log(`Account invoice size: ${authStats.size} bytes`);

    results['account_invoice_downloaded'] = Boolean(authStats.size > 2000);
    evidence['auth_order_id'] = authOrderId;
    evidence['auth_invoice_bytes'] = authStats.size;

    fs.unlinkSync(authDownloadPath);

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

  const allPassed = results['guest_invoice_downloaded'] && results['resend_email_triggered'] && results['account_invoice_downloaded'];
  if (!allPassed) {
    console.error('\n❌ ONE OR MORE TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL INVOICE & EMAIL TESTS PASSED!');
    process.exit(0);
  }
}

runInvoiceAndEmailTests();
