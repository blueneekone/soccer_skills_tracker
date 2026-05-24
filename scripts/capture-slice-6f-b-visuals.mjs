/**
 * Capture slice 6f-b visual acceptance PNGs against a running dev server.
 * Reuses persistent auth profile from other capture scripts when available.
 *
 * Usage:
 *   npm run dev   (http://127.0.0.1:5173)
 *   node scripts/capture-slice-6f-b-visuals.mjs
 *
 * First-time login (no saved profile):
 *   HEADED=1 node scripts/capture-slice-6f-b-visuals.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';
const OUT = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6f-b');
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

async function clipRegionBetween(page, topLocator, bottomLocator, filename, viewportMax = 1280, pad = 8) {
	await topLocator.scrollIntoViewIfNeeded();
	const topBox = await topLocator.boundingBox();
	const bottomBox = await bottomLocator.boundingBox();
	if (!topBox || !bottomBox) {
		await page.screenshot({ path: path.join(OUT, filename) });
		return;
	}
	const y = Math.max(0, topBox.y - pad);
	const height = bottomBox.y + bottomBox.height - y + pad * 2;
	await page.screenshot({
		path: path.join(OUT, filename),
		clip: {
			x: Math.max(0, topBox.x - pad),
			y,
			width: Math.min(viewportMax, Math.max(topBox.width, bottomBox.width) + pad * 2),
			height,
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
	await page.getByRole('group', { name: 'Operative identity card' }).waitFor({ timeout: 90_000 }).catch(async () => {
		await page.locator('.pd-strap').first().waitFor({ timeout: 90_000 });
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

const strap = page.locator('.pd-strap').first();
const telemetryHeading = page.getByRole('heading', { name: 'TELEMETRY' });
await strap.waitFor({ timeout: 15_000 });
await telemetryHeading.waitFor({ timeout: 15_000 });
await clipRegionBetween(page, strap, telemetryHeading, 'hq-1280-header-ladder.png', 1280, 12);

const analyticsVoid = page.locator('[data-region="player-analytics-void"]').first();
await analyticsVoid.waitFor({ timeout: 15_000 });
await clipLocator(page, analyticsVoid, 'hq-1280-vpp-inspector-whisper.png', 1280, 12);

const axisButton = page.getByRole('button', { name: /Select PAC/i }).first();
await axisButton.click();
await page.locator('.vpp-inspector--selected').waitFor({ timeout: 10_000 });
await clipLocator(page, analyticsVoid, 'hq-1280-vpp-vector-selected.png', 1280, 12);

const holoCard = page.getByRole('group', { name: 'Operative identity card' }).first();
await holoCard.waitFor({ timeout: 15_000 });
await clipLocator(page, holoCard, 'hq-1280-identity-bezel-regression.png', 360, 12);

await page.setViewportSize({ width: 390, height: 844 });
await ensureDashboard(page);
await strap.scrollIntoViewIfNeeded();
await analyticsVoid.scrollIntoViewIfNeeded();
await clipRegionBetween(page, strap, analyticsVoid, 'hq-390-header-vpp.png', 390, 8);

await browser.close();
console.log(`Saved PNGs to ${OUT}`);
console.log(`Saved auth to ${AUTH}`);
