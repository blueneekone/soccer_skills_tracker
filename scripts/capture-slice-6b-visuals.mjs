/**
 * Capture slice 6b visual acceptance PNGs against a running dev server.
 * Requires an authenticated session — saves storage to e2e/.auth/player.json on first run.
 *
 * Usage:
 *   npm run dev   (in another terminal)
 *   node scripts/capture-slice-6b-visuals.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const OUT = path.resolve('docs/visual-acceptance/sprint-2.22-slice-6b');
const AUTH = path.resolve('e2e/.auth/player.json');

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(AUTH), { recursive: true });

function todayUtc() {
	return new Date().toISOString().slice(0, 10);
}

async function setQuestProgress(page, claimedIds) {
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

async function clipLocator(page, locator, filename, pad = 8) {
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
			width: box.width + pad * 2,
			height: box.height + pad * 2,
		},
	});
}

async function ensureDashboard(page) {
	await page.goto(`${BASE}/player/dashboard`, { waitUntil: 'networkidle' });
	await page.getByRole('group', { name: 'Operative identity card' }).waitFor({ timeout: 30_000 });
	const closeAlerts = page.getByRole('button', { name: 'Close alerts' });
	if (await closeAlerts.isVisible().catch(() => false)) {
		await closeAlerts.click();
	}
}

const browser = await chromium.launch({ headless: true });
const contextOptions = fs.existsSync(AUTH) ? { storageState: AUTH } : {};
const context = await browser.newContext({ ...contextOptions, viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

await ensureDashboard(page);

if (!fs.existsSync(AUTH)) {
	await context.storageState({ path: AUTH });
	console.log(`Saved auth state to ${AUTH}`);
}

const hub = page.locator('[data-region="operative-hub"]').first();
const missionDeck = page.getByRole('region', { name: 'Quest log' });
const identityStage = page.locator('.operative-hub__identity-stage').first();

// One gold hero — hide streak secondary via claimed progress
await setQuestProgress(page, ['daily-streak-check']);
await page.reload({ waitUntil: 'networkidle' });
await ensureDashboard(page);
await page.getByRole('article', { name: 'Mission' }).waitFor({ timeout: 15_000 });
await clipLocator(page, hub, 'hq-1280-mission-theater-one-gold.png');

// Two missions — gold primary + compact teal secondary
await setQuestProgress(page, []);
await page.reload({ waitUntil: 'networkidle' });
await ensureDashboard(page);
await page.getByRole('article', { name: 'Secondary mission' }).waitFor({ timeout: 15_000 });
await clipLocator(page, missionDeck, 'hq-1280-mission-theater-two-missions.png');

// Three missions — inject rail row when only two natural missions exist
await setQuestProgress(page, []);
await page.reload({ waitUntil: 'networkidle' });
await ensureDashboard(page);
const railCount = await missionDeck.locator('.quest-row--rail').count();
if (railCount < 1) {
	await page.evaluate(() => {
		const deck = document.querySelector('.quest-log-panel--rail');
		const row = document.querySelector('.quest-row--rail');
		if (!deck || !row) return;
		const feed = deck.querySelector('.quest-log__feed--embedded');
		const clone = row.cloneNode(true);
		clone.setAttribute('data-visual-clone', '6b-rail');
		if (feed) feed.appendChild(clone);
		else deck.appendChild(clone);
	});
}
await clipLocator(page, missionDeck, 'hq-1280-mission-theater-three-missions.png');

// Identity 6a regression
await clipLocator(page, identityStage, 'hq-1280-identity-6a-regression.png');

// Mobile mission theater
await page.setViewportSize({ width: 390, height: 844 });
await setQuestProgress(page, []);
await page.reload({ waitUntil: 'networkidle' });
await ensureDashboard(page);
await clipLocator(page, missionDeck, 'hq-390-mission-theater.png', 4);

await browser.close();
console.log(`Saved PNGs to ${OUT}`);
