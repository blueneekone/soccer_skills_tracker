import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-4d-revert');

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

test.describe('Sprint 2.22 slice 4d-revert — hero restored + banner + quick ops regression', () => {
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

	test('captures hero restore, banner, quick ops, and pathway regression screenshots', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);

		const missionDeck = page.getByRole('region', { name: 'Quest log' });
		await missionDeck.scrollIntoViewIfNeeded();
		await expect(missionDeck.getByRole('heading', { name: 'ACTIVE MISSIONS' })).toBeVisible();

		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-1280-hero-mission-restored.png'),
		});

		const identityStage = page.getByRole('region', { name: 'Player identity' });
		await identityStage.scrollIntoViewIfNeeded();

		const identityBox = await identityStage.boundingBox();
		if (identityBox) {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-onboarding-banner-full.png'),
				clip: {
					x: Math.max(0, identityBox.x - 8),
					y: Math.max(0, identityBox.y - 8),
					width: Math.min(1280, identityBox.width + 16),
					height: identityBox.height + 16,
				},
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-onboarding-banner-full.png'),
			});
		}

		const quickOps = page.getByRole('region', { name: 'Quick operations' });
		await quickOps.scrollIntoViewIfNeeded();
		const quickOpsBox = await quickOps.boundingBox();
		if (quickOpsBox) {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-quick-ops-three-col-regression.png'),
				clip: {
					x: Math.max(0, quickOpsBox.x - 8),
					y: Math.max(0, quickOpsBox.y - 8),
					width: Math.min(1280, quickOpsBox.width + 16),
					height: quickOpsBox.height + 16,
				},
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-quick-ops-three-col-regression.png'),
			});
		}

		const pathwaySection = page.getByRole('region', { name: 'Mission rewards pathway' });
		await pathwaySection.scrollIntoViewIfNeeded();
		await expect(pathwaySection.getByText('ACTIVE')).toBeVisible();
		await expect(page.getByRole('button', { name: /Expand pathway/i })).toHaveCount(0);

		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-1280-pathway-regression.png'),
		});

		await page.setViewportSize({ width: 390, height: 844 });
		await ensurePlayerDashboard(page);
		await missionDeck.scrollIntoViewIfNeeded();

		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-390-hero-and-banner.png'),
		});
	});
});
