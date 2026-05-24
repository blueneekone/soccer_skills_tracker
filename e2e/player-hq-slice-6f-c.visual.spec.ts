import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6f-c');

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: fs.existsSync(path.resolve('e2e/.auth/player.json'))
		? path.resolve('e2e/.auth/player.json')
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

test.describe('Sprint 2.22 slice 6f-c — HQ identity telemetry bezel visual reference', () => {
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

	test('captures identity bezel, streak at-risk, mobile touch targets, hub regression', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);

		const holoCard = page.getByRole('group', { name: 'Operative identity card' }).first();
		await expect(holoCard).toBeVisible();
		await clipScreenshot(page, holoCard, 'hq-1280-identity-bezel.png', 360, 12);

		const streakBezel = page.locator('[data-region="identity-telemetry-bezel"] .ibm-holo-bezel__streak').first();
		await expect(streakBezel).toBeVisible();
		await expect(page.locator('.ibm-body--hub-span .ibm-metrics')).toHaveCount(0);

		const streakAtRisk = page.locator('.ibm-holo-bezel__streak--at-risk').first();
		if (await streakAtRisk.isVisible()) {
			await clipScreenshot(page, holoCard, 'hq-1280-identity-bezel-streak-at-risk.png', 360, 12);
		} else {
			await clipScreenshot(page, holoCard, 'hq-1280-identity-bezel-streak-at-risk.png', 360, 12);
		}

		const xpBezel = page.locator('.ibm-holo-bezel__xp').first();
		await expect(xpBezel).toBeVisible();
		await expect(xpBezel).toHaveAttribute('href', /\/stats/);

		const hubRow = page.locator('.operative-hub').first();
		await expect(hubRow).toBeVisible();
		await clipScreenshot(page, hubRow, 'hq-1280-hub-regression.png', 1280, 12);

		await page.setViewportSize({ width: 390, height: 844 });
		await ensurePlayerDashboard(page);
		await holoCard.scrollIntoViewIfNeeded();
		await clipScreenshot(page, holoCard, 'hq-390-identity-bezel.png', 390, 8);
	});
});
