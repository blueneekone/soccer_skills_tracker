# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: DIRECTOR OS >> Navigate & Audit: DASHBOARD
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
          - strong [ref=e11]: Director
          - text: / Console
        - generic [ref=e12]:
          - button "Alerts" [ref=e13] [cursor=pointer]
          - button "Settings" [ref=e15] [cursor=pointer]
      - generic [ref=e34]:
        - navigation "Director sections" [ref=e35]:
          - link "Home" [ref=e36] [cursor=pointer]:
            - /url: /director?tab=home
          - link "Roster" [ref=e38] [cursor=pointer]:
            - /url: /director?tab=teams
          - link "Field" [ref=e40] [cursor=pointer]:
            - /url: /director?tab=field
          - link "Comply" [ref=e42] [cursor=pointer]:
            - /url: /director?tab=compliance
          - link "Families" [ref=e44] [cursor=pointer]:
            - /url: /director?tab=household
          - link "Sync" [ref=e46] [cursor=pointer]:
            - /url: /director?tab=sync
        - generic [ref=e47]:
          - region [ref=e48]:
            - generic [ref=e49]:
              - generic [ref=e50]:
                - generic [ref=e51]:
                  - generic [ref=e52]: Director workspace · club operations
                  - heading "Command center" [level=2] [ref=e53]
                  - paragraph [ref=e54]: Firestore KPIs, compliance queues, and club-ops telemetry. Severity bands mirror risk — scroll for queues and charts.
                - generic [ref=e55]:
                  - generic [ref=e56]: Live ingest
                  - generic [ref=e58]: Club scope · client
              - generic "Operations snapshot" [ref=e59]:
                - generic [ref=e60]:
                  - generic [ref=e61]: Open invites
                  - generic [ref=e62]: "0"
                  - generic [ref=e63]: Coach seat pipeline
                - generic [ref=e64]:
                  - generic [ref=e65]: Teams
                  - generic [ref=e66]: "0"
                  - generic [ref=e67]: Containers in club
                - generic [ref=e68]:
                  - generic [ref=e69]: Seat draw
                  - generic [ref=e70]: —
                  - generic [ref=e71]: Utilization vs cap
                - generic [ref=e72]:
                  - generic [ref=e73]: Orchestration
                  - generic [ref=e74]: Clear
                  - generic [ref=e75]: Coach invites · inbox workflows
              - generic [ref=e76]:
                - heading "Director command center" [level=2] [ref=e77]
                - generic [ref=e78]:
                  - article [ref=e79]:
                    - generic [ref=e80]:
                      - generic [ref=e81]: Teams
                      - generic [ref=e82]: —
                    - generic [ref=e83]: "0"
                    - generic [ref=e84]: Program containers
                  - article [ref=e85]:
                    - generic [ref=e86]:
                      - generic [ref=e87]: Pending invites
                      - generic [ref=e88]: —
                    - generic [ref=e89]: "0"
                    - generic [ref=e90]: Coach seats
                  - article [ref=e91]:
                    - generic [ref=e92]:
                      - generic [ref=e93]: Active seats
                      - generic [ref=e94]: —
                    - generic [ref=e95]: "0"
                    - generic [ref=e96]: Billing draw
                  - article [ref=e97]:
                    - generic [ref=e98]:
                      - generic [ref=e99]: Seat cap
                      - generic [ref=e100]: —
                    - generic [ref=e101]: —
                    - generic [ref=e102]: License entitlement
                  - article [ref=e103]:
                    - generic [ref=e104]:
                      - generic [ref=e105]: Utilization
                      - generic [ref=e106]: —
                    - generic [ref=e107]: —
                    - generic [ref=e108]: Active / cap
                - generic [ref=e109]:
                  - generic [ref=e110]:
                    - generic "Priority actions inbox" [ref=e112]:
                      - heading "Priority actions" [level=2] [ref=e113]
                      - paragraph [ref=e114]: Loading…
                    - region [ref=e115]:
                      - generic [ref=e116]:
                        - generic [ref=e117]: platform fees · ytd
                        - heading "Revenue ledger" [level=3] [ref=e118]
                        - paragraph [ref=e119]: Vanguard charges only when money moves through the platform. Below is what your club has run year-to-date.
                      - paragraph [ref=e120]: Loading ledger…
                    - generic [ref=e121]:
                      - generic [ref=e125]:
                        - heading "PAYMENT RECOVERY SHOWCASE" [level=3] [ref=e126]
                        - paragraph [ref=e127]: Empathetic Lapsed Payment Assistant
                      - generic [ref=e128]: Scanning for lapsed payments...
                    - generic [ref=e132]:
                      - heading "🎟 Event Reconciliation" [level=3] [ref=e133]
                      - link "Manage Events →" [ref=e134] [cursor=pointer]:
                        - /url: /director/events
                  - generic [ref=e137]:
                    - generic [ref=e138]:
                      - generic [ref=e139]: Consent audit
                      - region [ref=e142]:
                        - generic [ref=e143]:
                          - generic [ref=e144]:
                            - paragraph [ref=e145]: COPPA · CONSENT AUDIT
                            - heading "Verified minor consent records" [level=3] [ref=e146]
                          - generic [ref=e147]: 0 RECORDS
                        - paragraph [ref=e148]: No consent records for this club yet. Parents finalize VPC in Parent OS — no director approval required.
                    - generic [ref=e149]:
                      - generic [ref=e150]:
                        - heading "🏨 Hotel Rebates" [level=3] [ref=e151]
                        - generic [ref=e152]: Read-only — contact platform support to dispute.
                      - generic [ref=e153]:
                        - button "Pending 0 $0.00" [ref=e154] [cursor=pointer]:
                          - generic [ref=e155]: Pending
                          - generic [ref=e156]: "0"
                          - generic [ref=e157]: $0.00
                        - button "Approved 0 $0.00" [ref=e158] [cursor=pointer]:
                          - generic [ref=e159]: Approved
                          - generic [ref=e160]: "0"
                          - generic [ref=e161]: $0.00
                        - button "Paid Out 0 $0.00" [ref=e162] [cursor=pointer]:
                          - generic [ref=e163]: Paid Out
                          - generic [ref=e164]: "0"
                          - generic [ref=e165]: $0.00
                    - generic [ref=e171]:
                      - heading "Coach accountability" [level=3] [ref=e172]
                      - paragraph [ref=e173]: Practice logging signals from athlete-submitted reps. Teams bucketed by days since last log.
          - generic [ref=e174]:
            - generic [ref=e175]:
              - heading "Revenue Engine" [level=3] [ref=e177]
              - generic [ref=e179]: Club Revenue Analytics Offline
            - generic [ref=e180]:
              - heading "Roster Hierarchy" [level=3] [ref=e182]
              - generic [ref=e184]: God-Mode Tree Offline
    - complementary [ref=e185]
    - complementary [ref=e186]:
      - generic [ref=e187]:
        - heading [level=2] [ref=e192]: Alerts
        - button [ref=e193] [cursor=pointer]
      - generic [ref=e196]:
        - paragraph [ref=e198]: No alerts right now.
        - paragraph [ref=e199]: We'll notify you when something needs your attention.
  - iframe [ref=e201]:
    
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