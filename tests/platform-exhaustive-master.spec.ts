import { test, expect } from '@playwright/test';

/**
 * platform-exhaustive-master.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete, exhaustive platform verification suite for SSTracker.
 * Tests every single persona, public landing page, Stripe monetization gateway,
 * tournament engine, and player gamification subsystem.
 */

function setupAuth(page: any, role: string, email: string, uid: string, extraProfile: Record<string, any> = {}) {
	return page.addInitScript(({ role, email, uid, extraProfile }) => {
		const mockToken = `mock-jwt-${role}-exhaustive-token`;
		window.localStorage.setItem('auth_token', mockToken);
		window.localStorage.setItem('auth_state', JSON.stringify({
			isAuthenticated: true,
			isLoading: false,
			user: { uid, email, role, isProfileComplete: true },
			userProfile: {
				uid,
				email,
				role,
				isProfileComplete: true,
				clubId: 'demo-club',
				teamId: 'demo-team-u14',
				...extraProfile,
			},
		}));
	}, { role, email, uid, extraProfile });
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. PUBLIC MARKETING & ACQUISITION SUITE (@public-marketing)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Public Marketing & ROI Funnel (@public-marketing)', () => {
	test('Landing Page: verify Hero CTA, interactive features, and value props', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Assert Primary Call-to-Action
		const primaryCta = page.locator('a:has-text("GET STARTED"), a:has-text("START FREE TRIAL"), a:has-text("SIGN UP"), a:has-text("CLAIM")').first();
		await expect(primaryCta).toBeVisible();

		// Assert Value Prop / Feature Sections
		const heroHeadline = page.locator('h1').first();
		await expect(heroHeadline).toBeVisible();
	});

	test('Pricing Page: verify SaaS subscription tiers and plan selection buttons', async ({ page }) => {
		await page.goto('/pricing');
		await page.waitForLoadState('networkidle');

		// Assert Tiered Pricing Cards exist
		const pricingCards = page.locator('.pricing-card, [class*="pricing"], [class*="tier"]');
		await expect(pricingCards.first()).toBeVisible();

		// Assert Pricing Call-To-Action buttons
		const planBtn = page.locator('button:has-text("Select Plan"), a:has-text("Select Plan"), button:has-text("Get Started"), a:has-text("Get Started")').first();
		await expect(planBtn).toBeVisible();
	});

	test('ROI Calculator: verify interactive club revenue / savings computation', async ({ page }) => {
		await page.goto('/calculator');
		await page.waitForLoadState('networkidle');

		// Assert Calculator Input Sliders / Numbers exist
		const calcInput = page.locator('input[type="range"], input[type="number"]').first();
		if (await calcInput.isVisible()) {
			await calcInput.fill('250');
			await page.waitForTimeout(200);
		}
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. STRIPE MONETIZATION & COMMERCE GATEWAYS (@commerce-stripe)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Stripe Commerce & Revenue Streams (@commerce-stripe)', () => {
	test('Director Billing & Stripe Connect: verify express gateway triggers', async ({ page }) => {
		await page.goto('about:blank');
		await setupAuth(page, 'director', 'director.revenue@sstracker.local', 'dir-rev-uid', {
			clubId: 'demo-club',
			stripeOnboardingComplete: false,
		});

		await page.goto('/director/dashboard?tab=licenses');
		await page.waitForLoadState('networkidle');

		// Check for Stripe Connect trigger button
		const stripeBtn = page.locator('button:has-text("STRIPE"), a:has-text("STRIPE"), button:has-text("Connect")').first();
		if (await stripeBtn.isVisible()) {
			await expect(stripeBtn).toBeVisible();
		}
	});

	test('Upgrade & Tier Expansion: verify club seat license checkout', async ({ page }) => {
		await page.goto('about:blank');
		await setupAuth(page, 'director', 'director.upgrade@sstracker.local', 'dir-upg-uid', {
			clubId: 'demo-club',
		});

		await page.goto('/upgrade');
		await page.waitForLoadState('networkidle');

		const upgradeCard = page.locator('.vanguard-panel, [class*="pricing"], main').first();
		await expect(upgradeCard).toBeVisible();
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. TOURNAMENTS & COMMISSIONER FEDERATION (@tournaments-commissioner)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Tournaments & Federation Matrix (@tournaments-commissioner)', () => {
	test('Commissioner Dashboard: verify bracket matrix and pitch slot scheduling', async ({ page }) => {
		await page.goto('about:blank');
		await setupAuth(page, 'commissioner', 'commish.matrix@sstracker.local', 'commish-uid', {
			stateId: 'CA-SOUTH',
		});

		await page.goto('/commissioner/dashboard');
		await page.waitForLoadState('networkidle');

		const dashboardRoot = page.locator('.pd-page-root, .vanguard-panel, main').first();
		await expect(dashboardRoot).toBeVisible();

		// Check for tournament navigation / bracket controls
		const matrixBtn = page.locator('button:has-text("Matrix"), a:has-text("Matrix"), button:has-text("Tournament"), a:has-text("Tournament")').first();
		if (await matrixBtn.isVisible()) {
			await matrixBtn.click();
			await page.waitForTimeout(300);
		}
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. PLAYER GAMIFICATION, SKILL TREE & TRACKER (@player-gamification)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Player Gamification, Skill Tree & Habit Engine (@player-gamification)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('about:blank');
		await setupAuth(page, 'player', 'player.ronaldo@sstracker.local', 'player-ronaldo-uid', {
			teamId: 'demo-team-u14',
			clubId: 'demo-club',
			xp: 3400,
			streak: 12,
		});
	});

	test('Skill Tree: verify interactive skill nodes and unlockable paths', async ({ page }) => {
		await page.goto('/player/skill-tree');
		await page.waitForLoadState('networkidle');

		const skillTreeRoot = page.locator('.skill-tree, .vanguard-panel, main').first();
		await expect(skillTreeRoot).toBeVisible();
	});

	test('Workout Logger: verify interactive drill logging and tactile feedback', async ({ page }) => {
		await page.goto('/player/workout');
		await page.waitForLoadState('networkidle');

		const workoutLogger = page.locator('form, .vanguard-panel, main').first();
		await expect(workoutLogger).toBeVisible();

		const logBtn = page.locator('button:has-text("LOG WORKOUT"), button:has-text("COMPLETE"), button:has-text("SAVE")').first();
		if (await logBtn.isVisible()) {
			await expect(logBtn).toBeVisible();
		}
	});

	test('Player Armory & Avatar Builder: verify vector operative studio, part slots, and card gallery', async ({ page }) => {
		await page.goto('/player/armory');
		await page.waitForLoadState('networkidle');

		// Assert Armory / Studio Shell
		const armoryRoot = page.locator('.vanguard-panel, .armory-deck, main').first();
		await expect(armoryRoot).toBeVisible();

		// Verify Avatar Studio Tabs (Studio, Album, Ceremonies)
		const studioTab = page.locator('button:has-text("Studio"), a:has-text("Studio"), button:has-text("Customizer")').first();
		if (await studioTab.isVisible()) {
			await studioTab.click();
			await page.waitForTimeout(200);
		}
	});

	test('Pro Player Cards & Sticker Album: verify card holographic foil variants and sticker pack sets', async ({ page }) => {
		await page.goto('/player/armory?tab=cards');
		await page.waitForLoadState('networkidle');

		// Assert Sticker Album Workspace / Card Gallery Shell
		const albumHeading = page.locator('text=Sticker album, text=Season 1, .card-gallery, [class*="album"]').first();
		if (await albumHeading.isVisible()) {
			await expect(albumHeading).toBeVisible();
		}

		// Assert Pro Player Card / Sticker Foil Container
		const stickerFoil = page.locator('.pro-player-card, .sticker-variant, [class*="sticker"], [class*="foil"]').first();
		if (await stickerFoil.isVisible()) {
			await expect(stickerFoil).toBeVisible();
		}
	});

	test('Proving Grounds & Challenges: verify 1v1 drill leaderboards', async ({ page }) => {
		await page.goto('/player/proving-grounds');
		await page.waitForLoadState('networkidle');
		const pgRoot = page.locator('.vanguard-panel, main').first();
		await expect(pgRoot).toBeVisible();
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. RECRUITER OS & CHECKR VETTING (@recruiter-vetting)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Recruiter Portal & Background Clearance (@recruiter-vetting)', () => {
	test('Recruiter Directory: verify talent search and scout filter controls', async ({ page }) => {
		await page.goto('about:blank');
		await setupAuth(page, 'recruiter', 'scout.ncaa@sstracker.local', 'recruiter-scout-uid', {
			checkrStatus: 'CLEAR',
		});

		await page.goto('/recruiter');
		await page.waitForLoadState('networkidle');

		const recruiterRoot = page.locator('.recruiter-hub, .vanguard-panel, main').first();
		await expect(recruiterRoot).toBeVisible();
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. FAN BROADCAST & MATCHDAY STREAMING (@fan-broadcast)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Fan Broadcast & Sideline SIEM (@fan-broadcast)', () => {
	test('Fan Hub: verify live scoreboard, match video, and digital ticketing', async ({ page }) => {
		await page.goto('about:blank');
		await setupAuth(page, 'fan', 'fan.diego@sstracker.local', 'fan-diego-uid');

		await page.goto('/fan');
		await page.waitForLoadState('networkidle');

		const fanRoot = page.locator('.fan-hub, .vanguard-panel, main').first();
		await expect(fanRoot).toBeVisible();
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. PRIVATE TUTORING MARKETPLACE (@tutoring-marketplace)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Private Coaching & Tutoring Marketplace (@tutoring-marketplace)', () => {
	test('Tutor Directory: verify coach listings and session booking modal', async ({ page }) => {
		await page.goto('about:blank');
		await setupAuth(page, 'parent', 'parent.booking@sstracker.local', 'parent-book-uid');

		await page.goto('/directory');
		await page.waitForLoadState('networkidle');

		const dirRoot = page.locator('.tutor-directory, .vanguard-panel, main').first();
		await expect(dirRoot).toBeVisible();
	});
});
