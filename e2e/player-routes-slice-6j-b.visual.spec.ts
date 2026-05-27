import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6j-b');

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: fs.existsSync(path.resolve('e2e/.auth/player.json'))
		? path.resolve('e2e/.auth/player.json')
		: undefined;

const hasOperativeLogin =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) && Boolean(process.env.E2E_PLAYER_OTP?.trim());

async function ensurePlayerSession(page: import('@playwright/test').Page) {
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

test.describe('Sprint 2.22 slice 6j-b — Routes pd-os-deck depth visual reference', () => {
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

	test('captures Train, Tracker, Armory, Settings deck depth + HQ regression', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });

		await page.goto('/player/workout');
		await expect(page.locator('[data-region="player-workout-log"]')).toBeVisible({ timeout: 30_000 });
		const theater = page.locator('.pw-theater.pd-os-deck--hero').first();
		await expect(theater).toBeVisible();
		await clipScreenshot(page, theater, 'train-1280-theater-depth.png', 1280, 12);

		const logButton = page.getByRole('button', { name: /log session/i });
		if (await logButton.isVisible()) {
			await logButton.hover();
			await page.waitForTimeout(200);
			await clipScreenshot(page, theater, 'train-1280-exec-hover.png', 1280, 12);
		}

		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/player/workout');
		await expect(page.locator('.pg-terminal-chrome').first()).toBeVisible({ timeout: 30_000 });
		await clipScreenshot(page, page.locator('[data-region="player-workout-log"]').first(), 'train-390-stack.png', 390, 4);

		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/player/tracker');
		await expect(page.locator('.pt-root, .pd-route-stack').first()).toBeVisible({ timeout: 30_000 });
		const trackerStack = page.locator('.pd-content-wrap.pd-route-stack').first();
		await clipScreenshot(page, trackerStack, 'tracker-1280-deck-stack.png', 1280, 12);

		const ghostWell = page.locator('.pt-ghost--whisper.pd-os-deck__well').first();
		if (await ghostWell.isVisible()) {
			await clipScreenshot(page, ghostWell, 'tracker-1280-ghost-well.png', 640, 8);
		}

		await page.goto('/player/armory');
		await expect(page.locator('[data-region="quartermaster-armory"]')).toBeVisible({ timeout: 30_000 });
		const qmGrid = page.locator('#quartermaster-grid, .qa-grid').first();
		await expect(qmGrid).toBeVisible();
		await clipScreenshot(page, qmGrid, 'armory-1280-qa-cards.png', 1280, 12);

		await page.goto('/player/settings');
		await expect(page.locator('.ps-settings-root')).toBeVisible({ timeout: 30_000 });
		const settingsPanel = page.locator('.ps-settings-panel.pd-os-deck').first();
		await expect(settingsPanel).toBeVisible();
		await clipScreenshot(page, settingsPanel, 'settings-1280-player-panel.png', 1280, 12);

		await ensurePlayerSession(page);
		const operativeHub = page.locator('[data-region="operative-hub"], .operative-hub').first();
		await expect(operativeHub).toBeVisible();
		await clipScreenshot(page, operativeHub, 'hq-1280-regression.png', 1280, 12);
	});
});
