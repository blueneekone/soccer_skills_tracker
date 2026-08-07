# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: ADMIN OS >> Navigate & Audit: ORGANIZATIONS
- Location: e2e\visual-regression-v5.spec.ts:164:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.pd-page-root') to be visible

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
          - link "Overview" [ref=e18] [cursor=pointer]:
            - /url: /admin/overview
          - link "Organizations" [ref=e21] [cursor=pointer]:
            - /url: /admin/organizations
          - link "Global Users" [ref=e24] [cursor=pointer]:
            - /url: /admin/users
          - link "Recruiters" [ref=e27] [cursor=pointer]:
            - /url: /admin/recruiters
          - link "Coach clearance" [ref=e30] [cursor=pointer]:
            - /url: /admin/coach-clearance
          - link "Audit Log" [ref=e33] [cursor=pointer]:
            - /url: /admin/audit-log
          - link "System Settings" [ref=e36] [cursor=pointer]:
            - /url: /admin/system-settings
          - link "Support Terminal" [ref=e39] [cursor=pointer]:
            - /url: /admin/support-terminal
          - link "Data Sync" [ref=e42] [cursor=pointer]:
            - /url: /admin/interoperability
        - generic [ref=e44]:
          - paragraph [ref=e45]: System actions
          - link "Support / Help Desk" [ref=e46] [cursor=pointer]:
            - /url: mailto:support@sstracker.app?subject=SSTRACKER%20support
          - button "Report Anomaly" [ref=e49] [cursor=pointer]
          - button "Sign out" [ref=e52] [cursor=pointer]
    - generic [ref=e55]:
      - generic [ref=e56]:
        - generic [ref=e57]:
          - button "Collapse sidebar" [expanded] [ref=e58] [cursor=pointer]
          - generic [ref=e60]:
            - strong [ref=e61]: Global Admin
            - text: / Console
        - button "Open command palette" [ref=e62]:
          - generic [ref=e63]: Search & jump to…
          - generic [ref=e66]: ⌘K
        - generic [ref=e67]:
          - button "Alerts" [ref=e68] [cursor=pointer]
          - button "Settings" [ref=e70] [cursor=pointer]
          - generic [ref=e72]: Account
      - generic [ref=e92]:
        - generic [ref=e93]:
          - generic [ref=e94]:
            - generic [ref=e95]:
              - heading "Organizations" [level=1] [ref=e96]
              - generic [ref=e97]: Organization › Program › Team › Roster
            - generic [ref=e98]:
              - generic [ref=e99]: "0"
              - generic [ref=e100]: OF 0 TOTAL
          - generic [ref=e101]:
            - searchbox "Filter organizations" [ref=e106]
            - generic [ref=e107]:
              - button "Enterprise Filter" [ref=e109] [cursor=pointer]
              - button "Import via Stack Sports API" [ref=e112] [cursor=pointer]
              - button "Add Organization" [ref=e114] [cursor=pointer]
        - tablist [ref=e116]:
          - tab "All" [selected] [ref=e117]
        - table "Organizations" [ref=e120]:
          - rowgroup [ref=e121]:
            - row [ref=e122]:
              - columnheader "Logo" [ref=e123]
              - columnheader "Organization" [ref=e124]
              - columnheader "Sport" [ref=e125]
              - columnheader "License" [ref=e126]
              - columnheader "Director" [ref=e127]
              - columnheader "Compliance" [ref=e128]
              - columnheader "Actions" [ref=e129]
          - rowgroup [ref=e130]:
            - row [ref=e131]:
              - cell "No organizations registered yet." [ref=e132]
  - complementary [ref=e133]
  - complementary [ref=e134]:
    - generic [ref=e135]:
      - heading [level=2] [ref=e140]: Alerts
      - button [ref=e141] [cursor=pointer]
    - generic [ref=e144]:
      - paragraph [ref=e146]: No alerts right now.
      - paragraph [ref=e147]: We'll notify you when something needs your attention.
