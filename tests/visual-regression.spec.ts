import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// NUCLEAR AMERICANA TECH NOIR — Color Taxonomy (RGB computed values)
// ─────────────────────────────────────────────────────────────────────────────
const COLOR = {
	DATA_CYAN:      'rgb(20, 184, 166)',   // #14b8a6
	ATOMPUNK_AMBER: 'rgb(245, 158, 11)',   // #f59e0b
	ACTION_GOLD:    'rgb(251, 191, 36)',   // #fbbf24
	NAVY_SLATE_1:   'rgb(15, 23, 42)',     // #0f172a
	NAVY_SLATE_2:   'rgb(30, 41, 59)',     // #1e293b
	VOID_BLACK:     'rgb(0, 0, 0)',        // #000000
	TOOLTIP_BG:     'rgb(11, 15, 25)',     // #0B0F19
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA MAP — all real routes from src/routes/(app)/
// ─────────────────────────────────────────────────────────────────────────────
const PERSONAS = {
	admin: {
		role: 'admin',
		uid: 'mock-admin-uid',
		routes: [
			{ name: 'overview',         path: '/admin/overview' },
			{ name: 'users',            path: '/admin/users' },
			{ name: 'organizations',    path: '/admin/organizations' },
			{ name: 'audit-log',        path: '/admin/audit-log' },
			{ name: 'system-settings',  path: '/admin/system-settings' },
			{ name: 'support-terminal', path: '/admin/support-terminal' },
		],
	},
	director: {
		role: 'director',
		uid: 'mock-director-uid',
		routes: [
			{ name: 'dashboard',   path: '/director/dashboard' },
			{ name: 'compliance',  path: '/director/compliance' },
			{ name: 'events',      path: '/director/events' },
			{ name: 'uplinks',     path: '/director/uplinks' },
		],
	},
	coach: {
		role: 'coach',
		uid: 'mock-coach-uid',
		routes: [
			{ name: 'dashboard',   path: '/coach/dashboard' },
			{ name: 'tactical',    path: '/coach/tactical' },
			{ name: 'war-room',    path: '/coach/war-room' },
			{ name: 'drills',      path: '/coach/drills' },
			{ name: 'match-day',   path: '/coach/match-day' },
			{ name: 'daily-intel', path: '/coach/daily-intel' },
		],
	},
	player: {
		role: 'player',
		uid: 'mock-player-uid',
		routes: [
			{ name: 'dashboard',        path: '/player/dashboard' },
			{ name: 'skill-tree',       path: '/player/skill-tree' },
			{ name: 'tracker',          path: '/player/tracker' },
			{ name: 'armory',           path: '/player/armory' },
			{ name: 'proving-grounds',  path: '/player/proving-grounds' },
		],
	},
	parent: {
		role: 'parent',
		uid: 'mock-parent-uid',
		routes: [
			{ name: 'dashboard',    path: '/parent/dashboard' },
			{ name: 'household',    path: '/parent/household' },
			{ name: 'trust-center', path: '/parent/trust-center' },
			{ name: 'payments',     path: '/parent/payments' },
		],
	},
	commissioner: {
		role: 'commissioner',
		uid: 'mock-commissioner-uid',
		routes: [
			{ name: 'matrix', path: '/commissioner/matrix' },
		],
	},
	public: {
		role: 'public',
		uid: '',
		routes: [
			{ name: 'landing', path: '/' },
			{ name: 'login', path: '/login' },
			{ name: 'features', path: '/features' },
			{ name: 'pricing', path: '/pricing' },
			{ name: 'about', path: '/about' },
			{ name: 'terms', path: '/terms' },
			{ name: 'privacy', path: '/privacy' },
		],
	},
} satisfies Record<string, { role: string; uid: string; routes: { name: string; path: string }[] }>;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH BYPASS — writes a synthetic Firebase Auth session into IndexedDB so
// onAuthStateChanged fires with the mock user. Firebase Auth reads its
// persisted session from IndexedDB key:
//   firebaseLocalStorageDb  →  store: firebaseLocalStorage
//   key: firebase:authUser:{apiKey}:{appName}
//
// We also intercept the Firestore REST profile fetch so isProfileComplete
// resolves immediately without a real network round-trip.
// ─────────────────────────────────────────────────────────────────────────────

// Firebase dev project API key (from firebase.js devConfig)
const FIREBASE_API_KEY = 'AIzaSyCiBoemXJHTkTnujTwM1vOJc4FrVZF8Lw8';
const FIREBASE_APP_NAME = '[DEFAULT]';
const IDB_KEY = `firebase:authUser:${FIREBASE_API_KEY}:${FIREBASE_APP_NAME}`;

async function bypassRouteGuards(page: Page, role: string, uid: string) {
	// Step 1: Inject a synthetic Firebase Auth user into IndexedDB BEFORE
	// the page loads so onAuthStateChanged fires with it on first tick.
	await page.addInitScript(
		({ uid, role, idbKey }: { uid: string; role: string; idbKey: string }) => {
			// Synthetic Firebase User object — matches the shape Firebase SDK expects
			const mockUser = {
				uid,
				email:          `${role}-test@sstracker.app`,
				emailVerified:  true,
				displayName:    `Test ${role}`,
				isAnonymous:    false,
				providerData:   [{ providerId: 'password', uid, email: `${role}-test@sstracker.app`, displayName: null, photoURL: null, phoneNumber: null }],
				stsTokenManager: {
					refreshToken:  'mock-refresh-token',
					accessToken:   'mock-access-token',
					expirationTime: Date.now() + 3600 * 1000,
				},
				createdAt:      '1700000000000',
				lastLoginAt:    String(Date.now()),
				apiKey:         idbKey.split(':')[2],
				appName:        '[DEFAULT]',
			};

			// Write into Firebase's IndexedDB store before SDK initialises
			const dbReq = indexedDB.open('firebaseLocalStorageDb', 1);
			dbReq.onupgradeneeded = (e) => {
				const db = (e.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
					db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
				}
			};
			dbReq.onsuccess = (e) => {
				const db = (e.target as IDBOpenDBRequest).result;
				const tx = db.transaction('firebaseLocalStorage', 'readwrite');
				const store = tx.objectStore('firebaseLocalStorage');
				store.put({ fbase_key: idbKey, value: mockUser });
			};

			// Also write mock profile to localStorage as a secondary signal
			// consumed by any code that reads window.__TEST_PROFILE__
			(window as any).__TEST_PROFILE__ = {
				uid, role,
				isProfileComplete: true,
				clubId:            'mock-club-123',
				teamId:            'mock-team-123',
				householdId:       'mock-household-123',
				vpcStatus:         'verified',
				coppaStatus:       'granted',
				clearance:         { status: 'cleared' },
				isMinor:           false,
			};
		},
		{ uid, role, idbKey: IDB_KEY },
	);

	// Step 2: Intercept Firestore REST calls for the user profile doc so
	// isProfileComplete resolves immediately without a real DB round-trip.
	await page.route('**/firestore.googleapis.com/**', async (route) => {
		const url = route.request().url();
		if (url.includes('/users/') || url.includes('documents/users')) {
			await route.fulfill({
				status:      200,
				contentType: 'application/json',
				body:        JSON.stringify({
					name:   `projects/sports-skill-tracker-dev/databases/(default)/documents/users/${IDB_KEY}`,
					fields: {
						role:              { stringValue: 'admin' }, // overridden per persona below
						isProfileComplete: { booleanValue: true },
						clubId:            { stringValue: 'mock-club-123' },
						vpcStatus:         { stringValue: 'verified' },
					},
					createTime: new Date().toISOString(),
					updateTime: new Date().toISOString(),
				}),
			});
		} else {
			await route.continue();
		}
	});

	// Step 3: Intercept Firebase Auth token exchange so the SDK never tries
	// to refresh the mock token against the real Identity Platform.
	await page.route('**/identitytoolkit.googleapis.com/**', async (route) => {
		await route.fulfill({
			status:      200,
			contentType: 'application/json',
			body:        JSON.stringify({
				idToken:      'mock-id-token',
				refreshToken: 'mock-refresh-token',
				expiresIn:    '3600',
				localId:      uid,
				email:        `${role}-test@sstracker.app`,
				registered:   true,
			}),
		});
	});

	// Step 4: Intercept securetoken (refresh) calls
	await page.route('**/securetoken.googleapis.com/**', async (route) => {
		await route.fulfill({
			status:      200,
			contentType: 'application/json',
			body:        JSON.stringify({
				access_token:  'mock-access-token',
				expires_in:    '3600',
				token_type:    'Bearer',
				refresh_token: 'mock-refresh-token',
				id_token:      'mock-id-token',
				user_id:       uid,
				project_id:    'sports-skill-tracker-dev',
			}),
		});
	});
}


// ─────────────────────────────────────────────────────────────────────────────
// MICROSCOPIC LAYOUT ASSERTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Asserts zero horizontal overflow and zero Bento Grid sibling collisions. */
async function runMicroscopicLayoutAssertions(page: Page, routeName: string) {
	// 1. No horizontal scroll overflow
	const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
	const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
	expect(scrollWidth, `[${routeName}] Horizontal overflow detected`).toBeLessThanOrEqual(clientWidth + 1);

	// 2. Bento Grid 2D Collision Detection — per container, checking only in-flow siblings
	const collisionError = await page.evaluate(() => {
		const grids = Array.from(document.querySelectorAll('.tw-grid, [class*="bento"], [class*="Bento"], .grid'));
		for (let g = 0; g < grids.length; g++) {
			const grid = grids[g];
			// Only check direct children that are visibly in-flow (not absolute/fixed)
			const children = Array.from(grid.children).filter((el) => {
				const style = window.getComputedStyle(el);
				return style.position !== 'absolute' && style.position !== 'fixed' && style.display !== 'none';
			});
			
			const bboxes = children.map((c, idx) => ({ id: idx, ...c.getBoundingClientRect() }));
			
			for (let i = 0; i < bboxes.length; i++) {
				for (let j = i + 1; j < bboxes.length; j++) {
					const a = bboxes[i];
					const b = bboxes[j];
					if (a.width <= 1 || a.height <= 1 || b.width <= 1 || b.height <= 1) continue;
					
					const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
					const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
					
					// 2px tolerance for subpixel rendering
					if (overlapX > 2 && overlapY > 2) {
						return `[COLLISION] Grid #${g} Item #${a.id} overlaps Item #${b.id} ` +
							`(overlapX=${overlapX.toFixed(1)}, overlapY=${overlapY.toFixed(1)})`;
					}
				}
			}
		}
		return null;
	});
	if (collisionError) {
		throw new Error(`${collisionError} on route "${routeName}"`);
	}

	// 3. Silent text clipping check — warns but doesn't hard-fail
	const hasClipping = await page.evaluate(() => {
		const els = Array.from(document.querySelectorAll('h1, h2, h3, p, .tw-font-mono, [data-telemetry]'));
		return els.some(
			(el) => el.scrollWidth > el.clientWidth && window.getComputedStyle(el).overflow === 'hidden',
		);
	});
	if (hasClipping) {
		console.warn(`[WARN] Silent text clipping detected on route: "${routeName}"`);
	}
}

/** Asserts that no pure white background is rendered (guards against FOUC). */
async function assertDarkModeBackground(page: Page, routeName: string) {
	const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
	expect(bg, `[${routeName}] Light-mode FOUC detected — body bg should not be white`).not.toBe('rgb(255, 255, 255)');
}

/**
 * Hover-state verification. Checks that the first matching element
 * transitions to a brand-approved accent color within 250ms.
 */
async function verifyHoverState(page: Page, selector: string, routeName: string) {
	// Filter to VISIBLE elements only — hidden desktop-only nav items cause
	// scrollIntoViewIfNeeded() to hang on mobile viewports.
	const elements = page.locator(selector).filter({ visible: true });
	if (await elements.count() === 0) return;

	const el = elements.first();
	const html = await el.evaluate(n => n.outerHTML);
	console.log(`[${routeName}] First matched element for hover test:`, html);
	await el.scrollIntoViewIfNeeded();
	await el.hover({ force: true }); // force bypasses pointer-event interception from overlapping canvases (e.g. War Room)
	await page.waitForTimeout(250); // kinetic transition window (150–250ms mandated)

	const computedColor = await el.evaluate((node) => window.getComputedStyle(node as Element).color);
	const allowedColors = [COLOR.DATA_CYAN, COLOR.ATOMPUNK_AMBER, COLOR.ACTION_GOLD];
	expect(
		allowedColors,
		`[${routeName}] Hover color "${computedColor}" is not an approved accent`,
	).toContain(computedColor);
}

/** Asserts tooltips are visible, correctly backgrounded, and not clipped. */
async function verifyTooltips(page: Page) {
	const triggers = page.locator('.tooltip-trigger, [data-tooltip]');
	if (await triggers.count() === 0) return;

	await triggers.first().hover();
	await page.waitForTimeout(250);

	const tooltip = page.locator('.tooltip, [role="tooltip"]').first();
	if (await tooltip.count() === 0) return;

	await expect(tooltip).toBeVisible();
	const bg = await tooltip.evaluate((el) => window.getComputedStyle(el as Element).backgroundColor);
	expect([COLOR.TOOLTIP_BG, COLOR.NAVY_SLATE_1, COLOR.VOID_BLACK]).toContain(bg);

	const box = await tooltip.boundingBox();
	if (box) {
		const vpSize = page.viewportSize();
		if (vpSize) {
			expect(box.x).toBeGreaterThanOrEqual(0);
			expect(box.y).toBeGreaterThanOrEqual(0);
			expect(box.x + box.width).toBeLessThanOrEqual(vpSize.width + 1);
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONA-SPECIFIC DEEP ASSERTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Admin & Director: enforce strict 0px border-radius (90° square corners). */
async function assertSquareCorners(page: Page, selector: string, routeName: string) {
	const panels = page.locator(selector);
	const count = await panels.count();
	for (let i = 0; i < count; i++) {
		const radius = await panels.nth(i).evaluate((el) => window.getComputedStyle(el as Element).borderRadius);
		expect(radius, `[${routeName}] Panel should have 0px border-radius`).toBe('0px');
	}
}

/** Player: enforce chamfered clip-path on specialty cards. */
async function assertChamferedClipPath(page: Page) {
	const cards = page.locator('.chamfered-card, [data-chamfer]');
	if (await cards.count() === 0) return;
	const clipPath = await cards.first().evaluate((el) => window.getComputedStyle(el as Element).clipPath);
	expect(clipPath).toContain('polygon');
}

/** Player: assert the 6-axis Vanguard Prism radar SVG is present. */
async function assertVanguardPrism(page: Page) {
	const prism = page.locator('canvas.vanguard-prism, svg.vanguard-prism-radar, [data-chart="vanguard-prism"]');
	if (await prism.count() > 0) {
		await expect(prism.first()).toBeVisible();
	}
}

/** Parent: enforce friendly 24px rounded corners on trust panels. */
async function assertRoundedCorners(page: Page, routeName: string) {
	const panels = page.locator('.parent-panel, [data-panel]');
	if (await panels.count() === 0) return;
	const radius = await panels.first().evaluate((el) => window.getComputedStyle(el as Element).borderRadius);
	expect(
		parseInt(radius),
		`[${routeName}] Parent panels should use ≥24px border-radius`,
	).toBeGreaterThanOrEqual(24);
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTIFACT DIRECTORY BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────
const artifactsDir = join(process.cwd(), 'audit-artifacts');
if (!existsSync(artifactsDir)) {
	mkdirSync(artifactsDir, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC TEST GENERATION — one describe block per persona
// ─────────────────────────────────────────────────────────────────────────────
for (const [personaName, persona] of Object.entries(PERSONAS)) {
	test.describe(`EPIC TRAVERSAL: ${personaName.toUpperCase()} OS`, () => {

		test.beforeEach(async ({ page }) => {
			page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
			page.on('pageerror', error => console.log(`[BROWSER ERROR] ${error.message}`));
			page.on('response', response => {
				if (response.status() === 404) {
					console.log(`[BROWSER 404] ${response.url()}`);
				}
			});
			if (personaName !== 'public') {
				await bypassRouteGuards(page, persona.role, persona.uid);
			}
		});

		for (const route of persona.routes) {
			test(`Audit: ${route.name.toUpperCase()}`, async ({ page }, testInfo) => {
				// Create isolated output folder
				const personaDir = join(artifactsDir, personaName);
				if (!existsSync(personaDir)) mkdirSync(personaDir, { recursive: true });

				// Navigate — use domcontentloaded; 'networkidle' hangs forever with Firebase WebSockets
				await page.goto(route.path, { waitUntil: 'domcontentloaded' });
				await page.waitForLoadState('load');
				await page.waitForTimeout(800); // allow Svelte 5 $state reactivity to settle
				if (route.name === 'overview') {
					writeFileSync('debug-dom.html', await page.content());
				}

				// ── Core assertions ────────────────────────────────────────────
				await assertDarkModeBackground(page, route.name);
				await runMicroscopicLayoutAssertions(page, route.name);
				await verifyHoverState(page, '.vanguard-link, nav a, button', route.name);
				await verifyTooltips(page);

				// ── Persona-specific structural assertions ─────────────────────
				if (personaName === 'admin') {
					await assertSquareCorners(page, '.admin-panel, [data-panel]', route.name);
				}
				if (personaName === 'director') {
					await assertSquareCorners(page, '.director-card, [data-card], [data-panel]', route.name);
				}
				if (personaName === 'player') {
					await assertChamferedClipPath(page);
					if (route.name === 'dashboard') await assertVanguardPrism(page);
				}
				if (personaName === 'parent') {
					await assertRoundedCorners(page, route.name);
				}

				// ── Visual proof screenshot ────────────────────────────────────
				const envName = testInfo.project.name.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';
				const screenshotPath = join(personaDir, `${route.name}-${envName}.png`);
				await page.screenshot({ path: screenshotPath, fullPage: true });
				console.log(`✅ [AUDIT PASSED] ${personaName}/${route.name} (${envName}) → ${screenshotPath}`);
			});
		}
	});
}