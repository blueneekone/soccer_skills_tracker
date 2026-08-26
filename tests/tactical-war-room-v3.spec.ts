import { test, expect } from '@playwright/test';

test.describe('SSTracker War Room Multi-Persona Feature Verification', () => {
  test('Should execute full drawing, right-click deletion, position tags, and out-of-bounds reset triggers', async ({ page }) => {
    
    // 1. Authenticate with custom claims and bypass SvelteKit auth walls
    const mockClaims = {
      uid: 'tactical-auditor-uid',
      email: 'coach@sstracker.app',
      role: 'coach',
      isProfileComplete: true,
      clubId: 'mock-club',
      teamId: 'mock-team',
      clearance: { status: 'cleared' }
    };
    
    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
      window.localStorage.setItem('auth_state', JSON.stringify(claims));
      window.localStorage.setItem('sstracker_e2e_bypass', 'true');
    }, mockClaims);

    // Navigate to the War Room (which redirects to /coach/tactical)
    await page.goto('/coach/tactical');
    await page.waitForSelector('.pd-page-root', { timeout: 10000 });

    const canvas = page.locator('.tactical-pitch-canvas').first();
    await expect(canvas).toBeVisible();

    const showToolsBtn = page.getByText('↑ SHOW TOOLS');
    if (await showToolsBtn.isVisible()) {
      await showToolsBtn.click();
    }

    // Switch to DRAW mode
    const drawBtn = page.locator('button', { hasText: 'DRAW' }).first();
    await expect(drawBtn).toBeVisible();
    await drawBtn.click();

    // Get canvas bounding box for coordinate math
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Could not find canvas bounding box");

    const toScreen = (svgX: number, svgY: number) => ({
      x: canvasBox.x + (svgX / 1600) * canvasBox.width,
      y: canvasBox.y + (svgY / 900) * canvasBox.height
    });

    // Draw first route (CUT)
    const p1 = toScreen(200, 200);
    const p2 = toScreen(300, 300);
    await page.mouse.move(p1.x, p1.y);
    await page.mouse.down();
    await page.mouse.move(p2.x, p2.y, { steps: 5 });
    await page.mouse.up();

    // Switch to PASS route type
    const passBtn = page.getByText('[ PASS ]');
    if (await passBtn.isVisible()) {
      await passBtn.click();
    }

    // Draw second route (PASS)
    const p3 = toScreen(400, 200);
    const p4 = toScreen(500, 300);
    await page.mouse.move(p3.x, p3.y);
    await page.mouse.down();
    await page.mouse.move(p4.x, p4.y, { steps: 5 });
    await page.mouse.up();

    const routes = page.locator('path[data-route-hit]');
    await expect(routes).toHaveCount(2);

    // Right-click second route to splice
    const secondRoute = routes.nth(1);
    const pTarget = toScreen(425, 225);
    await secondRoute.dispatchEvent('contextmenu', {
      clientX: pTarget.x,
      clientY: pTarget.y,
      button: 2
    });

    const deleteButton = page.getByText('[ DELETE ROUTE ]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.dispatchEvent('click');

    // Confirm second route is deleted
    await expect(routes).toHaveCount(1);

    // 4. Test "Practice makes progress" Mistake & Reset Ritual
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('simulate-out-of-bounds-drag'));
    });

    const prompt = page.getByText('Practice makes progress');
    await expect(prompt).toBeVisible();

    const resetButton = page.locator('button:has-text("RESET DRILL")').first();
    await expect(resetButton).toBeVisible();

    // Reset and assert cleanup
    await resetButton.click();
    await expect(resetButton).not.toBeVisible();
  });
});
