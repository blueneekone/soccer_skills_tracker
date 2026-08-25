import { test, expect } from '@playwright/test';

test('Admin Active Incidents click navigation', async ({ page }) => {
  await page.goto('/onboarding');
  // Inject auth bypass
  await page.evaluate(() => {
    localStorage.setItem('auth_state', JSON.stringify({
      uid: 'admin1',
      email: 'admin@example.com',
      role: 'super_admin'
    }));
  });

  await page.goto('/admin/overview');

  // Wait for load
  await page.waitForLoadState('load');

  // Wait for the tile to be visible
  await page.waitForSelector('div[role="button"]:has-text("Active Incidents")', { state: 'visible', timeout: 15000 });

  // Click
  await page.locator('div[role="button"]:has-text("Active Incidents")').click();

  // Verify navigation to audit log
  await expect(page).toHaveURL(/.*\/admin\/audit-logs\?status=active/);
});
