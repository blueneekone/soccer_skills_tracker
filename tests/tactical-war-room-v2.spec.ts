import { test, expect } from '@playwright/test';

test.describe('Coach OS Tactical War Room v2 - Visual Verification Suite', () => {
  test('Should execute mount verification, interactive route drawing, right-click route splicing, and mistake ritual', async ({ page }) => {
    // 1. Mount Verification: Set auth state and navigate to /coach/tactical
    const authState = {
      isAuthenticated: true,
      isLoading: false,
      user: {
        uid: 'tactical-auditor-uid',
        email: 'coach@sstracker.app',
        role: 'coach',
        isProfileComplete: true,
        clubId: 'mock-club',
        teamId: 'mock-team',
      },
    };

    await page.addInitScript((state) => {
      window.localStorage.setItem('auth_state', JSON.stringify(state));
    }, authState);

    await page.goto('/coach/tactical');

    // Assert SVG canvas svg.tactical-arena-canvas is present in the DOM
    const canvas = page.locator('svg.tactical-arena-canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 2. Interactive Drawing: Click DRAW tool in TacticalDock
    const drawButton = page.getByText('[ DRAW ]');
    await expect(drawButton).toBeVisible();
    await drawButton.click();

    // Get canvas bounding box for coordinate relative drawing
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    const cx = canvasBox!.x;
    const cy = canvasBox!.y;

    // Draw Route 1
    await page.mouse.move(cx + 200, cy + 200);
    await page.mouse.down();
    await page.mouse.move(cx + 400, cy + 200);
    await page.mouse.up();

    // Draw Route 2
    await page.mouse.move(cx + 200, cy + 400);
    await page.mouse.down();
    await page.mouse.move(cx + 400, cy + 400);
    await page.mouse.up();

    // Assert that 2 active route hit paths are present in the DOM
    const routes = page.locator('path[data-route-hit]');
    await expect(routes).toHaveCount(2);

    // 3. Right-Click Splice Assertion: Trigger right-click on the second drawn route
    const secondRoute = routes.nth(1);
    await secondRoute.dispatchEvent('contextmenu', { clientX: cx + 300, clientY: cy + 400 });

    // Assert floating [ DELETE ROUTE ] context button is visible
    const deleteButton = page.getByText('[ DELETE ROUTE ]');
    await expect(deleteButton).toBeVisible();

    // Click [ DELETE ROUTE ] and assert count drops from 2 to 1
    await deleteButton.click();
    await expect(routes).toHaveCount(1);

    // 4. Mistake Ritual Assertion: Open SYS.MENU drawer and click TEST MISTAKE
    const sysMenuButton = page.getByText('[ SYS.MENU ]');
    await sysMenuButton.click();

    const mistakeButton = page.getByText('TEST MISTAKE');
    await expect(mistakeButton).toBeVisible();
    await mistakeButton.click();

    // Assert encouraging toast displaying "Practice makes progress" appears
    const prompt = page.getByText('Practice makes progress');
    await expect(prompt).toBeVisible();

    // Assert perfectly square [ RESET DRILL ] button (border-radius: 0px / tw-rounded-none) mounts
    const resetButton = page.getByRole('button', { name: '[ RESET DRILL ]' });
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toHaveClass(/tw-rounded-none/);

    // Click [ RESET DRILL ] and verify mistake overlay dismisses cleanly
    await resetButton.click();
    await expect(resetButton).not.toBeVisible();
  });
});
