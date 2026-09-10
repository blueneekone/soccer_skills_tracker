import { test, expect } from '@playwright/test';

test.describe('Parent OS: Visual Layout Regression Suite', () => {
  test.use({ storageState: 'playwright/.auth/parent.json' });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sstracker_e2e_bypass', 'true');
      localStorage.setItem('sstracker_e2e_bypass_role', 'parent');
      localStorage.setItem('sstracker_e2e_bypass_is_cleared', 'true');
    });
  });

  test('Parent consent form matches our premium design baseline', async ({ page }) => {
    // Navigate to the target form route
    await page.goto('/parent/vpc');
    await page.waitForLoadState('domcontentloaded');
    // Ensure all critical elements are visible before capturing
    await expect(page.getByRole('heading', { name: 'Verifiable Parental Consent' })).toBeVisible({ timeout: 10000 });

    // 📸 Capture and assert visual snapshot alignment
    await expect(page).toHaveScreenshot('parent-vpc-consent-form-baseline.png', {
      maxDiffPixelRatio: 0.05, // Enforce a strict 5% maximum visual drift margin
      threshold: 0.2
    });
  });
});
