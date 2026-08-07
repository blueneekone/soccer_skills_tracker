# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: PARENT OS >> Navigate & Audit: HOUSEHOLD
- Location: tests\visual-regression-v5.spec.ts:177:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.pd-page-root, .household-graph') to be visible

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
      - generic [ref=e70]:
        - generic [ref=e72]:
          - paragraph [ref=e73]: Parent OS · TIER-0 ACCESS
          - heading "Household Clearance Center" [level=1] [ref=e74]
          - paragraph [ref=e75]: Classified provisioning. Minors do not self-register. Digital signatures and dispatch codes are the only valid ingress paths.
        - generic [ref=e76]:
          - region [ref=e78]:
            - generic [ref=e79]:
              - generic [ref=e80]: COPPA & LIABILITY
              - heading "Minor accounts locked" [level=2] [ref=e81]
            - paragraph [ref=e82]: Until you execute the digital signature below, child operative accounts in this household remain inert (no self-initiation). By signing, you assert parental authority to provision credentials per club policy and federal child-privacy law.
            - generic [ref=e83]:
              - generic [ref=e84]: Clearance file
              - generic [ref=e85]: PENDING SIGNATURE
            - paragraph [ref=e86]: Household / club line
            - generic [ref=e87]: "HH: — (created on sign) · Club: —"
            - button "Sign waiver & authorize" [ref=e88] [cursor=pointer]
          - generic [ref=e89]:
            - region [ref=e90]:
              - generic [ref=e91]:
                - text: Operative generation
                - heading "Credential dispatch" [level=2] [ref=e92]
              - paragraph [ref=e93]: Register the minor’s legal display name and a unique Operative Callsign (username for sign-in). A proxy account is created automatically. The engine issues a one-time DISPATCH code for Operative login.
              - generic [ref=e94]:
                - generic [ref=e95]:
                  - generic [ref=e96]: Operative name
                  - textbox "Operative name" [ref=e97]:
                    - /placeholder: Full name (minor)
                - generic [ref=e98]:
                  - generic [ref=e99]: Operative Callsign (required)
                  - textbox "Operative Callsign (required)" [ref=e100]:
                    - /placeholder: e.g. Red-Fox, striker99
                - generic [ref=e101]:
                  - generic [ref=e102]:
                    - generic [ref=e103]: Dispatch Code (optional)
                    - button "[ ? ]" [ref=e105]
                  - textbox "Dispatch Code (optional)" [ref=e106]:
                    - /placeholder: e.g. AB-1K2M
                  - paragraph [ref=e107]: Optional team dispatch code from your coach (e.g. AB-1K2M). Links your operative to the roster when you provision credentials.
              - button "Generate operative credentials" [disabled] [ref=e109] [cursor=pointer]
            - region [ref=e110]:
              - generic [ref=e111]:
                - text: Club transfer
                - heading "Vanguard transfer protocol" [level=2] [ref=e112]
              - paragraph [ref=e113]: Initiate a player transfer to another club. You will receive a token to share with the destination registrar; confirm with their auth code when prompted.
              - generic [ref=e114]:
                - generic [ref=e115]:
                  - generic [ref=e121]:
                    - generic [ref=e122]: VANGUARD TRANSFER PROTOCOL
                    - generic [ref=e123]: PARENT AUTHORIZATION TERMINAL
                  - generic [ref=e124]: RESTRICTED
                - generic [ref=e126]:
                  - generic [ref=e127]:
                    - generic [ref=e128]: "1"
                    - text: PARENT INITIATES
                  - generic [ref=e129]:
                    - generic [ref=e130]: "2"
                    - text: DIRECTOR ACCEPTS
                  - generic [ref=e131]:
                    - generic [ref=e132]: "3"
                    - text: PARENT CONFIRMS
                  - generic [ref=e133]:
                    - generic [ref=e134]: "4"
                    - text: DATA PORTED
                - generic [ref=e136]:
                  - generic [ref=e137]: "⚠ ZERO-TRUST PROTOCOL: Transfers are irreversible without re-initiation. Only the COPPA-verified parent account may authorize movement of player data."
                  - generic [ref=e138]:
                    - text: PLAYER EMAIL
                    - textbox "player@club.com" [ref=e139]
                  - button "[ INITIATE TRANSFER PROTOCOL ]" [ref=e140]
                - generic [ref=e141]: COPPA-VERIFIED · HMAC-SHA256 · 48H TOKEN TTL VANGUARD NEXUS v4
  - complementary [ref=e142]
  - complementary [ref=e143]:
    - generic [ref=e144]:
      - heading [level=2] [ref=e149]: Alerts
      - button [ref=e150] [cursor=pointer]
    - generic [ref=e153]:
      - paragraph [ref=e155]: No alerts right now.
      - paragraph [ref=e156]: We'll notify you when something needs your attention.
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