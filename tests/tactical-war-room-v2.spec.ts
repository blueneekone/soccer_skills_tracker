import { test, expect } from '@playwright/test';

test.describe('SSTracker War Room Tactical Verification v2', () => {
  test('Should execute drawing, right-click splice, and mistake reset ritual', async ({ page }) => {
    // 1. Mount Test: Login as a verified Coach user and navigate to /coach/tactical
    const authState = {
      uid: 'tactical-auditor-uid',
      email: 'coach@sstracker.app',
      role: 'coach',
      isProfileComplete: true,
      clubId: 'mock-club',
      teamId: 'mock-team',
      clearance: { status: 'cleared' }
    };
    
    await page.addInitScript((state) => {
      window.localStorage.setItem('auth_state', JSON.stringify(state));
      window.localStorage.setItem('sstracker_e2e_bypass', 'true');
    }, authState);

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.goto('/coach/tactical');
    
    // The war room uses an immersive canvas setup
    console.log('Current URL before expect:', page.url());
    const canvas = page.locator('.tactical-pitch-canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 2. Interaction Simulation: Draw two distinct routes using Epic 5 Tools
    
    // Expand toolbar if not already visible (Epic 5 HUD behavior)
    // Sometimes it takes a moment for the initial auth loading to settle.
    await page.waitForTimeout(1000);
    
    const showToolsBtn = page.getByText('↑ SHOW TOOLS');
    if (await showToolsBtn.isVisible()) {
      await showToolsBtn.click();
    }

    // Ensure we switch from default DRAG mode to DRAW (ROUTE) mode using the TacticalDock
    await page.locator('button', { hasText: 'DRAW' }).first().click();
    
    // Verify crosshair active
    await expect(canvas).toHaveClass(/tw-cursor-crosshair/);

    // Draw first route: CUT (default)
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error("Could not find canvas bounding box");

    // Helper to map SVG coords (1600x900) to screen coords
    const toScreen = (svgX: number, svgY: number) => ({
      x: canvasBox.x + (svgX / 1600) * canvasBox.width,
      y: canvasBox.y + (svgY / 900) * canvasBox.height
    });

    // Draw first route: CUT (default) at SVG (200, 200) to (300, 300)
    const p1 = toScreen(200, 200);
    const p2 = toScreen(300, 300);
    await page.mouse.move(p1.x, p1.y);
    await page.mouse.down();
    await page.mouse.move(p2.x, p2.y, { steps: 5 });
    await page.mouse.up();

    console.log('Routes after 1st draw:', await page.locator('path[data-route-hit]').count());

    // Switch to PASS route type via CommandDrawer
    await page.getByText('[ PASS ]').click();

    // Draw second route: PASS at SVG (400, 200) to (500, 300)
    const p3 = toScreen(400, 200);
    const p4 = toScreen(500, 300);
    await page.mouse.move(p3.x, p3.y);
    await page.mouse.down();
    await page.mouse.move(p4.x, p4.y, { steps: 5 });
    await page.mouse.up();

    console.log('Routes after 2nd draw:', await page.locator('path[data-route-hit]').count());

    // We should have at least 2 route hits rendered.
    // The hit layers are rendered with data-route-hit attribute.
    const routes = page.locator('path[data-route-hit]');
    await expect(routes).toHaveCount(2);

    // 3. Right-Click Splice Check: Right click second route
    const secondRoute = routes.nth(1);
    
    // We must pass clientX and clientY so the context menu can position itself!
    // We already calculated pTarget for the right-click coordinate.
    const pTarget = toScreen(425, 225);
    await secondRoute.dispatchEvent('contextmenu', {
      clientX: pTarget.x,
      clientY: pTarget.y,
      button: 2
    });

    const deleteButton = page.getByText('[ DELETE ROUTE ]');
    await expect(deleteButton).toBeVisible();
    
    // Use dispatchEvent to bypass potential Playwright coordinate overlay issues
    await deleteButton.dispatchEvent('click');

    // Assert count drops to 1
    await expect(routes).toHaveCount(1);

    // 4. Mistake & Encouragement Assertion
    const mistakeButton = page.getByText('[ SIM MISTAKE ]');
    await mistakeButton.click();

    // Assert "Reset Button" circle is successfully mounted
    const resetButton = page.locator('button.tw-w-24.tw-h-24.tw-rounded-full').first();
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toHaveClass(/tw-rounded-full/); // Assert it is a circle

    // Assert micro-interactive notification displaying "Practice makes progress"
    const prompt = page.getByText('Practice makes progress');
    await expect(prompt).toBeVisible();

    // Reset drill
    await resetButton.click();
    await expect(resetButton).not.toBeVisible();
    
    // The toast fades out after 2500ms
    await expect(prompt).not.toBeVisible({ timeout: 5000 });
  });
});
