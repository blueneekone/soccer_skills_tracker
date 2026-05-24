/**
 * Capture slice 6e visual acceptance PNGs against a running dev server.
 * Requires an authenticated session — saves storage to e2e/.auth/player.json on first run.
 *
 * Usage:
 *   npm run dev   (in another terminal)
 *   node scripts/capture-slice-6e-visuals.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const OUT = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6e');
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
			'Not signed in — run once with HEADED=1, log in via Initialize Operative, then re-run (session persists in e2e/.auth/profile).',
		);
	}
	await page.locator('[data-region="operative-pathway-preview"], .operative-hub').first().waitFor({
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

const pathwayPreview = page.locator('[data-region="operative-pathway-preview"]').first();
await pathwayPreview.waitFor({ timeout: 15_000 });
await clipLocator(page, pathwayPreview, 'hq-1280-pathway-void-rail.png');

const currentNode = pathwayPreview.locator('[data-opp-current="true"]').first();
await currentNode.waitFor({ timeout: 10_000 });
await clipLocator(page, currentNode, 'hq-1280-pathway-current-active.png', 320, 12);

const track = pathwayPreview.locator('.opp-track').first();
await track.evaluate((el) => {
	const milestone = el.querySelector('[aria-label*="Level 10,"]');
	if (milestone) milestone.scrollIntoView({ block: 'nearest', inline: 'center' });
});
await page.waitForTimeout(400);
const milestoneNode = pathwayPreview.locator('[aria-label*="Level 10,"]').first();
await clipLocator(page, milestoneNode, 'hq-1280-pathway-milestone.png', 320, 12);

const hubRow = page.locator('.operative-hub').first();
await hubRow.scrollIntoViewIfNeeded();
await clipLocator(page, hubRow, 'hq-1280-hub-regression.png', 1280, 12);

await page.setViewportSize({ width: 390, height: 844 });
await ensureDashboard(page);
await clipLocator(page, pathwayPreview, 'hq-390-pathway-scroll.png', 390, 4);

await browser.close();
console.log(`Saved PNGs to ${OUT}`);
console.log(`Saved auth to ${AUTH}`);
