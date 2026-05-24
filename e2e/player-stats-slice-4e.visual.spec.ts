import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-4e');

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: undefined;

const hasOperativeLogin =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) && Boolean(process.env.E2E_PLAYER_OTP?.trim());

async function ensurePlayerSession(page: import('@playwright/test').Page) {
	if (storageState) return;

	await page.goto('/login');
	await page.getByRole('button', { name: /initialize operative/i }).click();
	await page.locator('#op-callsign').fill(process.env.E2E_PLAYER_CALLSIGN!);
	await page.locator('#op-code-otp').fill(process.env.E2E_PLAYER_OTP!);
	await page.getByRole('button', { name: /authorize clearance/i }).click();
	await page.waitForURL(/\/player\/dashboard/, { timeout: 60_000 });
}

test.describe('Sprint 2.22 slice 4e — stats chart parity + workout slider focus visual reference', () => {
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

		await ensurePlayerSession(page);
	});

	test('captures stats full-width charts and workout slider click focus screenshots', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });

		await page.goto('/stats');
		await expect(page.getByRole('region', { name: 'Skill radar and analytics' })).toBeVisible({
			timeout: 30_000,
		});

		const analyticsRegion = page.getByRole('region', { name: 'Skill radar and analytics' });
		await analyticsRegion.scrollIntoViewIfNeeded();

		const vppPanel = page.getByRole('region', { name: 'Vanguard protocol telemetry' });
		const workoutPanel = page.getByRole('region', { name: 'Workout telemetry' });
		await expect(vppPanel).toBeVisible();
		await expect(workoutPanel).toBeVisible();

		await page.screenshot({
			path: path.join(OUT_DIR, 'stats-1280-vpp-workout-full-width.png'),
		});

		const chartBox = await workoutPanel.locator('.dossier-workout__chart').boundingBox();
		if (chartBox) {
			await page.screenshot({
				path: path.join(OUT_DIR, 'stats-1280-workout-chart-detail.png'),
				clip: {
					x: Math.max(0, chartBox.x - 8),
					y: Math.max(0, chartBox.y - 8),
					width: Math.min(1280, chartBox.width + 16),
					height: chartBox.height + 16,
				},
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'stats-1280-workout-chart-detail.png'),
			});
		}

		await page.goto('/player/workout');
		await expect(page.getByLabel('Duration in minutes')).toBeVisible({
			timeout: 30_000,
		});

		const durationSlider = page.locator('.pw-range').first();
		await durationSlider.scrollIntoViewIfNeeded();
		await durationSlider.click();
		await page.screenshot({
			path: path.join(OUT_DIR, 'workout-1280-slider-click-no-outline.png'),
		});

		await page.goto('/player/dashboard');
		await expect(page.getByRole('region', { name: 'Quick operations' })).toBeVisible({
			timeout: 30_000,
		});

		const pathwaySection = page.getByRole('region', { name: 'Mission rewards pathway' });
		await pathwaySection.scrollIntoViewIfNeeded();
		await page.screenshot({
			path: path.join(OUT_DIR, 'hq-1280-pathway-regression.png'),
		});
	});
});
