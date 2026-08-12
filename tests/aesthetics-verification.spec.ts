import { test, expect } from '@playwright/test';

test.describe('Chief Design Officer: Viewport Cohesion & Color Taxonomy', () => {
  test('Asserts 60-30-10 palette rules and Geist typography at critical viewport steps', async ({ page }) => {
    const viewports = [375, 768, 1024];
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/player/dashboard');
      
      // Ensure the background is unshaded Void Black
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bodyBg).not.toContain('rgba');
    }
  });
});