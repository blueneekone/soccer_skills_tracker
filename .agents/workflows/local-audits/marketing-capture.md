---
name: marketing-capture
description: Automated, choreographed multi-scene browser-in-the-loop marketing video capture workflow matching the 90-Second SSTracker Demo Script.
trigger: manual
---

# WORKFLOW: AUTOMATED 90-SECOND DEMO SCENE CAPTURE
**Owner**: Chief Marketing Officer (CMO) | **Priority**: P1 — RELEASE READINESS

This workflow orchestrates the **CRO (Chief Reliability Officer)** browser subagent to execute a choreographed, multi-scene visual simulation of sstracker.app directly matching the approved 90-Second Demo Script. The CMO agent acts as the director, recording high-resolution webm/mp4 visual proof without manual screen-recording.

---

## CRITICAL SAFETY & DEPLOYMENT GUARDRAIL
The CMO and Browser subagents are **mathematically prohibited** from executing any production deployment, external API writes, or remote hosting upload scripts. All recorded scenes, cropped viewports, and metadata overlays must remain local within `/marketing/pending-review/` for human offline validation.

---

## EXECUTION STEPS

### STEP 1: CREATE THE CAPTURE SCRIPT
The agent must generate a Playwright test script at `tests/marketing-capture.spec.ts` with the following actual workflow walkthroughs for the key personas:

```typescript
import { test, expect, type Page } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const artifactsDir = join(process.cwd(), 'marketing/pending-review');
if (!existsSync(artifactsDir)) mkdirSync(artifactsDir, { recursive: true });

async function bypassRouteGuards(page: Page, role: string, uid: string) {
	await page.addInitScript(
		({ uid, role, idbKey }: { uid: string; role: string; idbKey: string }) => {
			const mockUser = {
				uid,
				email: `${role}-test@sstracker.app`,
				emailVerified: true,
				displayName: `Test ${role}`,
				isAnonymous: false,
				providerData: [{ providerId: 'password', uid, email: `${role}-test@sstracker.app`, displayName: null, photoURL: null, phoneNumber: null }],
				stsTokenManager: { refreshToken: 'mock-refresh-token', accessToken: 'mock-access-token', expirationTime: Date.now() + 3600000 },
				createdAt: Date.now().toString(),
				lastLoginAt: Date.now().toString(),
				apiKey: 'mock-api-key',
				appName: '[DEFAULT]'
			};
			const mockProfile = { id: uid, role, email: mockUser.email, firstName: 'Test', lastName: role.toUpperCase(), clubId: 'mock-club-id', teams: ['mock-team-1'] };
			const mockToken = { claims: { role, clubId: 'mock-club-id' }, token: 'mock-jwt' };
			const state = { user: mockUser, profile: mockProfile, token: mockToken, status: 'AUTHENTICATED', role };
			window.localStorage.setItem(idbKey, JSON.stringify(state));
		},
		{ uid, role, idbKey: 'sst_auth_state_v1' }
	);
}

test.use({
  video: 'on',
  viewport: { width: 1920, height: 1080 }
});

test.describe('Marketing Capture Walkthroughs', () => {

	test('Scene 1: Director OS & B2B Revenue Engine', async ({ page }) => {
		await bypassRouteGuards(page, 'director', 'mock-director-uid');
		await page.goto('/director/dashboard', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(1000);

		// Simulate viewing the command center and analytics
		await page.mouse.move(500, 500);
		await page.mouse.wheel(0, 300);
		await page.waitForTimeout(2000);

		// Navigate to compliance
		await page.goto('/director/dashboard?tab=compliance', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(2000);
	});

	test('Scene 2: Athlete OS & Dopamine Engine', async ({ page }) => {
		await bypassRouteGuards(page, 'player', 'mock-player-uid');
		await page.goto('/player/dashboard', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(1000);

		// Navigate to skill tree
		await page.goto('/player/dashboard?tab=skills', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(2000);

		// Navigate to armory
		await page.goto('/player/dashboard?tab=armory', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(2000);
	});

	test('Scene 3: Coach OS & The Sideline SIEM', async ({ page }) => {
		await bypassRouteGuards(page, 'coach', 'mock-coach-uid');
		await page.goto('/coach/dashboard', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(1000);

		// Navigate to War Room
		await page.goto('/coach/dashboard?tab=tactics', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(3000);
	});

	test('Scene 4: SafeSport & Parent Shield', async ({ page }) => {
		await bypassRouteGuards(page, 'parent', 'mock-parent-uid');
		await page.goto('/parent/dashboard', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(1000);

		// Navigate to household
		await page.goto('/parent/dashboard?tab=household', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(2000);
	});

});
```

### STEP 2: RUN THE CAPTURE
Execute the Playwright script to record the walkthroughs:
```bash
npx playwright test tests/marketing-capture.spec.ts --project=chromium
```

### STEP 3: POST-PRODUCTION & ARTIFACT EXTRACTION
1.  **Locate Videos**: Playwright automatically saves the recorded WebM videos in the `test-results/` directory.
2.  **Move to Pending Review**: The agent must run a script to copy and rename these video files into `./marketing/pending-review/` with cryptographic or descriptive filenames (e.g., `Scene-1-Director-OS.webm`).
3.  **Clear Test Results**: Clean up the raw `test-results/` directory to save space.

---

## VERIFICATION & HANDOVER
The CMO must verify that:
*   The video artifacts are successfully stored in `./marketing/pending-review/`.
*   The actual UI rendering is captured across the key routes for Director, Player, Coach, and Parent.
*   No errors or stack traces are visible on screen during the recording.
