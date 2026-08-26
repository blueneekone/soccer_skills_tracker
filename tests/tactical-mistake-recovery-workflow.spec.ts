import { test, expect } from '@playwright/test';

test.describe('Player OS Tactical Mistake Recovery & Visual Verification', () => {
  test('Should trigger, display encouragement, and reset the path state upon click', async ({ page }) => {
    
    // 1. Setup Session: Programmatically bypass the login wall using Auth State Mock
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-coach-jwt');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true,
        isLoading: false,
        user: { uid: 'coach-auditor', email: 'coach@sstracker.local', role: 'coach', isProfileComplete: true },
        userProfile: { uid: 'coach-auditor', email: 'coach@sstracker.local', role: 'coach', isProfileComplete: true, clubId: 'demo-club', teamId: 'demo-team' }
      }));
    });

    // Navigate straight to active tactical canvas in War Room
    await page.goto('/coach/tactical');
    await page.waitForSelector('.pd-page-root', { timeout: 5000 });

    // 2. Simulate Route Deviation / Mistake Behavior
    // We dispatch a custom window-level event to simulate a routing failure on the canvas
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sstracker-route-mistake', {
        detail: { reason: 'out-of-bounds', lastValidCheckpoint: { x: 100, y: 150 } }
      }));
    });

    // 3. Assert Non-Distracting Banner Presence ("Practice makes progress")
    const banner = page.locator('text=Practice makes progress');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveCSS('font-family', /Switzer|sans-serif/);

    // 4. Assert Tactical Reset Button Render Compliance (Strict 90-Degree Corners)
    const resetButton = page.locator('text=[ RESET DRILL ]');
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toHaveCSS('border-radius', '0px'); // Forces strict Atompunk styling

    // 5. Execute Action Verification: Click the Reset Button
    await resetButton.click();

    // 6. Assert State Cleanup (Visual structures fade out cleanly)
    await expect(banner).not.toBeVisible();
    await expect(resetButton).not.toBeVisible();
  });
});
