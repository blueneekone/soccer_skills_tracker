import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6c');

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: undefined;

const hasOperativeLogin =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) && Boolean(process.env.E2E_PLAYER_OTP?.trim());

async function ensurePlayerDashboard(page: import('@playwright/test').Page) {
	await page.goto('/player/dashboard');
	await expect(page.getByRole('group', { name: 'Operative identity card' })).toBeVisible({
		timeout: 30_000,
	});
}

async function clipScreenshot(
	page: import('@playwright/test').Page,
	locator: import('@playwright/test').Locator,
	filename: string,
	viewportMax = 1280,
	pad = 8,
) {
	await locator.scrollIntoViewIfNeeded();
	const box = await locator.boundingBox();
	if (!box) {
		await page.screenshot({ path: path.join(OUT_DIR, filename) });
		return;
	}
	await page.screenshot({
		path: path.join(OUT_DIR, filename),
		clip: {
			x: Math.max(0, box.x - pad),
			y: Math.max(0, box.y - pad),
			width: Math.min(viewportMax, box.width + pad * 2),
			height: box.height + pad * 2,
		},
	});
}

test.describe('Sprint 2.22 slice 6c — HQ analytics void island visual reference', () => {
	test.use(storageState ? { storageState } : {});

	test.beforeEach(async ({ page }, testInfo) => {
		if (storageState) return;

		if (!hasOperativeLogin) {
			testInfo.skip(
				true,
				'Set E2E_STORAGE_STATE or E2E_PLAYER_CALLSIGN + E2E_PLAYER_OTP for visual capture',
			);
			return;
		}

		await page.goto('/login');
		await page.getByRole('button', { name: /initialize operative/i }).click();
		await page.locator('#op-callsign').fill(process.env.E2E_PLAYER_CALLSIGN!);
		await page.locator('#op-code-otp').fill(process.env.E2E_PLAYER_OTP!);
		await page.getByRole('button', { name: /authorize clearance/i }).click();
		await page.waitForURL(/\/player\/dashboard/, { timeout: 60_000 });
	});

	test('captures analytics void + mission hub regression screenshots', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);

		const analyticsVoid = page.locator('[data-region="player-analytics-void"]').first();
		await expect(analyticsVoid).toBeVisible();
		await clipScreenshot(page, analyticsVoid, 'hq-1280-analytics-void.png');
		await clipScreenshot(page, analyticsVoid, 'hq-1280-analytics-void-compact.png');

		const operativeHub = page.locator('[data-region="operative-hub"], .operative-hub').first();
		await operativeHub.scrollIntoViewIfNeeded();
		await clipScreenshot(page, operativeHub, 'hq-1280-mission-hub-regression.png');

		await page.setViewportSize({ width: 390, height: 844 });
		await ensurePlayerDashboard(page);
		await analyticsVoid.scrollIntoViewIfNeeded();
		await clipScreenshot(page, analyticsVoid, 'hq-390-analytics-void.png', 390, 4);
	});
});
