# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-regression.spec.ts >> SSTracker Landing Page Visual Audit >> Desktop View - 12-Column Asymmetric Bento Grid
- Location: visual-regression.spec.ts:136:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  33  |         }));
  34  |     }, { role, uid });
  35  | }
  36  | 
  37  | // Global Microscopic Auditing Utilities
  38  | const auditors = {
  39  |     // 1. Verify that no text element hugs the container boundary
  40  |     async assertEdgePadding(page, containerSelector, minPaddingDesktop = 24, minPaddingMobile = 16) {
  41  |         const containers = page.locator(containerSelector);
  42  |         const count = await containers.count();
  43  | 
  44  |         for (let i = 0; i < count; i++) {
  45  |             const element = containers.nth(i);
  46  |             const padding = await element.evaluate((el) => {
  47  |                 const style = window.getComputedStyle(el);
  48  |                 return {
  49  |                     left: parseFloat(style.paddingLeft),
  50  |                     right: parseFloat(style.paddingRight),
  51  |                     top: parseFloat(style.paddingTop),
  52  |                     bottom: parseFloat(style.paddingBottom)
  53  |                 };
  54  |             });
  55  | 
  56  |             const isMobile = page.viewportSize()?.width < 768;
  57  |             const minRequired = isMobile ? minPaddingMobile : minPaddingDesktop;
  58  | 
  59  |             expect(padding.left).toBeGreaterThanOrEqual(minRequired);
  60  |             expect(padding.right).toBeGreaterThanOrEqual(minRequired);
  61  |         }
  62  |     },
  63  | 
  64  |     // 2. Audit copy grammar, font family, and period placement
  65  |     async assertTypographyAndGrammar(page) {
  66  |         // Audit Headers
  67  |         const headers = page.locator('h1, h2, h3, h4, h5');
  68  |         const headerCount = await headers.count();
  69  |         for (let i = 0; i < headerCount; i++) {
  70  |             const header = headers.nth(i);
  71  |             const computed = await header.evaluate((el) => {
  72  |                 const style = window.getComputedStyle(el);
  73  |                 return {
  74  |                     fontFamily: style.fontFamily,
  75  |                     textTransform: style.textTransform
  76  |                 };
  77  |             });
  78  |             // Headers should use Geist Sans font family
  79  |             expect(computed.fontFamily.toLowerCase()).toContain('geist');
  80  |         }
  81  | 
  82  |         // Audit Telemetry / Numbers (must use Geist Mono)
  83  |         const telemetryElements = page.locator('.telemetry-data, .font-mono, [data-telemetry]');
  84  |         const telemetryCount = await telemetryElements.count();
  85  |         for (let i = 0; i < telemetryCount; i++) {
  86  |             const element = telemetryElements.nth(i);
  87  |             const fontFamily = await element.evaluate((el) => window.getComputedStyle(el).fontFamily);
  88  |             expect(fontFamily.toLowerCase()).toContain('mono');
  89  |         }
  90  | 
  91  |         // Audit CTA labels for trailing periods (Prohibited on CTAs)
  92  |         const ctas = page.locator('button, .btn, .cta-button');
  93  |         const ctaCount = await ctas.count();
  94  |         for (let i = 0; i < ctaCount; i++) {
  95  |             const text = await ctas.nth(i).innerText();
  96  |             expect(text.trim().endsWith('.')).toBe(false);
  97  |         }
  98  |     },
  99  | 
  100 |     // 3. Enforce strict Nuclear Americana color rules
  101 |     async assertColorContrast(page, cardSelector) {
  102 |         const pageBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  103 |         // Main canvas MUST resolve to pure Void Black
  104 |         expect(pageBg === 'rgb(0, 0, 0)' || pageBg === '#000000' || pageBg === 'black').toBe(true);
  105 | 
  106 |         const cards = page.locator(cardSelector);
  107 |         const count = await cards.count();
  108 |         if (count > 0) {
  109 |             const cardBg = await cards.first().evaluate((el) => window.getComputedStyle(el).backgroundColor);
  110 |             // Cards/Panels must be in the Navy Slate spectrum
  111 |             expect(cardBg).toMatch(/rgb\((15|30), (23|41), (42|59)\)/); // matches #0f172a or #1e293b
  112 |         }
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
> 133 |         await page.goto('/');
      |                    ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
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
```