import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6f-b');

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

async function clipRegionBetween(
	page: import('@playwright/test').Page,
	topLocator: import('@playwright/test').Locator,
	bottomLocator: import('@playwright/test').Locator,
	filename: string,
	viewportMax = 1280,
	pad = 8,
) {
	await topLocator.scrollIntoViewIfNeeded();
	const topBox = await topLocator.boundingBox();
	const bottomBox = await bottomLocator.boundingBox();
	if (!topBox || !bottomBox) {
		await page.screenshot({ path: path.join(OUT_DIR, filename) });
		return;
	}
	const y = Math.max(0, topBox.y - pad);
	const height = bottomBox.y + bottomBox.height - y + pad * 2;
	await page.screenshot({
		path: path.join(OUT_DIR, filename),
		clip: {
			x: Math.max(0, topBox.x - pad),
			y,
			width: Math.min(viewportMax, Math.max(topBox.width, bottomBox.width) + pad * 2),
			height,
		},
	});
}

test.describe('Sprint 2.22 slice 6f-b — HQ header ladder + VPP inspector whisper visual reference', () => {
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

	test('captures header ladder, VPP whisper/selected, identity bezel regression, mobile', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);

		const strap = page.locator('.pd-strap').first();
		const telemetryHeading = page.getByRole('heading', { name: 'TELEMETRY' });
		await expect(strap).toBeVisible();
		await expect(telemetryHeading).toBeVisible();
		await clipRegionBetween(page, strap, telemetryHeading, 'hq-1280-header-ladder.png', 1280, 12);

		const analyticsVoid = page.locator('[data-region="player-analytics-void"]').first();
		await expect(analyticsVoid).toBeVisible();
		await clipScreenshot(page, analyticsVoid, 'hq-1280-vpp-inspector-whisper.png', 1280, 12);

		const axisButton = page.getByRole('button', { name: /Select PAC/i }).first();
		await axisButton.click();
		await expect(page.locator('.vpp-inspector--selected')).toBeVisible();
		await clipScreenshot(page, analyticsVoid, 'hq-1280-vpp-vector-selected.png', 1280, 12);

		const holoCard = page.getByRole('group', { name: 'Operative identity card' }).first();
		await expect(holoCard).toBeVisible();
		await clipScreenshot(page, holoCard, 'hq-1280-identity-bezel-regression.png', 360, 12);

		await page.setViewportSize({ width: 390, height: 844 });
		await ensurePlayerDashboard(page);
		await strap.scrollIntoViewIfNeeded();
		await clipRegionBetween(page, strap, analyticsVoid, 'hq-390-header-vpp.png', 390, 8);
	});
});
