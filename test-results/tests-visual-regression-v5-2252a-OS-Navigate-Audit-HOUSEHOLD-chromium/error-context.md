# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/visual-regression-v5.spec.ts >> EPIC COMPREHENSIVE TRAVERSAL: PARENT OS >> Navigate & Audit: HOUSEHOLD
- Location: tests/visual-regression-v5.spec.ts:194:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.screenshot: Test timeout of 30000ms exceeded.
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

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
      - generic [ref=e83]:
        - generic [ref=e85]:
          - paragraph [ref=e86]: Parent OS · TIER-0 ACCESS
          - heading "Household Clearance Center" [level=1] [ref=e87]
          - paragraph [ref=e88]: Classified provisioning. Minors do not self-register. Digital signatures and dispatch codes are the only valid ingress paths.
        - generic [ref=e89]:
          - region [ref=e91]:
            - generic [ref=e92]:
              - generic [ref=e93]: COPPA & LIABILITY
              - heading "Minor accounts locked" [level=2] [ref=e94]
            - paragraph [ref=e95]: Until you execute the digital signature below, child operative accounts in this household remain inert (no self-initiation). By signing, you assert parental authority to provision credentials per club policy and federal child-privacy law.
            - generic [ref=e96]:
              - generic [ref=e97]: Clearance file
              - generic [ref=e98]: PENDING SIGNATURE
            - paragraph [ref=e99]: Household / club line
            - generic [ref=e100]: "HH: — (created on sign) · Club: aggiesfc"
            - button "Sign waiver & authorize" [ref=e101] [cursor=pointer]
          - generic [ref=e102]:
            - region [ref=e103]:
              - generic [ref=e104]:
                - text: Operative generation
                - heading "Credential dispatch" [level=2] [ref=e105]
              - paragraph [ref=e106]: Register the minor’s legal display name and a unique Operative Callsign (username for sign-in). A proxy account is created automatically. The engine issues a one-time DISPATCH code for Operative login.
              - generic [ref=e107]:
                - generic [ref=e108]:
                  - generic [ref=e109]: Operative name
                  - textbox "Operative name" [ref=e110]:
                    - /placeholder: Full name (minor)
                - generic [ref=e111]:
                  - generic [ref=e112]: Operative Callsign (required)
                  - textbox "Operative Callsign (required)" [ref=e113]:
                    - /placeholder: e.g. Red-Fox, striker99
                - generic [ref=e114]:
                  - generic [ref=e115]:
                    - generic [ref=e116]: Dispatch Code (optional)
                    - button "[ ? ]" [ref=e118]
                  - textbox "Dispatch Code (optional)" [ref=e119]:
                    - /placeholder: e.g. AB-1K2M
                  - paragraph [ref=e120]: Optional team dispatch code from your coach (e.g. AB-1K2M). Links your operative to the roster when you provision credentials.
              - button "Generate operative credentials" [disabled] [ref=e122] [cursor=pointer]
            - region [ref=e123]:
              - generic [ref=e124]:
                - text: Club transfer
                - heading "Vanguard transfer protocol" [level=2] [ref=e125]
              - paragraph [ref=e126]: Initiate a player transfer to another club. You will receive a token to share with the destination registrar; confirm with their auth code when prompted.
              - generic [ref=e127]:
                - generic [ref=e128]:
                  - generic [ref=e134]:
                    - generic [ref=e135]: VANGUARD TRANSFER PROTOCOL
                    - generic [ref=e136]: PARENT AUTHORIZATION TERMINAL
                  - generic [ref=e137]: RESTRICTED
                - generic [ref=e139]:
                  - generic [ref=e140]:
                    - generic [ref=e141]: "1"
                    - text: PARENT INITIATES
                  - generic [ref=e142]:
                    - generic [ref=e143]: "2"
                    - text: DIRECTOR ACCEPTS
                  - generic [ref=e144]:
                    - generic [ref=e145]: "3"
                    - text: PARENT CONFIRMS
                  - generic [ref=e146]:
                    - generic [ref=e147]: "4"
                    - text: DATA PORTED
                - generic [ref=e149]:
                  - generic [ref=e150]: "⚠ ZERO-TRUST PROTOCOL: Transfers are irreversible without re-initiation. Only the COPPA-verified parent account may authorize movement of player data."
                  - generic [ref=e151]:
                    - text: PLAYER EMAIL
                    - textbox "player@club.com" [ref=e152]
                  - button "[ INITIATE TRANSFER PROTOCOL ]" [ref=e153]
                - generic [ref=e154]: COPPA-VERIFIED · HMAC-SHA256 · 48H TOKEN TTL VANGUARD NEXUS v4
  - complementary [ref=e155]
  - complementary [ref=e156]:
    - generic [ref=e157]:
      - heading [level=2] [ref=e162]: Alerts
      - button [ref=e163] [cursor=pointer]
    - generic [ref=e166]:
      - paragraph [ref=e168]: No alerts right now.
      - paragraph [ref=e169]: We'll notify you when something needs your attention.
```

# Test source

```ts
  120 |       const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  121 |       if (overlapX > 1 && overlapY > 1) {
  122 |         const classA = await gridChildren.nth(i).evaluate(el => el.className);
  123 |         const classB = await gridChildren.nth(j).evaluate(el => el.className);
  124 |         throw new Error(`[COLLISION DETECTED] Element ${a.id} (${classA}) overlaps Element ${b.id} (${classB}) on route: ${routeName}`);
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
> 220 |         await page.screenshot({ path: screenshotPath, fullPage: true });
      |                    ^ Error: page.screenshot: Test timeout of 30000ms exceeded.
  221 |         console.log(`[VISUAL AUDIT PASSED] Screenshot exported to: ${screenshotPath}`);
  222 |       });
  223 |     }
  224 |   });
  225 | }
  226 |
```