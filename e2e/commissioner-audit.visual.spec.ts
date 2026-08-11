import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('audit-artifacts/commissioner');

async function bypassRouteGuards(context: any, role: string, uid: string) {
	await context.addInitScript(({ role, uid }) => {
		window.localStorage.setItem('auth_token', JSON.stringify({
			isAuthenticated: true,
			user: { uid: uid, email: `${role}-test@sstracker.app`, emailVerified: true }
		}));
		window.localStorage.setItem('user_profile', JSON.stringify({
			isProfileComplete: true,
			role: role,
			clubId: 'mock-club-123',
			tenantId: 'mock-tenant-123'
		}));
		window.localStorage.setItem('auth_state', JSON.stringify({
			role: role,
			isProfileComplete: true,
			tenantId: 'mock-tenant-123',
			clubId: 'mock-club-123',
			clearance: { status: 'cleared' }
		}));
	}, { role, uid });
}

test.describe('Commissioner OS Dashboard Visual Verification', () => {
	test('captures commissioner dashboard layout and panels', async ({ page, context }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await bypassRouteGuards(context, 'commissioner', 'mock-commissioner-uid');

		await page.goto('/commissioner/dashboard');

		// Assert that the page title or elements are visible
		await expect(page.locator('h3', { hasText: 'ODP Talent Vanguard' })).toBeVisible({ timeout: 15000 });
		await expect(page.locator('.vanguard-prism')).toBeVisible({ timeout: 15000 });

		// Take screenshot of the entire dashboard
		await page.screenshot({
			path: path.join(OUT_DIR, 'commissioner-dashboard.png'),
			fullPage: true
		});
	});
});
