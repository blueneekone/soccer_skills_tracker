# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: PARENT OS >> Navigate & Audit: DASHBOARD
- Location: tests\visual-regression-v5.spec.ts:186:7

# Error details

```
Error: [COLLISION DETECTED] Element 1 (lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6) overlaps Element 2 (tw-bg-[#1e293b] tw-rounded-xl tw-p-4 tw-border tw-border-[#334155]) on route: dashboard
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
          - link "Household" [ref=e18] [cursor=pointer]:
            - /url: /parent/household
          - link "Co-op Command" [ref=e21] [cursor=pointer]:
            - /url: /parent/dashboard
          - link "Consent (VPC)" [ref=e24] [cursor=pointer]:
            - /url: /parent/vpc
          - link "Log Workout" [ref=e27] [cursor=pointer]:
            - /url: /parent/log-workout
          - link "Payments" [ref=e30] [cursor=pointer]:
            - /url: /parent/payments
          - link "Messages" [ref=e33] [cursor=pointer]:
            - /url: /messages
        - generic [ref=e36]:
          - paragraph [ref=e37]: System actions
          - link "Support / Help Desk" [ref=e38] [cursor=pointer]:
            - /url: mailto:support@sstracker.app?subject=SSTRACKER%20support
          - button "Report Anomaly" [ref=e41] [cursor=pointer]
          - button "Sign out" [ref=e44] [cursor=pointer]
    - generic [ref=e47]:
      - generic [ref=e48]:
        - generic [ref=e49]:
          - button "Collapse sidebar" [expanded] [ref=e50] [cursor=pointer]
          - generic [ref=e52]:
            - strong [ref=e53]: Parent
            - text: / Console
        - button "Open command palette" [ref=e54]:
          - generic [ref=e55]: Search & jump to…
          - generic [ref=e58]: ⌘K
        - generic [ref=e59]:
          - button "Alerts" [ref=e60] [cursor=pointer]
          - button "Settings" [ref=e62] [cursor=pointer]
          - generic [ref=e64]: Account
      - generic [ref=e83]:
        - generic [ref=e84]:
          - heading "Parent OS" [level=1] [ref=e85]
          - paragraph [ref=e86]: Trusted Co-Op Partner Console
        - generic [ref=e87]:
          - generic [ref=e89]:
            - generic [ref=e90]:
              - heading "● Co-Op Arena" [level=2] [ref=e91]:
                - generic [ref=e92]: ●
                - text: Co-Op Arena
              - generic [ref=e93]: FUNDING MANAGEMENT
            - generic [ref=e94]:
              - heading "# Stripe Billing Metrics" [level=3] [ref=e95]:
                - generic [ref=e96]: "#"
                - text: Stripe Billing Metrics
              - generic [ref=e98]:
                - paragraph [ref=e99]: No primary funding source linked. Link an account to fund bounties.
                - button "Fetch Stripe Sources" [ref=e100]
            - generic [ref=e101]:
              - heading "# Active Objectives" [level=3] [ref=e102]:
                - generic [ref=e103]: "#"
                - text: Active Objectives
              - generic [ref=e104]: NO_ACTIVE_BOUNTIES
          - generic [ref=e107]:
            - generic "Priority actions inbox" [ref=e108]:
              - heading "Priority actions" [level=2] [ref=e109]
              - paragraph [ref=e110]: No urgent items. You're caught up.
            - region [ref=e111]:
              - generic [ref=e113]:
                - heading "Upcoming — availability" [level=3] [ref=e114]
                - paragraph [ref=e115]: Confirm whether your athlete can attend practices and games.
              - paragraph [ref=e116]:
                - text: Link an athlete on
                - link "Household" [ref=e117] [cursor=pointer]:
                  - /url: /parent/household
                - text: to RSVP.
            - generic [ref=e120]:
              - generic [ref=e121]:
                - heading "Latest Match:" [level=2] [ref=e123]
                - generic [ref=e124]: POST-MATCH ANALYSIS
              - generic [ref=e125]:
                - generic [ref=e126]:
                  - generic [ref=e127]: EFFORT (RPE)
                  - generic [ref=e128]: /10
                - generic [ref=e129]:
                  - generic [ref=e130]: SUCCESS RATE
                  - generic [ref=e131]: "%"
            - generic [ref=e133]:
              - generic [ref=e134]:
                - heading "● Tremendous Escrow" [level=2] [ref=e135]:
                  - generic [ref=e136]: ●
                  - text: Tremendous Escrow
                - generic [ref=e137]: BOUNTY TERMINAL
              - generic [ref=e138]:
                - generic [ref=e139]:
                  - paragraph [ref=e140]: FUNDING SOURCE
                  - paragraph [ref=e141]: No funding source linked
                - generic [ref=e142]:
                  - paragraph [ref=e143]: ACTIVE BOUNTIES
                  - paragraph [ref=e144]: "3"
              - generic [ref=e145]:
                - paragraph [ref=e146]: Fund real-world rewards for your athlete's completed quests seamlessly.
                - generic [ref=e147]:
                  - combobox [ref=e148]:
                    - option "$25.00"
                    - option "$50.00" [selected]
                    - option "$100.00"
                    - option "$200.00"
                  - button "Deposit Funds via Stripe" [ref=e149]
        - generic [ref=e150]:
          - generic [ref=e151]:
            - heading "Parent Lounge" [level=3] [ref=e152]
            - generic [ref=e154]:
              - generic [ref=e155]: READ_ONLY
              - status "No Recent Announcements" [ref=e156]:
                - generic: "0x2520FF"
                - generic: NULL_DATASET
                - generic [ref=e157]:
                  - paragraph [ref=e160]:
                    - text: No Recent Announcements
                    - generic [ref=e161]: ▋
                  - paragraph [ref=e162]: Official team broadcasts and scheduling announcements will appear here.
          - generic [ref=e163]:
            - heading "Household Thread" [level=3] [ref=e164]
            - generic [ref=e166]:
              - generic [ref=e167]: SAFESPORT_COMPLIANT
              - generic [ref=e168]: PRIVATE MESSAGING DISABLED FOR MINORS
              - status "No Active Threads" [ref=e171]:
                - generic: "0xB3AE33"
                - generic: NULL_DATASET
                - generic [ref=e172]:
                  - paragraph [ref=e175]:
                    - text: No Active Threads
                    - generic [ref=e176]: ▋
                  - paragraph [ref=e177]: Coach-to-athlete communications are CC'd to this thread automatically for full oversight.
  - complementary [ref=e178]
  - complementary [ref=e179]:
    - generic [ref=e180]:
      - heading [level=2] [ref=e185]: Alerts
      - button [ref=e186] [cursor=pointer]
    - generic [ref=e189]:
      - paragraph [ref=e191]: No alerts right now.
      - paragraph [ref=e192]: We'll notify you when something needs your attention.
```

