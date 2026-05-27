/**
 * VA capture for Sprint 3.5g-g — saves to docs/vision/va-screenshots/
 */
import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs/vision/va-screenshots');
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';
const PROFILE_DIR = path.join(ROOT, 'e2e/.auth/profile');
const STORAGE_STATE = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: fs.existsSync(path.join(ROOT, 'e2e/.auth/player.json'))
		? path.join(ROOT, 'e2e/.auth/player.json')
		: null;

const hasOtp =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) &&
	Boolean(process.env.E2E_PLAYER_OTP?.trim());

async function clipScreenshot(page, locator, filename, viewportMax = 1280, pad = 12) {
	await locator.scrollIntoViewIfNeeded();
	const box = await locator.boundingBox();
	const outPath = path.join(OUT_DIR, filename);
	if (!box) {
		await page.screenshot({ path: outPath, fullPage: false });
		return outPath;
	}
	await page.screenshot({
		path: outPath,
		clip: {
			x: Math.max(0, box.x - pad),
			y: Math.max(0, box.y - pad),
			width: Math.min(viewportMax, box.width + pad * 2),
			height: box.height + pad * 2,
		},
	});
	return outPath;
}

async function loginWithOtp(page) {
	await page.goto(`${BASE_URL}/login`);
	await page.getByRole('button', { name: /initialize operative/i }).click();
	await page.locator('#op-callsign').fill(process.env.E2E_PLAYER_CALLSIGN);
	await page.locator('#op-code-otp').fill(process.env.E2E_PLAYER_OTP);
	await page.getByRole('button', { name: /authorize clearance/i }).click();
	await page.waitForURL(/\/player\/dashboard/, { timeout: 60_000 });
}

async function main() {
	fs.mkdirSync(OUT_DIR, { recursive: true });

	let context;
	const ownsContext = true;

	if (fs.existsSync(PROFILE_DIR)) {
		context = await chromium.launchPersistentContext(PROFILE_DIR, {
			headless: true,
			viewport: { width: 1280, height: 900 },
		});
	} else if (STORAGE_STATE) {
		const browser = await chromium.launch({ headless: true });
		context = await browser.newContext({
			storageState: STORAGE_STATE,
			viewport: { width: 1280, height: 900 },
		});
	} else {
		const browser = await chromium.launch({ headless: true });
		context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	}

	const page = context.pages()[0] ?? (await context.newPage());
	await page.setViewportSize({ width: 1280, height: 900 });

	await page.goto(`${BASE_URL}/player/dashboard`, { waitUntil: 'domcontentloaded' });
	const holoVisible = await page
		.getByRole('group', { name: 'Operative identity card' })
		.first()
		.waitFor({ state: 'visible', timeout: 8_000 })
		.then(() => true)
		.catch(() => false);

	if (!holoVisible) {
		if (!hasOtp) {
			console.error(
				'Not authenticated. Log in via e2e/.auth/profile, set E2E_STORAGE_STATE, or E2E_PLAYER_CALLSIGN + E2E_PLAYER_OTP.',
			);
			await context.close();
			process.exit(1);
		}
		await loginWithOtp(page);
	}

	await page.goto(`${BASE_URL}/player/dashboard`, { waitUntil: 'networkidle' });
	await page.getByRole('group', { name: 'Operative identity card' }).first().waitFor({
		state: 'visible',
		timeout: 30_000,
	});
	const identityStage = page.locator('.operative-hub__identity-stage').first();
	const hqPath = await clipScreenshot(page, identityStage, 's35gg-hq-holo-1280.png', 1280, 16);
	console.log('Wrote', hqPath);

	await page.goto(`${BASE_URL}/player/armory?tab=studio`, { waitUntil: 'networkidle' });
	await page.getByRole('region', { name: 'Operative loadout studio' }).waitFor({
		state: 'visible',
		timeout: 30_000,
	});
	const dossierPanel = page.locator('.ols-dossier-panel').first();
	await dossierPanel.waitFor({ state: 'visible', timeout: 15_000 });
	const studioPath = await clipScreenshot(page, dossierPanel, 's35gg-studio-dossier-1280.png', 1280, 16);
	console.log('Wrote', studioPath);

	if (ownsContext) await context.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
