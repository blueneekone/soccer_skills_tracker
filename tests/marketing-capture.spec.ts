import { test, expect, type Page } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const artifactsDir = join(process.cwd(), 'marketing/pending-review');
if (!existsSync(artifactsDir)) mkdirSync(artifactsDir, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// AUTH BYPASS (Restored from visual-regression.spec.ts)
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_API_KEY = 'AIzaSyCiBoemXJHTkTnujTwM1vOJc4FrVZF8Lw8';
const FIREBASE_APP_NAME = '[DEFAULT]';
const IDB_KEY = `firebase:authUser:${FIREBASE_API_KEY}:${FIREBASE_APP_NAME}`;

async function bypassRouteGuards(page: Page, role: string, uid: string) {
	await page.addInitScript(
		({ uid, role, idbKey }: { uid: string; role: string; idbKey: string }) => {
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

			const dbReq = indexedDB.open('firebaseLocalStorageDb', 1);
			dbReq.onupgradeneeded = (e: any) => {
				const db = e.target.result;
				if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
					db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
				}
			};
			dbReq.onsuccess = (e: any) => {
				const db = e.target.result;
				const tx = db.transaction('firebaseLocalStorage', 'readwrite');
				const store = tx.objectStore('firebaseLocalStorage');
				store.put({ fbase_key: idbKey, value: mockUser });
			};

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

	await page.route('**/firestore.googleapis.com/**', async (route) => {
		const url = route.request().url();
		if (url.includes('/users/') || url.includes('documents/users')) {
			await route.fulfill({
				status:      200,
				contentType: 'application/json',
				body:        JSON.stringify({
					name:   `projects/sports-skill-tracker-dev/databases/(default)/documents/users/${IDB_KEY}`,
					fields: {
						role:              { stringValue: role }, 
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
// MOCK CURSOR INJECTION FOR REALISTIC DEMO
// ─────────────────────────────────────────────────────────────────────────────
async function installMouseHelper(page: Page) {
	await page.addInitScript(() => {
		const box = document.createElement('div');
		box.id = 'playwright-mouse-pointer';
		box.style.position = 'absolute';
		box.style.width = '32px';
		box.style.height = '32px';
		box.innerHTML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M11.4326 25.1098L6.44299 4.31683C6.18247 3.23126 7.42436 2.30219 8.35824 3.0117L26.3312 16.6713C27.2346 17.3579 27.054 18.7845 25.9928 19.1915L17.7538 22.3512L13.149 26.2307C12.4431 26.8252 11.3533 26.3475 11.4326 25.1098Z" fill="black" stroke="white" stroke-width="2"/>
		</svg>`;
		box.style.pointerEvents = 'none';
		box.style.zIndex = '9999999';
		box.style.transition = 'transform 0.15s ease-out';
		document.body.appendChild(box);
		
		document.addEventListener('mousemove', event => {
			box.style.left = event.pageX + 'px';
			box.style.top = event.pageY + 'px';
		});
		document.addEventListener('mousedown', event => {
			box.style.transform = 'scale(0.8)';
		});
		document.addEventListener('mouseup', event => {
			box.style.transform = 'scale(1)';
		});
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY OVERLAY INJECTION
// ─────────────────────────────────────────────────────────────────────────────
async function injectOverlay(page: Page, text: string) {
	await page.evaluate((t) => {
		const div = document.createElement('div');
		div.id = 'cmo-marketing-overlay';
		div.style.position = 'fixed';
		div.style.top = '40px';
		div.style.right = '40px';
		div.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
		div.style.color = '#14b8a6'; // Data Cyan
		div.style.fontFamily = 'Geist Mono, monospace';
		div.style.fontSize = '18px';
		div.style.fontWeight = 'bold';
		div.style.padding = '12px 20px';
		div.style.borderRadius = '8px';
		div.style.zIndex = '999999';
		div.style.border = '1px solid rgba(20, 184, 166, 0.5)';
		div.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5), 0 0 20px rgba(20, 184, 166, 0.2)';
		div.innerText = t;
		document.body.appendChild(div);
	}, text);
}

// ─────────────────────────────────────────────────────────────────────────────
// SMOOTH MOVEMENT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function smoothScroll(page: Page, yOffset: number) {
    await page.mouse.wheel(0, yOffset);
    await page.waitForTimeout(1000);
}

test.use({
  video: 'on',
  viewport: { width: 1920, height: 1080 }
});

test.describe('Marketing Capture Walkthroughs', () => {

	test('Scene 1: Coach OS - Dispatching Mission/Bounty', async ({ page }) => {
		await bypassRouteGuards(page, 'coach', 'mock-coach-uid');
		await page.goto('/coach/drills', { waitUntil: 'domcontentloaded' });
		
        await installMouseHelper(page);
        await page.mouse.move(960, 540); // Center start
        await injectOverlay(page, '⚡ Mission Dispatch | Live Field Tactics');
        
		await page.waitForTimeout(1000);

		// Simulate interacting with drills and dispatching
		await page.mouse.move(400, 300, { steps: 30 });
		await page.waitForTimeout(500);
		await smoothScroll(page, 400);
        await page.mouse.move(800, 600, { steps: 20 });
        await page.waitForTimeout(1000);
        await page.mouse.move(1400, 200, { steps: 40 });
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.up(); // simulated click
        
		await page.waitForTimeout(2000);
	});

	test('Scene 2: Parent OS - Escrow & Funding', async ({ page }) => {
		await bypassRouteGuards(page, 'parent', 'mock-parent-uid');
		await page.goto('/parent/dashboard', { waitUntil: 'domcontentloaded' });
		
        await installMouseHelper(page);
        await page.mouse.move(960, 540);
        await injectOverlay(page, '🔒 Secure Escrow | Instant Funding');

		await page.waitForTimeout(1000);

		// Scroll to view Bounty Terminal
        await page.mouse.move(600, 400, { steps: 20 });
		await smoothScroll(page, 500);
		await page.waitForTimeout(500);
        
        // Interact with funding cards
        await page.mouse.move(1200, 600, { steps: 30 });
        await page.waitForTimeout(300);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.up();
        
		await page.waitForTimeout(2000);
	});

	test('Scene 3: Player OS - Workout & Dopamine', async ({ page }) => {
		await bypassRouteGuards(page, 'player', 'mock-player-uid');
		await page.goto('/player/dashboard', { waitUntil: 'domcontentloaded' });
		
        await installMouseHelper(page);
        await page.mouse.move(960, 540);
        await injectOverlay(page, '💎 Dopamine Commit | Skill Progression');

		await page.waitForTimeout(1000);
        
        // Panning the dashboard
        await page.mouse.move(1000, 300, { steps: 20 });
        await smoothScroll(page, 300);

		// Player executes workout
		await page.goto('/player/workout', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(1000);
        
        // Simulate dragging through workout node
        await page.mouse.move(960, 600, { steps: 20 });
        await page.mouse.down();
        await page.mouse.move(1160, 600, { steps: 40 });
        await page.mouse.up();
        await page.evaluate(() => window.dispatchEvent(new CustomEvent('dopamine-commit-celebration')));
        await page.waitForTimeout(2000);

		// Player views their unlocked gear in armory
		await page.goto('/player/armory', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(1000);
        await page.mouse.move(1400, 500, { steps: 30 });
        await page.waitForTimeout(1500);
	});

	test('Scene 4: Coach OS - Telemetry Review', async ({ page }) => {
		await bypassRouteGuards(page, 'coach', 'mock-coach-uid');
		await page.goto('/coach/dashboard', { waitUntil: 'domcontentloaded' });
		
        await installMouseHelper(page);
        await page.mouse.move(960, 540);
        await injectOverlay(page, '📈 Telemetry Sync | Real-Time Diagnostics');

		await page.waitForTimeout(1000);
        
        await page.mouse.move(500, 400, { steps: 25 });
        await smoothScroll(page, 400);
        await page.mouse.move(1200, 600, { steps: 40 });
        
		await page.waitForTimeout(3000);
	});

});
