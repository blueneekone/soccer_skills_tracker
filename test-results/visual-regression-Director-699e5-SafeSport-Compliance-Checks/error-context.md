# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-regression.spec.ts >> Director OS Dashboard Audit >> Revenue Matrices & SafeSport Compliance Checks
- Location: visual-regression.spec.ts:216:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/director/dashboard", waiting until "load"

```

# Test source

```ts
  113 |     },
  114 | 
  115 |     // 4. Assert exactly one active primary Action Gold CTA in the viewport
  116 |     async assertSingleCTA(page) {
  117 |         const goldCtas = page.locator('button.bg-gold, .btn-primary, [data-primary-cta]');
  118 |         const count = await goldCtas.count();
  119 | 
  120 |         let visibleGoldCount = 0;
  121 |         for (let i = 0; i < count; i++) {
  122 |             if (await goldCtas.nth(i).isVisible()) {
  123 |                 visibleGoldCount++;
  124 |             }
  125 |         }
  126 |         expect(visibleGoldCount).toBe(1);
  127 |     }
  128 | };
  129 | 
  130 | test.describe('SSTracker Landing Page Visual Audit', () => {
  131 |     test.beforeEach(async ({ page }) => {
  132 |         // Landing page is static and unauthenticated
  133 |         await page.goto('/');
  134 |     });
  135 | 
  136 |     test('Desktop View - 12-Column Asymmetric Bento Grid', async ({ page }) => {
  137 |         await page.setViewportSize(viewports.desktop);
  138 | 
  139 |         // Validate Headline
  140 |         const headline = page.locator('h1');
  141 |         await expect(headline).toHaveText(/Stop managing teams. Start developing athletes. The Youth Sports OS./i);
  142 | 
  143 |         // Verify 6-4-2 Asymmetric Layout Column Spans
  144 |         const playerCard = page.locator('[data-bento="player"]');
  145 |         const coachCard = page.locator('[data-bento="coach"]');
  146 |         const parentCard = page.locator('[data-bento="parent"]');
  147 | 
  148 |         await expect(playerCard).toHaveClass(/col-span-6|lg:col-span-6/);
  149 |         await expect(coachCard).toHaveClass(/col-span-4|lg:col-span-4/);
  150 |         await expect(parentCard).toHaveClass(/col-span-2|lg:col-span-2/);
  151 | 
  152 |         // Run Microscopic Audits
  153 |         await auditors.assertEdgePadding(page, '.bento-well', 24, 16);
  154 |         await auditors.assertTypographyAndGrammar(page);
  155 |         await auditors.assertColorContrast(page, '.bento-well');
  156 |         await auditors.assertSingleCTA(page);
  157 | 
  158 |         // Deposit Verification Evidence
  159 |         await page.screenshot({ path: 'audit-artifacts/public/desktop-landing.png', fullPage: true });
  160 |     });
  161 | 
  162 |     test('Mobile View - Fluid Single-Column Collapse', async ({ page }) => {
  163 |         await page.setViewportSize(viewports.mobile);
  164 | 
  165 |         // Bento wells should stack vertically in a single column
  166 |         const playerCard = page.locator('[data-bento="player"]');
  167 |         const bounding = await playerCard.boundingBox();
  168 |         const viewportWidth = viewports.mobile.width;
  169 | 
  170 |         if (bounding) {
  171 |             expect(bounding.width).toBeLessThanOrEqual(viewportWidth);
  172 |         }
  173 | 
  174 |         // Mobile specific padding check
  175 |         await auditors.assertEdgePadding(page, '.bento-well', 24, 16);
  176 |         await page.screenshot({ path: 'audit-artifacts/public/mobile-landing.png' });
  177 |     });
  178 | });
  179 | 
  180 | test.describe('Global Admin OS Dashboard Audit', () => {
  181 |     test.beforeEach(async ({ page }) => {
  182 |         await bypassRouteGuards(page, 'admin', 'mock-admin-uid');
  183 |         await page.goto('/admin/overview');
  184 |     });
  185 | 
  186 |     test('Microscopic Style & Technical Mainboard Check', async ({ page }) => {
  187 |         await page.setViewportSize(viewports.desktop);
  188 | 
  189 |         // Enforce 90-degree square corners on panel card borders
  190 |         const panels = page.locator('.admin-panel, [data-panel]');
  191 |         const count = await panels.count();
  192 |         for (let i = 0; i < count; i++) {
  193 |             const borderRadius = await panels.nth(i).evaluate((el) => window.getComputedStyle(el).borderRadius);
  194 |             expect(borderRadius).toBe('0px');
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
> 213 |         await page.goto('/director/dashboard');
      |                    ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
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
  295 |         await page.goto('/parent/dashboard');
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
```