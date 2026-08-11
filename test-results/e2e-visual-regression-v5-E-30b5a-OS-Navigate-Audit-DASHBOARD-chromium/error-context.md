# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: PARENT OS >> Navigate & Audit: DASHBOARD
- Location: e2e/visual-regression-v5.spec.ts:165:7

# Error details

```
Error: [COLLISION DETECTED] Element 0 overlaps Element 1 on route: dashboard
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
            - generic [ref=e162]:
              - generic [ref=e163]:
                - generic [ref=e164]:
                  - generic [ref=e165]:
                    - 'heading "Latest Match: Metro City Elite" [level=2] [ref=e166]'
                    - text: 2026-08-11T10:27:51.507Z
                  - generic [ref=e167]: POST-MATCH ANALYSIS
                - generic [ref=e168]:
                  - generic [ref=e169]:
                    - generic [ref=e170]: EFFORT (RPE)
                    - generic [ref=e171]: /10
                  - generic [ref=e172]:
                    - generic [ref=e173]: SUCCESS RATE
                    - generic [ref=e174]: "%"
              - generic [ref=e175]:
                - heading "The Car Ride Home" [level=3] [ref=e176]
                - paragraph [ref=e177]: Match data is processing. We enforce a 15-minute cooling off period to preserve emotional safety.
                - generic [ref=e178]:
                  - paragraph [ref=e179]: "SUGGESTED CONVERSATION ANCHORS:"
                  - list [ref=e180]:
                    - listitem [ref=e181]:
                      - generic [ref=e182]: ">"
                      - text: "\"I love watching you play.\""
                    - listitem [ref=e183]:
                      - generic [ref=e184]: ">"
                      - text: "\"What was your favorite moment out there?\""
                    - listitem [ref=e185]:
                      - generic [ref=e186]: ">"
                      - text: "\"Did anything surprise you today?\""
                - generic [ref=e187]: UNLOCKS IN 15:00
                - button "I Acknowledge The Safety Parameters" [ref=e188]
            - generic [ref=e190]:
              - generic [ref=e191]:
                - heading "● Tremendous Escrow" [level=2] [ref=e192]:
                  - generic [ref=e193]: ●
                  - text: Tremendous Escrow
                - generic [ref=e194]: BOUNTY TERMINAL
              - generic [ref=e195]:
                - generic [ref=e196]:
                  - paragraph [ref=e197]: FUNDING SOURCE
                  - paragraph [ref=e198]: No funding source linked
                - generic [ref=e199]:
                  - paragraph [ref=e200]: ACTIVE BOUNTIES
                  - paragraph [ref=e201]: "3"
              - generic [ref=e202]:
                - paragraph [ref=e203]: Fund real-world rewards for your athlete's completed quests seamlessly.
                - generic [ref=e204]:
                  - combobox [ref=e205]:
                    - option "$25.00"
                    - option "$50.00" [selected]
                    - option "$100.00"
                    - option "$200.00"
                  - button "Deposit Funds via Stripe" [ref=e206]
        - generic [ref=e207]:
          - generic [ref=e208]:
            - heading "Parent Lounge" [level=3] [ref=e209]
            - generic [ref=e211]:
              - generic [ref=e212]: READ_ONLY
              - status "No Recent Announcements" [ref=e213]:
                - generic: "0x2520FF"
                - generic: NULL_DATASET
                - generic [ref=e214]:
                  - paragraph [ref=e217]:
                    - text: No Recent Announcements
                    - generic [ref=e218]: ▋
                  - paragraph [ref=e219]: Official team broadcasts and scheduling announcements will appear here.
          - generic [ref=e220]:
            - heading "Household Thread" [level=3] [ref=e221]
            - generic [ref=e223]:
              - generic [ref=e224]: SAFESPORT_COMPLIANT
              - generic [ref=e225]: PRIVATE MESSAGING DISABLED FOR MINORS
              - status "No Active Threads" [ref=e228]:
                - generic: "0xB3AE33"
                - generic: NULL_DATASET
                - generic [ref=e229]:
                  - paragraph [ref=e232]:
                    - text: No Active Threads
                    - generic [ref=e233]: ▋
                  - paragraph [ref=e234]: Coach-to-athlete communications are CC'd to this thread automatically for full oversight.
  - complementary [ref=e235]
  - complementary [ref=e236]:
    - generic [ref=e237]:
      - heading [level=2] [ref=e242]: Alerts
      - button [ref=e243] [cursor=pointer]
    - generic [ref=e246]:
      - paragraph [ref=e248]: No alerts right now.
      - paragraph [ref=e249]: We'll notify you when something needs your attention.
```

# Test source

