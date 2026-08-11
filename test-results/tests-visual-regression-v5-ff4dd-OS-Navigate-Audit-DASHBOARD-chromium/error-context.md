# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: PARENT OS >> Navigate & Audit: DASHBOARD
- Location: tests/visual-regression-v5.spec.ts:194:7

# Error details

```
Error: [COLLISION DETECTED] Element 0 (st-bento bento-col-8 parent-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-overflow-hidden tw-relative tw-min-w-0) overlaps Element 1 (tw-bg-[#0f172a] tw-rounded-[24px] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col tw-gap-8) on route: dashboard
```

# Page snapshot

```yaml
- main [ref=e5]:
  - button "Report an anomaly or bug" [ref=e6] [cursor=pointer]:
    - generic [ref=e8]: ALPHA
  - generic [ref=e10]:
    - complementary "Workspace navigation" [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e14]:
          - generic [ref=e15]: SSTracker
          - generic [ref=e16]: "|"
          - generic [ref=e17]: Nexus Command
        - navigation [ref=e18]:
          - link "Household" [ref=e19] [cursor=pointer]:
            - /url: /parent/household
          - link "Co-op Command" [ref=e22] [cursor=pointer]:
            - /url: /parent/dashboard
          - link "Consent (VPC)" [ref=e25] [cursor=pointer]:
            - /url: /parent/vpc
          - link "Log Workout" [ref=e28] [cursor=pointer]:
            - /url: /parent/log-workout
          - link "Payments" [ref=e31] [cursor=pointer]:
            - /url: /parent/payments
          - link "Messages" [ref=e34] [cursor=pointer]:
            - /url: /messages
        - generic [ref=e37]:
          - paragraph [ref=e38]: System actions
          - link "Support / Help Desk" [ref=e39] [cursor=pointer]:
            - /url: mailto:support@sstracker.app?subject=SSTRACKER%20support
          - button "Report Anomaly" [ref=e42] [cursor=pointer]
          - button "Sign out" [ref=e45] [cursor=pointer]
    - generic [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e50]:
          - button "Collapse sidebar" [expanded] [ref=e51] [cursor=pointer]
          - generic [ref=e53]:
            - strong [ref=e54]: Parent
            - text: / Console
        - button "Open command palette" [ref=e55]:
          - generic [ref=e56]: Search & jump to…
          - generic [ref=e59]: ⌘K
        - generic [ref=e60]:
          - button "Alerts" [ref=e61] [cursor=pointer]
          - button "Settings" [ref=e63] [cursor=pointer]
          - generic [ref=e65]: Account
      - generic [ref=e84]:
        - generic [ref=e85]:
          - heading "Parent OS" [level=1] [ref=e86]
          - paragraph [ref=e87]: Trusted Co-Op Partner Console
        - generic [ref=e88]:
          - generic [ref=e90]:
            - generic [ref=e91]:
              - heading "● Co-Op Arena" [level=2] [ref=e92]:
                - generic [ref=e93]: ●
                - text: Co-Op Arena
              - generic [ref=e94]: FUNDING MANAGEMENT
            - generic [ref=e95]:
              - heading "# Stripe Billing Metrics" [level=3] [ref=e96]:
                - generic [ref=e97]: "#"
                - text: Stripe Billing Metrics
              - generic [ref=e99]:
                - paragraph [ref=e100]: No primary funding source linked. Link an account to fund bounties.
                - button "Fetch Stripe Sources" [ref=e101]
            - generic [ref=e102]:
              - heading "# Active Objectives" [level=3] [ref=e103]:
                - generic [ref=e104]: "#"
                - text: Active Objectives
              - generic [ref=e105]: NO_ACTIVE_BOUNTIES
          - generic [ref=e108]:
            - region [ref=e110]:
              - generic [ref=e112]:
                - heading "Notifications" [level=3] [ref=e113]
                - paragraph [ref=e114]: Push alerts for schedule, messages, and payments.
              - button "Enable push notifications" [disabled] [ref=e115]
              - list [ref=e116]:
                - listitem [ref=e117]:
                  - generic [ref=e118] [cursor=pointer]:
                    - checkbox "Game & practice reminders" [checked] [ref=e119]
                    - text: Game & practice reminders
                - listitem [ref=e120]:
                  - generic [ref=e121] [cursor=pointer]:
                    - checkbox "Coach messages" [checked] [ref=e122]
                    - text: Coach messages
                - listitem [ref=e123]:
                  - generic [ref=e124] [cursor=pointer]:
                    - checkbox "Team announcements" [checked] [ref=e125]
                    - text: Team announcements
                - listitem [ref=e126]:
                  - generic [ref=e127] [cursor=pointer]:
                    - checkbox "Payment reminders" [checked] [ref=e128]
                    - text: Payment reminders
            - generic "Priority actions inbox" [ref=e130]:
              - heading "Priority actions" [level=2] [ref=e131]
              - paragraph [ref=e132]: No urgent items. You're caught up.
            - region [ref=e134]:
              - generic [ref=e136]:
                - heading "Upcoming — availability" [level=3] [ref=e137]
                - paragraph [ref=e138]: Confirm whether your athlete can attend practices and games.
              - paragraph [ref=e139]:
                - text: Link an athlete on
                - link "Household" [ref=e140] [cursor=pointer]:
                  - /url: /parent/household
                - text: to RSVP.
            - region "Notifications" [ref=e142]:
              - generic [ref=e144]:
                - heading "Notifications" [level=3] [ref=e145]
                - paragraph [ref=e146]: Push alerts for schedule, messages, and payments.
              - button "Enable push notifications" [disabled] [ref=e147]
              - list [ref=e148]:
                - listitem [ref=e149]:
                  - generic [ref=e150] [cursor=pointer]:
                    - checkbox "Game & practice reminders" [checked] [ref=e151]
                    - text: Game & practice reminders
                - listitem [ref=e152]:
                  - generic [ref=e153] [cursor=pointer]:
                    - checkbox "Coach messages" [checked] [ref=e154]
                    - text: Coach messages
                - listitem [ref=e155]:
                  - generic [ref=e156] [cursor=pointer]:
                    - checkbox "Team announcements" [checked] [ref=e157]
                    - text: Team announcements
                - listitem [ref=e158]:
                  - generic [ref=e159] [cursor=pointer]:
                    - checkbox "Payment reminders" [checked] [ref=e160]
                    - text: Payment reminders
            - generic [ref=e163]:
              - generic [ref=e164]:
                - heading "Latest Match:" [level=2] [ref=e166]
                - generic [ref=e167]: POST-MATCH ANALYSIS
              - generic [ref=e168]:
                - generic [ref=e169]:
                  - generic [ref=e170]: EFFORT (RPE)
                  - generic [ref=e171]: /10
                - generic [ref=e172]:
                  - generic [ref=e173]: SUCCESS RATE
                  - generic [ref=e174]: "%"
            - generic [ref=e176]:
              - generic [ref=e177]:
                - heading "● Tremendous Escrow" [level=2] [ref=e178]:
                  - generic [ref=e179]: ●
                  - text: Tremendous Escrow
                - generic [ref=e180]: BOUNTY TERMINAL
              - generic [ref=e181]:
                - generic [ref=e182]:
                  - paragraph [ref=e183]: FUNDING SOURCE
                  - paragraph [ref=e184]: No funding source linked
                - generic [ref=e185]:
                  - paragraph [ref=e186]: ACTIVE BOUNTIES
                  - paragraph [ref=e187]: "3"
              - generic [ref=e188]:
                - paragraph [ref=e189]: Fund real-world rewards for your athlete's completed quests seamlessly.
                - generic [ref=e190]:
                  - combobox [ref=e191]:
                    - option "$25.00"
                    - option "$50.00" [selected]
                    - option "$100.00"
                    - option "$200.00"
                  - button "Deposit Funds via Stripe" [ref=e192]
        - generic [ref=e193]:
          - generic [ref=e194]:
            - heading "Parent Lounge" [level=3] [ref=e195]
            - generic [ref=e197]:
              - generic [ref=e198]: READ_ONLY
              - status "No Recent Announcements" [ref=e199]:
                - generic: "0x2520FF"
                - generic: NULL_DATASET
                - generic [ref=e200]:
                  - paragraph [ref=e203]:
                    - text: No Recent Announcements
                    - generic [ref=e204]: ▋
                  - paragraph [ref=e205]: Official team broadcasts and scheduling announcements will appear here.
          - generic [ref=e206]:
            - heading "Household Thread" [level=3] [ref=e207]
            - generic [ref=e209]:
              - generic [ref=e210]: SAFESPORT_COMPLIANT
              - generic [ref=e211]: PRIVATE MESSAGING DISABLED FOR MINORS
              - status "No Active Threads" [ref=e214]:
                - generic: "0xB3AE33"
                - generic: NULL_DATASET
                - generic [ref=e215]:
                  - paragraph [ref=e218]:
                    - text: No Active Threads
                    - generic [ref=e219]: ▋
                  - paragraph [ref=e220]: Coach-to-athlete communications are CC'd to this thread automatically for full oversight.
  - complementary [ref=e221]
  - complementary [ref=e222]:
    - generic [ref=e223]:
      - heading [level=2] [ref=e228]: Alerts
      - button [ref=e229] [cursor=pointer]
    - generic [ref=e232]:
      - paragraph [ref=e234]: No alerts right now.
      - paragraph [ref=e235]: We'll notify you when something needs your attention.
```

