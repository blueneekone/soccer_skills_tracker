import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-4d-fix-b');

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

test.describe('Sprint 2.22 slice 4d-fix-b — teal hover + metrics row + typography visual reference', () => {
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

	test('captures teal hover, identity metrics row, typography, and regression screenshots', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);

		const missionDeck = page.getByRole('region', { name: 'Quest log' });
		await missionDeck.scrollIntoViewIfNeeded();
		await expect(missionDeck.getByRole('heading', { name: 'ACTIVE MISSIONS' })).toBeVisible();

		const tealHeroCta = missionDeck.locator('.quest-hero--teal .quest-hero__cta').first();
		if ((await tealHeroCta.count()) > 0) {
			await tealHeroCta.scrollIntoViewIfNeeded();
			await tealHeroCta.hover();
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-mission2-teal-hover.png'),
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-mission2-teal-hover.png'),
			});
		}

		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-1280-dual-hero-regression.png'),
		});

		const identityStage = page.getByRole('region', { name: 'Player identity' });
		await identityStage.scrollIntoViewIfNeeded();
		const identityBox = await identityStage.boundingBox();
		if (identityBox) {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-identity-metrics-row.png'),
				clip: {
					x: Math.max(0, identityBox.x - 8),
					y: Math.max(0, identityBox.y - 8),
					width: Math.min(1280, identityBox.width + 16),
					height: identityBox.height + 16,
				},
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-identity-metrics-row.png'),
			});
		}

		const quickOps = page.getByRole('region', { name: 'Quick operations' });
		const pathwaySection = page.getByRole('region', { name: 'Mission rewards pathway' });
		await quickOps.scrollIntoViewIfNeeded();
		await pathwaySection.scrollIntoViewIfNeeded();

		const quickOpsBox = await quickOps.boundingBox();
		const pathwayBox = await pathwaySection.boundingBox();
		if (quickOpsBox && pathwayBox) {
			const top = Math.min(quickOpsBox.y, pathwayBox.y);
			const bottom = Math.max(quickOpsBox.y + quickOpsBox.height, pathwayBox.y + pathwayBox.height);
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-typography-hierarchy.png'),
				clip: {
					x: Math.max(0, Math.min(quickOpsBox.x, pathwayBox.x) - 8),
					y: Math.max(0, top - 8),
					width: Math.min(1280, Math.max(quickOpsBox.width, pathwayBox.width) + 16),
					height: bottom - top + 16,
				},
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-typography-hierarchy.png'),
			});
		}

		await page.setViewportSize({ width: 390, height: 844 });
		await ensurePlayerDashboard(page);
		await identityStage.scrollIntoViewIfNeeded();
		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-390-identity-metrics-mobile.png'),
		});
	});
});
