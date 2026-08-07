# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: PARENT OS >> Navigate & Audit: DASHBOARD
- Location: tests\visual-regression-v5.spec.ts:177:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.pd-page-root, .compliance-vault, .st-bento') to be visible

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
          - link "Home" [ref=e18] [cursor=pointer]:
            - /url: /
          - link "Settings" [ref=e21] [cursor=pointer]:
            - /url: /settings
        - generic [ref=e24]:
          - paragraph [ref=e25]: System actions
          - link "Support / Help Desk" [ref=e26] [cursor=pointer]:
            - /url: mailto:support@sstracker.app?subject=SSTRACKER%20support
          - button "Report Anomaly" [ref=e29] [cursor=pointer]
          - button "Sign out" [ref=e32] [cursor=pointer]
    - generic [ref=e35]:
      - generic [ref=e36]:
        - generic [ref=e37]:
          - button "Collapse sidebar" [expanded] [ref=e38] [cursor=pointer]
          - generic [ref=e40]:
            - strong [ref=e41]: Workspace
            - text: / Console
        - button "Open command palette" [ref=e42]:
          - generic [ref=e43]: Search & jump to…
          - generic [ref=e46]: ⌘K
        - generic [ref=e47]:
          - button "Alerts" [ref=e48] [cursor=pointer]
          - button "Settings" [ref=e50] [cursor=pointer]
          - generic [ref=e52]: Account
      - generic [ref=e71]:
        - generic [ref=e72]:
          - heading "Parent OS" [level=1] [ref=e73]
          - paragraph [ref=e74]: Trusted Co-Op Partner Console
        - generic [ref=e75]:
          - generic [ref=e77]:
            - generic [ref=e78]:
              - heading "● Co-Op Arena" [level=2] [ref=e79]:
                - generic [ref=e80]: ●
                - text: Co-Op Arena
              - generic [ref=e81]: FUNDING MANAGEMENT
            - generic [ref=e82]:
              - heading "# Stripe Billing Metrics" [level=3] [ref=e83]:
                - generic [ref=e84]: "#"
                - text: Stripe Billing Metrics
              - generic [ref=e86]:
                - paragraph [ref=e87]: No primary funding source linked. Link an account to fund bounties.
                - button "Fetch Stripe Sources" [ref=e88]
            - generic [ref=e89]:
              - heading "# Active Objectives" [level=3] [ref=e90]:
                - generic [ref=e91]: "#"
                - text: Active Objectives
              - generic [ref=e92]: NO_ACTIVE_BOUNTIES
          - generic [ref=e95]:
            - generic "Priority actions inbox" [ref=e96]:
              - heading "Priority actions" [level=2] [ref=e97]
              - paragraph [ref=e98]: Loading…
            - region [ref=e99]:
              - generic [ref=e101]:
                - heading "Upcoming — availability" [level=3] [ref=e102]
                - paragraph [ref=e103]: Confirm whether your athlete can attend practices and games.
              - paragraph [ref=e104]:
                - text: Link an athlete on
                - link "Household" [ref=e105] [cursor=pointer]:
                  - /url: /parent/household
                - text: to RSVP.
            - generic [ref=e107]:
              - generic [ref=e108]:
                - generic [ref=e109]:
                  - generic [ref=e110]:
                    - 'heading "Latest Match: Metro City Elite" [level=2] [ref=e111]'
                    - text: 2026-08-07T16:30:28.214Z
                  - generic [ref=e112]: POST-MATCH ANALYSIS
                - generic [ref=e113]:
                  - generic [ref=e114]:
                    - generic [ref=e115]: EFFORT (RPE)
                    - generic [ref=e116]: /10
                  - generic [ref=e117]:
                    - generic [ref=e118]: SUCCESS RATE
                    - generic [ref=e119]: "%"
              - generic [ref=e120]:
                - heading "The Car Ride Home" [level=3] [ref=e121]
                - paragraph [ref=e122]: Match data is processing. We enforce a 15-minute cooling off period to preserve emotional safety.
                - generic [ref=e123]:
                  - paragraph [ref=e124]: "SUGGESTED CONVERSATION ANCHORS:"
                  - list [ref=e125]:
                    - listitem [ref=e126]:
                      - generic [ref=e127]: ">"
                      - text: "\"I love watching you play.\""
                    - listitem [ref=e128]:
                      - generic [ref=e129]: ">"
                      - text: "\"What was your favorite moment out there?\""
                    - listitem [ref=e130]:
                      - generic [ref=e131]: ">"
                      - text: "\"Did anything surprise you today?\""
                - generic [ref=e132]: UNLOCKS IN 15:00
                - button "I Acknowledge The Safety Parameters" [ref=e133]
            - generic [ref=e135]:
              - generic [ref=e136]:
                - heading "● Tremendous Escrow" [level=2] [ref=e137]:
                  - generic [ref=e138]: ●
                  - text: Tremendous Escrow
                - generic [ref=e139]: BOUNTY TERMINAL
              - generic [ref=e140]:
                - generic [ref=e141]:
                  - paragraph [ref=e142]: FUNDING SOURCE
                  - paragraph [ref=e143]: No funding source linked
                - generic [ref=e144]:
                  - paragraph [ref=e145]: ACTIVE BOUNTIES
                  - paragraph [ref=e146]: "3"
              - generic [ref=e147]:
                - paragraph [ref=e148]: Fund real-world rewards for your athlete's completed quests seamlessly.
                - generic [ref=e149]:
                  - combobox [ref=e150]:
                    - option "$25.00"
                    - option "$50.00" [selected]
                    - option "$100.00"
                    - option "$200.00"
                  - button "Deposit Funds via Stripe" [ref=e151]
        - generic [ref=e152]:
          - generic [ref=e153]:
            - heading "Parent Lounge" [level=3] [ref=e154]
            - generic [ref=e156]:
              - generic [ref=e157]: READ_ONLY
              - status "No Recent Announcements" [ref=e158]:
                - generic: "0x2520FF"
                - generic: NULL_DATASET
                - generic [ref=e159]:
                  - paragraph [ref=e162]:
                    - text: No Recent Announcements
                    - generic [ref=e163]: ▋
                  - paragraph [ref=e164]: Official team broadcasts and scheduling announcements will appear here.
          - generic [ref=e165]:
            - heading "Household Thread" [level=3] [ref=e166]
            - generic [ref=e168]:
              - generic [ref=e169]: SAFESPORT_COMPLIANT
              - generic [ref=e170]: PRIVATE MESSAGING DISABLED FOR MINORS
              - status "No Active Threads" [ref=e173]:
                - generic: "0xB3AE33"
                - generic: NULL_DATASET
                - generic [ref=e174]:
                  - paragraph [ref=e177]:
                    - text: No Active Threads
                    - generic [ref=e178]: ▋
                  - paragraph [ref=e179]: Coach-to-athlete communications are CC'd to this thread automatically for full oversight.
  - complementary [ref=e180]
  - complementary [ref=e181]:
    - generic [ref=e182]:
      - heading [level=2] [ref=e187]: Alerts
      - button [ref=e188] [cursor=pointer]
    - generic [ref=e191]:
      - paragraph [ref=e193]: No alerts right now.
      - paragraph [ref=e194]: We'll notify you when something needs your attention.
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