# Test source

```ts
  16  |   ATOMPUNK_AMBER_RGB,
  17  |   ACTION_GOLD_RGB,
  18  |   SOFT_CYAN_RGB,
  19  |   SLATE_50_RGB
  20  | ];
  21  | 
  22  | const PERSONAS = {
  23  |   admin: {
  24  |     uid: 'admin-telemetry-uid',
  25  |     role: 'super_admin',
  26  |     clubId: 'aggiesfc',
  27  |     routes: [
  28  |       { name: 'overview', path: '/admin/overview', waitSelector: '.tenant-matrix-grid' },
  29  |       { name: 'users', path: '/admin/users', waitSelector: '.cc-root, .gu-root' },
  30  |       { name: 'organizations', path: '/admin/organizations', waitSelector: '.orgs-panel' },
  31  |       { name: 'audit-logs', path: '/admin/audit-log', waitSelector: '.al-page' },
  32  |       { name: 'settings', path: '/admin/system-settings', waitSelector: 'h1' }
  33  |     ]
  34  |   },
  35  |   player: {
  36  |     uid: 'player-telemetry-uid',
  37  |     role: 'player',
  38  |     clubId: 'aggiesfc',
  39  |     routes: [
  40  |       { name: 'dashboard', path: '/player/dashboard', waitSelector: '.pd-page-root' },
  41  |       { name: 'skill-tree', path: '/player/skill-tree', waitSelector: '.pd-page-root, .st-bento' }
  42  |     ]
  43  |   },
  44  |   coach: {
  45  |     uid: 'coach-telemetry-uid',
  46  |     role: 'coach',
  47  |     clubId: 'aggiesfc',
  48  |     routes: [
  49  |       { name: 'dashboard', path: '/coach/dashboard', waitSelector: '.coach-dashboard-root, .st-bento' },
  50  |       { name: 'logistics', path: '/coach/logistics', waitSelector: '.pd-page-root, .st-bento' },
  51  |       { name: 'daily-intel', path: '/coach/daily-intel', waitSelector: '.pd-page-root, .st-bento' },
  52  |       { name: 'war-room', path: '/coach/war-room', waitSelector: '.pd-page-root, .st-bento, .tactical-arena-canvas' }
  53  |     ]
  54  |   },
  55  |   parent: {
  56  |     uid: 'parent-telemetry-uid',
  57  |     role: 'parent',
  58  |     clubId: 'aggiesfc',
  59  |     routes: [
  60  |       { name: 'dashboard', path: '/parent/dashboard', waitSelector: 'main, .parent-panel' },
  61  |       { name: 'household', path: '/parent/household', waitSelector: '.parent-lounge-page, .phh' },
  62  |       { name: 'trust-center', path: '/parent/trust-center', waitSelector: 'main' },
  63  |       { name: 'payments', path: '/parent/payments', waitSelector: '.pp-root' }
  64  |     ]
  65  |   },
  66  |   director: {
  67  |     uid: 'director-telemetry-uid',
  68  |     role: 'director',
  69  |     clubId: 'aggiesfc',
  70  |     routes: [
  71  |       { name: 'dashboard', path: '/director/dashboard', waitSelector: '.director-console-page' }
  72  |     ]
  73  |   },
  74  |   public: {
  75  |     uid: 'public-telemetry-uid',
  76  |     role: 'public',
  77  |     clubId: 'aggiesfc',
  78  |     routes: [
  79  |       { name: 'club-roster', path: '/club/aggiesfc', waitSelector: '.clp-root' }
  80  |     ]
  81  |   }
  82  | };
  83  | 
  84  | /**
  85  |  * Programmatic visual inspection assertions for 2D bounding boxes and CSS.
  86  |  */
  87  | async function runMicroscopicLayoutAssertions(page: any, routeName: string) {
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
> 116 |         throw new Error(`[COLLISION DETECTED] Element ${a.id} (${classA}) overlaps Element ${b.id} (${classB}) on route: ${routeName}`);
      |               ^ Error: [COLLISION DETECTED] Element 1 (lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6) overlaps Element 2 (tw-bg-[#1e293b] tw-rounded-xl tw-p-4 tw-border tw-border-[#334155]) on route: dashboard
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
  167 |         const profile = {
  168 |           uid: p.uid,
  169 |           isAuthenticated: true,
  170 |           role: p.role,
  171 |           clubId: p.clubId,
  172 |           isProfileComplete: true,
  173 |           isCleared: true,
  174 |           clearance: { status: 'cleared', checkrStatus: 'clear', safeSportStatus: 'certified' },
  175 |           vpcStatus: 'verified',
  176 |           isConsented: true
  177 |         };
  178 |         // Set both localStorage (for hydrateForE2E sync path) and
  179 |         // window.__TEST_PROFILE__ (for VITE_E2E_BYPASS_AUTH async path)
  180 |         window.localStorage.setItem('auth_state', JSON.stringify(profile));
  181 |         (window as any).__TEST_PROFILE__ = profile;
  182 |       }, persona);
  183 |     });
  184 | 
  185 |     for (const route of persona.routes) {
  186 |       test(`Navigate & Audit: ${route.name.toUpperCase()}`, async ({ page }) => {
  187 |         // Create isolated folders for each target review segment
  188 |         const personaDir = join(artifactsDir, personaName);
  189 |         if (!existsSync(personaDir)) {
  190 |           mkdirSync(personaDir, { recursive: true });
  191 |         }
  192 | 
  193 |         // 1. Navigate directly to the target route using fast load gating (bypass gRPC networkidle lock)
  194 |         await page.goto(route.path, { waitUntil: 'load' });
  195 | 
  196 |         // 2. Wait explicitly for the Svelte 5 DOM and page elements to hydrate
  197 |         await page.waitForSelector(route.waitSelector, { state: 'visible', timeout: 10000 });
  198 |         await page.waitForTimeout(300); // Allow reactivity and animations to settle
  199 | 
  200 |         // 3. Assert no unstyled light-mode flash exists (Void Black/Navy Slate only)
  201 |         const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  202 |         expect(bg).not.toBe('rgb(255, 255, 255)');
  203 | 
  204 |         // 4. Run coordinate box layout overlap calculations
  205 |         await runMicroscopicLayoutAssertions(page, route.name);
  206 | 
  207 |         // 5. Perform active hover style validation against brand links
  208 |         await verifyInteractiveHoverState(page, '.vanguard-link, .pd-nav-link, .st-bento a:not(.quest-hero__cta)');
  209 | 
  210 |         // 6. Deposit visual proof screenshot directly into audit-artifacts/
  211 |         const screenshotPath = join(personaDir, `${route.name}-desktop.png`);
  212 |         await page.screenshot({ path: screenshotPath, fullPage: true });
  213 |         console.log(`[VISUAL AUDIT PASSED] Screenshot exported to: ${screenshotPath}`);
  214 |       });
  215 |     }
  216 |   });
```