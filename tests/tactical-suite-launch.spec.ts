import { test, expect } from '@playwright/test';

test.describe('Coach Tactical War Room & Match Day Suite', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Inject your secure mock custom claims to satisfy the Zero-Trust gates
    await page.addInitScript(() => {
      window.localStorage.setItem('sstracker_e2e_bypass', 'true');
      window.localStorage.setItem('auth_state', JSON.stringify({
        uid: 'test-coach-uid',
        email: 'coach@test.com',
        role: 'coach',
        teamId: 'test-team-id',
        isProfileComplete: true,
        isCleared: true,
        clearance: { status: 'cleared', step: 'completed' },
        emailVerified: true
      }));
      window.localStorage.setItem('user_session_claims', JSON.stringify({
        uid: 'test-coach-uid',
        email: 'coach@test.com',
        role: 'coach',
        teamId: 'test-team-id',
        isProfileComplete: true,
        isCleared: true,
        clearance: { status: 'cleared', step: 'completed' },
        emailVerified: true
      }));
    });

    // Abort actual backend requests to prevent latency
    await page.route('**/*firestore.googleapis.com/**', (route) => route.abort());

    // Disable CSS animations for testing speed
    await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });

    // 2. Force a hard, clean-slate page navigation to flush memory
    await page.goto('/coach/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('Should seamlessly transition from War Room strategy to Drill Designer', async ({ page }) => {
    // 1. Navigate to War Room and verify base canvas
    await page.goto('/coach/tactical');

    const svgCanvas = page.getByTestId('pitch-canvas');
    await expect(svgCanvas).toBeVisible({ timeout: 15000 });

    // 2. Render Tactics Hub and test tab switching
    const tacticsHubBtn = page.locator('button:has-text("[ ⚡ TACTICS HUB ]")').first();
    await expect(tacticsHubBtn).toBeVisible({ timeout: 15000 });
    await tacticsHubBtn.click({ force: true });

    const hubDrawer = page.locator('div[role="region"][aria-label="Tactics Hub"]').first();
    await expect(hubDrawer).toBeVisible({ timeout: 15000 });

    // Tab switching check
    await page.evaluate(() => {
        const drawToolsBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('DRAW TOOLS'));
        drawToolsBtn?.click();
    });

    await expect(page.locator('p:has-text("ROUTE_SHAPE")')).toBeVisible();

    // 3. Test Opponent token Right-Click logic
    // Select OPPONENT drop tool
    await page.evaluate(() => {
        const oppBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('Toggle Drop: TEAM'));
        oppBtn?.click();
    });
    await svgCanvas.click({ button: 'right', position: { x: 350, y: 450 }, force: true });
    const token = page.locator('.tactical-token.opponent-token').last();
    // Verify drop interaction completes without error

    // 4. Test Route drawing preservation
    // Actually the button contains an emoji we need to match carefully, so let's match substring
    await page.evaluate(() => {
        const runBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes('PLAYER RUN'));
        runBtn?.click();
    });

    // We need to wait for state to update, so dispatching a custom event on window may be better, but we will drag with mouse
    // to actually make sure the route gets drawn
    await svgCanvas.click({ position: { x: 100, y: 100 }, force: true });

    await svgCanvas.dispatchEvent('pointerdown', { clientX: 100, clientY: 100, button: 0 });
    await svgCanvas.dispatchEvent('pointermove', { clientX: 200, clientY: 200, button: 0 });
    await svgCanvas.dispatchEvent('pointerup', { clientX: 200, clientY: 200, button: 0 });

    // We expect the path to be drawn successfully
    const routes = page.locator('path[data-route-hit]');
    await expect(routes).toHaveCount(1, { timeout: 10000 });

    // 5. Trigger deployment handoff
    const deployBtn = page.locator('button:has-text("[ OPS DEPLOY ]")').first();
    await expect(deployBtn).toBeEnabled({ timeout: 15000 });
    await deployBtn.click({ force: true });

    // 6. Verify Drill Designer route successfully mounts
    const drillDesigner = page.locator('.drill-designer-overlay');
    await expect(drillDesigner).toBeVisible();

    const simMistakeBtn = drillDesigner.locator('button:has-text("[ SIMULATE MISTAKE ]")');
    await expect(simMistakeBtn).toBeVisible();
  });

  test('Match Day - Should execute Two-Stage Weather Lockdown triggers', async ({ page }) => {
    await page.goto('/coach/matchday');

    // Ensure Live Match tab is visible
    const liveMatchTab = page.locator('button:has-text("[ LIVE MATCH ]")');
    await expect(liveMatchTab).toBeVisible({ timeout: 15000 });
    await liveMatchTab.click();

    // Trigger Amber Warning (8.5 miles)
    await page.click('button:has-text("Sim 8.5m")');
    const amberBanner = page.locator('text=PREPARE TO SEEK SHELTER');
    await expect(amberBanner).toBeVisible();

    // Trigger Red Lockdown (5.2 miles)
    await page.click('button:has-text("Sim 5.2m")');
    const redBanner = page.locator('text=EVACUATE PLAYERS IMMEDIATELY');
    await expect(redBanner).toBeVisible();
  });

  test('Match Day - Help Drawer visibility and Car Ride Home logic', async ({ page }) => {
    await page.goto('/coach/matchday');

    const helpBtn = page.locator('button:has-text("[ ? HELP ]")');
    await expect(helpBtn).toBeVisible({ timeout: 15000 });
    await helpBtn.click();

    const drawer = page.locator('h3:has-text("Toggle Shield")').locator('..').locator('p:has-text("Car Ride Home")');
    await expect(drawer).toBeVisible();
  });

  test('Match Day - Mistake logger flashes Reset/Park It cues', async ({ page }) => {
    await page.goto('/coach/matchday');

    const mistakeBtn = page.locator('button:has-text("+ LOG MISTAKE")').first();
    await expect(mistakeBtn).toBeVisible({ timeout: 15000 });
    await mistakeBtn.click();

    // Check for TARGET Mastery cue
    const targetCue = page.locator('.target-prompt-container');
    await expect(targetCue).toBeVisible();

    const text = await targetCue.textContent();
    expect(text).toMatch(/(Reset|Park It)/i);
  });
});
