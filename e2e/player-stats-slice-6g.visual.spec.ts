import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6g');

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: fs.existsSync(path.resolve('e2e/.auth/player.json'))
		? path.resolve('e2e/.auth/player.json')
		: undefined;

const hasOperativeLogin =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) && Boolean(process.env.E2E_PLAYER_OTP?.trim());

async function ensurePlayerSession(page: import('@playwright/test').Page) {
	if (storageState) return;

	if (!hasOperativeLogin) return;

	await page.goto('/login');
	await page.getByRole('button', { name: /initialize operative/i }).click();
	await page.locator('#op-callsign').fill(process.env.E2E_PLAYER_CALLSIGN!);
	await page.locator('#op-code-otp').fill(process.env.E2E_PLAYER_OTP!);
	await page.getByRole('button', { name: /authorize clearance/i }).click();
	await page.waitForURL(/\/player\/dashboard/, { timeout: 60_000 });
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

test.describe('Sprint 2.22 slice 6g — Stats investigation workspace visual reference', () => {
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

		await ensurePlayerSession(page);
	});

	test('captures stats VPP void, vector selected, workout band, mobile, HQ regression', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });

		await page.goto('/stats');
		await expect(page.getByRole('region', { name: 'Skill radar and analytics' })).toBeVisible({
			timeout: 30_000,
		});

		const analyticsVoid = page.locator('[data-region="stats-analytics-void"]').first();
		await expect(analyticsVoid).toBeVisible();
		await clipScreenshot(page, analyticsVoid, 'stats-1280-vpp-void.png', 1280, 12);

		const axisButton = page.getByRole('button', { name: /Select PAC/i }).first();
		if (await axisButton.isVisible()) {
			await axisButton.click();
			await expect(page.locator('.vpp-inspector--selected')).toBeVisible();
			await clipScreenshot(page, analyticsVoid, 'stats-1280-vpp-vector-selected.png', 1280, 12);
		}

		const workoutBand = page.locator('.stats-workout-band').first();
		await expect(workoutBand).toBeVisible();
		await clipScreenshot(page, workoutBand, 'stats-1280-workout-band.png', 1280, 12);

		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/stats');
		await expect(analyticsVoid).toBeVisible({ timeout: 30_000 });
		await analyticsVoid.scrollIntoViewIfNeeded();
		const investigationClip = page.getByRole('region', { name: 'Skill radar and analytics' });
		await clipScreenshot(page, investigationClip, 'stats-390-investigation.png', 390, 8);

		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/player/dashboard');
		await expect(page.locator('[data-region="player-analytics-void"]').first()).toBeVisible({
			timeout: 30_000,
		});
		const hqAnalyticsVoid = page.locator('[data-region="player-analytics-void"]').first();
		await clipScreenshot(page, hqAnalyticsVoid, 'hq-1280-analytics-regression.png', 1280, 12);
	});
});
