import { test, expect } from '@playwright/test';

test.describe('Coach Sandbox Mode', () => {
	test('uncleared trial coach is routed to sandbox and denied tactical access', async ({ page }) => {
		// Inject mock for hasActiveTrial to return true for E2E
		await page.route('**/*', async (route) => {
			const url = route.request().url();
			if (url.includes('DashboardEngine.svelte.js') || url.includes('DashboardEngine.svelte.ts')) {
				const response = await route.fetch();
				let body = await response.text();
				body = body.replace(
					/get hasActiveTrial\(\) \{[\s\S]*?\}/,
					'get hasActiveTrial() { return true; }'
				);
				await route.fulfill({ response, body });
			} else {
				route.continue();
			}
		});

		// Mock uncleared coach state + trial entitlement
		await page.addInitScript(() => {
			window.localStorage.setItem('sstracker_e2e_bypass', 'true');
			window.localStorage.setItem('auth_state', JSON.stringify({
				role: 'coach',
				isProfileComplete: true,
				userProfile: { role: 'coach' },
			}));
		});

		// Ensure it redirects correctly to clearance gate
		await page.goto('/coach/tactical');

		// The +layout.svelte guard should have redirected to /coach/dashboard
		await page.waitForURL('**/coach/dashboard**');
		expect(page.url()).toContain('/coach/dashboard');

		// Clearance Gate should be visible with the Sandbox CTA
		const sandboxCta = page.locator('a:has-text("[ ENTER TRIAL SANDBOX ]")');
		await expect(sandboxCta).toBeVisible();

		// Click the Sandbox CTA
		await sandboxCta.click();

		// Verify we are in the Sandbox route
		await page.waitForURL('**/coach/sandbox**');
		expect(page.url()).toContain('/coach/sandbox');

		// Verify the banner is visible
		await expect(page.locator('text=[ SANDBOX MODE // REAL-WORLD ROSTER SYNC DISABLED PENDING BACKGROUND CLEARANCE ]')).toBeVisible();

		// Ensure trying to bypass via UI or URL fails
		await page.goto('/coach/tactical');
		await page.waitForURL('**/coach/dashboard**');
		expect(page.url()).toContain('/coach/dashboard');
	});
});
