import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-4b');

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

test.describe('Sprint 2.22 slice 4b — pathway consolidation visual reference', () => {
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

	test('captures HQ + Armory pathway consolidation screenshots', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);

		await expect(page.getByRole('link', { name: /Log session/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /Telemetry/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /Armory Gear/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /^Pathway/i })).toHaveCount(0);

		await page.getByRole('region', { name: 'Quick operations' }).scrollIntoViewIfNeeded();
		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-1280-quick-ops-pathway-compact.png'),
		});

		await page.getByRole('button', { name: 'Expand pathway' }).click();
		await expect(page.getByRole('button', { name: 'Collapse pathway' })).toBeVisible();
		await page.getByRole('region', { name: 'Pathway preview' }).scrollIntoViewIfNeeded();
		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-1280-pathway-expanded.png'),
		});

		await page.evaluate(() => window.scrollTo(0, 0));
		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-1280-hero-mission-gold-accept.png'),
		});

		await page.goto('/player/armory');
		await expect(page.getByRole('heading', { name: 'Armory', level: 1 })).toBeVisible({
			timeout: 30_000,
		});
		await expect(page.getByText(/MISSION REWARDS PATHWAY/i)).toHaveCount(0);
		await page.screenshot({
			path: path.join(OUT_DIR, 'armory-1280-no-pathway-quartermaster.png'),
		});

		await page.setViewportSize({ width: 390, height: 844 });
		await ensurePlayerDashboard(page);
		await page.getByRole('region', { name: 'Quick operations' }).scrollIntoViewIfNeeded();
		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-390-quick-ops-pathway-compact.png'),
		});

		await page.getByRole('button', { name: 'Expand pathway' }).click();
		await page.getByRole('region', { name: 'Pathway preview' }).scrollIntoViewIfNeeded();
		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-390-pathway-expanded-horizontal-scroll.png'),
		});

		await page.goto('/player/armory');
		await expect(page.getByRole('heading', { name: 'Armory', level: 1 })).toBeVisible({
			timeout: 30_000,
		});
		await page.screenshot({
			path: path.join(OUT_DIR, 'armory-390-no-pathway.png'),
		});
	});
});
