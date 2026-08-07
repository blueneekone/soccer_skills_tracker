# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\visual-regression-v2.spec.ts >> Commissioner OS - State Federation Command >> State-wide Compliance Matrix and ODP Analytics
- Location: e2e\visual-regression-v2.spec.ts:221:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.status-dot-indicator').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.status-dot-indicator').first()

```

```yaml
- main:
  - button "Report an anomaly or bug": ALPHA
  - complementary "Workspace navigation":
    - text: SSTracker | Nexus Command
    - navigation:
      - link "Home":
        - /url: /
      - link "Settings":
        - /url: /settings
    - paragraph: System actions
    - link "Support / Help Desk":
      - /url: mailto:support@sstracker.app?subject=SSTRACKER%20support
    - button "Report Anomaly"
    - button "Sign out"
  - button "Collapse sidebar" [expanded]
  - strong: Workspace
  - text: / Console
  - button "Open command palette": Search & jump to… ⌘K
  - button "Alerts"
  - button "Settings"
  - text: Test Player FED
  - heading "Federation Command" [level=1]
  - paragraph: "STATUS: ODP ONLINE // MASTER TENANT ACTIVE"
  - text: Network Safety SECURE Nodes 1,024 ACTIVE
  - main:
    - heading "Federation Compliance Matrix" [level=2]
    - paragraph: Live COPPA/SafeSport Status
    - table:
      - rowgroup:
        - row "Club ID Status SafeSport":
          - columnheader "Club ID"
          - columnheader "Status"
          - columnheader "SafeSport"
      - rowgroup
    - heading "Tournament Operations" [level=2]
    - paragraph: Live Multi-Venue Scheduling
    - table:
      - rowgroup:
        - row "Event ID Status Teams":
          - columnheader "Event ID"
          - columnheader "Status"
          - columnheader "Teams"
      - rowgroup:
        - row "tourney-1 LIVE 16":
          - cell "tourney-1"
          - cell "LIVE"
          - cell "16"
        - row "tourney-2 SCHEDULING 32":
          - cell "tourney-2"
          - cell "SCHEDULING"
          - cell "32"
```

# Test source

```ts
  134 |         expect(visibleGoldCount).toBe(1);
  135 |     }
  136 | };
  137 | 
  138 | test.describe('SSTracker Landing Page Visual Audit', () => {
  139 |     test.beforeEach(async ({ page }) => {
  140 |         await page.goto('/');
  141 |     });
  142 | 
  143 |     test('Desktop View - 12-Column Asymmetric Bento Grid', async ({ page }) => {
  144 |         await page.setViewportSize(viewports.desktop);
  145 | 
  146 |         // Validate Headline
  147 |         const headline = page.locator('h1');
  148 |         await expect(headline).toHaveText(/Stop managing teams. Start developing athletes. The Youth Sports OS./i);
  149 | 
  150 |         // Verify 6-4-2 Asymmetric Layout Column Spans
  151 |         const playerCard = page.locator('[data-bento="player"]');
  152 |         const coachCard = page.locator('[data-bento="coach"]');
  153 |         const parentCard = page.locator('[data-bento="parent"]');
  154 | 
  155 |         await expect(playerCard).toHaveClass(/col-span-6|lg:col-span-6/);
  156 |         await expect(coachCard).toHaveClass(/col-span-4|lg:col-span-4/);
  157 |         await expect(parentCard).toHaveClass(/col-span-2|lg:col-span-2/);
  158 | 
  159 |         // Run Microscopic Audits
  160 |         await auditors.assertEdgePadding(page, '.bento-well', 24, 16);
  161 |         await auditors.assertTypographyAndGrammar(page);
  162 |         await auditors.assertColorContrast(page, '.bento-well');
  163 |         await auditors.assertSingleCTA(page);
  164 | 
  165 |         await page.screenshot({ path: 'audit-artifacts/public/desktop-landing.png', fullPage: true });
  166 |     });
  167 | 
  168 |     test('Mobile View - Fluid Single-Column Collapse', async ({ page }) => {
  169 |         await page.setViewportSize(viewports.mobile);
  170 | 
  171 |         // Bento wells should stack vertically in a single column
  172 |         const playerCard = page.locator('[data-bento="player"]');
  173 |         const bounding = await playerCard.boundingBox();
  174 |         const viewportWidth = viewports.mobile.width;
  175 | 
  176 |         if (bounding) {
  177 |             expect(bounding.width).toBeLessThanOrEqual(viewportWidth);
  178 |         }
  179 | 
  180 |         await auditors.assertEdgePadding(page, '.bento-well', 24, 16);
  181 |         await page.screenshot({ path: 'audit-artifacts/public/mobile-landing.png' });
  182 |     });
  183 | });
  184 | 
  185 | test.describe('Global Admin OS Dashboard Audit', () => {
  186 |     test.beforeEach(async ({ page }) => {
  187 |         await bypassRouteGuards(page, 'admin', 'mock-admin-uid');
  188 |         await page.goto('/admin/overview');
  189 |     });
  190 | 
  191 |     test('Microscopic Style & Technical Mainboard Check', async ({ page }) => {
  192 |         await page.setViewportSize(viewports.desktop);
  193 | 
  194 |         // Enforce 90-degree square corners on panel card borders
  195 |         const panels = page.locator('.admin-panel, [data-panel]');
  196 |         const count = await panels.count();
  197 |         for (let i = 0; i < count; i++) {
  198 |             const borderRadius = await panels.nth(i).evaluate((el) => window.getComputedStyle(el).borderRadius);
  199 |             expect(borderRadius).toBe('0px');
  200 |         }
  201 | 
  202 |         // Verify Monospace Font Scaling on KPIs
  203 |         const metricLabels = page.locator('.kpi-metric-val');
  204 |         const countMetrics = await metricLabels.count();
  205 |         for (let i = 0; i < countMetrics; i++) {
  206 |             const fontFamily = await metricLabels.nth(i).evaluate((el) => window.getComputedStyle(el).fontFamily);
  207 |             expect(fontFamily.toLowerCase()).toContain('mono');
  208 |         }
  209 | 
  210 |         await auditors.assertEdgePadding(page, '.admin-panel', 24, 16);
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
> 234 |         await expect(indicatorDots.first()).toBeVisible();
      |                                             ^ Error: expect(locator).toBeVisible() failed
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
```