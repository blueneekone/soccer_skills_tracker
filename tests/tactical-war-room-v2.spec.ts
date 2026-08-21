import { test, expect } from '@playwright/test';

test.describe('SSTracker War Room Tactical Verification v2', () => {
  test('Should execute drawing, right-click splice, and mistake reset ritual', async ({ page }) => {
    // 1. Mount Test: Login as a verified Coach user and navigate to /coach/tactical
    const authState = {
      isAuthenticated: true,
      isLoading: false,
      user: {
        uid: 'tactical-auditor-uid',
        email: 'coach@sstracker.app',
        role: 'coach',
        isProfileComplete: true,
        clubId: 'mock-club',
        teamId: 'mock-team'
      }
    };
    
    await page.addInitScript((state) => {
      window.localStorage.setItem('auth_state', JSON.stringify(state));
    }, authState);

    await page.goto('/coach/tactical');
    await page.waitForSelector('.tw-cursor-crosshair', { timeout: 5000 });

    const canvas = page.locator('svg.tw-cursor-crosshair').first();
    await expect(canvas).toBeVisible();

    // 2. Interaction Simulation: Draw two distinct routes
    // Click 'Player Run'
    await page.getByText('+ PLAYER RUN').click();
    await canvas.click({ position: { x: 100, y: 100 } });

    // Click 'Ball Pass'
    await page.getByText('+ BALL PASS (DASHED)').click();
    await canvas.click({ position: { x: 200, y: 200 } });

    // Ensure we have two routes (each route renders a path)
    const routes = page.locator('path.tw-cursor-pointer');
    await expect(routes).toHaveCount(2);

    // 3. Right-Click Splice Check: Right click second route
    const secondRoute = routes.nth(1);
    await secondRoute.click({ button: 'right' });

    const deleteButton = page.getByText('[ DELETE ROUTE ]');
    await expect(deleteButton).toBeVisible();
    
    await deleteButton.click();

    // Assert count drops to 1
    await expect(routes).toHaveCount(1);

    // 4. Mistake & Encouragement Assertion
    const mistakeButton = page.getByText('TEST MISTAKE');
    await mistakeButton.click();

    // Assert "Reset Button" circle is successfully mounted
    const resetButton = page.locator('button', { has: page.locator('svg circle') });
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toHaveClass(/tw-rounded-full/); // Assert it is a circle

    // Assert micro-interactive notification displaying "Practice makes progress"
    const prompt = page.getByText('Practice makes progress');
    await expect(prompt).toBeVisible();

    // Reset drill
    await resetButton.click();
    await expect(resetButton).not.toBeVisible();
    
    // The toast fades out, but might still be visible for a short time. 
    // We can wait for it to detach.
    await expect(prompt).not.toBeVisible({ timeout: 5000 });
  });
});
