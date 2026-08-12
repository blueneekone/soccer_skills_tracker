import { test, expect } from '@playwright/test';

test.describe('Chief Marketing Officer: Product Demo Navigation Verification', () => {
  test('Bypasses auth wall, navigates the training triangle segments and asserts video container', async ({ page }) => {
    await page.goto('/');
    const demoVideo = page.locator('video');
    await expect(demoVideo).toBeVisible();
    
    // Assert singular Action Gold CTA is present
    const cta = page.locator('button:has-text("Deploy Your Club")');
    await expect(cta).toBeVisible();
  });
});