import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6a');

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

test.describe('Sprint 2.22 slice 6a — HQ identity hologram visual reference', () => {
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

	test('captures HQ identity hologram and mission rail regression screenshots', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await ensurePlayerDashboard(page);

		const identityCard = page.getByRole('group', { name: 'Operative identity card' });
		await identityCard.scrollIntoViewIfNeeded();
		await expect(identityCard.locator('.ibm-holo-face__name')).toBeVisible();

		const identityStage = page.locator('.operative-hub__identity-stage').first();
		await identityStage.scrollIntoViewIfNeeded();

		const stageBox = await identityStage.boundingBox();
		if (stageBox) {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-identity-hologram.png'),
				clip: {
					x: Math.max(0, stageBox.x - 8),
					y: Math.max(0, stageBox.y - 8),
					width: Math.min(1280, stageBox.width + 16),
					height: stageBox.height + 16,
				},
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-identity-hologram.png'),
			});
		}

		const cardBox = await identityCard.boundingBox();
		if (cardBox) {
			await page.mouse.move(cardBox.x + cardBox.width * 0.65, cardBox.y + cardBox.height * 0.35);
			await page.waitForTimeout(180);
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-identity-hologram-hover.png'),
				clip: {
					x: Math.max(0, stageBox!.x - 8),
					y: Math.max(0, stageBox!.y - 8),
					width: Math.min(1280, stageBox!.width + 16),
					height: stageBox!.height + 16,
				},
			});
		}

		const missionDeck = page.getByRole('region', { name: 'Quest log' });
		await missionDeck.scrollIntoViewIfNeeded();
		await expect(missionDeck.getByRole('heading', { name: 'ACTIVE MISSIONS' })).toBeVisible();

		const missionBox = await missionDeck.boundingBox();
		if (missionBox) {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-missions-regression.png'),
				clip: {
					x: Math.max(0, missionBox.x - 8),
					y: Math.max(0, missionBox.y - 8),
					width: Math.min(1280, missionBox.width + 16),
					height: missionBox.height + 16,
				},
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-1280-missions-regression.png'),
			});
		}

		await page.setViewportSize({ width: 390, height: 844 });
		await ensurePlayerDashboard(page);
		await identityStage.scrollIntoViewIfNeeded();

		const mobileStageBox = await identityStage.boundingBox();
		if (mobileStageBox) {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-390-identity-hologram.png'),
				clip: {
					x: Math.max(0, mobileStageBox.x - 4),
					y: Math.max(0, mobileStageBox.y - 4),
					width: Math.min(390, mobileStageBox.width + 8),
					height: mobileStageBox.height + 8,
				},
			});
		} else {
			await page.screenshot({
				path: path.join(OUT_DIR, 'hq-390-identity-hologram.png'),
			});
		}
	});
});
