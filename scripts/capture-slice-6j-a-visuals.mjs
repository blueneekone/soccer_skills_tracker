/**
 * Capture slice 6j-a visual acceptance PNGs against a running dev server.
 * Uses persistent browser profile (log in once via HEADED=1 if needed).
 *
 * Usage:
 *   npm run dev
 *   node scripts/capture-slice-6j-a-visuals.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const OUT = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6j-a');
const AUTH = path.resolve('e2e/.auth/player.json');
const PROFILE = path.resolve('e2e/.auth/profile');

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(AUTH), { recursive: true });
fs.mkdirSync(PROFILE, { recursive: true });

async function clipLocator(page, locator, filename, viewportMax = 1280, pad = 8) {
	await locator.scrollIntoViewIfNeeded();
	const box = await locator.boundingBox();
	if (!box) {
		await page.screenshot({ path: path.join(OUT, filename) });
		return;
	}
	await page.screenshot({
		path: path.join(OUT, filename),
		clip: {
			x: Math.max(0, box.x - pad),
			y: Math.max(0, box.y - pad),
			width: Math.min(viewportMax, box.width + pad * 2),
			height: box.height + pad * 2,
		},
	});
}

async function ensureDashboard(page) {
	await page.goto(`${BASE}/player/dashboard`, { waitUntil: 'domcontentloaded' });
	await page.waitForTimeout(1500);
	if (page.url().includes('/login')) {
		throw new Error(
			'Not signed in — run HEADED=1 node scripts/capture-slice-6j-a-visuals.mjs, log in, then re-run.',
		);
	}
	await page.locator('[data-region="operative-hub"], .operative-hub').first().waitFor({
		timeout: 90_000,
	});
	const closeAlerts = page.getByRole('button', { name: 'Close alerts' });
	if (await closeAlerts.isVisible().catch(() => false)) {
		await closeAlerts.click();
	}
}

const headed = process.env.HEADED === '1' || process.env.HEADED === 'true';
const browser = await chromium.launchPersistentContext(PROFILE, {
	headless: !headed,
	viewport: { width: 1280, height: 900 },
});
const page = browser.pages()[0] ?? (await browser.newPage());

await ensureDashboard(page);
await browser.storageState({ path: AUTH });

const quickOps = page.locator('[data-region="operative-quick-ops"]').first();
await clipLocator(page, quickOps, 'hq-1280-quick-ops-edge.png');
await quickOps.locator('.oqo-op').first().hover();
await page.waitForTimeout(200);
await clipLocator(page, quickOps, 'hq-1280-quick-ops-hover.png');

const operativeHub = page.locator('[data-region="operative-hub"], .operative-hub').first();
await clipLocator(page, operativeHub, 'hq-1280-hub-missions-rail.png', 1280, 12);

const analyticsVoid = page.locator('[data-region="player-analytics-void"]').first();
await clipLocator(page, analyticsVoid, 'hq-1280-analytics-regression.png', 1280, 12);

const ghostCard = page.locator('.player-capsules-strip--void .lobby-capsule-ghost-card').first();
if (await ghostCard.isVisible()) {
	await clipLocator(page, ghostCard, 'hq-1280-capsules-ghost.png', 480, 8);
}

const pathwayPreview = page.locator('[data-region="operative-pathway-preview"]').first();
await clipLocator(page, pathwayPreview, 'hq-1280-pathway-regression.png');

await page.setViewportSize({ width: 390, height: 844 });
await ensureDashboard(page);
await clipLocator(page, operativeHub, 'hq-390-hq-scroll.png', 390, 4);

await browser.close();
console.log(`Saved PNGs to ${OUT}`);
