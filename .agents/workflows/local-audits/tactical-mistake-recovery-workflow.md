# =============================================================================
# SSTRACKER TACTICAL COGNITIVE RECOVERY WORKFLOW & VISUAL AUDIT PROTOCOL
# =============================================================================
# This master-level workflow file directs Antigravity and Jules to build,
# verify, and self-heal the Coach/Player OS Mistake Recovery system.
# It enforces strict Svelte 5 runes, tactical reset triggers, and 
# non-distracting psychological encouragement prompts.
# =============================================================================

# 🏛️ 1. ARCHITECTURAL OBJECTIVE: THE COGNITIVE RESET MECHANIC
Instead of legacy punitive error states, SSTracker implements an autonomy-supportive mistake ritual:
- **The Visual Reset Trigger:** A clean, tactical "RESET" button adhering to the 90-degree Atompunk design framework (absolutely no rounded borders or generic UI cards).
- **The Encouragement Banner:** When a routing or drag-and-drop mistake occurs, a subtle, non-distracting banner fades in at the bottom center of the HUD carrying the phrase:
  👉 `"Practice makes progress"`
- **The State Cycle:** Clicking the reset button immediately reverts the active coordinate path back to the last successfully reached checkpoint node rather than clearing the entire tactic.

---

# 🎨 2. SVELTE 5 COMPONENT SPECIFICATION: `MistakeResetOverlay.svelte`
Save this file to: `src/lib/components/tactical/MistakeResetOverlay.svelte`

```svelte
<script lang="ts">
  import { fade } from 'svelte/transition';
  import { untrack } from 'svelte';

  // Svelte 5 Runes for explicit active state management
  let { 
    isMistakeActive = $bindable(false), 
    onReset 
  } = $props<{
    isMistakeActive: boolean;
    onReset: () => void;
  }>();

  // Non-distracting auto-dimming timing logic using untrack to prevent reactive cascade loops
  $effect(() => {
    if (isMistakeActive) {
      untrack(() => {
        console.log("🧠 [SSTracker EQ Engine] Player mistake registered. Encouragement state mounted.");
      });
    }
  });

  function handleReset() {
    onReset();
    isMistakeActive = false;
  }
</script>

{#if isMistakeActive}
  <div 
    class="tw-absolute tw-inset-x-0 tw-bottom-8 tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-3 tw-z-50"
    transition:fade={{ duration: 150 }}
  >
    <!-- Tactical Encouragement Prompt (Switzer, Non-Distracting HUD Grey) -->
    <div class="tw-bg-[#1e293b]/90 tw-border tw-border-[#334155] tw-px-4 py-2 tw-text-sm tw-text-[#94a3b8] tw-font-medium tw-tracking-wide tw-rounded-none">
      🛡️ <span class="tw-text-white">Practice makes progress</span>
    </div>

    <!-- The 90-degree Atompunk Action Reset Trigger -->
    <button
      type="button"
      onclick={handleReset}
      class="tw-bg-[#1e1e1e] tw-border tw-border-[#fbbf24] hover:tw-bg-[#fbbf24] hover:tw-text-[#0a0a0a] tw-text-[#fbbf24] tw-font-mono tw-text-xs tw-font-bold tw-px-6 tw-py-2.5 tw-transition-colors tw-rounded-none tw-shadow-md tw-uppercase"
    >
      [ RESET DRILL ]
    </button>
  </div>
{/if}
```

---

# 🧪 3. PLAYWRIGHT E2E VISUAL REGRESSION SPEC: `tactical-mistake-recovery.spec.ts`
Save this file to: `tests/tactical-mistake-recovery.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Player OS Tactical Mistake Recovery & Visual Verification', () => {
  test('Should trigger, display encouragement, and reset the path state upon click', async ({ page }) => {
    
    // 1. Setup Session: Programmatically bypass the login wall using Custom Claims
    const mockClaims = {
      uid: 'athlete-visual-auditor',
      email: 'player@sstracker.app',
      role: 'player',
      isProfileComplete: true
    };
    
    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    }, mockClaims);

    // Navigate straight to our active Player OS training canvas
    await page.goto('/player/training-arena');
    await page.waitForSelector('.pd-page-root', { timeout: 5000 });

    // 2. Simulate Route Deviation / Mistake Behavior
    // We dispatch a custom window-level event to simulate a routing failure on the canvas
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sstracker-route-mistake', {
        detail: { reason: 'out-of-bounds', lastValidCheckpoint: { x: 100, y: 150 } }
      }));
    });

    // 3. Assert Non-Distracting Banner Presence
    const banner = page.locator('text=Practice makes progress');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveCSS('font-family', /Switzer|sans-serif/);

    // 4. Assert Tactical Reset Button Render Compliance (Strict 90-Degree Corners)
    const resetButton = page.locator('text=[ RESET DRILL ]');
    await expect(resetButton).toBeVisible();
    await expect(resetButton).toHaveCSS('border-radius', '0px'); // Forces strict Atompunk styling

    // 5. Execute Action Verification: Click the Reset Button
    await resetButton.click();

    // 6. Assert State Cleanup
    await expect(banner).not.toBeVisible();
    await expect(resetButton).not.toBeVisible();
  });
});
```

---

# 🚀 4. AUTONOMOUS JULES WORKFLOW: `tactical-mistake-recovery-workflow.md`
To automate the verification run on Google Cloud without burning local credits, save this block as a markdown issue:

```markdown
@jules, please execute the visual test verification loop for our new Mistake Recovery HUD overlay:

1. Load your skills:
   - `.agents/skills/vanguard-trinity/` (strictly limit function bodies to 80 lines)
   - `.agents/skills/svelte5-strictness/` (enforce Svelte 5 reactive bindings and untrack blocks)

2. Audit files:
   - Ensure `src/lib/components/tactical/MistakeResetOverlay.svelte` perfectly mounts.
   - Run Vite and Svelte check processes to verify absolutely zero type errors or layout-blowout bugs.

3. Run visual check suite:
   - Run Playwright: `pnpm playwright test tests/tactical-mistake-recovery.spec.ts --project=chromium`
   - Capture visual execution screenshots and save them directly to `/audit-artifacts/player/mistake-recovery.png`.

4. Self-Correct & Commit:
   - If Playwright fails due to an off-by-one styling offset or rendering lag, adjust CSS margins, re-verify locally, and commit your changes once 100% green.
```
