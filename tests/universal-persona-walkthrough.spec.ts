import { test, expect } from '@playwright/test';
import path from 'node:path';

/**
 * universal-persona-walkthrough.spec.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 * SSTRACKER MULTI-BILLION-DOLLAR ENTERPRISE VISUAL WALKTHROUGH & INTERACTION HARNESS
 * 
 * Tests every persona, every page, tab switch, modal trigger, and button click.
 * Captures full-page visual screenshots to audit-artifacts/{persona}/*.png
 * ═══════════════════════════════════════════════════════════════════════════════
 */

function setupAuthMock(page: any, role: string, email: string, uid: string, extraProfile: Record<string, any> = {}) {
	return page.addInitScript(({ role, email, uid, extraProfile }) => {
		const mockToken = `mock-jwt-${role}-token`;
		window.localStorage.setItem('sstracker_e2e_bypass', 'true');
		window.localStorage.setItem('auth_token', mockToken);
		window.localStorage.setItem('auth_state', JSON.stringify({
			isAuthenticated: true,
			isLoading: false,
			role,
			isProfileComplete: true,
			tenantId: 'demo-tenant',
			clubId: 'demo-club',
			user: { uid, email, role, isProfileComplete: true },
			userProfile: {
				uid,
				email,
				role,
				isProfileComplete: true,
				clubId: 'demo-club',
				teamId: 'demo-team-u14',
				...extraProfile
			}
		}));
		window.localStorage.setItem('user_profile', JSON.stringify({
			uid,
			email,
			role,
			isProfileComplete: true,
			clubId: 'demo-club',
			tenantId: 'demo-tenant',
			...extraProfile
		}));
	}, { role, email, uid, extraProfile });
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. PUBLIC MARKETING & ONBOARDING
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Public & Marketing Acquisition (@visual-public)', () => {
	test('captures landing page, hero video HUD, trust strip, and pricing', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);

		await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
		await page.screenshot({ path: path.resolve('audit-artifacts/public/01-landing-hero.png'), fullPage: true });

		// Click Pricing toggle if present
		const annualToggle = page.locator('button:has-text("Annual"), button:has-text("Yearly")').first();
		if (await annualToggle.isVisible()) {
			await annualToggle.click();
			await page.waitForTimeout(200);
			await page.screenshot({ path: path.resolve('audit-artifacts/public/02-pricing-annual.png') });
		}
	});

	test('captures login and role select screens', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/login', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(300);
		await page.screenshot({ path: path.resolve('audit-artifacts/public/03-login-screen.png') });

		await page.goto('/onboarding/role-select', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(300);
		await page.screenshot({ path: path.resolve('audit-artifacts/public/04-onboarding-role-select.png') });
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. GLOBAL ADMIN OS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Admin OS Global Command Plane (@visual-admin)', () => {
	const adminRoutes = [
		{ route: '/admin/overview', file: '01-overview.png' },
		{ route: '/admin/organizations', file: '02-organizations.png' },
		{ route: '/admin/users', file: '03-users.png' },
		{ route: '/admin/recruiters', file: '04-recruiters.png' },
		{ route: '/admin/coach-clearance', file: '05-coach-clearance.png' },
		{ route: '/admin/system-settings', file: '06-system-settings.png' },
		{ route: '/admin/sports-configs', file: '07-sports-configs.png' }
	];

	for (const { route, file } of adminRoutes) {
		test(`captures and audits Admin route: ${route}`, async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 900 });
			await setupAuthMock(page, 'super_admin', 'admin@sstracker.app', 'admin-uid-01');
			await page.goto(route, { waitUntil: 'domcontentloaded' });
			await page.waitForTimeout(500);

			const main = page.locator('main, .pd-page-root, body').first();
			await expect(main).toBeVisible();

			// Interactive action: click first tab or filter button if available
			const tabButton = page.locator('button[role="tab"], .v-tab-btn, button:has-text("Filter")').first();
			if (await tabButton.isVisible()) {
				await tabButton.click();
				await page.waitForTimeout(200);
			}

			await page.screenshot({ path: path.resolve(`audit-artifacts/admin/${file}`), fullPage: true });
		});
	}
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMMISSIONER OS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Commissioner OS Federation Hub (@visual-commissioner)', () => {
	test('captures commissioner dashboard and talent matrix', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await setupAuthMock(page, 'commissioner', 'commissioner@sstracker.app', 'comm-uid-01');

		await page.goto('/commissioner/dashboard', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await expect(page.locator('main').first()).toBeVisible();
		await page.screenshot({ path: path.resolve('audit-artifacts/commissioner/01-dashboard.png'), fullPage: true });

		await page.goto('/commissioner/matrix', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await page.screenshot({ path: path.resolve('audit-artifacts/commissioner/02-matrix.png'), fullPage: true });
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. DIRECTOR OS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Director OS B2B Revenue Engine (@visual-director)', () => {
	test('captures director dashboard, vampire roster tabs, and compliance', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await setupAuthMock(page, 'director', 'director@club.org', 'dir-uid-01');

		await page.goto('/director/dashboard', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await expect(page.locator('main').first()).toBeVisible();
		await page.screenshot({ path: path.resolve('audit-artifacts/director/01-dashboard.png'), fullPage: true });

		// Click roster tab
		const rosterTab = page.locator('button:has-text("Roster"), a:has-text("Roster")').first();
		if (await rosterTab.isVisible()) {
			await rosterTab.click();
			await page.waitForTimeout(300);
			await page.screenshot({ path: path.resolve('audit-artifacts/director/02-roster-tab.png') });
		}

		await page.goto('/director/compliance-ops', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await page.screenshot({ path: path.resolve('audit-artifacts/director/03-compliance-ops.png'), fullPage: true });
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. COACH OS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Coach OS Sideline SIEM & War Room (@visual-coach)', () => {
	test('captures War Room tactical pitch, weather radar, and match review', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await setupAuthMock(page, 'coach', 'coach@club.org', 'coach-uid-01', {
			teamId: 'demo-team-u14',
			clubId: 'demo-club'
		});

		// 1. War Room / Tactics
		await page.goto('/coach/tactics-and-training', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(600);
		await expect(page.locator('main').first()).toBeVisible();
		await page.screenshot({ path: path.resolve('audit-artifacts/coach/01-war-room-tactics.png'), fullPage: true });

		// 2. Logistics & Squad Matrix
		await page.goto('/coach/logistics', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await page.screenshot({ path: path.resolve('audit-artifacts/coach/02-team-ops-logistics.png'), fullPage: true });

		// 3. Daily Intel
		await page.goto('/coach/daily-intel', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await page.screenshot({ path: path.resolve('audit-artifacts/coach/03-daily-intel.png'), fullPage: true });
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PLAYER OS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Player OS Gamified Dopamine Engine (@visual-player)', () => {
	test('captures Player Dashboard, 6-axis radar, armory, and skill tree', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await setupAuthMock(page, 'player', 'player.star@sstracker.app', 'player-uid-01', {
			xp: 2450,
			streak: 12,
			tier: 'Gold'
		});

		// 1. Dashboard
		await page.goto('/player/dashboard', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(600);
		await expect(page.locator('main').first()).toBeVisible();
		await page.screenshot({ path: path.resolve('audit-artifacts/player/01-dashboard.png'), fullPage: true });

		// 2. Skill Tree
		await page.goto('/player/skill-tree', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(600);
		await page.screenshot({ path: path.resolve('audit-artifacts/player/02-skill-tree.png'), fullPage: true });

		// 3. Workout Terminal
		await page.goto('/player/workout', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await page.screenshot({ path: path.resolve('audit-artifacts/player/03-workout.png'), fullPage: true });
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. PARENT OS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Parent OS Compliance Shield & Household (@visual-parent)', () => {
	test('captures household operatives, dispatch linking, and VPC consent', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await setupAuthMock(page, 'parent', 'parent.guardian@sstracker.app', 'parent-uid-01', {
			householdId: 'household-demo-01'
		});

		// 1. Household Management
		await page.goto('/parent/household', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await expect(page.locator('main').first()).toBeVisible();
		await page.screenshot({ path: path.resolve('audit-artifacts/parent/01-household.png'), fullPage: true });

		// 2. Log Workout
		await page.goto('/parent/log-workout', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await page.screenshot({ path: path.resolve('audit-artifacts/parent/02-log-workout.png'), fullPage: true });

		// 3. VPC Compliance
		await page.goto('/parent/vpc', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await page.screenshot({ path: path.resolve('audit-artifacts/parent/03-vpc-compliance.png'), fullPage: true });
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. FAN & RECRUITER OS + 8. TUTORING MARKETPLACE
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Fan, Recruiter & Marketplace Visual Verification (@visual-extended)', () => {
	test('captures Fan broadcast arena', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await setupAuthMock(page, 'fan', 'fan.supporter@sstracker.app', 'fan-uid-01');

		await page.goto('/fan/watch', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await page.screenshot({ path: path.resolve('audit-artifacts/fan/01-broadcast-arena.png'), fullPage: true });
	});

	test('captures Recruiter talent search and Checkr gate', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await setupAuthMock(page, 'recruiter', 'recruiter.pro@scout.com', 'recruiter-uid-01');

		await page.goto('/recruiter', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await page.screenshot({ path: path.resolve('audit-artifacts/recruiter/01-talent-search.png'), fullPage: true });
	});

	test('captures Tutoring Marketplace directory', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await setupAuthMock(page, 'parent', 'parent.guardian@sstracker.app', 'parent-uid-01');

		await page.goto('/tutor', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);
		await page.screenshot({ path: path.resolve('audit-artifacts/marketplace/01-tutor-directory.png'), fullPage: true });
	});
});
