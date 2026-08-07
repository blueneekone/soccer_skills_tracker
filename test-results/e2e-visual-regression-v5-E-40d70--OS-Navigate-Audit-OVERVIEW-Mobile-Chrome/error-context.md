# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: ADMIN OS >> Navigate & Audit: OVERVIEW
- Location: e2e\visual-regression-v5.spec.ts:164:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.pd-page-root, .st-bento') to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e4]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e10]:
          - strong [ref=e11]: Global Admin
          - text: / Console
        - generic [ref=e12]:
          - button "Alerts" [ref=e13] [cursor=pointer]
          - button "Settings" [ref=e15] [cursor=pointer]
      - generic [ref=e34]:
        - generic [ref=e36]:
          - generic [ref=e41]:
            - heading "Nexus Command" [level=1] [ref=e42]
            - paragraph [ref=e43]: "SYSTEM_STATUS: ONLINE"
          - navigation [ref=e44]:
            - button "Overview" [ref=e45]
            - button "Security" [ref=e46]
            - button "Platform" [ref=e47]
        - main [ref=e48]:
          - generic [ref=e49]:
            - generic [ref=e50]:
              - generic [ref=e51]:
                - generic [ref=e52]: Total Organizations
                - generic [ref=e53]: "0"
              - generic [ref=e54]:
                - generic [ref=e55]: Total Users
                - generic [ref=e56]: "0"
              - generic [ref=e57]:
                - generic [ref=e58]: Active Incidents
                - generic [ref=e59]: "0"
              - generic [ref=e60]:
                - generic [ref=e61]: System Status
                - generic [ref=e62]: NOMINAL
            - generic [ref=e63]:
              - generic [ref=e64]:
                - heading "Global Activity Matrix" [level=3] [ref=e65]
                - generic [ref=e66]: "[VISUALIZATION_PENDING]"
              - generic [ref=e69]:
                - heading "Recent Org Registrations" [level=3] [ref=e70]
                - generic [ref=e71]: NO_DATA
            - generic [ref=e73]:
              - generic [ref=e74]:
                - heading "Global Telemetry Feed" [level=3] [ref=e75]
                - generic [ref=e76]: Stream Offline
              - generic [ref=e77]:
                - heading "System Health Diagnostics" [level=3] [ref=e78]
                - generic [ref=e79]: All Systems Nominal
    - complementary [ref=e80]
    - complementary [ref=e81]:
      - generic [ref=e82]:
        - heading [level=2] [ref=e87]: Alerts
        - button [ref=e88] [cursor=pointer]
      - generic [ref=e91]:
        - paragraph [ref=e93]: No alerts right now.
        - paragraph [ref=e94]: We'll notify you when something needs your attention.
  - iframe [ref=e96]:
    
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