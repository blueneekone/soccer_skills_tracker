import { test, expect } from '@playwright/test';

test.describe('Director OS Navigation Restructure', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('about:blank');
		await page.addInitScript(() => {
			window.localStorage.setItem('auth_token', 'mock-jwt-director-token');
			window.localStorage.setItem('auth_state', JSON.stringify({
				isAuthenticated: true,
				isLoading: false,
				user: {
					uid: 'director-telemetry-uid',
					email: 'ecwaechtler+director@gmail.com',
					role: 'director',
					clubId: 'aggiesfc',
					isProfileComplete: true
				}
			}));
		});
	});

	test('should render Compliance & Ops Hub and navigate tabs without squishing', async ({ page }) => {
		await page.goto('/director/compliance-ops');
		await page.waitForSelector('.pd-page-root');

		await expect(page.getByRole('heading', { name: 'Compliance & Ops' })).toBeVisible();
		await expect(page.locator('button:has-text("Player Passports")')).toBeVisible();

		// Click Staff Clearance tab
		await page.click('button:has-text("Staff Clearance")');
		await expect(page).toHaveURL(/tab=clearance/);

		// Click Households tab
		await page.click('button:has-text("Households")');
		await expect(page).toHaveURL(/tab=households/);

		// Click COPPA tab
		await page.click('button:has-text("COPPA")');
		await expect(page).toHaveURL(/tab=coppa/);
	});

	test('should render Club Management Hub and navigate tabs cleanly', async ({ page }) => {
		await page.goto('/director/club-management');
		await page.waitForSelector('.pd-page-root');

		await expect(page.getByRole('heading', { name: 'Club Management' })).toBeVisible();
		await expect(page.locator('button:has-text("Registrars")')).toBeVisible();

		// Click Registrars tab
		await page.click('button:has-text("Registrars")');
		await expect(page).toHaveURL(/tab=registrars/);

		// Click Comms tab
		await page.click('button:has-text("Comms")');
		await expect(page).toHaveURL(/tab=comms/);

		// Click Licenses & Sets tab
		await page.click('button:has-text("Licenses & Sets")');
		await expect(page).toHaveURL(/tab=licenses/);

		// Click Plans & Billing tab
		await page.click('button:has-text("Plans & Billing")');
		await expect(page).toHaveURL(/tab=billing/);

		// Click Data Sync tab
		await page.click('button:has-text("Data Sync")');
		await expect(page).toHaveURL(/tab=sync/);
	});

	test('should render Tactics & Training Hub including War Room tab with SVG canvas', async ({ page }) => {
		await page.goto('/director/tactics-and-training');
		await page.waitForSelector('.pd-page-root');

		await expect(page.getByRole('heading', { name: 'Tactics & Training' })).toBeVisible();
		await expect(page.locator('button:has-text("Mission Control")')).toBeVisible();

		// Click Playbook tab
		await page.click('button:has-text("Playbook")');
		await expect(page).toHaveURL(/tab=playbook/);

		// Click Field Ops tab
		await page.click('button:has-text("Field Ops")');
		await expect(page).toHaveURL(/tab=field/);

		// Click War Room tab
		await page.click('button:has-text("War Room")');
		await expect(page).toHaveURL(/tab=war-room/);

		// Verify SVG pitch canvas is mounted
		const svgCanvas = page.locator('svg#tactical-pitch, svg.tactical-pitch-canvas');
		await expect(svgCanvas).toBeVisible();
	});
});
