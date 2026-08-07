# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: ADMIN OS >> Navigate & Audit: OVERVIEW
- Location: tests\visual-regression-v5.spec.ts:177:7

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