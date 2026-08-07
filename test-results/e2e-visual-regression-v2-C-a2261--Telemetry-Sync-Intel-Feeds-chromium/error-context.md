# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\visual-regression-v2.spec.ts >> Coach OS - Multi-Page Tactical Audits >> Coach Daily Intel - Telemetry Sync & Intel Feeds
- Location: e2e\visual-regression-v2.spec.ts:321:5

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 24
Received:    16
```

# Page snapshot

```yaml
- main [ref=e4]:
  - button "Report an anomaly or bug" [ref=e5] [cursor=pointer]:
    - generic [ref=e7]: ALPHA
  - generic [ref=e9]:
    - complementary "Workspace navigation" [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e13]:
          - generic [ref=e14]: SSTracker
          - generic [ref=e15]: "|"
          - generic [ref=e16]: Nexus Command
        - navigation [ref=e17]:
          - link "Daily Intel" [ref=e18] [cursor=pointer]:
            - /url: /coach/dashboard
          - link "The Forge" [ref=e21] [cursor=pointer]:
            - /url: /coach/forge
          - link "Field Station" [ref=e24] [cursor=pointer]:
            - /url: /coach/drills
          - link "War Room" [ref=e27] [cursor=pointer]:
            - /url: /coach/tactical
          - link "Match Day" [ref=e30] [cursor=pointer]:
            - /url: /coach/match-day
          - link "Scouting" [ref=e33] [cursor=pointer]:
            - /url: /coach/scouting
          - link "Team Ops" [ref=e36] [cursor=pointer]:
            - /url: /coach/logistics
        - generic [ref=e39]:
          - paragraph [ref=e40]: System actions
          - link "Support / Help Desk" [ref=e41] [cursor=pointer]:
            - /url: mailto:support@sstracker.app?subject=SSTRACKER%20support
          - button "Report Anomaly" [ref=e44] [cursor=pointer]
          - button "Sign out" [ref=e47] [cursor=pointer]
    - generic [ref=e50]:
      - generic [ref=e51]:
        - generic [ref=e52]:
          - button "Collapse sidebar" [expanded] [ref=e53] [cursor=pointer]
          - generic [ref=e55]:
            - strong [ref=e56]: Coach
            - text: / Console
        - button "Open command palette" [ref=e57]:
          - generic [ref=e58]: Search & jump to…
          - generic [ref=e61]: ⌘K
        - generic [ref=e62]:
          - button "Alerts" [ref=e63] [cursor=pointer]
          - button "Settings" [ref=e65] [cursor=pointer]
          - generic [ref=e67]: Test Player
      - generic [ref=e84]:
        - heading "Daily Intel" [level=1] [ref=e85]
        - generic [ref=e86]:
          - heading "Squad Telemetry" [level=2] [ref=e87]
          - generic [ref=e88]:
            - generic [ref=e89]:
              - text: Load
              - generic [ref=e90]: 82%
            - generic [ref=e91]:
              - text: Readiness
              - generic [ref=e92]: 95%
        - generic [ref=e93]:
          - heading "The Forge & Intent Engine (RL Volume)" [level=2] [ref=e94]
          - generic [ref=e95]:
            - generic [ref=e96]:
              - text: Drill Volume Autoregulator
              - generic [ref=e97]:
                - generic [ref=e98]: RL Inference
                - generic [ref=e99]: +12% Intensity
            - generic [ref=e102]:
              - text: ZPD Engine (Dynamic Difficulty)
              - generic [ref=e103]:
                - generic [ref=e104]: Latency
                - generic [ref=e105]: 14ms
              - paragraph [ref=e106]: Vygotsky inference active. Skill boundary scaling applied to central press and transitional width phases.
        - generic [ref=e107]:
          - heading "Active Roster & Operatives" [level=2] [ref=e108]
          - generic [ref=e109]:
            - heading "Roster" [level=2] [ref=e110]
            - paragraph [ref=e111]:
              - text: Import CSV below or add one player at a time on
              - link "Daily Intel" [ref=e112] [cursor=pointer]:
                - /url: /coach/dashboard
              - text: . Linked players with email appear in the list automatically.
            - region [ref=e113]:
              - heading "Import roster" [level=3] [ref=e114]
              - paragraph [ref=e115]: Upload a roster spreadsheet (.csv) or league PDF. Preview rows before committing — linked players appear below automatically.
              - generic [ref=e116]:
                - paragraph [ref=e117]: Drop a .csv or PDF file here or choose a file
                - generic [ref=e118] [cursor=pointer]:
                  - text: Choose file
                  - button "Choose file" [ref=e119]
            - paragraph [ref=e120]: No athletes found on this roster. Ingest using the CSV tool above or manually via Daily Intel.
  - complementary [ref=e121]
  - complementary [ref=e122]:
    - generic [ref=e123]:
      - heading [level=2] [ref=e128]: Alerts
      - button [ref=e129] [cursor=pointer]
    - generic [ref=e132]:
      - paragraph [ref=e134]: No alerts right now.
      - paragraph [ref=e135]: We'll notify you when something needs your attention.
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * SSTracker "Atomic Noir" Microscopic Visual & Layout Testing Suite - Version 2.0
  5   |  * FULL COVERAGE: Audits all 7 personas and all sub-pages across the Youth Sports OS.
  6   |  * Strictly enforces:
  7   |  * - 60-30-10 color taxonomy: Void Black (#000000), Navy Slate (#0f172a / #1e293b), Data Cyan (#14b8a6)
  8   |  * - Microscopic padding checks: minimum 24px (1.5rem) on desktop, 16px (1rem) on mobile
  9   |  * - Standardized typography: Geist Sans (headers), Switzer (body), Geist Mono (data and telemetry)
  10  |  * - Single-CTA rule: Exactly one Action Gold (#fbbf24) primary CTA per viewport
  11  |  * - Persona specific layouts: 
  12  |  *   * 90deg square corners (Admin, Commissioner, Coach, Director)
  13  |  *   * 24px rounded corners (Parent)
  14  |  *   * Chamfered clip-paths (Player)
  15  |  * - Asymmetric 12-column Bento Grid fluid clamping
  16  |  */
  17  | 
  18  | // Viewport profiles matching standard 16:9 widescreen and responsive breakpoints
  19  | const viewports = {
  20  |     desktop: { width: 1280, height: 720 },
  21  |     tablet: { width: 768, height: 1024 },
  22  |     mobile: { width: 375, height: 667 }
  23  | };
  24  | 
  25  | // Helper function to inject authentication JWT into localStorage for unblocked testing
  26  | async function bypassRouteGuards(page: Page, role: string, uid: string = 'mock-test-uid') {
  27  |     await page.addInitScript(({ role, uid }: { role: string, uid: string }) => {
  28  |         window.localStorage.setItem('auth_token', JSON.stringify({
  29  |             uid,
  30  |             email: `${role}-test@sstracker.app`,
  31  |             emailVerified: true
  32  |         }));
  33  |         window.localStorage.setItem('user_profile', JSON.stringify({
  34  |             isProfileComplete: true,
  35  |             role: role,
  36  |             clubId: 'mock-club-123',
  37  |             teamId: 'mock-team-123',
  38  |             playerName: 'Test Player',
  39  |             householdId: 'mock-household-123',
  40  |             vpcStatus: 'verified'
  41  |         }));
  42  |     }, { role, uid });
  43  | }
  44  | 
  45  | // Global Microscopic Auditing Utilities
  46  | const auditors = {
  47  |     // 1. Verify that no text element hugs the container boundary
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
> 67  |             expect(padding.left).toBeGreaterThanOrEqual(minRequired);
      |                                  ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
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
```