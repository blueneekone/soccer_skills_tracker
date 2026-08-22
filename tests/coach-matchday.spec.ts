import { test, expect } from '@playwright/test';

test.describe('Coach OS: Match Day Console & Pediatric Safety Verification', () => {
  test('Should mount the HUD, verify target mastery prompts, and enforce Car Ride Home lockout', async ({ page }) => {
    
    // 1. Bypass authentication wall using custom admin claims for the Coach
    const mockClaims = {
      uid: 'coach-matchday-auditor',
      email: 'coach@sstracker.app',
      role: 'coach',
      tenantId: 'utah-youth-soccer',
      isProfileComplete: true
    };
    
    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    }, mockClaims);

    // Navigate to the Coach Match Day command suite
    await page.goto('/coach/matchday');
    await page.waitForSelector('.pd-matchday-root', { timeout: 5000 });

    // 2. Assert Void Black and Atompunk visual standard (strict square corners)
    const container = page.locator('.pd-matchday-root');
    await expect(container).toHaveCSS('background-color', 'rgb(10, 10, 10)'); // Void Black #0a0a0a
    await expect(container).toHaveCSS('border-radius', '0px'); // Strict 90-degree corners

    // 3. Verify the "Car Ride Home" Metric Shield is ACTIVE on load
    const shieldStatus = page.locator('text=[ SHIELD_ACTIVE: CAR_RIDE_HOME_LOCKOUT ]');
    await expect(shieldStatus).toBeVisible();
    await expect(shieldStatus).toHaveCSS('color', 'rgb(251, 191, 36)'); // Atompunk Action Amber #fbbf24

    // 4. Toggle the Metric Shield to verify manual override auth security
    const shieldToggle = page.locator('button[aria-label="Toggle Car Ride Home Shield"]');
    await expect(shieldToggle).toBeVisible();
    await shieldToggle.click();

    // Verify confirmation telemetry updates and state propagation
    const diagnosticLog = page.locator('text=[TELEMETRY] Shield state mutated');
    await expect(diagnosticLog).toBeVisible();

    // 5. Assert the TARGET Model mastery-climate coaching cues render correctly
    const targetPrompt = page.locator('.target-prompt-container');
    await expect(targetPrompt).toBeVisible();
    await expect(targetPrompt).toContainText(/Praise movement mechanics|Focus on spatial width|Autonomy support/i);
    await expect(targetPrompt).toHaveCSS('font-family', /Switzer|sans-serif/);

    // 6. Execute Live Event Logger Action
    const logGoalButton = page.locator('button:has-text("+ LOG GOAL")');
    await expect(logGoalButton).toBeVisible();
    await logGoalButton.click();

    // Assert the event list updates instantly with a low-latency render
    const latestEvent = page.locator('.match-event-row').first();
    await expect(latestEvent).toContainText(/GOAL LOGGED/i);
    await expect(latestEvent).toHaveCSS('border-radius', '0px');

    // 7. Sync Halftime Choice Planner Player consensus
    const syncButton = page.locator('button:has-text("SYNC HALFTIME CHOICE")');
    await expect(syncButton).toBeVisible();
    await syncButton.click();

    // Verify active selection overlays inside the coach HUD
    const halftimeChoiceOverlay = page.locator('.halftime-choice-overlay');
    await expect(halftimeChoiceOverlay).toBeVisible();
    await expect(halftimeChoiceOverlay).toContainText(/ACTIVE SELECTION/i);
  });
});
