import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-4c');

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

test.describe('Sprint 2.22 slice 4c — HQ native pathway scroll visual reference', () => {
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

	test('captures HQ native pathway scroll screenshots', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);

		await expect(page.getByRole('button', { name: /Expand pathway/i })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Collapse pathway/i })).toHaveCount(0);
		await expect(page.getByText(/^Scroll · LV/i)).toHaveCount(0);

		const pathwaySection = page.getByRole('region', { name: 'Mission rewards pathway' });
		await pathwaySection.scrollIntoViewIfNeeded();
		await expect(pathwaySection.getByText('ACTIVE')).toBeVisible();

		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-1280-pathway-native-scroll-current-centered.png'),
		});

		const sectionBox = await pathwaySection.boundingBox();
		if (sectionBox) {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-pathway-section-full.png'),
				clip: {
					x: Math.max(0, sectionBox.x - 8),
					y: Math.max(0, sectionBox.y - 8),
					width: Math.min(1280, sectionBox.width + 16),
					height: sectionBox.height + 16,
				},
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-pathway-section-full.png'),
			});
		}

		await page.evaluate(() => window.scrollTo(0, 0));
		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-1280-hero-mission-gold-accept.png'),
		});

		await page.setViewportSize({ width: 390, height: 844 });
		await ensurePlayerDashboard(page);
		await pathwaySection.scrollIntoViewIfNeeded();

		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-390-pathway-native-scroll.png'),
		});

		await expect(page.getByRole('button', { name: /Expand pathway/i })).toHaveCount(0);
		const mobileSectionBox = await pathwaySection.boundingBox();
		if (mobileSectionBox) {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-390-pathway-no-expand-button.png'),
				clip: {
					x: Math.max(0, mobileSectionBox.x - 4),
					y: Math.max(0, mobileSectionBox.y - 4),
					width: Math.min(390, mobileSectionBox.width + 8),
					height: mobileSectionBox.height + 8,
				},
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-390-pathway-no-expand-button.png'),
			});
		}
	});
});
