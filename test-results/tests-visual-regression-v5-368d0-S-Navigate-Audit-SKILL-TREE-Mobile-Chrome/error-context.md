# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: PLAYER OS >> Navigate & Audit: SKILL-TREE
- Location: tests\visual-regression-v5.spec.ts:186:7

# Error details

```
Error: [COLLISION DETECTED] Element 0 (pd-page-root player-dossier-root st-page tw-h-[100dvh] tw-min-w-0 tw-overflow-hidden tw-flex tw-flex-col tw-text-white s-1GIp0BcDeNN_) overlaps Element 1 (st-cell-primary tw-relative chamfered-card s-1GIp0BcDeNN_) on route: skill-tree
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e4]:
    - complementary [ref=e5]:
      - generic [ref=e6]:
        - heading [level=2] [ref=e11]: Alerts
        - button [ref=e12] [cursor=pointer]
      - generic [ref=e15]:
        - paragraph [ref=e17]: No alerts right now.
        - paragraph [ref=e18]: We'll notify you when something needs your attention.
    - main [ref=e22]:
      - generic [ref=e24]:
        - generic "Physical progression" [ref=e25]:
          - generic [ref=e26]:
            - generic [ref=e27]:
              - heading "Physical progression" [level=1] [ref=e28]
              - paragraph [ref=e29]: Progress / Skill tree
            - status [ref=e30]:
              - generic [ref=e31]: ROOKIE
        - generic [ref=e32]:
          - generic [ref=e33]:
            - generic [ref=e34]:
              - img "Composite Snowflake skill tree" [ref=e35]:
                - 'button "Skill: First Step (locked)" [ref=e68] [cursor=pointer]'
                - 'button "Skill: Burst Speed (locked)" [ref=e69] [cursor=pointer]'
                - 'button "Skill: Top-End Pace (locked)" [ref=e70] [cursor=pointer]'
                - 'button "Skill: Explosive Start (locked)" [ref=e71] [cursor=pointer]'
                - 'button "Skill: Sprint Endurance (locked)" [ref=e72] [cursor=pointer]'
                - 'button "Skill: React & Drive (locked)" [ref=e73] [cursor=pointer]'
                - 'button "Skill: Hip Turn (locked)" [ref=e74] [cursor=pointer]'
                - 'button "Skill: Power Step (locked)" [ref=e75] [cursor=pointer]'
                - 'button "Skill: False Start (locked)" [ref=e76] [cursor=pointer]'
                - 'button "Skill: Jet Cuts (locked)" [ref=e77] [cursor=pointer]'
                - 'button "Skill: Loaded Stance (locked)" [ref=e78] [cursor=pointer]'
                - 'button "Skill: Ground Strike (locked)" [ref=e79] [cursor=pointer]'
                - 'button "Skill: Vertical Leap (locked)" [ref=e80] [cursor=pointer]'
                - 'button "Skill: Power Header (locked)" [ref=e81] [cursor=pointer]'
                - 'button "Skill: Long Drive (locked)" [ref=e82] [cursor=pointer]'
                - 'button "Skill: Body Balance (locked)" [ref=e83] [cursor=pointer]'
                - 'button "Skill: Work Rate (locked)" [ref=e84] [cursor=pointer]'
                - 'button "Skill: Elite Readiness (locked)" [ref=e85] [cursor=pointer]'
                - 'button "Skill: Tactical Engine (locked)" [ref=e86] [cursor=pointer]'
                - 'button "Skill: Vanguard Form (locked)" [ref=e87] [cursor=pointer]'
                - 'button "Skill: Base Fitness (locked)" [ref=e88] [cursor=pointer]'
                - 'button "Skill: Interval Recovery (locked)" [ref=e89] [cursor=pointer]'
                - 'button "Skill: Pressing Engine (locked)" [ref=e90] [cursor=pointer]'
                - 'button "Skill: 90-Min Wall (locked)" [ref=e91] [cursor=pointer]'
                - 'button "Skill: Iron Lungs (locked)" [ref=e92] [cursor=pointer]'
                - 'button "Skill: Lateral Shuffle (locked)" [ref=e93] [cursor=pointer]'
                - 'button "Skill: Cone Weave (locked)" [ref=e94] [cursor=pointer]'
                - 'button "Skill: Hip Fluidity (locked)" [ref=e95] [cursor=pointer]'
                - 'button "Skill: Scissors Step (locked)" [ref=e96] [cursor=pointer]'
                - 'button "Skill: Change of Speed (locked)" [ref=e97] [cursor=pointer]'
              - generic:
                - img "Vanguard Prism — athletic stat hexagon":
                  - generic: PAC
                  - generic: ACC
                  - generic: POW
                  - generic: VAN
                  - generic: STM
                  - generic: AGI
            - generic:
              - generic:
                - generic:
                  - button "PAC · 0/5/5" [ref=e98] [cursor=pointer]
                  - button "ACC · 0/5/5" [ref=e99] [cursor=pointer]
                  - button "POW · 0/5/5" [ref=e100] [cursor=pointer]
                  - button "VAN · 0/5/5" [ref=e101] [cursor=pointer]
                  - button "STM · 0/5/5" [ref=e102] [cursor=pointer]
                  - button "AGI · 0/5/5" [ref=e103] [cursor=pointer]
                - generic: "[ ROOKIE ]"
          - generic [ref=e104]:
            - generic [ref=e105]:
              - paragraph [ref=e106]: Current tier
              - paragraph [ref=e107]: ROOKIE
              - paragraph [ref=e109]: 0 XP
              - paragraph [ref=e110]: 1,000 XP to PRO
            - generic [ref=e111]:
              - paragraph [ref=e112]: Branch progress
              - generic [ref=e113]:
                - generic [ref=e114]: PAC
                - generic [ref=e116]: 0/5
              - generic [ref=e117]:
                - generic [ref=e118]: ACC
                - generic [ref=e120]: 0/5
              - generic [ref=e121]:
                - generic [ref=e122]: POW
                - generic [ref=e124]: 0/5
              - generic [ref=e125]:
                - generic [ref=e126]: VAN
                - generic [ref=e128]: 0/5
              - generic [ref=e129]:
                - generic [ref=e130]: STM
                - generic [ref=e132]: 0/5
              - generic [ref=e133]:
                - generic [ref=e134]: AGI
                - generic [ref=e136]: 0/5
  - generic:
    - navigation [ref=e138]:
      - tablist [ref=e139]:
        - tab [ref=e140] [cursor=pointer]:
          - generic [ref=e142]: HQ
        - tab [ref=e143] [cursor=pointer]:
          - generic [ref=e145]: Train
        - tab [ref=e146] [cursor=pointer]:
          - generic [ref=e148]: Stats
        - tab [ref=e149] [cursor=pointer]:
          - generic [ref=e151]: Menu
    - navigation [ref=e152]:
      - tablist [ref=e153]:
        - tab [ref=e154] [cursor=pointer]:
          - generic [ref=e156]: HQ
        - tab [ref=e157] [cursor=pointer]:
          - generic [ref=e159]: Train
        - tab [ref=e160] [cursor=pointer]:
          - generic [ref=e162]: Stats
        - tab [ref=e163] [cursor=pointer]:
          - generic [ref=e165]: Menu
  - iframe [ref=e166]:
    
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
      |               ^ Error: [COLLISION DETECTED] Element 0 (pd-page-root player-dossier-root st-page tw-h-[100dvh] tw-min-w-0 tw-overflow-hidden tw-flex tw-flex-col tw-text-white s-1GIp0BcDeNN_) overlaps Element 1 (st-cell-primary tw-relative chamfered-card s-1GIp0BcDeNN_) on route: skill-tree
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