```

# Test source

```ts
  75  | 
  76  | /**
  77  |  * Programmatic visual inspection assertions for 2D bounding boxes and CSS.
  78  |  */
  79  | async function runMicroscopicLayoutAssertions(page: any, routeName: string) {
  80  |   // 1. Assert No Horizontal Scroll Overflow
  81  |   const overflowX = await page.evaluate(() => window.scrollX);
  82  |   expect(overflowX).toBe(0);
  83  | 
  84  |   const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  85  |   const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  86  |   expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  87  | 
  88  |   // 2. Bento Grid 2D Collision Check (Ensure no layout overlapping coordinates)
  89  |   const gridChildren = page.locator('.tw-grid > *, .st-bento > *, [class*=\"Bento\"] > *');
  90  |   const count = await gridChildren.count();
  91  |   const bboxes = [];
  92  |   for (let i = 0; i < count; i++) {
  93  |     const box = await gridChildren.nth(i).boundingBox();
  94  |     if (box) {
  95  |       bboxes.push({ id: i, ...box });
  96  |     }
  97  |   }
  98  | 
  99  |   for (let i = 0; i < bboxes.length; i++) {
  100 |     for (let j = i + 1; j < bboxes.length; j++) {
  101 |       const a = bboxes[i];
  102 |       const b = bboxes[j];
  103 |       const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  104 |       const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  105 |       if (overlapX > 1 && overlapY > 1) {
  106 |         throw new Error(`[COLLISION DETECTED] Element ${a.id} overlaps Element ${b.id} on route: ${routeName}`);
  107 |       }
  108 |     }
  109 |   }
  110 | 
  111 |   // 3. Text Truncation / Clipping Checks
  112 |   const clips = await page.evaluate(() => {
  113 |     const elements = Array.from(document.querySelectorAll('.tw-font-mono, h1, h2, h3, p'));
  114 |     return elements.some(el => el.scrollWidth > el.clientWidth && window.getComputedStyle(el).overflow === 'hidden');
  115 |   });
  116 |   if (clips) {
  117 |     console.warn(`[WARNING] Silent text clipping/truncation observed on route: ${routeName}`);
  118 |   }
  119 | }
  120 | 
  121 | /**
  122 |  * Interactive hover and tooltip assertions with kinetic delay handling.
  123 |  */
  124 | async function verifyInteractiveHoverState(page: any, selector: string) {
  125 |   const elements = page.locator(selector);
  126 |   const count = await elements.count();
  127 |   if (count > 0) {
  128 |     const targetElement = elements.first();
  129 |     await targetElement.scrollIntoViewIfNeeded();
  130 |     await targetElement.hover();
  131 |     
  132 |     // Wait for the mandated 150-250ms kinetic transition window
  133 |     await page.waitForTimeout(250);
  134 | 
  135 |     // Verify visual color transition shifts cleanly to a compliant accent
  136 |     const computedColor = await targetElement.evaluate((el: any) => window.getComputedStyle(el).color);
  137 |     expect(COMPLIANT_HOVER_COLORS).toContain(computedColor);
  138 |   }
  139 | }
  140 | 
  141 | // Ensure the local screenshots folder exists securely
  142 | const artifactsDir = join(process.cwd(), 'audit-artifacts');
  143 | if (!existsSync(artifactsDir)) {
  144 |   mkdirSync(artifactsDir, { recursive: true });
  145 | }
  146 | 
  147 | // Generate sequential traversal specs for each persona
  148 | for (const [personaName, persona] of Object.entries(PERSONAS)) {
  149 |   test.describe(`EPIC COMPREHENSIVE TRAVERSAL: ${personaName.toUpperCase()} OS`, () => {
  150 |     
  151 |     test.beforeEach(async ({ page }) => {
  152 |       // Zero-Touch CSO Protocol: Inject authenticated state directly before page loads
  153 |       await page.addInitScript((p) => {
  154 |         window.localStorage.setItem('auth_state', JSON.stringify({
  155 |           uid: p.uid,
  156 |           isAuthenticated: true,
  157 |           role: p.role,
  158 |           clubId: p.clubId
  159 |         }));
  160 |       }, persona);
  161 |     });
  162 | 
  163 |     for (const route of persona.routes) {
  164 |       test(`Navigate & Audit: ${route.name.toUpperCase()}`, async ({ page }) => {
  165 |         // Create isolated folders for each target review segment
  166 |         const personaDir = join(artifactsDir, personaName);
  167 |         if (!existsSync(personaDir)) {
  168 |           mkdirSync(personaDir, { recursive: true });
  169 |         }
  170 | 
  171 |         // 1. Navigate directly to the target route using fast load gating (bypass gRPC networkidle lock)
  172 |         await page.goto(route.path, { waitUntil: 'load' });
  173 | 
  174 |         // 2. Wait explicitly for the Svelte 5 DOM and page elements to hydrate
> 175 |         await page.waitForSelector(route.waitSelector, { state: 'visible', timeout: 10000 });
      |                    ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  176 |         await page.waitForTimeout(300); // Allow reactivity and animations to settle
  177 | 
  178 |         // 3. Assert no unstyled light-mode flash exists (Void Black/Navy Slate only)
  179 |         const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  180 |         expect(bg).not.toBe('rgb(255, 255, 255)');
  181 | 
  182 |         // 4. Run coordinate box layout overlap calculations
  183 |         await runMicroscopicLayoutAssertions(page, route.name);
  184 | 
  185 |         // 5. Perform active hover style validation against brand links
  186 |         await verifyInteractiveHoverState(page, '.vanguard-link, .pd-nav-link, .st-bento a:not(.quest-hero__cta)');
  187 | 
  188 |         // 6. Deposit visual proof screenshot directly into audit-artifacts/
  189 |         const screenshotPath = join(personaDir, `${route.name}-desktop.png`);
  190 |         await page.screenshot({ path: screenshotPath, fullPage: true });
  191 |         console.log(`[VISUAL AUDIT PASSED] Screenshot exported to: ${screenshotPath}`);
  192 |       });
  193 |     }
  194 |   });
  195 | }
  196 | 
```