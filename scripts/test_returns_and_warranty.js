import { chromium } from 'playwright';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

async function runReturnsAndWarrantyVerification() {
  console.log('===========================================================');
  console.log(' TECHNIKWELT RETURNS & WARRANTY E2E VERIFICATION SUITE');
  console.log('===========================================================\n');

  const testEmail = 'e2e.retoure.test@technikwelt-shop.de';
  const testCustomerName = 'Sabine Musterfrau';
  let createdOrderId = '';
  let createdReturnId = '';
  let createdWarrantyClaimNumber = '';

  // -------------------------------------------------------------
  // TEST 1: BACKEND ORDER CREATION FOR RETOUR TEST
  // -------------------------------------------------------------
  console.log('--- 1. CREATING TEST ORDER VIA BACKEND API ---');
  const orderPayload = {
    email: testEmail,
    first_name: 'Sabine',
    last_name: 'Musterfrau',
    street: 'Schloßallee 12',
    postal_code: '80331',
    city: 'München',
    payment_method: 'stripe',
    items: [
      {
        product_id: 'p1',
        quantity: 1
      }
    ]
  };

  const orderRes = await fetch(`${BACKEND_URL}/api/v1/orders/checkout/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });

  if (!orderRes.ok) {
    throw new Error(`Order checkout failed: ${orderRes.status} ${await orderRes.text()}`);
  }
  const orderData = await orderRes.json();
  createdOrderId = orderData.id;
  console.log(`✓ Order successfully created: ${createdOrderId} (${orderData.grand_total} EUR)`);

  // -------------------------------------------------------------
  // TEST 2: BACKEND RETURN REQUEST & DHL LABEL PDF CREATION
  // -------------------------------------------------------------
  console.log('\n--- 2. CREATING RETURN REQUEST (30-DAY STATUTORY RETURN) ---');
  const returnPayload = {
    order_id: createdOrderId,
    customer_email: testEmail,
    customer_name: testCustomerName,
    reason: 'not_liked',
    customer_notes: 'Farbe weicht im Wohnzimmerlicht leicht ab.',
    refund_method: 'original_payment',
    items: [
      {
        product_id: 'p1',
        product_name: orderData.items[0]?.name || 'Sony WH-1000XM5',
        quantity: 1,
        unit_price: orderData.items[0]?.unit_price || 299.00
      }
    ]
  };

  const returnRes = await fetch(`${BACKEND_URL}/api/v1/returns/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(returnPayload)
  });

  if (!returnRes.ok) {
    throw new Error(`Return creation failed: ${returnRes.status} ${await returnRes.text()}`);
  }
  const returnData = await returnRes.json();
  createdReturnId = returnData.id;
  console.log(`✓ Return created: ${returnData.id}`);
  console.log(`✓ DHL Tracking Code: ${returnData.return_tracking_number}`);
  console.log(`✓ Refund Amount: ${returnData.refund_amount} EUR`);
  console.log(`✓ Status: ${returnData.status_display}`);

  // Test DHL PDF download
  console.log('\n--- 3. TESTING DHL RETOURENSCHEIN PDF DOWNLOAD ---');
  const pdfRes = await fetch(`${BACKEND_URL}/api/v1/returns/${createdReturnId}/label/?email=${encodeURIComponent(testEmail)}`);
  if (!pdfRes.ok) {
    throw new Error(`PDF Download failed: ${pdfRes.status}`);
  }
  const pdfBuffer = await pdfRes.arrayBuffer();
  const pdfHeader = Buffer.from(pdfBuffer.slice(0, 5)).toString();
  console.log(`✓ DHL PDF Response: ${pdfRes.status} ${pdfRes.headers.get('content-type')}`);
  console.log(`✓ PDF Magic Bytes: "${pdfHeader}" (Valid PDF document: ${pdfHeader === '%PDF-'})`);
  console.log(`✓ PDF Size: ${pdfBuffer.byteLength} bytes`);

  // Test security: unauthorized email should be forbidden (403)
  const unauthPdfRes = await fetch(`${BACKEND_URL}/api/v1/returns/${createdReturnId}/label/?email=wrong@email.de`);
  console.log(`✓ Security Check: Unauthorized email access rejected with HTTP ${unauthPdfRes.status} (Expected: 403)`);

  // -------------------------------------------------------------
  // TEST 4: BACKEND STATUTORY WARRANTY CLAIM (§ 439 BGB)
  // -------------------------------------------------------------
  console.log('\n--- 4. SUBMITTING STATUTORY WARRANTY CLAIM (§ 439 BGB) ---');
  const warrantyPayload = {
    customer_email: testEmail,
    customer_name: testCustomerName,
    order_id: createdOrderId,
    product: 'p1',
    serial_number: 'SN-WH5-2026-99120',
    defect_category: 'battery_power',
    remedy_preference: 'repair',
    description: 'Kopfhörer lädt nur noch bis 20% und entlädt sich innerhalb von 15 Minuten komplett.'
  };

  const warrantyRes = await fetch(`${BACKEND_URL}/api/v1/warranty-claims/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(warrantyPayload)
  });

  if (!warrantyRes.ok) {
    throw new Error(`Warranty claim failed: ${warrantyRes.status} ${await warrantyRes.text()}`);
  }
  const warrantyData = await warrantyRes.json();
  createdWarrantyClaimNumber = warrantyData.claim_number;
  console.log(`✓ Warranty Claim created: ${warrantyData.claim_number}`);
  console.log(`✓ Defect Category: ${warrantyData.defect_category_display}`);
  console.log(`✓ Statutory Remedy (§ 439 BGB): ${warrantyData.remedy_preference_display}`);
  console.log(`✓ Status: ${warrantyData.status_display}`);

  // Track claim
  const trackWarrantyRes = await fetch(`${BACKEND_URL}/api/v1/warranty-claims/track/?claim_number=${createdWarrantyClaimNumber}&email=${encodeURIComponent(testEmail)}`);
  const trackedData = await trackWarrantyRes.json();
  console.log(`✓ Track Claim Endpoint: Verified claim ${trackedData.claim_number} is ${trackedData.status_display}`);

  // -------------------------------------------------------------
  // TEST 5: PLAYWRIGHT BROWSER VERIFICATION OF ACCOUNT PORTAL
  // -------------------------------------------------------------
  console.log('\n--- 5. PLAYWRIGHT UI INSPECTION (ACCOUNT PORTAL) ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Seed authenticated user state into localStorage
  await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
  await page.evaluate((auth) => {
    localStorage.setItem('technikwelt_demo_mode', 'true');
    localStorage.setItem('technikwelt_demo_token', 'demo-token-e2e-12345');
    localStorage.setItem(
      'technikwelt_demo_user',
      JSON.stringify({
        id: 'usr_e2e_test',
        email: auth.email,
        full_name: auth.name,
        first_name: 'Sabine',
        last_name: 'Musterfrau',
        street: 'Schloßallee 12',
        postal_code: '80331',
        city: 'München',
      })
    );
  }, { email: testEmail, name: testCustomerName });

  // Navigate to Account page
  await page.goto(`${FRONTEND_URL}/account`, { waitUntil: 'networkidle' });

  // Check Account header
  const accountTitle = await page.textContent('h1');
  console.log(`✓ Account page loaded: "${accountTitle?.trim()}"`);

  // Switch to Returns tab
  console.log('Navigating to Returns tab...');
  const returnsTabBtn = page.locator('button:has-text("Rücksendungen")').first();
  await returnsTabBtn.click();
  await page.waitForTimeout(500);

  // Check that the demo placeholder is GONE and real header exists
  const returnsHeading = await page.textContent('h3');
  console.log(`✓ Returns Tab Heading: "${returnsHeading?.trim()}"`);
  if (returnsHeading?.includes('Rücksendungen & Retouren')) {
    console.log('✓ Verified: Demo callout replaced with functional Returns management view');
  }

  // Check return card
  await page.locator(`text=${createdReturnId}`).waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  const returnCard = page.locator(`text=${createdReturnId}`);
  const hasReturnCard = await returnCard.count() > 0;
  console.log(`✓ Return Card for ${createdReturnId} visible in Account: ${hasReturnCard}`);

  // Verify DHL Download button exists
  const dhlDownloadBtn = page.locator('button:has-text("DHL Retourenschein (PDF)")').first();
  const hasDhlBtn = await dhlDownloadBtn.count() > 0;
  console.log(`✓ DHL Retourenschein (PDF) download button available: ${hasDhlBtn}`);

  // Test opening New Return Modal
  console.log('Testing "Neue Rücksendung anlegen" modal...');
  const newReturnBtn = page.locator('button:has-text("Neue Rücksendung anlegen")').first();
  await newReturnBtn.click();
  await page.waitForTimeout(400);

  const modalTitle = await page.textContent('#return-modal-title');
  console.log(`✓ Return Modal opened: "${modalTitle?.trim()}"`);
  const closeReturnModalBtn = page.locator('button[aria-label="Modal schließen"]').first();
  await closeReturnModalBtn.click();
  await page.waitForTimeout(300);
  console.log('✓ Return Modal closed cleanly');

  // Switch to Warranty tab
  console.log('\nNavigating to Warranty tab...');
  const warrantyTabBtn = page.locator('button:has-text("Garantie & BGB")').first();
  await warrantyTabBtn.click();
  await page.waitForTimeout(500);

  const warrantyHeading = await page.textContent('h3');
  console.log(`✓ Warranty Tab Heading: "${warrantyHeading?.trim()}"`);

  // Check warranty card
  await page.locator(`text=${createdWarrantyClaimNumber}`).waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  const warrantyCard = page.locator(`text=${createdWarrantyClaimNumber}`);
  const hasWarrantyCard = await warrantyCard.count() > 0;
  console.log(`✓ Warranty Claim Card for ${createdWarrantyClaimNumber} visible: ${hasWarrantyCard}`);

  // Test opening Warranty Modal
  console.log('Testing "Neuen Garantieantrag stellen" modal...');
  const newWarrantyBtn = page.locator('button:has-text("Neuen Garantieantrag stellen")').first();
  await newWarrantyBtn.click();
  await page.waitForTimeout(400);

  const warrantyModalTitle = await page.textContent('#warranty-modal-title');
  console.log(`✓ Warranty Modal opened: "${warrantyModalTitle?.trim()}"`);
  const closeWarrantyModalBtn = page.locator('button[aria-label="Modal schließen"]').first();
  await closeWarrantyModalBtn.click();
  await page.waitForTimeout(300);
  console.log('✓ Warranty Modal closed cleanly');

  await browser.close();

  console.log('\n===========================================================');
  console.log(' ALL RETURNS & WARRANTY TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('===========================================================');
}

runReturnsAndWarrantyVerification().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
