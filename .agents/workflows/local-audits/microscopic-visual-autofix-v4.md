---
name: microscopic-visual-autofix-v4
description: Highly rigorous, single-persona visual audit and repair loop. It executes physical Playwright checks with explicit DOM-hydration load-gating, verifies brand-accented hover/tooltip states across all five core personas (Admin, Player, Coach, Parent, Director), and pauses for human verification.
---

# 🛡️ SYSTEM WORKFLOW: MICROSCOPIC VISUAL AUDIT & AUTO-FIX (v4.0)

This workflow legally binds the Antigravity frontend agent to perform a strict, physical, browser-in-the-loop visual audit and structural repair against **exactly ONE persona at a time**, utilizing the highly optimized `visual-regression-v5.spec.ts` spec.

No shortcuts, no static code-reading, and no hallucinated "looks green to me" approvals.

---

### 🚨 MANDATORY PRE-FLIGHT CHECK: TARGET ISOLATION
The operator **MUST** provide exactly one target persona when invoking this workflow:
*   Usage: `/microscopic-visual-autofix-v4 [Persona]` (e.g., `/microscopic-visual-autofix-v4 Coach`)
*   If no persona is explicitly specified in the prompt, **HALT EXECUTION IMMEDIATELY** and ask the operator: *\"Which persona dashboard are we auditing right now?\"*

---

## 🛠️ THE RUNTIME TRAJECTORY (STEP-BY-STEP)

### STEP 1: INITIALIZE DIRECTORIES & START DEVELOPMENT SERVER
1. Locate or create the target output directory: `audit-artifacts/[persona-name]/`
2. Start or confirm the local Svelte development server is active (`pnpm run dev` or `npm run dev`) on `http://localhost:5173`. 
3. If the server is unresponsive, flag the error and wait for the operator to initialize the local server.

### STEP 2: THE INTERACTIVE STATE & HOVER AUDIT
The agent is strictly forbidden from assuming hover animations, tooltip transitions, or active button clicks function correctly. You must programmatically force and assert these micro-interactions:
1. **Targeted Hover State Verification:**
   * Locate all brand-accented links/elements: `.vanguard-link, .pd-nav-link, .st-bento a:not(.quest-hero__cta)`.
   * Programmatically trigger hovers inside your Playwright spec:
     ```typescript
     const element = page.locator('.pd-nav-link');
     await element.first().hover();
     // Wait for kinetic transition (150-250ms) to complete
     await page.waitForTimeout(250); 
     ```
   * Assert style updates transition cleanly to a whitelisted accent color (Data Cyan, Atompunk Amber, Action Gold, Soft Cyan, or Slate-50):
     ```typescript
     const computedColor = await element.first().evaluate(el => window.getComputedStyle(el).color);
     expect(COMPLIANT_HOVER_COLORS).toContain(computedColor);
     ```

2. **Tooltip & Popover Gating:**
   * For links/buttons with tooltips or dynamic dropdown action boxes (Z4 Floating Chrome):
     * Trigger hover/click: `await page.locator('.tooltip-trigger').hover();`
     * Assert the tooltip is fully rendered, has a solid background (`#0B0F19`), is visible in the viewport, and does not clip or overflow:
       ```typescript
       await expect(page.locator('.tooltip')).toBeVisible();
       ```

### STEP 3: EXECUTE PLAYWRIGHT COLLISION & SCALING AUDIT
Run the target Playwright block in the terminal, isolating it strictly to the current persona:
```bash
pnpm playwright test visual-regression-v5.spec.ts -g "EPIC COMPREHENSIVE TRAVERSAL: [PERSONA-NAME] OS" --headed
```
This test will execute the following rigorous, non-negotiable checks:
*   **Collision Detection:** Asserts sibling components inside your Bento Grids do not overlap by comparing 2D bounding boxes.
*   **Inline Styling Cheat Check:** Scans files to ensure no inline `!important` paddings or margin hacks have been injected to game the spacing tests.
*   **Viewport Lock:** Verifies that no horizontal scrollbars are generated and that `scrollWidth` matches `innerWidth` across 1024px (Widescreen), 768px (Tablet), and 375px (Mobile).
*   **Clipping & Truncation:** Asserts that numerical readouts inside Geist Mono tables do not clip or truncate.

### STEP 4: AUTONOMOUS REPAIR LOOP (THE TDD AUTO-FIX)
If the visual audit suite returns any failures (e.g., overlapping grids, missing tooltips, Svelte 5 reactivity loops, or color bleeding):
1. **Analyze the DOM Output:** Identify the specific CSS layout or Svelte component causing the failure.
2. **Apply Surgical Edits:** Modify the Svelte component in `/src/` strictly following your design system:
   * Maintain the **60-30-10 palette** (Void Black backgrounds, Structural Grey borders, and Data Cyan/Atompunk Amber accents).
   * Ensure Svelte 5 `$effect` routing or state mutations are wrapped in `untrack()` closures to prevent memory loops.
3. **Re-run the Spec:** Run the test suite again. Repeat this self-correction pass until the console returns a clean `100% SUCCESS` pass.

### STEP 5: THE HUMAN-IN-THE-LOOP SCREENSHOT GATE
Once the tests are passing programmatically:
1. Save high-fidelity screenshots of each audited screen state (including active hover and tooltip views) as `.png` files directly to `audit-artifacts/[persona-name]/` [cite: 559].
2. **PAUSE EXECUTION.** Print a bold terminal alert to the operator:
   ```text
   ⏸️ PAUSED FOR HUMAN REVIEW: Visual audit completed for the [Persona] OS.
   Screenshots representing the bento grid layouts, computed typography, and active hover/tooltip states have been generated and saved to:
   📁 audit-artifacts/[persona-name]/
   
   Please review the visual outputs. Press [Enter] in the terminal when you are satisfied with the design to commit the visual lock and proceed...
   ```
3. Wait for physical keyboard input (`Enter`) before finalizing the block.

---\n\n## 🔒 POST-VERIFICATION PROCEDURES
Once the human gatekeeper approves:
1. Commit the styling adjustments to your branch:
   ```bash
   git add .
   git commit -m "style: visual styling lock and interactive verification for [Persona] OS"
   ```
2. Proceed to mark the matching Epic as complete in `@ROADMAP.md`.
