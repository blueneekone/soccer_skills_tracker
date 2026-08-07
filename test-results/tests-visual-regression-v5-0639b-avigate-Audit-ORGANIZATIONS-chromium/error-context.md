# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: ADMIN OS >> Navigate & Audit: ORGANIZATIONS
- Location: tests\visual-regression-v5.spec.ts:177:7

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
        - alert [ref=e119]: Missing or insufficient permissions.
        - table "Organizations" [ref=e122]:
          - rowgroup [ref=e123]:
            - row [ref=e124]:
              - columnheader "Logo" [ref=e125]
              - columnheader "Organization" [ref=e126]
              - columnheader "Sport" [ref=e127]
              - columnheader "License" [ref=e128]
              - columnheader "Director" [ref=e129]
              - columnheader "Compliance" [ref=e130]
              - columnheader "Actions" [ref=e131]
          - rowgroup [ref=e132]:
            - row [ref=e133]:
              - cell "No organizations registered yet." [ref=e134]
  - complementary [ref=e135]
  - complementary [ref=e136]:
    - generic [ref=e137]:
      - heading [level=2] [ref=e142]: Alerts
      - button [ref=e143] [cursor=pointer]
    - generic [ref=e146]:
      - paragraph [ref=e148]: No alerts right now.
      - paragraph [ref=e149]: We'll notify you when something needs your attention.
```

# Test source

```ts
  88  |   // 1. Assert No Horizontal Scroll Overflow
  89  |   const overflowX = await page.evaluate(() => window.scrollX);
  90  |   expect(overflowX).toBe(0);
  91  | 
  92  |   const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  93  |   const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  94  |   expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  95  | 
  96  |   // 2. Bento Grid 2D Collision Check (Ensure no layout overlapping coordinates)
  97  |   const gridChildren = page.locator('.tw-grid > *, .st-bento > *, [class*=\"Bento\"] > *');
  98  |   const count = await gridChildren.count();
  99  |   const bboxes = [];
  100 |   for (let i = 0; i < count; i++) {
  101 |     const box = await gridChildren.nth(i).boundingBox();
  102 |     if (box) {
  103 |       bboxes.push({ id: i, ...box });
  104 |     }
  105 |   }
  106 | 
  107 |   for (let i = 0; i < bboxes.length; i++) {
  108 |     for (let j = i + 1; j < bboxes.length; j++) {
  109 |       const a = bboxes[i];
  110 |       const b = bboxes[j];
  111 |       const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  112 |       const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  113 |       if (overlapX > 1 && overlapY > 1) {
  114 |         const classA = await gridChildren.nth(i).evaluate(el => el.className);
  115 |         const classB = await gridChildren.nth(j).evaluate(el => el.className);
  116 |         throw new Error(`[COLLISION DETECTED] Element ${a.id} (${classA}) overlaps Element ${b.id} (${classB}) on route: ${routeName}`);
  117 |       }
  118 |     }
  119 |   }
  120 | 
  121 |   // 3. Text Truncation / Clipping Checks
  122 |   const clips = await page.evaluate(() => {
  123 |     const elements = Array.from(document.querySelectorAll('.tw-font-mono, h1, h2, h3, p'));
  124 |     return elements.some(el => el.scrollWidth > el.clientWidth && window.getComputedStyle(el).overflow === 'hidden');
  125 |   });
  126 |   if (clips) {
  127 |     console.warn(`[WARNING] Silent text clipping/truncation observed on route: ${routeName}`);
  128 |   }
  129 | }
  130 | 
  131 | /**
  132 |  * Interactive hover and tooltip assertions with kinetic delay handling.
  133 |  */
  134 | async function verifyInteractiveHoverState(page: any, selector: string) {
  135 |   const elements = page.locator(selector);
  136 |   const count = await elements.count();
  137 |   if (count > 0) {
  138 |     const targetElement = elements.first();
  139 |     await targetElement.scrollIntoViewIfNeeded();
  140 |     await targetElement.hover();
  141 |     
  142 |     // Wait for the mandated 150-250ms kinetic transition window
  143 |     await page.waitForTimeout(250);
  144 | 
  145 |     // Verify visual color transition shifts cleanly to a compliant accent
  146 |     const computedColor = await targetElement.evaluate((el: any) => window.getComputedStyle(el).color);
  147 |     expect(COMPLIANT_HOVER_COLORS).toContain(computedColor);
  148 |   }
  149 | }
  150 | 
  151 | // Ensure the local screenshots folder exists securely
  152 | const artifactsDir = join(process.cwd(), 'audit-artifacts');
  153 | if (!existsSync(artifactsDir)) {
  154 |   mkdirSync(artifactsDir, { recursive: true });
  155 | }
  156 | 
  157 | // Generate sequential traversal specs for each persona
  158 | for (const [personaName, persona] of Object.entries(PERSONAS)) {
  159 |   test.describe(`EPIC COMPREHENSIVE TRAVERSAL: ${personaName.toUpperCase()} OS`, () => {
  160 |     
  161 |     test.beforeEach(async ({ page }) => {
  162 |       page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  163 |       page.on('pageerror', err => console.error(`[Browser Error] ${err.name}: ${err.message}`, err.stack));
  164 | 
  165 |       // Zero-Touch CSO Protocol: Inject authenticated state directly before page loads
  166 |       await page.addInitScript((p) => {
  167 |         window.localStorage.setItem('auth_state', JSON.stringify({
  168 |           uid: p.uid,
  169 |           isAuthenticated: true,
  170 |           role: p.role,
  171 |           clubId: p.clubId
  172 |         }));
  173 |       }, persona);
  174 |     });
  175 | 
  176 |     for (const route of persona.routes) {
  177 |       test(`Navigate & Audit: ${route.name.toUpperCase()}`, async ({ page }) => {
  178 |         // Create isolated folders for each target review segment
  179 |         const personaDir = join(artifactsDir, personaName);
  180 |         if (!existsSync(personaDir)) {
  181 |           mkdirSync(personaDir, { recursive: true });
  182 |         }
  183 | 
  184 |         // 1. Navigate directly to the target route using fast load gating (bypass gRPC networkidle lock)
  185 |         await page.goto(route.path, { waitUntil: 'load' });
  186 | 
  187 |         // 2. Wait explicitly for the Svelte 5 DOM and page elements to hydrate
> 188 |         await page.waitForSelector(route.waitSelector, { state: 'visible', timeout: 10000 });
      |                    ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  189 |         await page.waitForTimeout(300); // Allow reactivity and animations to settle
  190 | 
  191 |         // 3. Assert no unstyled light-mode flash exists (Void Black/Navy Slate only)
  192 |         const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  193 |         expect(bg).not.toBe('rgb(255, 255, 255)');
  194 | 
  195 |         // 4. Run coordinate box layout overlap calculations
  196 |         await runMicroscopicLayoutAssertions(page, route.name);
  197 | 
  198 |         // 5. Perform active hover style validation against brand links
  199 |         await verifyInteractiveHoverState(page, '.vanguard-link, .pd-nav-link, .st-bento a:not(.quest-hero__cta)');
  200 | 
  201 |         // 6. Deposit visual proof screenshot directly into audit-artifacts/
  202 |         const screenshotPath = join(personaDir, `${route.name}-desktop.png`);
  203 |         await page.screenshot({ path: screenshotPath, fullPage: true });
  204 |         console.log(`[VISUAL AUDIT PASSED] Screenshot exported to: ${screenshotPath}`);
  205 |       });
  206 |     }
  207 |   });
  208 | }
  209 | 
```