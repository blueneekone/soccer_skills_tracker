# =============================================================================
# SSTRACKER WAR ROOM: JULES AUTONOMOUS DEPLOYMENT & SELF-HEALING WORKFLOW
# =============================================================================
# This master-level workflow file directs Google Jules to implement our custom
# interactive tactical features, compile them, execute visual regression tests,
# and programmatically self-correct any Svelte 5 compilation or layout errors.
# =============================================================================

@task: "Deploy, verify, and programmatically self-heal the custom Coach/Player OS War Room simulator upgrades."
@target_files: [
  "src/lib/services/coach/CoachTacticalEngine.svelte.ts",
  "src/lib/components/coach/TacticalArena.svelte",
  "src/lib/components/tactical/MistakeResetOverlay.svelte",
  "tests/tactical-war-room-v3.spec.ts"
]

---

## 🏛️ 1. SYSTEM SPECIFICATIONS & EXPECTED BEHAVIORS

Jules must verify that the following five custom tactical mechanics are completely implemented and functional:

1. **Dashed Flight Paths (Ball Vectors):**
   * Solid lines (`stroke="#10b981"`) are rendered for player movements.
   * Dashed lines (`stroke="#06b6d4"` with `stroke-dasharray="8,8"`) are rendered programmatically for ball passes.
2. **Right-Click Selective Splicing:**
   * Intercepting right-clicks (`oncontextmenu`) on an active path reveals a micro-context menu.
   * Clicking `[ DELETE ROUTE ]` triggers a slice on the Svelte 5 array (`routes = routes.filter(...)`) to delete *only* that specific route vector.
3. **Active Cursor-Mode Draggable Bézier Handles:**
   * Selecting a route reveals a dynamic yellow control point (`#fbbf24`) at the curve's midpoint.
   * Dragging this control point recalculates the quadratic curve coordinates in real time.
   * Timing is controlled by an inline range slider mapped directly to the route's `duration` value.
4. **Position-Specific Hostile Acronyms:**
   * Red hostiles must render using position-specific labels (`CB`, `CDM`, `LWB`, `ST`, `GK`) instead of numbers.
   * The text is styled in bold Geist Mono, centered inside a dark, yellow-bordered circle.
5. **The "Practice makes progress" Reset HUD:**
   * Dragging any point within 15px of the outer canvas border triggers the mistake state.
   * A non-distracting banner fades in carrying the phrase: `👉 "Practice makes progress"` in Switzer typography.
   * Below the text, a perfectly square button with `0px` rounded corners displaying `[ RESET DRILL ]` is rendered.
   * Clicking the button reverts coordinates to their last valid checkpoint atomically.

---

## 🧪 2. E2E TESTING SPECIFICATION: `tests/tactical-war-room-v3.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('SSTracker War Room Multi-Persona Feature Verification', () => {
  test('Should execute full drawing, right-click deletion, position tags, and out-of-bounds reset triggers', async ({ page }) => {
    
    // 1. Authenticate with custom claims and bypass SvelteKit auth walls
    const mockClaims = {
      uid: 'tactical-auditor-uid',
      email: 'coach@sstracker.app',
      role: 'coach',
      isProfileComplete: true
    };
    
    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    }, mockClaims);

    // Navigate to the War Room
    await page.goto('/coach/war-room');
    await page.waitForSelector('.pd-page-root', { timeout: 5000 });

    // 2. Assert Base Elements & Spacing Overlays
    const canvas = page.locator('svg');
    await expect(canvas).toBeVisible();

    // 3. Test Selective Splicing (Right-Click Context Menu)
    // Simulate drawing two routes and right-clicking the second to splice
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('simulate-draw-route', { detail: { type: 'player' } }));
      window.dispatchEvent(new CustomEvent('simulate-draw-route', { detail: { type: 'ball' } }));
    });

    const secondRoute = page.locator('path').nth(1);
    await secondRoute.click({ button: 'right' });

    const deleteButton = page.locator('text=[ DELETE ROUTE ]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Ensure the second route was spliced and is no longer rendered
    await expect(secondRoute).not.toBeVisible();

    // 4. Test Hostile Position Acronym Badge
    const hostileMenu = page.locator('select');
    await hostileMenu.selectOption('CDM');
    await canvas.click({ position: { x: 200, y: 200 } });

    const hostileBadge = page.locator('text=CDM');
    await expect(hostileBadge).toBeVisible();
    await expect(hostileBadge).toHaveCSS('font-family', /Geist Mono|monospace/);

    // 5. Test "Practice makes progress" Out-of-Bounds Reset
    // Simulate dragging a point out-of-bounds (within 15px of boundary)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('simulate-out-of-bounds-drag'));
    });

    const prompt = page.locator('text=Practice makes progress');
    await expect(prompt).toBeVisible();

    const resetButton = page.locator('text=[ RESET DRILL ]');
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toHaveCSS('border-radius', '0px'); // Explicitly square

    // Reset and assert cleanup
    await resetButton.click();
    await expect(prompt).not.toBeVisible();
    await expect(resetButton).not.toBeVisible();
  });
});
```

---

## 🛠️ 3. AUTONOMOUS SELF-HEALING DEPLOYMENT PROTOCOL

Jules is commanded to execute the following loop to deploy and mathematically prove these upgrades are fully stable:

### Step A: Code Integration
1. Write `src/lib/services/coach/CoachTacticalEngine.svelte.ts` using our reactive Svelte 5 model.
2. Write `src/lib/components/coach/TacticalArena.svelte` containing our interactive SVG layers and event handlers (ensuring absolutely NO escape string formatting errors like `\\n` inside coordinate arrays).
3. Write `src/lib/components/tactical/MistakeResetOverlay.svelte` containing the custom banner and reset layout.
4. Write `tests/tactical-war-room-v3.spec.ts` containing the full visual and functional assertions.

### Step B: The Verification & Repair Loop
Run the compiler check and Playwright E2E browser traversal:
```bash
pnpm install
npm run check
npx eslint --fix
pnpm playwright test tests/tactical-war-room-v3.spec.ts --project=chromium
```

**CRITICAL CRITIC LOOP (Max 3 Iterations):**
* **If Compilation Fails (Parse/TypeScript/Rune errors):**
  1. Inspect the terminal error stack and identify the exact line number.
  2. Rewrite the failing component using strict Svelte 5 runes (`$state`, `$derived.by`, `$effect`, and `untrack` wrappers).
  3. Ensure no double-escaped characters exist.
  4. Rerun `npm run check`.
* **If Playwright Fails (Visual Offsets / DOM mismatch):**
  1. Inspect the test traceback.
  2. Adjust the CSS tokens inside Svelte components (matching Void Black `#0a0a0a`, Data Cyan `#06b6d4`, Action Gold `#fbbf24`, and square `tw-rounded-none` borders).
  3. Rerun the E2E tests.

### Step C: Zero-Touch PR Delivery
Once Svelte checks return exactly **0 errors and 0 warnings** and Playwright tests are **100% green**:
1. Commit the code.
2. Capture visual screenshots and save them directly to `/audit-artifacts/player/mistake-recovery-v3.png`.
3. Open a clean, non-conflicting Pull Request directly to `dev`.
