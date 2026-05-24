import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6h');

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: fs.existsSync(path.resolve('e2e/.auth/player.json'))
		? path.resolve('e2e/.auth/player.json')
		: undefined;

const hasOperativeLogin =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) && Boolean(process.env.E2E_PLAYER_OTP?.trim());

async function ensurePlayerSession(page: import('@playwright/test').Page) {
	if (storageState) return;

	if (!hasOperativeLogin) return;

	await page.goto('/login');
	await page.getByRole('button', { name: /initialize operative/i }).click();
	await page.locator('#op-callsign').fill(process.env.E2E_PLAYER_CALLSIGN!);
	await page.locator('#op-code-otp').fill(process.env.E2E_PLAYER_OTP!);
	await page.getByRole('button', { name: /authorize clearance/i }).click();
	await page.waitForURL(/\/player\/dashboard/, { timeout: 60_000 });
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

test.describe('Sprint 2.22 slice 6h — Train / Tracker terminal chrome visual reference', () => {
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

	test('captures Train exec terminal, columns, mobile, Tracker capsule/ghost, Stats regression', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 });

		await page.goto('/player/workout');
		await expect(page.locator('.player-hud-root').first()).toBeVisible({ timeout: 30_000 });

		const execTerminal = page.locator('.pw-panel--term').first();
		await expect(execTerminal).toBeVisible();
		await expect(execTerminal.locator('.pg-terminal-chrome').first()).toBeVisible();
		await expect(execTerminal.locator('.pg-bracket--tl').first()).toBeVisible();
		await expect(execTerminal.locator('.pw-terminal-state').first()).toBeVisible();
		await clipScreenshot(page, execTerminal, 'train-1280-exec-terminal.png', 1280, 12);

		const grid = page.locator('.pw-grid.bento-grid').first();
		await clipScreenshot(page, grid, 'train-1280-columns.png', 1280, 12);

		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/player/workout');
		await expect(execTerminal).toBeVisible({ timeout: 30_000 });
		const transmitCta = page.locator('.pw-exec.qa-btn--ready').first();
		await expect(transmitCta).toBeVisible();
		const ctaBox = await transmitCta.boundingBox();
		if (ctaBox) {
			expect(ctaBox.height).toBeGreaterThanOrEqual(44);
		}
		await execTerminal.scrollIntoViewIfNeeded();
		await clipScreenshot(page, execTerminal, 'train-390-terminal.png', 390, 4);

		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/player/tracker');
		await expect(page.locator('.player-hud-root').first()).toBeVisible({ timeout: 30_000 });

		const capsuleArena = page.locator('.mc-arena--dossier-premium').first();
		if (await capsuleArena.isVisible()) {
			await clipScreenshot(page, capsuleArena, 'tracker-1280-capsule.png', 1280, 12);
		}

		const ghostWhisper = page.locator('.pt-ghost--whisper').first();
		if (await ghostWhisper.isVisible()) {
			await clipScreenshot(page, ghostWhisper, 'tracker-1280-ghost-whisper.png', 1280, 12);
		}

		await page.goto('/stats');
		await expect(page.getByRole('region', { name: 'Skill radar and analytics' })).toBeVisible({
			timeout: 30_000,
		});
		const statsVoid = page.locator('[data-region="stats-analytics-void"]').first();
		await clipScreenshot(page, statsVoid, 'stats-1280-regression.png', 1280, 12);
	});
});
