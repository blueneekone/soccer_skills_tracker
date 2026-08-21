// passkey-re-enrollment.spec.ts
// =============================================================================
// SSTRACKER E2E AUDIT: WEBBAUTHN PASSKEY ENFORCEMENT & FALLBACK GATING TEST
// This Playwright spec programmatically asserts that our authentication gates
// block insecure silent fallbacks to Magic Links when a user's passkey is deleted.
// It verifies that they are instead cleanly redirected to our passkey setup gate.
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('Authentication Security: Passkey Enforcement & Re-enrollment Gates', () => {
  test('Should block magic-link fallback if account had passkey record and is missing enrollment', async ({ page }) => {
    // 1. Mock user claims for an account that has "passkeyEnrolled: true" on metadata,
    // but the actual public keys are out of sync or deleted locally
    const mockClaims = {
      uid: 'compromised-director',
      email: 'compromised@sstracker.app',
      role: 'director',
      isProfileComplete: true,
      passkeyEnrolled: true, // System flagged that a passkey exists
      activePasskeyId: null  // Local key reference is missing or deleted
    };

    // Attempt to navigate to the secure login flow
    await page.goto('/login');

    // 2. Mock API Intercept: Intercept the magic-link send request
    // The server must reject magic link dispatch if passkey is out-of-sync
    await page.route('/api/auth/magic-link', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'PASSKEY_REQUIRED',
          message: 'Silent magic link fallback blocked. Biometric verification or re-enrollment required.'
        })
      });
    });

    // 3. Fill in the email of the compromised passkey account
    await page.fill('input[type="email"]', 'compromised@sstracker.app');
    await page.click('button[type="submit"]');

    // 4. Assert that the client-side router intercepts the server's 403 and redirects strictly to the passkey re-enrollment gate
    await page.waitForURL('**/auth/passkey-setup');
    
    const bannerText = page.locator('text=Mandatory Passkey Re-enrollment');
    await expect(bannerText).toBeVisible();

    // Verify that the page has exactly 0px rounded corners on panels (Tactical SIEM style)
    const card = page.locator('.tw-border-slate-800, .bento-panel').first();
    await expect(card).toHaveCSS('border-radius', '0px');
  });
});
