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
		await expect(container).toHaveCSS('background-color', 'rgb(0, 0, 0)');
		await expect(container).toHaveCSS('border-radius', '0px');

		const shieldStatus = page.locator('text=[ SHIELD_ACTIVE: CAR_RIDE_HOME_LOCKOUT ]');
		await expect(shieldStatus).toBeVisible();
		await expect(shieldStatus).toHaveCSS('color', 'rgb(251, 191, 36)');
	});

	test('2. Action Latency Check: Simulate Log Goal action and verify low-latency render', async ({ page }) => {
		await page.goto('/coach/matchday');
		await page.waitForSelector('.pd-matchday-root', { timeout: 10000 });

		const logGoalButton = page.locator('button:has-text("+ GOAL")');
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

		// Ensure lockout state is active
		await request.post('/api/match/lockout', { data: { toggleShield: true } });

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

		// Open settings drawer to verify telemetry log stream
		const settingsBtn = page.locator('button:has-text("SETTINGS")');
		await settingsBtn.click();
		const diagnosticLog = page.locator('text=[TELEMETRY] Shield state mutated');
		await expect(diagnosticLog).toBeVisible();
	});

	test('5. Mission Control Navigation: Assert Mission Control exists in sidebar and navigates to Match Day', async ({ page }) => {
		await page.goto('/coach/dashboard');
		const matchDayLink = page.locator('a[href*="/coach/matchday"]').first();
		await expect(matchDayLink).toBeVisible();
		await matchDayLink.click();
		await page.waitForURL('**/coach/matchday');
		await expect(page.locator('.pd-matchday-root')).toBeVisible();
	});

	test('6. Auto-Timestamp Check: Simulate START MATCH click and assert timestamp payload', async ({ page }) => {
		await page.goto('/coach/matchday');
		const startMatchBtn = page.locator('button:has-text("START MATCH")');
		await startMatchBtn.click();

		// Open settings drawer to check telemetry log
		const settingsBtn = page.locator('button:has-text("SETTINGS")');
		await settingsBtn.click();
		const telemetryLog = page.locator('text=[TELEMETRY] Match clock started with locked timestamp');
		await expect(telemetryLog).toBeVisible();
	});

	test('7. Tab Verification: Assert Live Match, Roster & Subs, and Post-Match Review tabs mount and toggle', async ({ page }) => {
		await page.goto('/coach/matchday');

		const rosterTab = page.locator('button:has-text("ROSTER & SUBS")');
		await rosterTab.click();
		await expect(page.locator('text=Matchday Roster Allocation & Substitution Deck')).toBeVisible();

		const reviewTab = page.locator('button:has-text("POST-MATCH REVIEW")');
		await reviewTab.click();
		await expect(page.locator('text=Post-Match Telemetry Audit Matrix')).toBeVisible();

		const liveTab = page.locator('button:has-text("LIVE TELEMETRY")');
		await liveTab.click();
		await expect(page.locator('text=Tactical Telemetry Pad')).toBeVisible();
	});

	test('8. Help Drawer: Simulate click on Help icon and verify Z4 drawer slides out displaying Shield info', async ({ page }) => {
		await page.goto('/coach/matchday');
		const helpBtn = page.locator('button:has-text("SETTINGS")');
		await helpBtn.click();

		const drawerTitle = page.locator('h2:has-text("Match Day Settings")');
		await expect(drawerTitle).toBeVisible();
		await expect(page.locator('text=Car Ride Home Shield').first()).toBeVisible();
	});

	test('9. Post-Match Edit: Simulate editing a stat in Post-Match Review and verify mutation', async ({ page }) => {
		await page.goto('/coach/matchday');

		// Log an event first
		await page.locator('button:has-text("+ GOAL")').click();

		// Go to review tab
		await page.locator('button:has-text("POST-MATCH REVIEW")').click();

		// Edit the input
		const input = page.locator('tbody tr:first-child input');
		await input.fill('GOAL LOGGED (EDITED)');
		await input.blur(); // Trigger onchange

		// Verify telemetry log in settings drawer
		const settingsBtn = page.locator('button:has-text("SETTINGS")');
		await settingsBtn.click();
		const telemetryLog = page.locator('text=[TELEMETRY] Event edited post-match').first();
		await expect(telemetryLog).toBeVisible();
	});
});
