import { test, expect } from '@playwright/test';

test.describe('Player OS Tactical Mistake Recovery & Visual Verification', () => {
  test('Should trigger, display encouragement, and reset the path state upon click', async ({ page }) => {
    
    // 1. Setup Session: Programmatically bypass the login wall using Custom Claims
    const mockClaims = {
      uid: 'athlete-visual-auditor',
      email: 'player@sstracker.app',
      role: 'player',
      isProfileComplete: true
    };
    
    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    }, mockClaims);

    // Navigate straight to our active Player OS training canvas
    await page.goto('/player/training-arena');
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
