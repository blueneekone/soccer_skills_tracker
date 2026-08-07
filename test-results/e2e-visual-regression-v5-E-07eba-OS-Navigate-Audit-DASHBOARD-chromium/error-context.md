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
            - /url: /director?tab=home
          - link "Roster & Teams" [ref=e21] [cursor=pointer]:
            - /url: /director?tab=teams
          - link "Field Ops" [ref=e24] [cursor=pointer]:
            - /url: /director?tab=field
          - link "Comms" [ref=e27] [cursor=pointer]:
            - /url: /director?tab=comms
          - link "Registrars" [ref=e30] [cursor=pointer]:
            - /url: /director?tab=registrars
          - link "Club Branding" [ref=e33] [cursor=pointer]:
            - /url: /director?tab=brand
          - link "Playbook" [ref=e36] [cursor=pointer]:
            - /url: /director?tab=playbook
          - link "Licenses & Seats" [ref=e39] [cursor=pointer]:
            - /url: /director?tab=licenses
          - link "Player passports" [ref=e42] [cursor=pointer]:
            - /url: /director?tab=compliance
          - link "Staff clearance" [ref=e45] [cursor=pointer]:
            - /url: /director/compliance
          - link "Households & COPPA" [ref=e48] [cursor=pointer]:
            - /url: /director?tab=household
          - link "Mission Control" [ref=e51] [cursor=pointer]:
            - /url: /director?tab=vanguard
          - link "Retention & PII" [ref=e54] [cursor=pointer]:
            - /url: /director?tab=retention
          - link "Tournaments" [ref=e57] [cursor=pointer]:
            - /url: /director/events
          - link "Data Sync" [ref=e60] [cursor=pointer]:
            - /url: /director?tab=sync
          - paragraph [ref=e62]: Billing
          - link "Plans & Billing" [ref=e63] [cursor=pointer]:
            - /url: /upgrade
        - generic [ref=e66]:
          - paragraph [ref=e67]: System actions
          - link "Support / Help Desk" [ref=e68] [cursor=pointer]:
            - /url: mailto:support@sstracker.app?subject=SSTRACKER%20support
          - button "Report Anomaly" [ref=e71] [cursor=pointer]
          - button "Sign out" [ref=e74] [cursor=pointer]
    - generic [ref=e77]:
      - generic [ref=e78]:
        - generic [ref=e79]:
          - button "Collapse sidebar" [expanded] [ref=e80] [cursor=pointer]
          - generic [ref=e82]:
            - strong [ref=e83]: Director
            - text: / Console
        - button "Open command palette" [ref=e84]:
          - generic [ref=e85]: Search & jump to…
          - generic [ref=e88]: ⌘K
        - generic [ref=e89]:
          - button "Alerts" [ref=e90] [cursor=pointer]
          - button "Settings" [ref=e92] [cursor=pointer]
          - generic [ref=e94]: Account
      - generic [ref=e112]:
        - heading "Director Portal" [level=2] [ref=e114]
        - generic [ref=e115]:
          - region [ref=e116]:
            - generic [ref=e117]:
              - generic [ref=e118]:
                - generic [ref=e119]:
                  - generic [ref=e120]: Director workspace · club operations
                  - heading "Command center" [level=2] [ref=e121]
                  - paragraph [ref=e122]: Firestore KPIs, compliance queues, and club-ops telemetry. Severity bands mirror risk — scroll for queues and charts.
                - generic [ref=e123]:
                  - generic [ref=e124]: Live ingest
                  - generic [ref=e126]: Club scope · client
              - generic "Operations snapshot" [ref=e127]:
                - generic [ref=e128]:
                  - generic [ref=e129]: Open invites
                  - generic [ref=e130]: "0"
                  - generic [ref=e131]: Coach seat pipeline
                - generic [ref=e132]:
                  - generic [ref=e133]: Teams
                  - generic [ref=e134]: "0"
                  - generic [ref=e135]: Containers in club
                - generic [ref=e136]:
                  - generic [ref=e137]: Seat draw
                  - generic [ref=e138]: —
                  - generic [ref=e139]: Utilization vs cap
                - generic [ref=e140]:
                  - generic [ref=e141]: Orchestration
                  - generic [ref=e142]: Clear
                  - generic [ref=e143]: Coach invites · inbox workflows
              - generic [ref=e144]:
                - heading "Director command center" [level=2] [ref=e145]
                - generic [ref=e146]:
                  - article [ref=e147]:
                    - generic [ref=e148]:
                      - generic [ref=e149]: Teams
                      - generic [ref=e150]: —
                    - generic [ref=e151]: "0"
                    - generic [ref=e152]: Program containers
                  - article [ref=e153]:
                    - generic [ref=e154]:
                      - generic [ref=e155]: Pending invites
                      - generic [ref=e156]: —
                    - generic [ref=e157]: "0"
                    - generic [ref=e158]: Coach seats
                  - article [ref=e159]:
                    - generic [ref=e160]:
                      - generic [ref=e161]: Active seats
                      - generic [ref=e162]: —
                    - generic [ref=e163]: "0"
                    - generic [ref=e164]: Billing draw
                  - article [ref=e165]:
                    - generic [ref=e166]:
                      - generic [ref=e167]: Seat cap
                      - generic [ref=e168]: —
                    - generic [ref=e169]: —
                    - generic [ref=e170]: License entitlement
                  - article [ref=e171]:
                    - generic [ref=e172]:
                      - generic [ref=e173]: Utilization
                      - generic [ref=e174]: —
                    - generic [ref=e175]: —
                    - generic [ref=e176]: Active / cap
                - generic [ref=e177]:
                  - generic [ref=e178]:
                    - generic "Priority actions inbox" [ref=e180]:
                      - heading "Priority actions" [level=2] [ref=e181]
                      - paragraph [ref=e182]: Loading…
                    - region [ref=e183]:
                      - generic [ref=e184]:
                        - generic [ref=e185]: platform fees · ytd
                        - heading "Revenue ledger" [level=3] [ref=e186]
                        - paragraph [ref=e187]: Vanguard charges only when money moves through the platform. Below is what your club has run year-to-date.
                      - paragraph [ref=e188]: Loading ledger…
                    - generic [ref=e189]:
                      - generic [ref=e193]:
                        - heading "PAYMENT RECOVERY SHOWCASE" [level=3] [ref=e194]
                        - paragraph [ref=e195]: Empathetic Lapsed Payment Assistant
                      - generic [ref=e196]: Scanning for lapsed payments...
                    - generic [ref=e200]:
                      - heading "🎟 Event Reconciliation" [level=3] [ref=e201]
                      - link "Manage Events →" [ref=e202] [cursor=pointer]:
                        - /url: /director/events
                  - generic [ref=e205]:
                    - generic [ref=e206]:
                      - generic [ref=e207]: Consent audit
                      - region "Verified minor consent records" [ref=e209]:
                        - generic:
                          - generic:
                            - paragraph: COPPA · CONSENT AUDIT
                            - heading "Verified minor consent records" [level=3]
                          - generic [ref=e210]: 0 RECORDS
                        - paragraph: No consent records for this club yet. Parents finalize VPC in Parent OS — no director approval required.
                    - generic [ref=e211]:
                      - generic [ref=e212]:
                        - heading "🏨 Hotel Rebates" [level=3] [ref=e213]
                        - generic [ref=e214]: Read-only — contact platform support to dispute.
                      - generic [ref=e215]:
                        - button "Pending 0 $0.00" [ref=e216] [cursor=pointer]:
                          - generic [ref=e217]: Pending
                          - generic [ref=e218]: "0"
                          - generic [ref=e219]: $0.00
                        - button "Approved 0 $0.00" [ref=e220] [cursor=pointer]:
                          - generic [ref=e221]: Approved
                          - generic [ref=e222]: "0"
                          - generic [ref=e223]: $0.00
                        - button "Paid Out 0 $0.00" [ref=e224] [cursor=pointer]:
                          - generic [ref=e225]: Paid Out
                          - generic [ref=e226]: "0"
                          - generic [ref=e227]: $0.00
                    - generic [ref=e233]:
                      - heading "Coach accountability" [level=3] [ref=e234]
                      - paragraph [ref=e235]: Practice logging signals from athlete-submitted reps. Teams bucketed by days since last log.
          - generic [ref=e236]:
            - generic [ref=e237]:
              - heading "Revenue Engine" [level=3] [ref=e239]
              - generic [ref=e241]: Club Revenue Analytics Offline
            - generic [ref=e242]:
              - heading "Roster Hierarchy" [level=3] [ref=e244]
              - generic [ref=e246]: God-Mode Tree Offline
  - complementary [ref=e247]
  - complementary [ref=e248]:
    - generic [ref=e249]:
      - heading [level=2] [ref=e254]: Alerts
      - button [ref=e255] [cursor=pointer]
    - generic [ref=e258]:
      - paragraph [ref=e260]: No alerts right now.
      - paragraph [ref=e261]: We'll notify you when something needs your attention.
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