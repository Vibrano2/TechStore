import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5174';

async function runAuthTests() {
  console.log('====================================================');
  console.log('   TECHNIKWELT AUTHENTICATION & FALLBACK TEST SUITE ');
  console.log('====================================================\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = {};
  const evidence = {};

  try {
    // -------------------------------------------------------------
    // TEST 1: EXPLICIT DEMO MODE STILL WORKS & STAYS SEPARATE
    // -------------------------------------------------------------
    console.log('--- TEST 1: EXPLICIT DEMO MODE & STATE ISOLATION ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    // Enable explicit demo configuration via localStorage
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('technikwelt_demo_mode', 'true');
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Verify demo mode is detected
    const isDemoConfigActive = await page.evaluate(() => {
      return localStorage.getItem('technikwelt_demo_mode') === 'true';
    });
    console.log(`Explicit demo configuration active: ${isDemoConfigActive}`);

    // Open Auth modal
    const loginBtn = page.locator('header button:has-text("Anmelden")');
    await loginBtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Enter demo test email
    const demoEmail = 'demo-tester@example.de';
    await page.fill('[role="dialog"] input[type="email"]', demoEmail);
    await page.click('[role="dialog"] button[type="submit"]');

    // Wait for step 2 (OTP Entry)
    await page.waitForSelector('#otp-digit-1', { state: 'visible' });
    console.log('Demo mode successfully transitioned to OTP entry');

    // Check dev test code banner is displayed
    const devCodeElement = page.locator('[role="dialog"] strong.font-mono');
    await devCodeElement.waitFor({ state: 'visible' });
    const codeText = await devCodeElement.textContent();
    console.log(`Dev test code banner: ${codeText.trim()}`);

    // Click Insert button ('Einfügen') to fill and submit demo code
    const insertBtn = page.locator('[role="dialog"] button:has-text("Einfügen")');
    await insertBtn.click();

    // Wait for modal to close upon successful login
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
    console.log('Demo login succeeded and modal closed');

    // Verify storage keys: demo keys MUST be set, real keys MUST be null
    const storageStateDemo = await page.evaluate(() => ({
      demoToken: localStorage.getItem('technikwelt_demo_token'),
      demoUser: localStorage.getItem('technikwelt_demo_user'),
      realToken: localStorage.getItem('technikwelt_auth_token'),
      realUser: localStorage.getItem('technikwelt_auth_user'),
    }));

    console.log('Storage inspection in demo mode:');
    console.log(`  technikwelt_demo_token: ${storageStateDemo.demoToken?.substring(0, 20)}...`);
    console.log(`  technikwelt_demo_user: ${storageStateDemo.demoUser ? 'Present (Demo-Kunde)' : 'Missing'}`);
    console.log(`  technikwelt_auth_token: ${storageStateDemo.realToken}`);
    console.log(`  technikwelt_auth_user: ${storageStateDemo.realUser}`);

    const demoIsolationPass = (
      storageStateDemo.demoToken !== null &&
      storageStateDemo.demoUser !== null &&
      storageStateDemo.realToken === null &&
      storageStateDemo.realUser === null
    );

    results['explicit_demo_mode_works'] = demoIsolationPass;
    evidence['explicit_demo_mode'] = storageStateDemo;

    // Logout demo user
    const userMenuBtn = page.locator('header button:has-text("Mein Konto"), header button:has-text("Demo-Kunde")');
    await userMenuBtn.click();
    const logoutBtn = page.locator('button:has-text("Abmelden")');
    await logoutBtn.click();
    await page.waitForTimeout(300);

    const storagePostLogout = await page.evaluate(() => ({
      demoToken: localStorage.getItem('technikwelt_demo_token'),
      demoUser: localStorage.getItem('technikwelt_demo_user'),
    }));
    console.log(`Demo logout cleared demo keys: ${storagePostLogout.demoToken === null}`);

    // -------------------------------------------------------------
    // TEST 2: PRODUCTION API FAILURE DOES NOT SIGN USER IN
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: PRODUCTION API FAILURE & TRANSLATED SERVICE-UNAVAILABLE ---');
    // Clear demo mode flag to enforce pure production/standard mode
    await page.evaluate(() => {
      localStorage.clear();
      window.__TECHSTORE_DEMO_AUTH__ = false;
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Intercept backend auth requests to simulate offline / network connection failure
    await page.route('**/api/v1/auth/**', (route) => {
      console.log(`Intercepted and aborted request to: ${route.request().url()}`);
      route.abort('failed');
    });

    // Attempt login in DE (German)
    const signInTrigger = page.locator('header button:has-text("Anmelden")');
    await signInTrigger.click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    await page.fill('[role="dialog"] input[type="email"]', 'prod-tester@example.de');
    await page.click('[role="dialog"] button[type="submit"]');

    // Wait for error alert to appear
    const alertBox = page.locator('[role="alert"]');
    await alertBox.waitFor({ state: 'visible', timeout: 5000 });
    const alertTextDe = await alertBox.textContent();
    console.log(`Production API failure alert text (DE): "${alertTextDe.trim()}"`);

    // Expected German service unavailable message
    const expectedMsgDe = 'Der Authentifizierungsdienst ist vorübergehend nicht erreichbar. Bitte versuchen Sie es später erneut.';
    const deAlertMatches = alertTextDe.includes('Authentifizierungsdienst ist vorübergehend nicht erreichbar');

    // Verify modal DID NOT transition to OTP entry step
    const otpInputPresent = await page.locator('#otp-digit-1').count();
    console.log(`OTP input present: ${otpInputPresent > 0 ? 'YES (UNEXPECTED)' : 'NO (CORRECT)'}`);

    // Verify localStorage has NO session tokens or users created
    const storageStateProdFailed = await page.evaluate(() => ({
      demoToken: localStorage.getItem('technikwelt_demo_token'),
      demoUser: localStorage.getItem('technikwelt_demo_user'),
      realToken: localStorage.getItem('technikwelt_auth_token'),
      realUser: localStorage.getItem('technikwelt_auth_user'),
    }));

    console.log('Storage inspection after production API failure:');
    console.log(`  realToken: ${storageStateProdFailed.realToken}`);
    console.log(`  realUser: ${storageStateProdFailed.realUser}`);
    console.log(`  demoToken: ${storageStateProdFailed.demoToken}`);
    console.log(`  demoUser: ${storageStateProdFailed.demoUser}`);

    const prodFailureNoSessionPass = (
      deAlertMatches &&
      otpInputPresent === 0 &&
      storageStateProdFailed.realToken === null &&
      storageStateProdFailed.realUser === null &&
      storageStateProdFailed.demoToken === null &&
      storageStateProdFailed.demoUser === null
    );

    results['prod_failure_blocks_session'] = prodFailureNoSessionPass;
    evidence['prod_failure'] = {
      alertText: alertTextDe.trim(),
      expectedMsg: expectedMsgDe,
      storageState: storageStateProdFailed,
    };

    // Also test translated service-unavailable error in English (EN)
    console.log('\n--- TEST 2B: PRODUCTION API FAILURE TRANSLATION (EN) ---');
    // Switch language to English
    const langSelect = page.locator('select').first();
    await langSelect.selectOption('en');
    await page.waitForTimeout(300);

    // Re-submit email in EN
    await page.fill('[role="dialog"] input[type="email"]', 'prod-tester-en@example.com');
    await page.click('[role="dialog"] button[type="submit"]');

    await alertBox.waitFor({ state: 'visible' });
    const alertTextEn = await alertBox.textContent();
    console.log(`Production API failure alert text (EN): "${alertTextEn.trim()}"`);
    const enAlertMatches = alertTextEn.includes('authentication service is temporarily unavailable');

    results['prod_failure_translated_en'] = enAlertMatches;

    // Close modal and unroute
    await page.locator('button[aria-label="Close"], button[aria-label="Schließen"]').click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
    await page.unroute('**/api/v1/auth/**');

    // Reset language back to DE
    await langSelect.selectOption('de');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // TEST 3: LIVE DJANGO AUTHENTICATION STILL WORKS
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: LIVE DJANGO AUTHENTICATION ---');
    // Verify pure live Django authentication with real backend on port 8000
    await page.evaluate(() => {
      localStorage.clear();
      window.__TECHSTORE_DEMO_AUTH__ = false;
    });
    await page.reload({ waitUntil: 'networkidle' });

    const liveEmail = `live-${Date.now()}@technikwelt-test.de`;
    console.log(`Initiating live Django authentication for: ${liveEmail}`);

    const signInBtnLive = page.locator('header button:has-text("Anmelden")');
    await signInBtnLive.click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Request code from live Django backend
    await page.fill('[role="dialog"] input[type="email"]', liveEmail);
    await page.click('[role="dialog"] button[type="submit"]');

    // Wait for step 2 (OTP Entry)
    await page.waitForSelector('#otp-digit-1', { state: 'visible', timeout: 8000 });
    console.log('Django backend responded successfully with OTP creation');

    // In Django DEBUG mode, backend returns dev_code in response, which is shown in dev banner
    const liveDevCodeEl = page.locator('[role="dialog"] strong.font-mono');
    await liveDevCodeEl.waitFor({ state: 'visible', timeout: 5000 });
    const liveDevText = await liveDevCodeEl.textContent();
    console.log(`Live Django OTP code banner: ${liveDevText.trim()}`);

    // Click 'Einfügen' to insert and submit the real Django OTP code
    await page.locator('[role="dialog"] button:has-text("Einfügen")').click();

    // Modal closes upon successful Django token issuance
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
    console.log('Django authentication completed and verified');

    // Inspect stored tokens
    const storageStateDjango = await page.evaluate(() => ({
      realToken: localStorage.getItem('technikwelt_auth_token'),
      realUser: localStorage.getItem('technikwelt_auth_user'),
      demoToken: localStorage.getItem('technikwelt_demo_token'),
      demoUser: localStorage.getItem('technikwelt_demo_user'),
    }));

    console.log('Storage inspection after live Django login:');
    console.log(`  realToken (Django DRF Token): ${storageStateDjango.realToken}`);
    console.log(`  realUser (Django User): ${storageStateDjango.realUser ? 'Present (Server User)' : 'Missing'}`);
    console.log(`  demoToken: ${storageStateDjango.demoToken}`);
    console.log(`  demoUser: ${storageStateDjango.demoUser}`);

    const isDjangoTokenValid = (
      storageStateDjango.realToken &&
      storageStateDjango.realToken.length >= 40 &&
      !storageStateDjango.realToken.startsWith('mock-') &&
      !storageStateDjango.realToken.startsWith('demo-') &&
      storageStateDjango.demoToken === null &&
      storageStateDjango.demoUser === null
    );

    results['django_live_authentication_works'] = Boolean(isDjangoTokenValid);
    evidence['django_live_auth'] = {
      tokenType: 'Django Server-issued Token',
      tokenLength: storageStateDjango.realToken?.length,
      demoToken: storageStateDjango.demoToken,
    };

    // Logout Django user
    const userMenuDjango = page.locator('header button[aria-expanded]');
    await userMenuDjango.click();
    await page.locator('button:has-text("Abmelden")').click();
    await page.waitForTimeout(300);

    const storagePostDjangoLogout = await page.evaluate(() => ({
      realToken: localStorage.getItem('technikwelt_auth_token'),
      realUser: localStorage.getItem('technikwelt_auth_user'),
    }));
    console.log(`Django logout cleared real tokens: ${storagePostDjangoLogout.realToken === null}`);

  } catch (err) {
    console.error('Test execution failed with error:', err);
    results['error'] = err.message;
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log('              TEST SUMMARY REPORT                   ');
  console.log('====================================================');
  console.log(JSON.stringify({ results, evidence }, null, 2));

  const allPassed = Object.values(results).every(v => v === true);
  if (!allPassed) {
    console.error('\n❌ ONE OR MORE TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL FOCUSED AUTHENTICATION TESTS PASSED!');
    process.exit(0);
  }
}

runAuthTests();
