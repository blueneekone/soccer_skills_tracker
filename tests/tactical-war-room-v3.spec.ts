import { test, expect } from '@playwright/test';

test.describe('SSTracker War Room Multi-Persona Feature Verification', () => {
  test('Should execute full drawing, right-click deletion, position tags, and out-of-bounds reset triggers', async ({ page }) => {
    
    // 1. Authenticate with custom claims and bypass SvelteKit auth walls
    const mockClaims = {
      uid: 'tactical-auditor-uid',
      email: 'coach@sstracker.app',
      role: 'coach',
      isProfileComplete: true
    };
    
    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    }, mockClaims);

    // Navigate to the War Room
    await page.goto('/coach/war-room');
    await page.waitForSelector('.pd-page-root', { timeout: 5000 });

    // 2. Assert Base Elements & Spacing Overlays
    const canvas = page.locator('svg');
    await expect(canvas).toBeVisible();

    // 3. Test Selective Splicing (Right-Click Context Menu)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('simulate-draw-route', { detail: { type: 'player' } }));
      window.dispatchEvent(new CustomEvent('simulate-draw-route', { detail: { type: 'ball' } }));
    });

    const secondRoute = page.locator('path').nth(1);
    await secondRoute.click({ button: 'right' });

    const deleteButton = page.locator('text=[ DELETE ROUTE ]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Ensure the second route was spliced and is no longer rendered
    await expect(secondRoute).not.toBeVisible();

    // 4. Test Hostile Position Acronym Badge
    const hostileMenu = page.locator('select');
    await hostileMenu.selectOption('CDM');
    await canvas.click({ position: { x: 200, y: 200 } });

    const hostileBadge = page.locator('text=CDM');
    await expect(hostileBadge).toBeVisible();
    await expect(hostileBadge).toHaveCSS('font-family', /Geist Mono|monospace/);

    // 5. Test "Practice makes progress" Out-of-Bounds Reset
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('simulate-out-of-bounds-drag'));
    });

    const prompt = page.locator('text=Practice makes progress');
    await expect(prompt).toBeVisible();

    const resetButton = page.locator('text=[ RESET DRILL ]');
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toHaveCSS('border-radius', '0px'); // Explicitly square

    // Reset and assert cleanup
    await resetButton.click();
    await expect(prompt).not.toBeVisible();
    await expect(resetButton).not.toBeVisible();
  });
});
