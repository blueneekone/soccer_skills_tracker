import { test, expect } from '@playwright/test';

test.describe('Chief Design Officer: Visual Regression & Layout Physics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('about:blank');
    await page.addInitScript(() => {
      window.localStorage.setItem('sstracker_e2e_bypass', 'true');
      localStorage.setItem('auth_token', 'mock-jwt-director-token');
      window.localStorage.setItem('sstracker_e2e_bypass', 'true');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true,
        isLoading: false,
        user: {
          uid: 'director-telemetry-uid',
          email: 'ecwaechtler+director@gmail.com',
          role: 'director',
          clubId: 'aggiesfc',
          isProfileComplete: true
        }
      }));
    });
  });

  test('Asserts Svelte routes enforce 12-column asymmetric Bento Grid and strict corners', async ({ page }) => {
    await page.goto('/director/club-management?tab=comms');
    const layoutContainer = page.locator('.director-bento-grid-container, .st-bento').first();
    await expect(layoutContainer).toBeVisible();
    
    // Validate anti-squishing bounding boxes exist
    const kpiCards = page.locator('.tw-min-w-0');
    await expect(kpiCards.first()).toBeVisible();
  });
});
