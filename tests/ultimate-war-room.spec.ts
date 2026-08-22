// ultimate-war-room.spec.ts
// =============================================================================
// SSTRACKER COACH OS: ULTIMATE TACTICAL WAR ROOM E2E SPEC (Playwright)
// Verifies Svelte 5 coordinate boundaries, roster sidebar, position-tagged
// hostiles, collapsible help menus, and the "Practice makes progress" ritual.
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('Coach OS Tactical War Room - Multi-Billion-Dollar Aesthetics & Functionality', () => {
  test('Should execute continuous tactical audits, right-click route splicing, and help menu assertions', async ({ page }) => {
    
    // 1. Bypass the Login Wall using Custom Auth Claims to maintain zero-trust integrity
    const mockClaims = {
      uid: 'coach-tactical-strategist',
      email: 'missy.price@sstracker.app',
      role: 'coach',
      isCleared: true, // SafeSport & AB 506 background scan fully cleared
      isProfileComplete: true
    };
    
    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    }, mockClaims);

    // Navigate to our active Coach OS Tactical War Room
    await page.goto('/coach/war-room');
    await page.waitForSelector('.pd-page-root', { timeout: 10000 });

    // 2. Assert SVG Spatial Pitch Board Mounts cleanly
    const svgArena = page.locator('svg.tactical-arena-canvas');
    await expect(svgArena).toBeVisible();

    // 3. Verify Active Team Roster Sidebar is populated
    const rosterTray = page.locator('.sstracker-roster-tray');
    await expect(rosterTray).toBeVisible();
    
    // Ensure active players are populated with real-world names/initials
    const firstPlayerCard = page.locator('.roster-player-token').first();
    await expect(firstPlayerCard).toBeVisible();
    await expect(firstPlayerCard).toContainText(/[A-Z]{2}/); // Displays capital initials (e.g. JS, MP)

    // 4. Draw Routes and Verify Svelte 5 Vector Paths
    // Select the "PLAYER RUN" drawing tool inside the Tactical Dock
    const playerRunBtn = page.locator('button:has-text("PLAYER RUN")');
    await expect(playerRunBtn).toBeVisible();
    await playerRunBtn.click();

    // Perform Playwright mouse gestures on the SVG pitch board to simulate drawing a route
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(500, 300);
    await page.mouse.up();

    // Verify vector path renders successfully as a Svelte 5 reactive node
    const routePaths = page.locator('path.tactical-vector-route');
    await expect(routePaths).toHaveCount(1);

    // 5. Select "BALL PASS" and verify dashed flight path rendering (stroke-dasharray="8,8")
    const ballPassBtn = page.locator('button:has-text("BALL PASS")');
    await expect(ballPassBtn).toBeVisible();
    await ballPassBtn.click();

    await page.mouse.move(500, 300);
    await page.mouse.down();
    await page.mouse.move(700, 350);
    await page.mouse.up();

    // Verify we have drawn two vectors, one of which must hold dashed stroke attributes
    await expect(routePaths).toHaveCount(2);
    const dashedPath = routePaths.nth(1);
    await expect(dashedPath).toHaveAttribute('stroke-dasharray', '8,8');

    // 6. Test Right-Click Context Menu Splicing (Targeted Route Deletion)
    await dashedPath.click({ button: 'right' });

    // Assert floating menu is visible with exact [ DELETE ROUTE ] action text
    const deleteRouteBtn = page.locator('button:has-text("[ DELETE ROUTE ]")');
    await expect(deleteRouteBtn).toBeVisible();
    await deleteRouteBtn.click();

    // Confirm the vector route array is spliced atomically in state (count drops from 2 to 1)
    await expect(routePaths).toHaveCount(1);

    // 7. Verify Position-Specific Opponent Badge Deployment (Replacing numbers)
    const opponentDeployBtn = page.locator('button:has-text("OP DEPLOY")');
    await expect(opponentDeployBtn).toBeVisible();
    await opponentDeployBtn.click();

    // Select "CDM" (Defensive Midfielder) from the selector dropdown
    const positionSelect = page.locator('select.position-deploy-selector');
    await positionSelect.selectOption('CDM');

    // Click on canvas to deploy hostile opponent
    await page.mouse.click(600, 400);

    // Assert circular hostile badge mounts displaying position acronym inside circular marker
    const hostileGroup = page.locator('g.hostile-opponent-node');
    await expect(hostileGroup).toBeVisible();
    await expect(hostileGroup.locator('text')).toHaveText('CDM');
    await expect(hostileGroup.locator('circle')).toHaveCSS('stroke', '#fbbf24'); // Action Gold/Atompunk Amber

    // 8. Test the Collapsible [HUD_HELP] Console & Laws of the Game
    const hudHelpBtn = page.locator('button:has-text("[ HUD_HELP ]")');
    await expect(hudHelpBtn).toBeVisible();
    await hudHelpBtn.click();

    // Verify sliding Help sidebar mounts cleanly
    const helpSidebar = page.locator('.hud-help-sliding-console');
    await expect(helpSidebar).toBeVisible();
    await expect(helpSidebar).toHaveCSS('border-radius', '0px'); // Strict 90-degree Atompunk corners

    // Assert essential positional and pitch-dimension content exists in the console
    await expect(helpSidebar).toContainText('CB (Center Back)');
    await expect(helpSidebar).toContainText('CDM (Defensive Midfielder)');
    await expect(helpSidebar).toContainText('U12 (Learn to Train Stage)');
    await expect(helpSidebar).toContainText('75 x 50 Yards');
    await expect(helpSidebar).toContainText('2:1 or 3:1 training-to-competition ratio');

    // 9. Trigger & Verify the "Practice makes progress" Resilient Reset Ritual
    const diagnosticTrigger = page.locator('button:has-text("[ SYSTEM_DIAGNOSTIC: INJECT_PATH_DEVIATION ]")');
    await expect(diagnosticTrigger).toBeVisible();
    await diagnosticTrigger.click();

    // Assert non-distracting encouragement banner slides out carrying your exact text
    const toast = page.locator('text=Practice makes progress');
    await expect(toast).toBeVisible();
    await expect(toast).toHaveCSS('font-family', /Switzer|sans-serif/);

    // Verify the flat, perfectly square reset CTA is loaded with 0px rounded corners
    const resetBtn = page.locator('button:has-text("[ RESET DRILL ]")');
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toHaveCSS('border-radius', '0px');

    // Click the Reset Button and verify the state clears cleanly
    await resetBtn.click();
    await expect(toast).not.toBeVisible();
    await expect(resetBtn).not.toBeVisible();
  });
});
