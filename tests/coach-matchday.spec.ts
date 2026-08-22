import { test, expect } from '@playwright/test';

test.describe('Coach OS: Match Day Console & Pediatric Safety Verification', () => {
	test.beforeEach(async ({ page }) => {
		const mockClaims = {
			uid: 'coach-matchday-auditor',
			email: 'coach@sstracker.app',
			role: 'coach',
			tenantId: 'utah-youth-soccer',
			isProfileComplete: true,
			clearance: { status: 'cleared' }
		};

		await page.addInitScript((claims) => {
			window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
		}, mockClaims);
	});

	test('1. UI Mounting Check: Assert Match Day board mounts with 0px borders and Void Black', async ({ page }) => {
		await page.goto('/coach/matchday');
		await page.waitForSelector('.pd-matchday-root', { timeout: 10000 });

		const container = page.locator('.pd-matchday-root');
		await expect(container).toHaveCSS('background-color', 'rgb(10, 10, 10)');
		await expect(container).toHaveCSS('border-radius', '0px');

		const shieldStatus = page.locator('text=[ SHIELD_ACTIVE: CAR_RIDE_HOME_LOCKOUT ]');
		await expect(shieldStatus).toBeVisible();
		await expect(shieldStatus).toHaveCSS('color', 'rgb(251, 191, 36)');
	});

	test('2. Action Latency Check: Simulate Log Goal action and verify low-latency render', async ({ page }) => {
		await page.goto('/coach/matchday');
		await page.waitForSelector('.pd-matchday-root', { timeout: 10000 });

		const logGoalButton = page.locator('button:has-text("+ LOG GOAL")');
		await expect(logGoalButton).toBeVisible();

		const startTime = Date.now();
		await logGoalButton.click();

		const latestEvent = page.locator('.match-event-row').first();
		await expect(latestEvent).toContainText(/GOAL LOGGED/i);
		await expect(latestEvent).toHaveCSS('border-radius', '0px');

		const latency = Date.now() - startTime;
		expect(latency).toBeLessThan(1000);
	});

	test('3. The Car Ride Home Freeze Check: Verify SvelteKit blocks metric fetch with 423 Locked', async ({ request, page }) => {
		await page.goto('/coach/matchday');
		await page.waitForSelector('.pd-matchday-root', { timeout: 10000 });

		const response = await request.get('/api/match/lockout?type=metrics&player=minor-123');
		expect(response.status()).toBe(423);

		const data = await response.json();
		expect(data.error).toBe('METRICS_FROZEN: CAR_RIDE_HOME_ACTIVE');
		expect(data.message).toContain('CAR_RIDE_HOME_SHIELD_ACTIVE');
	});

	test('4. Coaching Prompt & Halftime Planner Check: Verify TARGET cues and Halftime choice overlay', async ({ page }) => {
		await page.goto('/coach/matchday');
		await page.waitForSelector('.pd-matchday-root', { timeout: 10000 });

		const targetPrompt = page.locator('.target-prompt-container');
		await expect(targetPrompt).toBeVisible();
		await expect(targetPrompt).toContainText(/Praise movement mechanics|Focus on spatial width|Autonomy support/i);
		await expect(targetPrompt).toHaveCSS('font-family', /Switzer|sans-serif/);

		const syncButton = page.locator('button:has-text("SYNC HALFTIME CHOICE")');
		await expect(syncButton).toBeVisible();
		await syncButton.click();

		const halftimeChoiceOverlay = page.locator('.halftime-choice-overlay');
		await expect(halftimeChoiceOverlay).toBeVisible();
		await expect(halftimeChoiceOverlay).toContainText(/ACTIVE SELECTION/i);

		const shieldToggle = page.locator('button[aria-label="Toggle Car Ride Home Shield"]');
		await expect(shieldToggle).toBeVisible();
		await shieldToggle.click();

		const diagnosticLog = page.locator('text=[TELEMETRY] Shield state mutated');
		await expect(diagnosticLog).toBeVisible();
	});
});
