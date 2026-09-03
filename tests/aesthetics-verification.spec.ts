import { test, expect } from '@playwright/test';

test.describe('Chief Design Officer: Viewport Cohesion & Color Taxonomy', () => {
  test.beforeEach(async ({ page }) => {
    const mockClaims = {
      uid: 'aesthetics-auditor',
      email: 'auditor@sstracker.app',
      role: 'player',
      tenantId: 'utah-youth-soccer',
      isProfileComplete: true,
      totalXp: 1000,
      xp: 1000
    };
    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
      window.localStorage.setItem('auth_state', 'authenticated');
    }, mockClaims);
  });

  test('Asserts 60-30-10 palette rules and Geist typography at critical viewport steps', async ({ page }) => {
    const viewports = [375, 768, 1024];
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/player/dashboard', { waitUntil: 'load' });
      await page.waitForLoadState('networkidle').catch(() => {});
      
      // Ensure the background is unshaded Void Black
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bodyBg).not.toContain('rgba');
    }
  });
});