# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/visual-regression-v2.spec.ts >> Parent OS Compliance Shield Audit >> Trust-Oriented Rounding & Car Ride Home Embargo Protocol
- Location: e2e/visual-regression-v2.spec.ts:383:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.evaluate: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.parent-panel, [data-panel]').first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e5]:
    - generic [ref=e9]:
      - paragraph [ref=e10]: VANGUARD ONBOARDING PROTOCOL
      - heading "AWAITING ASSIGNMENT" [level=1] [ref=e11]
    - separator [ref=e12]
    - paragraph [ref=e13]: Your account has been authenticated. An administrator will assign your role and grant access to your command surface.
    - generic [ref=e14]: PENDING ROLE ASSIGNMENT
    - button "← Sign out and return to login" [ref=e17] [cursor=pointer]
  - generic [ref=e18]: Onboarding · NEXUS COMMAND
```

# Test source

```ts
  288 |         const goldButtons = page.locator('button.bg-gold, .btn-primary');
  289 |         const count = await goldButtons.count();
  290 |         let visibleGold = 0;
  291 |         for (let i = 0; i < count; i++) {
  292 |             if (await goldButtons.nth(i).isVisible()) {
  293 |                 visibleGold++;
  294 |             }
  295 |         }
  296 |         expect(visibleGold).toBe(0);
  297 |
  298 |         // Verify SVG Tactical Canvas and coordinate system bindings
  299 |         const tacticalPitch = page.locator('svg.tactical-pitch-canvas');
  300 |         await expect(tacticalPitch).toBeVisible();
  301 |
  302 |         await page.screenshot({ path: 'audit-artifacts/coach/desktop-war-room.png' });
  303 |     });
  304 |
  305 |     test('Coach Dashboard - Mainboard Control Panel', async ({ page }) => {
  306 |         await page.goto('/coach/dashboard');
  307 |         await page.setViewportSize(viewports.desktop);
  308 |
  309 |         // Ensure strict 12-column asymmetric grid clamp rules are enforced on widgets
  310 |         const mainGrid = page.locator('.coach-mainboard-grid');
  311 |         await expect(mainGrid).toHaveClass(/tw-grid-cols-12|tw-grid/);
  312 |
  313 |         // Verify 90-degree square corners
  314 |         const dashboardCards = page.locator('.dashboard-card');
  315 |         const borderRadius = await dashboardCards.first().evaluate((el) => window.getComputedStyle(el).borderRadius);
  316 |         expect(borderRadius).toBe('0px');
  317 |
  318 |         await page.screenshot({ path: 'audit-artifacts/coach/desktop-dashboard.png' });
  319 |     });
  320 |
  321 |     test('Coach Daily Intel - Telemetry Sync & Intel Feeds', async ({ page }) => {
  322 |         await page.goto('/coach/daily-intel');
  323 |         await page.setViewportSize(viewports.desktop);
  324 |
  325 |         // Numeric telemetry values on daily reports must use Geist Mono
  326 |         const numericReadouts = page.locator('.telemetry-readout-val');
  327 |         const fontFamily = await numericReadouts.first().evaluate((el) => window.getComputedStyle(el).fontFamily);
  328 |         expect(fontFamily.toLowerCase()).toContain('mono');
  329 |
  330 |         await auditors.assertEdgePadding(page, '.intel-panel', 24, 16);
  331 |         await page.screenshot({ path: 'audit-artifacts/coach/desktop-daily-intel.png' });
  332 |     });
  333 | });
  334 |
  335 | test.describe('Player OS Gamified HUD & Skill Tree', () => {
  336 |     test.beforeEach(async ({ page }) => {
  337 |         await bypassRouteGuards(page, 'player', 'mock-player-uid');
  338 |     });
  339 |
  340 |     test('Widescreen TCG Player Card & Vanguard Prism Rendering', async ({ page }) => {
  341 |         await page.goto('/player/dashboard');
  342 |         await page.setViewportSize(viewports.desktop);
  343 |
  344 |         // Enforce aggressive chamfered clip-paths on cards
  345 |         const specialtyCards = page.locator('.chamfered-card, [data-chamfer]');
  346 |         const clipPath = await specialtyCards.first().evaluate((el) => window.getComputedStyle(el).clipPath);
  347 |         expect(clipPath).toContain('polygon');
  348 |
  349 |         // Verify the SVG-based 6-axis Vanguard Prism radar chart is present
  350 |         const vanguardPrism = page.locator('canvas.vanguard-prism-radar, canvas');
  351 |         await expect(vanguardPrism.first()).toBeVisible();
  352 |
  353 |         // Verify exactly ONE glowing Action Gold CTA per viewport
  354 |         await auditors.assertSingleCTA(page);
  355 |
  356 |         await page.screenshot({ path: 'audit-artifacts/player/desktop-dashboard.png' });
  357 |     });
  358 |
  359 |     test('Player Skill Tree - App-Like Viewport Lock', async ({ page }) => {
  360 |         await page.goto('/player/skill-tree');
  361 |         await page.setViewportSize(viewports.desktop);
  362 |
  363 |         // Verify 100dvh App-Like Viewport Flow
  364 |         const skillTreeRoot = page.locator('.st-page, .player-dossier-root');
  365 |         const rootHeight = await skillTreeRoot.first().evaluate((el) => window.getComputedStyle(el).height);
  366 |         // Calculated height should match exact viewport dimensions
  367 |         expect(rootHeight).toContain('px');
  368 |
  369 |         // Confirm that absolutely no standard scrollbars overflow the root layout
  370 |         const overflowX = await skillTreeRoot.first().evaluate((el) => window.getComputedStyle(el).overflowX);
  371 |         expect(overflowX).toBe('hidden');
  372 |
  373 |         await page.screenshot({ path: 'audit-artifacts/player/desktop-skill-tree.png' });
  374 |     });
  375 | });
  376 |
  377 | test.describe('Parent OS Compliance Shield Audit', () => {
  378 |     test.beforeEach(async ({ page }) => {
  379 |         await bypassRouteGuards(page, 'parent', 'mock-parent-uid');
  380 |         await page.goto('/parent/dashboard');
  381 |     });
  382 |
  383 |     test('Trust-Oriented Rounding & Car Ride Home Embargo Protocol', async ({ page }) => {
  384 |         await page.setViewportSize(viewports.desktop);
  385 |
  386 |         // Enforce friendly, trust-building 24px rounded corners
  387 |         const compliancePanels = page.locator('.parent-panel, [data-panel]');
> 388 |         const panelRadius = await compliancePanels.first().evaluate((el) => window.getComputedStyle(el).borderRadius);
      |                                                            ^ Error: locator.evaluate: Test timeout of 30000ms exceeded.
  389 |         expect(panelRadius).toBe('24px');
  390 |
  391 |         // Verify the Car Ride Home countdown timer is rendered active
  392 |         const countdownTimer = page.locator('.car-ride-home-timer');
  393 |         await expect(countdownTimer).toBeVisible();
  394 |
  395 |         // Verify the countdown contains appropriate time increments
  396 |         const timerText = await countdownTimer.innerText();
  397 |         expect(timerText).toMatch(/\d{2}:\d{2}/);
  398 |
  399 |         await page.screenshot({ path: 'audit-artifacts/parent/desktop-dashboard.png' });
  400 |     });
  401 | });
  402 |
  403 | test.describe('Fan OS - Broadcast & Ticketing Overlay', () => {
  404 |     test.beforeEach(async ({ page }) => {
  405 |         await bypassRouteGuards(page, 'fan', 'mock-fan-uid');
  406 |         await page.goto('/fan/broadcast');
  407 |     });
  408 |
  409 |     test('Interactive Overlay & Action Gold Accent Controls', async ({ page }) => {
  410 |         await page.setViewportSize(viewports.desktop);
  411 |
  412 |         // Verify live broadcast overlay elements are present and visible
  413 |         const interactiveOverlay = page.locator('.broadcast-interactive-overlay');
  414 |         await expect(interactiveOverlay).toBeVisible();
  415 |
  416 |         // Canvas must maintain deep Void Black (#000000) density
  417 |         const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  418 |         expect(bodyBg === 'rgb(0, 0, 0)' || bodyBg === '#000000').toBe(true);
  419 |
  420 |         // Verify presence of exactly one primary Action Gold CTA to drive audience fundraising
  421 |         await auditors.assertSingleCTA(page);
  422 |
  423 |         await page.screenshot({ path: 'audit-artifacts/fan/desktop-broadcast.png' });
  424 |     });
  425 | });
  426 |
  427 | test.describe('Recruiter OS - Compliance Vetting Funnel', () => {
  428 |     test.beforeEach(async ({ page }) => {
  429 |         await bypassRouteGuards(page, 'recruiter', 'mock-recruiter-uid');
  430 |         await page.goto('/recruiter/onboarding');
  431 |     });
  432 |
  433 |     test('Checkr Embed Compliance & Least Privilege Setup', async ({ page }) => {
  434 |         await page.setViewportSize(viewports.desktop);
  435 |
  436 |         // Ensure zero-distraction layout (legal onboarding strips sidebars)
  437 |         const sidebar = page.locator('.app-sidebar, .sidebar-nav');
  438 |         expect(await sidebar.count()).toBe(0);
  439 |
  440 |         // Verify the Checkr background verification container is visible
  441 |         const checkrContainer = page.locator('.checkr-verification-container, #checkr-embed');
  442 |         await expect(checkrContainer).toBeVisible();
  443 |
  444 |         // Typography rules hold on legal flow
  445 |         await auditors.assertTypographyAndGrammar(page);
  446 |
  447 |         await page.screenshot({ path: 'audit-artifacts/recruiter/desktop-onboarding.png' });
  448 |     });
  449 | });
```