# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-regression-v2.spec.ts >> Coach OS - Multi-Page Tactical Audits >> Coach Dashboard - Mainboard Control Panel
- Location: e2e\visual-regression-v2.spec.ts:305:5

# Error details

```
Error: expect(locator).toHaveClass(expected) failed

Locator: locator('.coach-mainboard-grid')
Expected pattern: /tw-grid-cols-12|tw-grid/
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveClass" with timeout 5000ms
  - waiting for locator('.coach-mainboard-grid')

```

```yaml
- main:
  - main:
    - button "Report an anomaly or bug": ALPHA
    - complementary "Workspace navigation":
      - text: SSTracker | Nexus Command
      - navigation:
        - link "Daily Intel":
          - /url: /coach/dashboard
        - link "The Forge":
          - /url: /coach/forge
        - link "Field Station":
          - /url: /coach/drills
        - link "War Room":
          - /url: /coach/tactical
        - link "Match Day":
          - /url: /coach/match-day
        - link "Scouting":
          - /url: /coach/scouting
        - link "Team Ops":
          - /url: /coach/logistics
      - paragraph: System actions
      - link "Support / Help Desk":
        - /url: mailto:support@sstracker.app?subject=SSTRACKER%20support
      - button "Report Anomaly"
      - button "Sign out"
    - button "Collapse sidebar" [expanded]
    - strong: Coach
    - text: / Console
    - button "Open command palette": Search & jump to… ⌘K
    - button "Alerts"
    - button "Settings"
    - text: Test Player
    - paragraph: Coach clearance
    - heading "Background screening" [level=1]
    - paragraph: Your club sponsors this screening. Complete the Checkr invitation when your director orders it — you will not pick packages or pay fees here.
    - paragraph: Signed in as —
    - region "Background screening checklist":
      - list:
        - listitem:
          - heading "Club-sponsored screening" [level=2]
          - paragraph: Your club pays for your background check. You will not select packages or pay fees.
        - listitem:
          - heading "Complete your Checkr invitation" [level=2]
          - paragraph: Your club administrator will order screening. When invited, Checkr will email you a secure link.
        - listitem:
          - heading "Screening in progress" [level=2]
          - paragraph: Checkr is processing your background check. Status updates appear below when available.
      - text: Current status Not started
      - paragraph: Waiting for your club to order screening. Contact your director if you believe this is an error.
    - heading "Screening status" [level=2]
    - region "Screening status":
      - text: Not started
      - paragraph: Your club director will order screening when you are ready. Use the checklist above for next steps.
    - paragraph: Identity details and disclosures are handled only inside Checkr's secure flow.
- text: Nexus Command · Coach OS
```

# Test source

```ts
  211 |         await page.screenshot({ path: 'audit-artifacts/admin/desktop-overview.png' });
  212 |     });
  213 | });
  214 | 
  215 | test.describe('Commissioner OS - State Federation Command', () => {
  216 |     test.beforeEach(async ({ page }) => {
  217 |         await bypassRouteGuards(page, 'commissioner', 'mock-commissioner-uid');
  218 |         await page.goto('/commissioner/matrix');
  219 |     });
  220 | 
  221 |     test('State-wide Compliance Matrix and ODP Analytics', async ({ page }) => {
  222 |         await page.setViewportSize(viewports.desktop);
  223 | 
  224 |         // Verify strict 90-degree square corners
  225 |         const matrixContainer = page.locator('[data-panel="compliance-matrix"]');
  226 |         const borderRadius = await matrixContainer.evaluate((el) => window.getComputedStyle(el).borderRadius);
  227 |         expect(borderRadius).toBe('0px');
  228 | 
  229 |         // Confirm presence of the Red/Amber/Green indicators
  230 |         const complianceMatrix = page.locator('.federation-matrix-grid');
  231 |         await expect(complianceMatrix).toBeVisible();
  232 | 
  233 |         const indicatorDots = page.locator('.status-dot-indicator');
  234 |         await expect(indicatorDots.first()).toBeVisible();
  235 | 
  236 |         // Verify Geist Mono is used for metrics tracking
  237 |         const odpMetrics = page.locator('.odp-analytics-val');
  238 |         const metricFont = await odpMetrics.first().evaluate((el) => window.getComputedStyle(el).fontFamily);
  239 |         expect(metricFont.toLowerCase()).toContain('mono');
  240 | 
  241 |         // Confirm that absolutely NO Action Gold CTAs exist in the tactical/SIEM command matrices
  242 |         const goldCtas = page.locator('button.bg-gold, .btn-primary');
  243 |         expect(await goldCtas.count()).toBe(0);
  244 | 
  245 |         await page.screenshot({ path: 'audit-artifacts/commissioner/desktop-matrix.png' });
  246 |     });
  247 | });
  248 | 
  249 | test.describe('Director OS Dashboard Audit', () => {
  250 |     test.beforeEach(async ({ page }) => {
  251 |         await bypassRouteGuards(page, 'director', 'mock-director-uid');
  252 |         await page.goto('/director/dashboard');
  253 |     });
  254 | 
  255 |     test('Revenue Matrices & SafeSport Compliance Checks', async ({ page }) => {
  256 |         await page.setViewportSize(viewports.desktop);
  257 | 
  258 |         // Validate 90deg Square Corners for B2B gravity
  259 |         const dashboardCards = page.locator('.director-card, [data-card]');
  260 |         const firstCardRadius = await dashboardCards.first().evaluate((el) => window.getComputedStyle(el).borderRadius);
  261 |         expect(firstCardRadius).toBe('0px');
  262 | 
  263 |         // Verify presence of Stripe Connect details & Red/Amber/Green indicators
  264 |         const statusDots = page.locator('.compliance-status-dot');
  265 |         await expect(statusDots.first()).toBeVisible();
  266 | 
  267 |         // Confirm typography rules
  268 |         await auditors.assertTypographyAndGrammar(page);
  269 |         await page.screenshot({ path: 'audit-artifacts/director/desktop-dashboard.png' });
  270 |     });
  271 | });
  272 | 
  273 | test.describe('Coach OS - Multi-Page Tactical Audits', () => {
  274 |     test.beforeEach(async ({ page }) => {
  275 |         await bypassRouteGuards(page, 'coach', 'mock-coach-uid');
  276 |     });
  277 | 
  278 |     test('The Tron War Room SVG Coordinate Engine Check', async ({ page }) => {
  279 |         await page.goto('/coach/war-room');
  280 |         await page.setViewportSize(viewports.desktop);
  281 | 
  282 |         // Verify strict 90deg square corners for tactical command view
  283 |         const tacticalHUD = page.locator('.tactical-hud-panel');
  284 |         const hudRadius = await tacticalHUD.evaluate((el) => window.getComputedStyle(el).borderRadius);
  285 |         expect(hudRadius).toBe('0px');
  286 | 
  287 |         // Confirm that absolutely NO Action Gold CTAs exist in the tactical console
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
> 311 |         await expect(mainGrid).toHaveClass(/tw-grid-cols-12|tw-grid/);
      |                                ^ Error: expect(locator).toHaveClass(expected) failed
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
  388 |         const panelRadius = await compliancePanels.first().evaluate((el) => window.getComputedStyle(el).borderRadius);
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
```