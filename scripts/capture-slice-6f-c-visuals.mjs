/**
 * Capture slice 6f-c visual acceptance PNGs against a running dev server.
 * Requires an authenticated session — saves storage to e2e/.auth/player.json on first run.
 *
 * Usage:
 *   npm run dev   (in another terminal, or rely on Playwright webServer)
 *   node scripts/capture-slice-6f-c-visuals.mjs
 *
 * First-time login (no saved profile):
 *   HEADED=1 node scripts/capture-slice-6f-c-visuals.mjs
 *   Log in via Initialize Operative, then re-run headless.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const OUT = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6f-c');
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
	await page.getByRole('group', { name: 'Operative identity card' }).waitFor({ timeout: 90_000 });
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

const holoCard = page.getByRole('group', { name: 'Operative identity card' }).first();
await holoCard.waitFor({ timeout: 15_000 });
await clipLocator(page, holoCard, 'hq-1280-identity-bezel.png', 360, 12);

const streakBezel = page.locator('[data-region="identity-telemetry-bezel"] .ibm-holo-bezel__streak').first();
await streakBezel.waitFor({ timeout: 10_000 });

const metricsCount = await page.locator('.ibm-body--hub-span .ibm-metrics').count();
if (metricsCount !== 0) {
	console.warn(`Expected 0 embedded ibm-metrics rows, found ${metricsCount}`);
}

await clipLocator(page, holoCard, 'hq-1280-identity-bezel-streak-at-risk.png', 360, 12);

const xpBezel = page.locator('.ibm-holo-bezel__xp').first();
await xpBezel.waitFor({ timeout: 10_000 });
const xpHref = await xpBezel.getAttribute('href');
if (!xpHref?.includes('/stats')) {
	console.warn(`Expected career XP link to /stats, got ${xpHref ?? 'none'}`);
}

const hubRow = page.locator('.operative-hub').first();
await hubRow.scrollIntoViewIfNeeded();
await clipLocator(page, hubRow, 'hq-1280-hub-regression.png', 1280, 12);

await page.setViewportSize({ width: 390, height: 844 });
await ensureDashboard(page);
await holoCard.scrollIntoViewIfNeeded();
await clipLocator(page, holoCard, 'hq-390-identity-bezel.png', 390, 8);

await browser.close();
console.log(`Saved PNGs to ${OUT}`);
console.log(`Saved auth to ${AUTH}`);
