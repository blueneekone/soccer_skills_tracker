import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('audit-artifacts/admin');

async function bypassRouteGuards(context: any) {
	await context.addInitScript(() => {
		const mockToken = 'mock-jwt-admin-token-secure';
		window.localStorage.setItem('auth_token', mockToken);
		window.localStorage.setItem('auth_state', JSON.stringify({
			isAuthenticated: true,
			isLoading: false,
			role: 'super_admin',
			isProfileComplete: true,
			tenantId: 'admin',
			clubId: 'admin',
			user: {
				uid: 'admin-telemetry-uid',
				email: 'admin@soccer-skills-tracker.com',
				role: 'super_admin',
				isProfileComplete: true
			}
		}));
		window.localStorage.setItem('user_profile', JSON.stringify({
			isProfileComplete: true,
			role: 'super_admin',
			clubId: 'admin',
			tenantId: 'admin'
		}));
	});
}

const ADMIN_ROUTES = [
	{ route: '/admin/overview', name: 'admin-overview.png', selector: '.pd-page-root' },
	{ route: '/admin/organizations', name: 'admin-organizations.png', selector: '.v-table-wrap, .orgs-card' },
	{ route: '/admin/users', name: 'admin-users.png', selector: '.v-table-wrap' },
	{ route: '/admin/recruiters', name: 'admin-recruiters.png', selector: '.v-table-wrap, .pd-page-root, body' },
	{ route: '/admin/coach-clearance', name: 'admin-coach-clearance.png', selector: '.v-table-wrap, .pd-page-root, body' },
	{ route: '/admin/audit-log', name: 'admin-audit-log.png', selector: '.v-table-wrap, .pd-page-root, body' },
	{ route: '/admin/system-settings', name: 'admin-system-settings.png', selector: '.pd-page-root, body' },
	{ route: '/admin/support-terminal', name: 'admin-support-terminal.png', selector: '.pd-page-root, body' },
	{ route: '/admin/rl-policy', name: 'admin-rl-policy.png', selector: '.page-shell, body' },
	{ route: '/admin/rebates/upload', name: 'admin-rebates.png', selector: '.page-shell, .pd-page-root, body' },
	{ route: '/admin/sports-configs', name: 'admin-sports-configs.png', selector: '.sc-shell, body' },
];

test.describe('Admin OS Global Console Visual Verification - Every Dashboard Page', () => {
	for (const item of ADMIN_ROUTES) {
		test(`captures ${item.route}`, async ({ page, context }) => {
			await page.setViewportSize({ width: 1440, height: 900 });
			await bypassRouteGuards(context);

			await page.goto(item.route, { waitUntil: 'domcontentloaded' });
			await page.waitForTimeout(1000);
			await expect(page.locator(item.selector).first()).toBeVisible({ timeout: 15000 });
			await page.screenshot({
				path: path.join(OUT_DIR, item.name),
				fullPage: true
			});
		});
	}
});
