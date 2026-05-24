import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6e');

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

test.describe('Sprint 2.22 slice 6e — HQ pathway Tier A timeline visual reference', () => {
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

	test('captures pathway void rail, current active, milestone, mobile scroll, hub regression', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);

		const pathwayPreview = page.locator('[data-region="operative-pathway-preview"]').first();
		await expect(pathwayPreview).toBeVisible();
		await clipScreenshot(page, pathwayPreview, 'hq-1280-pathway-void-rail.png');

		const currentNode = pathwayPreview.locator('[data-opp-current="true"]').first();
		await expect(currentNode).toBeVisible();
		await clipScreenshot(page, currentNode, 'hq-1280-pathway-current-active.png', 320, 12);

		const track = pathwayPreview.locator('.opp-track').first();
		await track.evaluate((el) => {
			const milestone = el.querySelector('[aria-label*="Level 10,"]');
			if (milestone) {
				milestone.scrollIntoView({ block: 'nearest', inline: 'center' });
			}
		});
		await page.waitForTimeout(300);
		const milestoneNode = pathwayPreview.locator('[aria-label*="Level 10,"]').first();
		await expect(milestoneNode).toBeVisible();
		await clipScreenshot(page, milestoneNode, 'hq-1280-pathway-milestone.png', 320, 12);

		const hubRow = page.locator('.operative-hub').first();
		const analyticsVoid = page.locator('[data-region="player-analytics-void"]').first();
		await expect(hubRow).toBeVisible();
		await expect(analyticsVoid).toBeVisible();
		await hubRow.scrollIntoViewIfNeeded();
		await clipScreenshot(page, hubRow, 'hq-1280-hub-regression.png', 1280, 12);

		await page.setViewportSize({ width: 390, height: 844 });
		await ensurePlayerDashboard(page);
		await pathwayPreview.scrollIntoViewIfNeeded();
		await clipScreenshot(page, pathwayPreview, 'hq-390-pathway-scroll.png', 390, 4);
	});
});
