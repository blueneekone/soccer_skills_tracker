import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-4f');

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: undefined;

const hasOperativeLogin =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) && Boolean(process.env.E2E_PLAYER_OTP?.trim());

async function ensurePlayerDashboard(page: import('@playwright/test').Page) {
	await page.goto('/player/dashboard');
	await expect(page.getByRole('region', { name: 'Quick operations' })).toBeVisible({
		timeout: 30_000,
	});
}

async function ensureArmory(page: import('@playwright/test').Page) {
	await page.goto('/player/armory');
	await expect(page.getByRole('heading', { name: 'Armory', level: 1 })).toBeVisible({
		timeout: 30_000,
	});
	await expect(page.getByRole('region', { name: 'Armory command deck' })).toBeVisible();
}

test.describe('Sprint 2.22 slice 4f — Armory command deck visual reference', () => {
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

	test('captures Armory command deck + quartermaster density + tab regression screenshots', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensureArmory(page);

		await expect(page.getByText(/MISSION REWARDS PATHWAY/i)).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Open studio' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'View album' })).toBeVisible();

		await page.screenshot({
			path: path.join(OUT_DIR, 'armory-1280-command-deck-quartermaster.png'),
		});

		await page.getByRole('button', { name: 'Studio' }).click();
		await expect(page.getByRole('region', { name: 'Armory command deck' })).toBeVisible();
		await page.screenshot({
			path: path.join(OUT_DIR, 'armory-1280-command-deck-studio-tab.png'),
		});

		await page.getByRole('button', { name: 'Quartermaster' }).click();
		await page.getByRole('region', { name: 'Available armory line items' }).scrollIntoViewIfNeeded();
		await page.screenshot({
			path: path.join(OUT_DIR, 'armory-1280-quartermaster-grid-density.png'),
		});

		await page.setViewportSize({ width: 390, height: 844 });
		await ensureArmory(page);
		await page.screenshot({
			path: path.join(OUT_DIR, 'armory-390-command-deck.png'),
		});

		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);
		await page.getByRole('button', { name: 'Expand pathway' }).click();
		await expect(page.getByRole('button', { name: 'Collapse pathway' })).toBeVisible();
		await page.getByRole('region', { name: 'Pathway preview' }).scrollIntoViewIfNeeded();
		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-1280-pathway-regression.png'),
		});
	});
});
