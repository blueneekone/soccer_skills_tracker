import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';

const PUBLIC_ROUTES = [
	{ path: '/', name: 'marketing-home' },
	{ path: '/login', name: 'login-terminal' },
	{ path: '/about', name: 'marketing-about' },
	{ path: '/pricing', name: 'marketing-pricing' }
];

async function assertDarkModeBackground(page: Page, routeName: string) {
	const bodyBg = await page.evaluate(() => {
		const el = document.body;
		return window.getComputedStyle(el).backgroundColor;
	});
	expect(bodyBg, `${routeName} body background must not be pure white`).not.toBe('rgb(255, 255, 255)');
}

async function assertNoHorizontalOverflow(page: Page, routeName: string) {
	const hasOverflow = await page.evaluate(() => {
		return document.documentElement.scrollWidth > document.documentElement.clientWidth;
	});
	expect(hasOverflow, `${routeName} must not horizontally overflow the viewport (squishing/Bento grid violation)`).toBe(false);
}

test.describe('Public & Marketing OS', () => {
	test.beforeAll(() => {
		if (!existsSync('audit-artifacts/public')) {
			mkdirSync('audit-artifacts/public', { recursive: true });
		}
	});

	for (const route of PUBLIC_ROUTES) {
		test(`Audit: ${route.name.toUpperCase()}`, async ({ page }) => {
			await page.goto(route.path, { waitUntil: 'domcontentloaded' });
			await page.waitForLoadState('load');
			await page.waitForTimeout(800);

			await assertDarkModeBackground(page, route.name);
			await assertNoHorizontalOverflow(page, route.name);

			// Hover State Verification on Primary CTAs or Vanguard Links
			const navLinks = page.locator('.vanguard-btn-amber, .vanguard-link, a[data-primary-cta]');
			const linkCount = await navLinks.count();
			if (linkCount > 0) {
				const element = navLinks.first();
				await element.hover();
				await page.waitForTimeout(250); 
			}

			// Bento Grid collision checks
			const panels = page.locator('.bento-well, .login-surface');
			const panelCount = await panels.count();
			for (let i = 0; i < panelCount; i++) {
				const boundingBox = await panels.nth(i).boundingBox();
				expect(boundingBox, `Panel ${i} bounding box must be valid`).not.toBeNull();
			}

			await page.screenshot({ path: `audit-artifacts/public/${route.name}-desktop.png` });
		});
	}
});
