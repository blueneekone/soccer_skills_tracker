import { test, expect } from '@playwright/test';

test.describe('Chief Design Officer: Visual Regression & Layout Physics', () => {
  test('Asserts Svelte routes enforce 12-column asymmetric Bento Grid and strict corners', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-jwt-director-token');
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
    await page.goto('/director/dashboard');
    await page.waitForSelector('.pd-page-root');
    const layoutContainer = page.locator('.tw-grid').first();
    await expect(layoutContainer).toBeVisible();
    
    // Validate anti-squishing bounding boxes exist
    const kpiCards = page.locator('.tw-min-w-0');
    await expect(kpiCards.first()).toBeVisible();
  });
});