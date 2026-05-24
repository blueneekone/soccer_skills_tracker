import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6b-revise');

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: undefined;

const hasOperativeLogin =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) && Boolean(process.env.E2E_PLAYER_OTP?.trim());

async function ensurePlayerDashboard(page: import('@playwright/test').Page) {
	await page.goto('/player/dashboard');
	await expect(page.getByRole('group', { name: 'Operative identity card' })).toBeVisible({
		timeout: 30_000,
	});
}

async function setQuestProgress(
	page: import('@playwright/test').Page,
	claimedIds: string[],
) {
	await page.evaluate((ids) => {
		sessionStorage.setItem(
			'player_quest_progress_v1',
			JSON.stringify({
				acceptedIds: [],
				completedIds: [],
				claimedIds: ids,
				claimedDateUtc: new Date().toISOString().slice(0, 10),
			}),
		);
	}, claimedIds);
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

test.describe('Sprint 2.22 slice 6b-revise — HQ mission rail visual reference', () => {
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

	test('captures mission rail + identity regression screenshots', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });

		await setQuestProgress(page, []);
		await page.reload({ waitUntil: 'networkidle' });
		await ensurePlayerDashboard(page);

		const operativeHub = page.locator('[data-region="operative-hub"]').first();
		const missionDeck = page.getByRole('region', { name: 'Quest log' });
		await expect(missionDeck.getByRole('heading', { name: 'ACTIVE MISSIONS' })).toBeVisible();

		const railRows = missionDeck.locator('.quest-row--rail');
		await expect(railRows.first()).toBeVisible();
		await expect(missionDeck.locator('.quest-hero--premium')).toHaveCount(0);

		await clipScreenshot(page, missionDeck, 'hq-1280-mission-rail-two-dailies.png');

		const identityStage = page.locator('.operative-hub__identity-stage').first();
		await identityStage.scrollIntoViewIfNeeded();
		await clipScreenshot(page, operativeHub, 'hq-1280-mission-rail-identity.png');

		await page.setViewportSize({ width: 390, height: 844 });
		await page.reload({ waitUntil: 'networkidle' });
		await ensurePlayerDashboard(page);
		await clipScreenshot(page, missionDeck, 'hq-390-mission-rail.png', 390, 4);
	});
});
