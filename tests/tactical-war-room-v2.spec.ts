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
    await expect(canvas).toBeVisible({ timeout: 5000 });

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
    const tokens = page.locator('[data-light-disc]');
    const firstToken = tokens.nth(0);
    const secondToken = tokens.nth(1);
    
    const box1 = await firstToken.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!box1 || !canvasBox) throw new Error("Could not find token bounding box");
    
    const startX1 = box1.x + box1.width / 2 - canvasBox.x;
    const startY1 = box1.y + box1.height / 2 - canvasBox.y;

    await page.mouse.move(startX1 + canvasBox.x, startY1 + canvasBox.y);
    await page.mouse.down();
    await page.mouse.move(startX1 + canvasBox.x + 100, startY1 + canvasBox.y - 100, { steps: 5 });
    await page.mouse.up();

    // Switch to PASS route type via CommandDrawer
    await page.getByText('[ PASS ]').click();

    // Draw second route: PASS
    const box2 = await secondToken.boundingBox();
    if (!box2) throw new Error("Could not find second token bounding box");
    const startX2 = box2.x + box2.width / 2;
    const startY2 = box2.y + box2.height / 2;

    await page.mouse.move(startX2, startY2);
    await page.mouse.down();
    await page.mouse.move(startX2 + 200, startY2, { steps: 5 });
    await page.mouse.up();

    // We should have at least 2 route hits rendered.
    // The hit layers are rendered with data-route-hit attribute.
    const routes = page.locator('path[data-route-hit]');
    await expect(routes).toHaveCount(2);

    // 3. Right-Click Splice Check: Right click second route
    const secondRoute = routes.nth(1);
    await secondRoute.click({ button: 'right', position: { x: 10, y: 10 } });

    const deleteButton = page.getByText('[ DELETE ROUTE ]');
    await expect(deleteButton).toBeVisible();
    
    await deleteButton.click();

    // Assert count drops to 1
    await expect(routes).toHaveCount(1);

    // 4. Mistake & Encouragement Assertion
    const mistakeButton = page.getByText('[ SIM MISTAKE ]');
    await mistakeButton.click();

    // Assert "Reset Button" circle is successfully mounted
    const resetButton = page.locator('button', { has: page.locator('svg circle') }).first();
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
