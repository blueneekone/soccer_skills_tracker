# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-regression.spec.ts >> Parent OS Compliance Shield Audit >> Trust-Oriented Rounding & Car Ride Home Embargo Protocol
- Location: visual-regression.spec.ts:298:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/parent/dashboard", waiting until "load"

```

# Test source

```ts
  195 |         }
  196 | 
  197 |         // Verify Monospace Font Scaling on KPIs
  198 |         const metricLabels = page.locator('.kpi-metric-val');
  199 |         const countMetrics = await metricLabels.count();
  200 |         for (let i = 0; i < countMetrics; i++) {
  201 |             const fontFamily = await metricLabels.nth(i).evaluate((el) => window.getComputedStyle(el).fontFamily);
  202 |             expect(fontFamily.toLowerCase()).toContain('mono');
  203 |         }
  204 | 
  205 |         await auditors.assertEdgePadding(page, '.admin-panel', 24, 16);
  206 |         await page.screenshot({ path: 'audit-artifacts/admin/desktop-overview.png' });
  207 |     });
  208 | });
  209 | 
  210 | test.describe('Director OS Dashboard Audit', () => {
  211 |     test.beforeEach(async ({ page }) => {
  212 |         await bypassRouteGuards(page, 'director', 'mock-director-uid');
  213 |         await page.goto('/director/dashboard');
  214 |     });
  215 | 
  216 |     test('Revenue Matrices & SafeSport Compliance Checks', async ({ page }) => {
  217 |         await page.setViewportSize(viewports.desktop);
  218 | 
  219 |         // Validate 90deg Square Corners for B2B gravity
  220 |         const dashboardCards = page.locator('.director-card, [data-card]');
  221 |         const firstCardRadius = await dashboardCards.first().evaluate((el) => window.getComputedStyle(el).borderRadius);
  222 |         expect(firstCardRadius).toBe('0px');
  223 | 
  224 |         // Verify presence of Stripe Connect details & Red/Amber/Green indicators
  225 |         const statusDots = page.locator('.compliance-status-dot');
  226 |         await expect(statusDots.first()).toBeVisible();
  227 | 
  228 |         // Confirm typography rules
  229 |         await auditors.assertTypographyAndGrammar(page);
  230 |         await page.screenshot({ path: 'audit-artifacts/director/desktop-dashboard.png' });
  231 |     });
  232 | });
  233 | 
  234 | test.describe('Coach OS Tactical SIEM Audit', () => {
  235 |     test.beforeEach(async ({ page }) => {
  236 |         await bypassRouteGuards(page, 'coach', 'mock-coach-uid');
  237 |         await page.goto('/coach/war-room');
  238 |     });
  239 | 
  240 |     test('The Tron War Room SVG Coordinate Engine Check', async ({ page }) => {
  241 |         await page.setViewportSize(viewports.desktop);
  242 | 
  243 |         // Verify strict 90deg square corners for tactical command view
  244 |         const tacticalHUD = page.locator('.tactical-hud-panel');
  245 |         const hudRadius = await tacticalHUD.evaluate((el) => window.getComputedStyle(el).borderRadius);
  246 |         expect(hudRadius).toBe('0px');
  247 | 
  248 |         // Confirm that absolutely NO Action Gold CTAs exist in the tactical console
  249 |         const goldButtons = page.locator('button.bg-gold, .btn-primary');
  250 |         const count = await goldButtons.count();
  251 |         let visibleGold = 0;
  252 |         for (let i = 0; i < count; i++) {
  253 |             if (await goldButtons.nth(i).isVisible()) {
  254 |                 visibleGold++;
  255 |             }
  256 |         }
  257 |         expect(visibleGold).toBe(0);
  258 | 
  259 |         // Verify SVG Tactical Canvas and coordinate system bindings
  260 |         const tacticalPitch = page.locator('svg.tactical-pitch-canvas');
  261 |         await expect(tacticalPitch).toBeVisible();
  262 | 
  263 |         await page.screenshot({ path: 'audit-artifacts/coach/desktop-war-room.png' });
  264 |     });
  265 | });
  266 | 
  267 | test.describe('Player OS Gamified HUD Audit', () => {
  268 |     test.beforeEach(async ({ page }) => {
  269 |         await bypassRouteGuards(page, 'player', 'mock-player-uid');
  270 |         await page.goto('/player/dashboard');
  271 |     });
  272 | 
  273 |     test('Widescreen TCG Player Card & Vanguard Prism Rendering', async ({ page }) => {
  274 |         await page.setViewportSize(viewports.desktop);
  275 | 
  276 |         // Enforce aggressive chamfered clip-paths on cards
  277 |         const specialtyCards = page.locator('.chamfered-card, [data-chamfer]');
  278 |         const clipPath = await specialtyCards.first().evaluate((el) => window.getComputedStyle(el).clipPath);
  279 |         expect(clipPath).toContain('polygon');
  280 | 
  281 |         // Verify the SVG-based 6-axis Vanguard Prism radar chart is present
  282 |         const vanguardPrism = page.locator('svg.vanguard-prism-radar');
  283 |         await expect(vanguardPrism).toBeVisible();
  284 | 
  285 |         // Verify exactly ONE glowing Action Gold CTA per viewport
  286 |         await auditors.assertSingleCTA(page);
  287 | 
  288 |         await page.screenshot({ path: 'audit-artifacts/player/desktop-dashboard.png' });
  289 |     });
  290 | });
  291 | 
  292 | test.describe('Parent OS Compliance Shield Audit', () => {
  293 |     test.beforeEach(async ({ page }) => {
  294 |         await bypassRouteGuards(page, 'parent', 'mock-parent-uid');
> 295 |         await page.goto('/parent/dashboard');
      |                    ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  296 |     });
  297 | 
  298 |     test('Trust-Oriented Rounding & Car Ride Home Embargo Protocol', async ({ page }) => {
  299 |         await page.setViewportSize(viewports.desktop);
  300 | 
  301 |         // Enforce friendly, trust-building 24px rounded corners
  302 |         const compliancePanels = page.locator('.parent-panel, [data-panel]');
  303 |         const panelRadius = await compliancePanels.first().evaluate((el) => window.getComputedStyle(el).borderRadius);
  304 |         expect(panelRadius).toBe('24px');
  305 | 
  306 |         // Verify the Car Ride Home countdown timer is rendered active
  307 |         const countdownTimer = page.locator('.car-ride-home-timer');
  308 |         await expect(countdownTimer).toBeVisible();
  309 | 
  310 |         // Verify the countdown contains appropriate time increments
  311 |         const timerText = await countdownTimer.innerText();
  312 |         expect(timerText).toMatch(/\d{2}:\d{2}/);
  313 | 
  314 |         await page.screenshot({ path: 'audit-artifacts/parent/desktop-dashboard.png' });
  315 |     });
  316 | });
```