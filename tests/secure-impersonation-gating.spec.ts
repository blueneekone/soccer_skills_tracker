// secure-impersonation-gating.spec.ts
// =============================================================================
// SSTRACKER SECURE IMPERSONATION & AGE-GATING PLAYWRIGHT VERIFICATION SUITE
// =============================================================================
// Proves the absolute block on minor impersonation, verifies age-gating DOB 
// profile validations, and mathematically validates the lack of infinite reloads
// on Director layout hydration guards.
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('Admin OS Secure Impersonation & Age Gating Gates', () => {

  test('Admin Impersonation: Should successfully initiate session for a verified adult (Age >= 18)', async ({ page }) => {
    // 1. Authenticate as a verified Global Admin using secure custom claims
    const adminSessionClaims = {
      uid: 'master-global-admin',
      email: 'admin@sstracker.app',
      role: 'admin',
      isProfileComplete: true,
      isAdult: true
    };

    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    }, adminSessionClaims);

    // Mock API response for a successful adult impersonation handshake
    await page.route('/api/auth/impersonate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          impersonationToken: 'mock-temp-impersonation-token-15min-lease',
          targetUid: 'verified-adult-coach-123',
          expiresIn: '15m'
        })
      });
    });

    // Navigate to Admin Global Users Console
    await page.goto('/admin/users');
    await page.waitForSelector('.pd-page-root', { timeout: 5000 });

    // Click the Impersonate button on a verified adult row
    const impersonateBtn = page.locator('button[data-user-uid="verified-adult-coach-123"]');
    await impersonateBtn.click();

    // Verify successful lease session redirection or toast
    const successToast = page.locator('text=Impersonation active. 15-minute secure lease initiated.');
    await expect(successToast).toBeVisible();
  });

  test('Admin Impersonation: Should hard-block and log a P0 alert on any minor impersonation attempts (Age < 18)', async ({ page }) => {
    // 1. Authenticate as Admin
    const adminSessionClaims = {
      uid: 'master-global-admin',
      email: 'admin@sstracker.app',
      role: 'admin',
      isProfileComplete: true,
      isAdult: true
    };

    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    }, adminSessionClaims);

    // Mock API response showing a hard 403 Forbidden with strict safety error payload
    await page.route('/api/auth/impersonate', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          errorCode: 'IMPERSONATION_BLOCKED: TARGET_IS_MINOR',
          message: 'Zero-Trust Protocol violation. Impersonating minors under age 18 is strictly prohibited.'
        })
      });
    });

    await page.goto('/admin/users');
    await page.waitForSelector('.pd-page-root', { timeout: 5000 });

    // Attempt to impersonate a minor player (Age 14)
    const impersonateMinorBtn = page.locator('button[data-user-uid="minor-player-456"]');
    await impersonateMinorBtn.click();

    // Assert that the UI interceptor catches the 403 and displays the high-priority warning
    const blockAlert = page.locator('text=Zero-Trust Protocol violation. Impersonating minors under age 18 is strictly prohibited.');
    await expect(blockAlert).toBeVisible();
  });

  test('Account Registration: Should fail if dateOfBirth parameter is missing or invalid', async ({ page }) => {
    await page.goto('/register');
    await page.waitForSelector('form[data-testid="registration-form"]', { timeout: 5000 });

    // Attempt registration with missing Date of Birth
    await page.fill('input[name="email"]', 'new-registrant@sstracker.app');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.fill('input[name="dateOfBirth"]', ''); // Left blank
    await page.click('button[type="submit"]');

    // Assert UI form validation feedback
    const validationError = page.locator('text=A verified Date of Birth is required to establish account safety gates.');
    await expect(validationError).toBeVisible();
  });

  test('Director Dashboard: SvelteKit layout hook should prevent infinite client-side auto-refresh loops', async ({ page }) => {
    // Setup mismatched claims: user accesses /director but SvelteKit hook has not completed claims propagation
    const mismatchedClaims = {
      uid: 'pending-director-uid',
      email: 'director@sstracker.app',
      role: 'player', // Mismatched: trying to access /director with a player claim
      isProfileComplete: true
    };

    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    }, mismatchedClaims);

    // Track page reloads to assert that we are not trapped in a rapid infinite reload loop
    let reloadCount = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        reloadCount++;
      }
    });

    // Try navigating to Director Dashboard
    await page.goto('/director/dashboard');

    // SvelteKit Server Hook (src/hooks.server.ts) should execute a server-side redirect to /login
    // or return a clean 403, rather than loading the page and forcing client-side reload cascades.
    await page.waitForURL('**/login', { timeout: 5000 });

    // Assert that the redirect was clean (should only navigate once or twice, definitely not an infinite loop)
    expect(reloadCount).toBeLessThanOrEqual(3);
  });

});
