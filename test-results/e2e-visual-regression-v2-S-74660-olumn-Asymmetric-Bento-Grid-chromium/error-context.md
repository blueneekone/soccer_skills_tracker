# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\visual-regression-v2.spec.ts >> SSTracker Landing Page Visual Audit >> Desktop View - 12-Column Asymmetric Bento Grid
- Location: e2e\visual-regression-v2.spec.ts:143:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('h1')
Expected pattern: /Stop managing teams. Start developing athletes. The Youth Sports OS./i
Received string:  "Focus on development, not just management."
Timeout: 5000ms

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('h1')
    13 × locator resolved to <h1 class="tw-text-4xl md:tw-text-5xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-leading-[1.05] tw-max-w-4xl s--zsgoZJfXwoG">Focus on development, not just management.</h1>
       - unexpected value "Focus on development, not just management."

```

```yaml
- heading "Focus on development, not just management." [level=1]
```

# Test source

```ts
  48  |     async assertEdgePadding(page: Page, containerSelector: string, minPaddingDesktop = 24, minPaddingMobile = 16) {
  49  |         const containers = page.locator(containerSelector);
  50  |         const count = await containers.count();
  51  | 
  52  |         for (let i = 0; i < count; i++) {
  53  |             const element = containers.nth(i);
  54  |             const padding = await element.evaluate((el: Element) => {
  55  |                 const style = window.getComputedStyle(el);
  56  |                 return {
  57  |                     left: parseFloat(style.paddingLeft),
  58  |                     right: parseFloat(style.paddingRight),
  59  |                     top: parseFloat(style.paddingTop),
  60  |                     bottom: parseFloat(style.paddingBottom)
  61  |                 };
  62  |             });
  63  | 
  64  |             const isMobile = page.viewportSize()?.width < 768;
  65  |             const minRequired = isMobile ? minPaddingMobile : minPaddingDesktop;
  66  | 
  67  |             expect(padding.left).toBeGreaterThanOrEqual(minRequired);
  68  |             expect(padding.right).toBeGreaterThanOrEqual(minRequired);
  69  |         }
  70  |     },
  71  | 
  72  |     // 2. Audit copy grammar, font family, and period placement
  73  |     async assertTypographyAndGrammar(page: Page) {
  74  |         // Audit Headers
  75  |         const headers = page.locator('h1, h2, h3, h4, h5');
  76  |         const headerCount = await headers.count();
  77  |         for (let i = 0; i < headerCount; i++) {
  78  |             const header = headers.nth(i);
  79  |             const computed = await header.evaluate((el: Element) => {
  80  |                 const style = window.getComputedStyle(el);
  81  |                 return {
  82  |                     fontFamily: style.fontFamily,
  83  |                     textTransform: style.textTransform
  84  |                 };
  85  |             });
  86  |             // Headers should use Geist Sans font family
  87  |             expect(computed.fontFamily.toLowerCase()).toContain('geist');
  88  |         }
  89  | 
  90  |         // Audit Telemetry / Numbers (must use Geist Mono)
  91  |         const telemetryElements = page.locator('.telemetry-data, .font-mono, [data-telemetry]');
  92  |         const telemetryCount = await telemetryElements.count();
  93  |         for (let i = 0; i < telemetryCount; i++) {
  94  |             const element = telemetryElements.nth(i);
  95  |             const fontFamily = await element.evaluate((el: Element) => window.getComputedStyle(el).fontFamily);
  96  |             expect(fontFamily.toLowerCase()).toContain('mono');
  97  |         }
  98  | 
  99  |         // Audit CTA labels for trailing periods (Prohibited on CTAs)
  100 |         const ctas = page.locator('button, .btn, .cta-button');
  101 |         const ctaCount = await ctas.count();
  102 |         for (let i = 0; i < ctaCount; i++) {
  103 |             const text = await ctas.nth(i).innerText();
  104 |             expect(text.trim().endsWith('.')).toBe(false);
  105 |         }
  106 |     },
  107 | 
  108 |     // 3. Enforce strict Nuclear Americana color rules
  109 |     async assertColorContrast(page: Page, cardSelector: string) {
  110 |         const pageBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  111 |         // Main canvas MUST resolve to pure Void Black
  112 |         expect(pageBg === 'rgb(0, 0, 0)' || pageBg === '#000000' || pageBg === 'black').toBe(true);
  113 | 
  114 |         const cards = page.locator(cardSelector);
  115 |         const count = await cards.count();
  116 |         if (count > 0) {
  117 |             const cardBg = await cards.first().evaluate((el: Element) => window.getComputedStyle(el).backgroundColor);
  118 |             // Cards/Panels must be in the Navy Slate spectrum
  119 |             expect(cardBg).toMatch(/rgb\((15|30), (23|41), (42|59)\)/); // matches #0f172a or #1e293b
  120 |         }
  121 |     },
  122 | 
  123 |     // 4. Assert exactly one active primary Action Gold CTA in the viewport (For Player / Fan OS)
  124 |     async assertSingleCTA(page: Page) {
  125 |         const goldCtas = page.locator('button.bg-gold, .btn-primary, [data-primary-cta]');
  126 |         const count = await goldCtas.count();
  127 | 
  128 |         let visibleGoldCount = 0;
  129 |         for (let i = 0; i < count; i++) {
  130 |             if (await goldCtas.nth(i).isVisible()) {
  131 |                 visibleGoldCount++;
  132 |             }
  133 |         }
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
> 148 |         await expect(headline).toHaveText(/Stop managing teams. Start developing athletes. The Youth Sports OS./i);
      |                                ^ Error: expect(locator).toHaveText(expected) failed
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
```