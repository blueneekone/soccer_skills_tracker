# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit-computed-styles-v5.spec.js >> SSTracker Elite Visual Compliance Suite >> Assert Strict "Nuclear Americana Tech Noir" Compliance
- Location: e2e\audit-computed-styles-v5.spec.js:77:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
    "className": Any<String>,
-   "color": "rgb(0, 0, 0)",
+   "color": "rgb(9, 9, 11)",
  }
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - main [ref=e4]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - heading "NEXUS COMMAND" [level=1] [ref=e11]
        - paragraph [ref=e12]: VANGUARD AUTH PROTOCOL
      - generic [ref=e13]:
        - button "Sign in with Passkey" [ref=e14] [cursor=pointer]
        - button "Continue with Google" [ref=e17] [cursor=pointer]
        - generic [ref=e23]: Or
        - textbox "Email address" [ref=e24]
        - button "Send Magic Link" [ref=e25] [cursor=pointer]
      - paragraph [ref=e29]: TACTICAL OPERATIONS PLATFORM
      - link "Initialize Operative" [ref=e30] [cursor=pointer]:
        - /url: /login
  - generic [ref=e32]: Login · NEXUS COMMAND
```

# Test source

```ts
  16  |                 mapValue: {
  17  |                     fields: {
  18  |                         totalXP: { integerValue: 2500 },
  19  |                         streakFreeze: {
  20  |                             mapValue: {
  21  |                                 fields: {
  22  |                                     available: { integerValue: 1 }
  23  |                                 }
  24  |                             }
  25  |                         },
  26  |                         stats: {
  27  |                             mapValue: {
  28  |                                 fields: {
  29  |                                     scoutsSix: {
  30  |                                         mapValue: {
  31  |                                             fields: {
  32  |                                                 accuracy: { doubleValue: 88.00 },
  33  |                                                 speed: { doubleValue: 75.00 },
  34  |                                                 consistency: { doubleValue: 90.00 },
  35  |                                                 power: { doubleValue: 80.00 },
  36  |                                                 endurance: { doubleValue: 85.00 },
  37  |                                                 tactics: { doubleValue: 92.00 }
  38  |                                             }
  39  |                                         }
  40  |                                     }
  41  |                                 }
  42  |                             }
  43  |                         }
  44  |                     }
  45  |                 }
  46  |             }
  47  |         }
  48  |     };
  49  | 
  50  |     try {
  51  |         const res = await fetch(EMULATOR_FIRESTORE_URL, {
  52  |             method: 'PATCH',
  53  |             headers: { 
  54  |                 'Content-Type': 'application/json',
  55  |                 'Authorization': 'Bearer owner'
  56  |             },
  57  |             body: JSON.stringify(payload)
  58  |         });
  59  |         if (res.ok) {
  60  |             console.log('[+] Firestore Emulator successfully seeded with completed profile.');
  61  |         } else {
  62  |             console.error('[-] Failed to seed Firestore Emulator:', res.statusText);
  63  |         }
  64  |     } catch (err) {
  65  |         console.error('[-] Network error seeding Firestore Emulator:', err.message);
  66  |     }
  67  | }
  68  | 
  69  | test.describe('SSTracker Elite Visual Compliance Suite', () => {
  70  |     const targetPersona = process.env.AUDIT_TARGET || 'coach';
  71  |     const targetRoute = `/${targetPersona}/dashboard`;
  72  | 
  73  |     test.beforeAll(async () => {
  74  |         await seedMockProfile();
  75  |     });
  76  | 
  77  |     test('Assert Strict "Nuclear Americana Tech Noir" Compliance', async ({ page }) => {
  78  |         // Inject auth token to skip login screen
  79  |         await page.addInitScript(() => {
  80  |             const firebaseApiKey = "AIzaSyCiBoemXJHTkTnujTwM1vOJc4FrVZF8Lw8";
  81  |             const storageKey = `firebase:authUser:${firebaseApiKey}:[DEFAULT]`;
  82  |             const mockUser = {
  83  |                 uid: 'mock-coach-uid',
  84  |                 email: 'mock@test.com',
  85  |                 emailVerified: true,
  86  |                 isAnonymous: false,
  87  |                 stsTokenManager: {
  88  |                     accessToken: "mock-jwt-access-token",
  89  |                     refreshToken: "mock-refresh-token",
  90  |                     expirationTime: Date.now() + 3600000
  91  |                 },
  92  |                 claims: { role: 'coach' }
  93  |             };
  94  |             window.localStorage.setItem(storageKey, JSON.stringify(mockUser));
  95  |         });
  96  | 
  97  |         page.on('console', msg => console.log(msg.text()));
  98  |         console.log(`[Audit] Navigating to ${targetRoute} for validation...`);
  99  |         await page.goto(targetRoute);
  100 |         await page.waitForLoadState('domcontentloaded');
  101 |         await page.waitForTimeout(2000);
  102 | 
  103 |         // Fail-safe: Detect if SvelteKit unauth route guard hijacked page and redirected to /setup
  104 |         const currentUrl = page.url();
  105 |         if (currentUrl.includes('/setup')) {
  106 |             throw new Error(`[-] CRITICAL GATE FAILURE: SvelteKit redirected traversal to /setup due to incomplete Auth hydration.`);
  107 |         }
  108 | 
  109 |         // 1. Assert strict 60-30-10 Color Palette Contrast
  110 |         const canvasBg = await page.evaluate(() => {
  111 |             console.log('DOM BODY:', document.body.innerHTML);
  112 |             const el = document.querySelector('.app-shell') || document.body;
  113 |             return { color: window.getComputedStyle(el).backgroundColor, className: el.className };
  114 |         });
  115 |         // Strict check: Must match rgb(0, 0, 0) - absolute Void Black
> 116 |         expect(canvasBg).toEqual({ color: 'rgb(0, 0, 0)', className: expect.any(String) });
      |                          ^ Error: expect(received).toEqual(expected) // deep equality
  117 | 
  118 |         // 2. Enforce the Singular CTA Constraint (Exactly ONE Action Gold #fbbf24 primary CTA per viewport)
  119 |         const goldCTAs = await page.locator('.tw-bg-\\[\\#fbbf24\\]').count();
  120 |         expect(goldCTAs).toBeLessThanOrEqual(1);
  121 | 
  122 |         // 3. Typographical Token Checks
  123 |         const monoTelemetry = page.locator('.tw-font-mono');
  124 |         const count = await monoTelemetry.count();
  125 |         for (let i = 0; i < count; i++) {
  126 |             const font = await monoTelemetry.nth(i).evaluate(el => window.getComputedStyle(el).fontFamily);
  127 |             expect(font.toLowerCase()).toContain('mono');
  128 |         }
  129 | 
  130 |         // 4. Persona-Specific Microscopic Corner Audits
  131 |         if (targetPersona === 'coach' || targetPersona === 'commissioner' || targetPersona === 'admin') {
  132 |             // Enforce sharp 90-degree SIEM dashboard corners
  133 |             const panels = page.locator('.vanguard-panel, .glass-panel');
  134 |             const panelCount = await panels.count();
  135 |             for (let i = 0; i < panelCount; i++) {
  136 |                 const radius = await panels.nth(i).evaluate(el => window.getComputedStyle(el).borderRadius);
  137 |                 expect(radius).toBe('0px');
  138 |             }
  139 |         } else if (targetPersona === 'parent') {
  140 |             // Enforce structural trust premium 24px rounded corners
  141 |             const parentPanels = page.locator('.parent-vault-panel');
  142 |             if (await parentPanels.count() > 0) {
  143 |                 const radius = await parentPanels.first().evaluate(el => window.getComputedStyle(el).borderRadius);
  144 |                 expect(radius).toBe('24px');
  145 |             }
  146 |         } else if (targetPersona === 'player') {
  147 |             // Enforce gamification outer card chamfers
  148 |             const playerCard = page.locator('.player-gamified-card');
  149 |             if (await playerCard.count() > 0) {
  150 |                 const clipPath = await playerCard.first().evaluate(el => window.getComputedStyle(el).clipPath);
  151 |                 expect(clipPath).toContain('polygon');
  152 |             }
  153 |         }
  154 | 
  155 |         // 5. Asymmetric 12-Column Bento Grid Math Assertions
  156 |         const grid = page.locator('.tw-grid');
  157 |         const gridCount = await grid.count();
  158 |         for (let i = 0; i < gridCount; i++) {
  159 |             const gridTemplate = await grid.nth(i).evaluate(el => window.getComputedStyle(el).gridTemplateColumns);
  160 |             if (gridTemplate.includes('repeat')) {
  161 |                 expect(gridTemplate).toMatch(/(clamp|minmax)/);
  162 |             }
  163 |         }
  164 | 
  165 |         // 6. Viewport capture limits (1280px, 768px, 375px)
  166 |         const viewports = [
  167 |             { width: 1280, height: 800, name: 'desktop' },
  168 |             { width: 768, height: 1024, name: 'tablet' },
  169 |             { width: 375, height: 667, name: 'mobile' }
  170 |         ];
  171 | 
  172 |         for (const vp of viewports) {
  173 |             await page.setViewportSize({ width: vp.width, height: vp.height });
  174 |             await page.waitForTimeout(200); // Wait for CSS transition kinetics (150-250ms)
  175 |             await page.screenshot({
  176 |                 path: `./audit-artifacts/${targetPersona}/${vp.name}-visual-audit.png`,
  177 |                 fullPage: true
  178 |             });
  179 |         }
  180 | 
  181 |         console.log(`[+] Visual audit successful! High-definition screenshots deposited for ${targetPersona}.`);
  182 |     });
  183 | });
  184 | 
```