# Test source

```ts
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
  74  |   commissioner: {
  75  |     uid: 'commissioner-telemetry-uid',
  76  |     role: 'commissioner',
  77  |     clubId: 'aggiesfc',
  78  |     routes: [
  79  |       { name: 'matrix', path: '/commissioner/matrix', waitSelector: '.federation-matrix-grid' }
  80  |     ]
  81  |   },
  82  |   public: {
  83  |     uid: 'public-telemetry-uid',
  84  |     role: 'public',
  85  |     clubId: 'aggiesfc',
  86  |     routes: [
  87  |       { name: 'club-roster', path: '/club/aggiesfc', waitSelector: '.clp-root' }
  88  |     ]
  89  |   }
  90  | };
  91  |
  92  | /**
  93  |  * Programmatic visual inspection assertions for 2D bounding boxes and CSS.
  94  |  */
  95  | async function runMicroscopicLayoutAssertions(page: any, routeName: string) {
  96  |   // 1. Assert No Horizontal Scroll Overflow
  97  |   const overflowX = await page.evaluate(() => window.scrollX);
  98  |   expect(overflowX).toBe(0);
  99  |
  100 |   const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  101 |   const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  102 |   expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  103 |
  104 |   // 2. Bento Grid 2D Collision Check (Ensure no layout overlapping coordinates)
  105 |   const gridChildren = page.locator('.tw-grid > *, .st-bento > *, [class*="Bento"] > *');
  106 |   const count = await gridChildren.count();
  107 |   const bboxes = [];
  108 |   for (let i = 0; i < count; i++) {
  109 |     const box = await gridChildren.nth(i).boundingBox();
  110 |     if (box) {
  111 |       bboxes.push({ id: i, ...box });
  112 |     }
  113 |   }
  114 |
  115 |   for (let i = 0; i < bboxes.length; i++) {
  116 |     for (let j = i + 1; j < bboxes.length; j++) {
  117 |       const a = bboxes[i];
  118 |       const b = bboxes[j];
  119 |       const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  120 |       const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  121 |       if (overlapX > 1 && overlapY > 1) {
  122 |         const classA = await gridChildren.nth(i).evaluate(el => el.className);
  123 |         const classB = await gridChildren.nth(j).evaluate(el => el.className);
> 124 |         throw new Error(`[COLLISION DETECTED] Element ${a.id} (${classA}) overlaps Element ${b.id} (${classB}) on route: ${routeName}`);
      |               ^ Error: [COLLISION DETECTED] Element 0 (st-bento bento-col-8 parent-panel tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-overflow-hidden tw-relative tw-min-w-0) overlaps Element 1 (tw-bg-[#0f172a] tw-rounded-[24px] tw-border tw-border-[#334155] tw-p-6 tw-flex tw-flex-col tw-gap-8) on route: dashboard
  125 |       }
  126 |     }
  127 |   }
  128 |
  129 |   // 3. Text Truncation / Clipping Checks
  130 |   const clips = await page.evaluate(() => {
  131 |     const elements = Array.from(document.querySelectorAll('.tw-font-mono, h1, h2, h3, p'));
  132 |     return elements.some(el => el.scrollWidth > el.clientWidth && window.getComputedStyle(el).overflow === 'hidden');
  133 |   });
  134 |   if (clips) {
  135 |     console.warn(`[WARNING] Silent text clipping/truncation observed on route: ${routeName}`);
  136 |   }
  137 | }
  138 |
  139 | /**
  140 |  * Interactive hover and tooltip assertions with kinetic delay handling.
  141 |  */
  142 | async function verifyInteractiveHoverState(page: any, selector: string) {
  143 |   const elements = page.locator(selector);
  144 |   const count = await elements.count();
  145 |   if (count > 0) {
  146 |     const targetElement = elements.first();
  147 |     await targetElement.scrollIntoViewIfNeeded();
  148 |     await targetElement.hover();
  149 |
  150 |     // Wait for the mandated 150-250ms kinetic transition window
  151 |     await page.waitForTimeout(250);
  152 |
  153 |     // Verify visual color transition shifts cleanly to a compliant accent
  154 |     const computedColor = await targetElement.evaluate((el: any) => window.getComputedStyle(el).color);
  155 |     expect(COMPLIANT_HOVER_COLORS).toContain(computedColor);
  156 |   }
  157 | }
  158 |
  159 | // Ensure the local screenshots folder exists securely
  160 | const artifactsDir = join(process.cwd(), 'audit-artifacts');
  161 | if (!existsSync(artifactsDir)) {
  162 |   mkdirSync(artifactsDir, { recursive: true });
  163 | }
  164 |
  165 | // Generate sequential traversal specs for each persona
  166 | for (const [personaName, persona] of Object.entries(PERSONAS)) {
  167 |   test.describe(`EPIC COMPREHENSIVE TRAVERSAL: ${personaName.toUpperCase()} OS`, () => {
  168 |
  169 |     test.beforeEach(async ({ page }) => {
  170 |       page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  171 |       page.on('pageerror', err => console.error(`[Browser Error] ${err.name}: ${err.message}`, err.stack));
  172 |
  173 |       // Zero-Touch CSO Protocol: Inject authenticated state directly before page loads
  174 |       await page.addInitScript((p) => {
  175 |         const profile = {
  176 |           uid: p.uid,
  177 |           isAuthenticated: true,
  178 |           role: p.role,
  179 |           clubId: p.clubId,
  180 |           isProfileComplete: true,
  181 |           isCleared: true,
  182 |           clearance: { status: 'cleared', checkrStatus: 'clear', safeSportStatus: 'certified' },
  183 |           vpcStatus: 'verified',
  184 |           isConsented: true
  185 |         };
  186 |         // Set both localStorage (for hydrateForE2E sync path) and
  187 |         // window.__TEST_PROFILE__ (for VITE_E2E_BYPASS_AUTH async path)
  188 |         window.localStorage.setItem('auth_state', JSON.stringify(profile));
  189 |         (window as any).__TEST_PROFILE__ = profile;
  190 |       }, persona);
  191 |     });
  192 |
  193 |     for (const route of persona.routes) {
  194 |       test(`Navigate & Audit: ${route.name.toUpperCase()}`, async ({ page }) => {
  195 |         // Create isolated folders for each target review segment
  196 |         const personaDir = join(artifactsDir, personaName);
  197 |         if (!existsSync(personaDir)) {
  198 |           mkdirSync(personaDir, { recursive: true });
  199 |         }
  200 |
  201 |         // 1. Navigate directly to the target route using fast load gating (bypass gRPC networkidle lock)
  202 |         await page.goto(route.path, { waitUntil: 'load' });
  203 |
  204 |         // 2. Wait explicitly for the Svelte 5 DOM and page elements to hydrate
  205 |         await page.waitForSelector(route.waitSelector, { state: 'visible', timeout: 10000 });
  206 |         await page.waitForTimeout(300); // Allow reactivity and animations to settle
  207 |
  208 |         // 3. Assert no unstyled light-mode flash exists (Void Black/Navy Slate only)
  209 |         const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  210 |         expect(bg).not.toBe('rgb(255, 255, 255)');
  211 |
  212 |         // 4. Run coordinate box layout overlap calculations
  213 |         await runMicroscopicLayoutAssertions(page, route.name);
  214 |
  215 |         // 5. Perform active hover style validation against brand links
  216 |         await verifyInteractiveHoverState(page, '.vanguard-link, .pd-nav-link, .st-bento a:not(.quest-hero__cta)');
  217 |
  218 |         // 6. Deposit visual proof screenshot directly into audit-artifacts/
  219 |         const screenshotPath = join(personaDir, `${route.name}-desktop.png`);
  220 |         await page.screenshot({ path: screenshotPath, fullPage: true });
  221 |         console.log(`[VISUAL AUDIT PASSED] Screenshot exported to: ${screenshotPath}`);
  222 |       });
  223 |     }
  224 |   });
```