# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: platform-exhaustive-master.spec.ts >> Private Coaching & Tutoring Marketplace (@tutoring-marketplace) >> Tutor Directory: verify coach listings and session booking modal
- Location: tests\platform-exhaustive-master.spec.ts:256:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.tutor-directory, .vanguard-panel, main').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.tutor-directory, .vanguard-panel, main').first()

```

```yaml
- heading "NEXUS COMMAND" [level=1]
- paragraph: VANGUARD AUTH PROTOCOL
- button "Sign in with Passkey" [disabled]
- button "Continue with Google" [disabled]
- text: Or
- textbox "Email address"
- button "Send Magic Link" [disabled]
- paragraph: TACTICAL OPERATIONS PLATFORM
- link "Initialize Operative":
  - /url: /login
- text: Login · NEXUS COMMAND
```

# Test source

```ts
  164 | 
  165 | 		const workoutLogger = page.locator('form, .vanguard-panel, main').first();
  166 | 		await expect(workoutLogger).toBeVisible();
  167 | 
  168 | 		const logBtn = page.locator('button:has-text("LOG WORKOUT"), button:has-text("COMPLETE"), button:has-text("SAVE")').first();
  169 | 		if (await logBtn.isVisible()) {
  170 | 			await expect(logBtn).toBeVisible();
  171 | 		}
  172 | 	});
  173 | 
  174 | 	test('Player Armory & Avatar Builder: verify vector operative studio, part slots, and card gallery', async ({ page }) => {
  175 | 		await page.goto('/player/armory');
  176 | 		await page.waitForLoadState('networkidle');
  177 | 
  178 | 		// Assert Armory / Studio Shell
  179 | 		const armoryRoot = page.locator('.vanguard-panel, .armory-deck, main').first();
  180 | 		await expect(armoryRoot).toBeVisible();
  181 | 
  182 | 		// Verify Avatar Studio Tabs (Studio, Album, Ceremonies)
  183 | 		const studioTab = page.locator('button:has-text("Studio"), a:has-text("Studio"), button:has-text("Customizer")').first();
  184 | 		if (await studioTab.isVisible()) {
  185 | 			await studioTab.click();
  186 | 			await page.waitForTimeout(200);
  187 | 		}
  188 | 	});
  189 | 
  190 | 	test('Pro Player Cards & Sticker Album: verify card holographic foil variants and sticker pack sets', async ({ page }) => {
  191 | 		await page.goto('/player/armory?tab=cards');
  192 | 		await page.waitForLoadState('networkidle');
  193 | 
  194 | 		// Assert Sticker Album Workspace / Card Gallery Shell
  195 | 		const albumHeading = page.locator('text=Sticker album, text=Season 1, .card-gallery, [class*="album"]').first();
  196 | 		if (await albumHeading.isVisible()) {
  197 | 			await expect(albumHeading).toBeVisible();
  198 | 		}
  199 | 
  200 | 		// Assert Pro Player Card / Sticker Foil Container
  201 | 		const stickerFoil = page.locator('.pro-player-card, .sticker-variant, [class*="sticker"], [class*="foil"]').first();
  202 | 		if (await stickerFoil.isVisible()) {
  203 | 			await expect(stickerFoil).toBeVisible();
  204 | 		}
  205 | 	});
  206 | 
  207 | 	test('Proving Grounds & Challenges: verify 1v1 drill leaderboards', async ({ page }) => {
  208 | 		await page.goto('/player/proving-grounds');
  209 | 		await page.waitForLoadState('networkidle');
  210 | 		const pgRoot = page.locator('.vanguard-panel, main').first();
  211 | 		await expect(pgRoot).toBeVisible();
  212 | 	});
  213 | });
  214 | 
  215 | // ═════════════════════════════════════════════════════════════════════════════
  216 | // 5. RECRUITER OS & CHECKR VETTING (@recruiter-vetting)
  217 | // ═════════════════════════════════════════════════════════════════════════════
  218 | 
  219 | test.describe('Recruiter Portal & Background Clearance (@recruiter-vetting)', () => {
  220 | 	test('Recruiter Directory: verify talent search and scout filter controls', async ({ page }) => {
  221 | 		await page.goto('about:blank');
  222 | 		await setupAuth(page, 'recruiter', 'scout.ncaa@sstracker.local', 'recruiter-scout-uid', {
  223 | 			checkrStatus: 'CLEAR',
  224 | 		});
  225 | 
  226 | 		await page.goto('/recruiter');
  227 | 		await page.waitForLoadState('networkidle');
  228 | 
  229 | 		const recruiterRoot = page.locator('.recruiter-hub, .vanguard-panel, main').first();
  230 | 		await expect(recruiterRoot).toBeVisible();
  231 | 	});
  232 | });
  233 | 
  234 | // ═════════════════════════════════════════════════════════════════════════════
  235 | // 6. FAN BROADCAST & MATCHDAY STREAMING (@fan-broadcast)
  236 | // ═════════════════════════════════════════════════════════════════════════════
  237 | 
  238 | test.describe('Fan Broadcast & Sideline SIEM (@fan-broadcast)', () => {
  239 | 	test('Fan Hub: verify live scoreboard, match video, and digital ticketing', async ({ page }) => {
  240 | 		await page.goto('about:blank');
  241 | 		await setupAuth(page, 'fan', 'fan.diego@sstracker.local', 'fan-diego-uid');
  242 | 
  243 | 		await page.goto('/fan');
  244 | 		await page.waitForLoadState('networkidle');
  245 | 
  246 | 		const fanRoot = page.locator('.fan-hub, .vanguard-panel, main').first();
  247 | 		await expect(fanRoot).toBeVisible();
  248 | 	});
  249 | });
  250 | 
  251 | // ═════════════════════════════════════════════════════════════════════════════
  252 | // 7. PRIVATE TUTORING MARKETPLACE (@tutoring-marketplace)
  253 | // ═════════════════════════════════════════════════════════════════════════════
  254 | 
  255 | test.describe('Private Coaching & Tutoring Marketplace (@tutoring-marketplace)', () => {
  256 | 	test('Tutor Directory: verify coach listings and session booking modal', async ({ page }) => {
  257 | 		await page.goto('about:blank');
  258 | 		await setupAuth(page, 'parent', 'parent.booking@sstracker.local', 'parent-book-uid');
  259 | 
  260 | 		await page.goto('/directory');
  261 | 		await page.waitForLoadState('networkidle');
  262 | 
  263 | 		const dirRoot = page.locator('.tutor-directory, .vanguard-panel, main').first();
> 264 | 		await expect(dirRoot).toBeVisible();
      |                         ^ Error: expect(locator).toBeVisible() failed
  265 | 	});
  266 | });
  267 | 
```