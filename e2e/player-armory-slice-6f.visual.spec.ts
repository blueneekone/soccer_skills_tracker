import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6f');

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: fs.existsSync(path.resolve('e2e/.auth/player.json'))
		? path.resolve('e2e/.auth/player.json')
		: undefined;

const hasOperativeLogin =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) && Boolean(process.env.E2E_PLAYER_OTP?.trim());

async function ensureArmoryStudio(page: import('@playwright/test').Page) {
	await page.goto('/player/armory?tab=studio');
	await expect(page.getByRole('region', { name: 'Operative loadout studio' })).toBeVisible({
		timeout: 30_000,
	});
}

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

test.describe('Sprint 2.22 slice 6f — Armory Studio dossier hologram visual reference', () => {
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

	test('captures studio dossier holo, hover glow, mobile centering, HQ regression', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensureArmoryStudio(page);

		const dossierPanel = page.locator('.ols-dossier-panel').first();
		const holoCard = page.getByRole('group', { name: 'Operative dossier card' }).first();
		await expect(dossierPanel).toBeVisible();
		await expect(holoCard).toBeVisible();

		await clipScreenshot(page, dossierPanel, 'armory-1280-studio-dossier-holo.png', 1280, 12);

		const cardFace = holoCard.locator('.hcs-card').first();
		const box = await cardFace.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.35);
			await page.waitForTimeout(200);
		}
		await clipScreenshot(page, dossierPanel, 'armory-1280-studio-dossier-hover.png', 1280, 12);

		await page.setViewportSize({ width: 390, height: 844 });
		await ensureArmoryStudio(page);
		await clipScreenshot(page, dossierPanel, 'armory-390-studio-dossier.png', 390, 6);

		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);
		const hubRow = page.locator('.operative-hub').first();
		await expect(hubRow).toBeVisible();
		await hubRow.scrollIntoViewIfNeeded();
		await clipScreenshot(page, hubRow, 'hq-1280-regression.png', 1280, 12);
	});
});