```ts
  6   | const DATA_CYAN_RGB = 'rgb(20, 184, 166)';       // #14b8a6 (Solid)
  7   | const DATA_CYAN_RGBA = 'rgba(20, 184, 166, 0.6)'; // #14b8a6 (Translucent Hover)
  8   | const ATOMPUNK_AMBER_RGB = 'rgb(245, 158, 11)';   // #f59e0b (Accent)
  9   | const ACTION_GOLD_RGB = 'rgb(251, 191, 36)';      // #fbbf24 (CTA Text)
  10  | const SOFT_CYAN_RGB = 'rgb(45, 217, 218)';        // #2dd9da (Parent Accent)
  11  | const SLATE_50_RGB = 'rgb(241, 245, 249)';         // #f1f5f9 (Muted Slate)
  12  |
  13  | const COMPLIANT_HOVER_COLORS = [
  14  |   DATA_CYAN_RGB,
  15  |   DATA_CYAN_RGBA,
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
  28  |       { name: 'overview', path: '/admin/overview', waitSelector: '.pd-page-root, .st-bento' },
  29  |       { name: 'users', path: '/admin/users', waitSelector: '.pd-page-root' },
  30  |       { name: 'organizations', path: '/admin/organizations', waitSelector: '.pd-page-root' },
  31  |       { name: 'audit-logs', path: '/admin/audit-log', waitSelector: '.pd-page-root' },
  32  |       { name: 'settings', path: '/admin/system-settings', waitSelector: '.pd-page-root' }
  33  |     ]
  34  |   },
  35  |   player: {
  36  |     uid: 'player-telemetry-uid',
  37  |     role: 'player',
  38  |     clubId: 'aggiesfc',
  39  |     routes: [
  40  |       { name: 'dashboard', path: '/player/dashboard', waitSelector: '.player-dossier-root, .st-bento' },
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
  60  |       { name: 'dashboard', path: '/parent/dashboard', waitSelector: '.pd-page-root, .compliance-vault, .st-bento' },
  61  |       { name: 'household', path: '/parent/household', waitSelector: '.pd-page-root, .household-graph' },
  62  |       { name: 'trust-center', path: '/parent/trust-center', waitSelector: '.pd-page-root, .compliance-vault' },
  63  |       { name: 'payments', path: '/parent/payments', waitSelector: '.pd-page-root, .compliance-vault' }
  64  |     ]
  65  |   },
  66  |   director: {
  67  |     uid: 'director-telemetry-uid',
  68  |     role: 'director',
  69  |     clubId: 'aggiesfc',
  70  |     routes: [
  71  |       { name: 'dashboard', path: '/director/dashboard', waitSelector: '.director-console-page' }
  72  |     ]
  73  |   }
  74  | };
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
  89  |   const gridChildren = page.locator('.tw-grid > *, .st-bento > *, [class*="Bento"] > *');
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
> 106 |         throw new Error(`[COLLISION DETECTED] Element ${a.id} overlaps Element ${b.id} on route: ${routeName}`);
      |               ^ Error: [COLLISION DETECTED] Element 0 overlaps Element 1 on route: dashboard
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
  158 |           clubId: p.clubId,
  159 |           clearance: { status: 'cleared' }
  160 |         }));
  161 |       }, persona);
  162 |     });
  163 |
  164 |     for (const route of persona.routes) {
  165 |       test(`Navigate & Audit: ${route.name.toUpperCase()}`, async ({ page }) => {
  166 |         // Create isolated folders for each target review segment
  167 |         const personaDir = join(artifactsDir, personaName);
  168 |         if (!existsSync(personaDir)) {
  169 |           mkdirSync(personaDir, { recursive: true });
  170 |         }
  171 |
  172 |         // 1. Navigate directly to the target route using fast load gating (bypass gRPC networkidle lock)
  173 |         await page.goto(route.path, { waitUntil: 'load' });
  174 |
  175 |         // 2. Wait explicitly for the Svelte 5 DOM and page elements to hydrate
  176 |         await page.waitForSelector(route.waitSelector, { state: 'visible', timeout: 10000 });
  177 |         await page.waitForTimeout(300); // Allow reactivity and animations to settle
  178 |
  179 |         // 3. Assert no unstyled light-mode flash exists (Void Black/Navy Slate only)
  180 |         const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  181 |         expect(bg).not.toBe('rgb(255, 255, 255)');
  182 |
  183 |         // 4. Run coordinate box layout overlap calculations
  184 |         await runMicroscopicLayoutAssertions(page, route.name);
  185 |
  186 |         // 5. Perform active hover style validation against brand links
  187 |         await verifyInteractiveHoverState(page, '.vanguard-link, .pd-nav-link, .st-bento a:not(.quest-hero__cta)');
  188 |
  189 |         // 6. Deposit visual proof screenshot directly into audit-artifacts/
  190 |         const screenshotPath = join(personaDir, `${route.name}-desktop.png`);
  191 |         await page.screenshot({ path: screenshotPath, fullPage: true });
  192 |         console.log(`[VISUAL AUDIT PASSED] Screenshot exported to: ${screenshotPath}`);
  193 |       });
  194 |     }
  195 |   });
  196 | }
  197 |
```