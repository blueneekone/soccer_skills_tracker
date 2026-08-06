---
name: microscopic-visual-autofix-v4-unattended
description: Completely unattended, headless visual audit and self-correcting repair loop. It runs Playwright, checks bento layouts, applies Svelte 5 reactive fixes, and automatically commits without human validation gates.
---

# 🛡️ UNATTENDED WORKFLOW: MICROSCOPIC VISUAL AUDIT & SELF-HEALING (v4.0)

This workflow legally binds the Antigravity frontend agent to perform a strict, physical, browser-in-the-loop visual audit and structural repair against **exactly ONE persona at a time**, with absolutely zero human-in-the-loop pauses.

---

### 🚨 MANDATORY PRE-FLIGHT CHECK: TARGET ISOLATION
The operator **MUST** provide exactly one target persona when invoking this workflow:
*   Usage: `/microscopic-visual-autofix-v4-unattended [Persona]` (e.g., `/microscopic-visual-autofix-v4-unattended Coach`)
*   If no persona is explicitly specified in the prompt, **HALT EXECUTION IMMEDIATELY** and ask the operator: *"Which persona dashboard are we auditing right now?"*

---

## 🛠️ THE UNATTENDED RUNTIME TRAJECTORY (STEP-BY-STEP)

### STEP 1: INITIALIZE DIRECTORIES & START DEVELOPMENT SERVER
1. Locate or create the target output directory: `audit-artifacts/[persona-name]/`
2. Start or confirm the local Svelte development server is active (`pnpm run dev` or `npm run dev`) on `http://localhost:5173`.
3. If the server is unresponsive, automatically boot it in a background thread.

### STEP 2: THE INTERACTIVE STATE & HOVER AUDIT
The agent is strictly forbidden from assuming hover animations, tooltip transitions, or active button clicks function correctly. You must programmatically force and assert these micro-interactions:
1. **Hover State Verification:**
   * Locate all interactive elements (navigation rails, secondary action links, tactical cards).
   * Programmatically trigger hovers inside your Playwright spec:
     ```typescript
     const element = page.locator('.vanguard-link, .pd-nav-link, .st-bento a:not(.quest-hero__cta)');
     await element.first().hover();
     // Wait for kinetic transition (150-250ms) to complete
     await page.waitForTimeout(250);
     ```
   * Assert style updates (e.g., color transitions cleanly match whitelisted Data Cyan, Atompunk Amber, or Soft Cyan accents):
     ```typescript
     const computedColor = await element.first().evaluate(el => window.getComputedStyle(el).color);
     expect(COMPLIANT_HOVER_COLORS).toContain(computedColor);
     ```

### STEP 3: EXECUTE PLAYWRIGHT COLLISION & SCALING AUDIT
Run the target Playwright block in the terminal, isolating it strictly to the current persona:
```bash
npx playwright test visual-regression-v5.spec.ts -g "[Persona] OS" --project=desktop-chrome
```
This test will execute the following rigorous, non-negotiable checks:
*   **Collision Detection:** Asserts sibling components inside your Bento Grids do not overlap by comparing 2D bounding boxes.
*   **Inline Styling Cheat Check:** Scans files to ensure no inline `!important` paddings or margin hacks have been injected to game the spacing tests.
*   **Viewport Lock:** Verifies that no horizontal scrollbars are generated and that `scrollWidth` matches `innerWidth` across 1280px (Widescreen), 768px (Tablet), and 375px (Mobile).
*   **Clipping & Truncation:** Asserts that numerical readouts inside Geist Mono tables do not clip or truncate.

### STEP 4: AUTONOMOUS REPAIR LOOP (THE TDD AUTO-FIX)
If the visual audit suite returns any failures (e.g., overlapping grids, missing tooltips, Svelte 5 reactivity loops, or color bleeding):
1. **Analyze the DOM Output:** Identify the specific CSS layout or Svelte component causing the failure.
2. **Apply Surgical Edits:** Modify the Svelte component in `/src/` strictly following your design system:
   * Maintain the **60-30-10 palette** (Void Black backgrounds, Structural Grey borders, and Data Cyan/Atompunk Amber accents).
   * Ensure Svelte 5 `$effect` routing or state mutations are wrapped in `untrack()` closures to prevent memory loops.
3. **Re-run the Spec:** Run the test suite again. Repeat this self-correction pass until the console returns a clean `100% SUCCESS` pass. Do not halt or prompt for keyboard inputs.

### STEP 5: THE UNATTENDED SCREENSHOT CAPTURE
Once the tests are passing programmatically:
1. Save high-fidelity screenshots of each audited screen state (including active hover and tooltip views) as `.png` files directly to `audit-artifacts/[persona-name]/`.
2. Do **NOT** pause for human review. Log a success receipt in the console and proceed immediately to finalization.

---\n\n## 🔒 POST-VERIFICATION PROCEDURES
Once the automated validations are fully green:
1. Commit the styling adjustments to your branch:
   ```bash
   git add .
   git commit -m "style: unattended visual styling lock and interactive verification for [Persona] OS"
   ```
2. Proceed to mark the matching Epic as complete in `@ROADMAP.md`.
