---
name: microscopic-visual-autofix-v3
description: Single-persona visual audit and surgical repair loop. Executes physical Playwright checks in a headed browser, verifies interactive hover/tooltip states, enforces Bento Grid collision constraints, and pauses for human sign-off before committing.
---

# 🛡️ SYSTEM WORKFLOW: MICROSCOPIC VISUAL AUDIT & AUTO-FIX (v3.1)

Legally binds the Antigravity frontend agent to perform a strict, physical, browser-in-the-loop visual audit and structural repair against **exactly ONE persona at a time**.

No static code-reading. No hallucinated "looks green to me" approvals.

---

### 🚨 MANDATORY PRE-FLIGHT: TARGET ISOLATION

- **Usage:** `/microscopic-visual-autofix-v3 [Persona]`
- **Valid personas:** `admin`, `director`, `coach`, `player`, `parent`, `commissioner`, `public`
- **If no persona is specified:** HALT immediately and ask: *"Which persona OS are we auditing?"*

---

## 🛠️ THE RUNTIME TRAJECTORY

### STEP 1: ENVIRONMENT INITIALIZATION & ISOLATION

1. Confirm `.svelte-kit/tsconfig.json` exists. If missing, regenerate:
   ```bash
   npx svelte-kit sync
   ```
2. Create or confirm the output directory: `audit-artifacts/[persona-name]/`
3. **CRITICAL: PORT COLLISION PREVENTION**
   - Playwright must launch its own isolated dev server to correctly inject `VITE_E2E_BYPASS_AUTH=true`.
   - **Do NOT** run `npm run dev` manually before executing the tests.
   - If a local dev server is already running on port `5173`, you **MUST** terminate it. Reusing a standard dev server will cause auth bypass failures, redirecting tests to the `/login` page and generating false-positive `slate-300` hover errors.

---

### STEP 2: INTERACTIVE STATE & HOVER AUDIT

The agent is **strictly forbidden** from assuming hover animations, tooltips, or click transitions function correctly. Programmatically force and assert every micro-interaction:

#### 2a. Hover State Verification
```typescript
// Locate interactive elements, explicitly excluding the omnipresent Alpha ReportAnomaly button (.ra-trigger) to prevent false positives.
const element = page.locator('.vanguard-link, nav a, button').not('.ra-trigger');
await element.first().scrollIntoViewIfNeeded();
await element.first().hover();

// Wait for kinetic transition (150–250ms mandated by design system)
await page.waitForTimeout(250);

// Assert transition to a brand-approved accent color
const computedColor = await element.first().evaluate(
  (el) => window.getComputedStyle(el).color
);
// DATA_CYAN, ATOMPUNK_AMBER, ACTION_GOLD
const ALLOWED = ['rgb(20, 184, 166)', 'rgb(245, 158, 11)', 'rgb(251, 191, 36)'];
expect(ALLOWED).toContain(computedColor);
```

#### 2b. Tooltip & Popover Gating
For buttons/links with tooltips or Z4 Floating Chrome:
```typescript
const trigger = page.locator('.tooltip-trigger, [data-tooltip]').not('.ra-trigger').first();
await trigger.hover();
await page.waitForTimeout(250);

// Assert tooltip is visible, correctly backgrounded, and within viewport
const tooltip = page.locator('.tooltip, [role="tooltip"]').first();
await expect(tooltip).toBeVisible();
const bg = await tooltip.evaluate((el) => window.getComputedStyle(el).backgroundColor);
expect(['rgb(11, 15, 25)', 'rgb(15, 23, 42)', 'rgb(0, 0, 0)']).toContain(bg);
```

---

### STEP 3: EXECUTE PLAYWRIGHT COLLISION & SCALING AUDIT

Run the spec targeting only the current persona:
```bash
npx playwright test tests/visual-regression.spec.ts -g "EPIC TRAVERSAL: [PERSONA] OS"
```

**Non-negotiable checks executed per route:**

| Check | Assertion |
|---|---|
| Dark Mode Background | Body not `rgb(255,255,255)` |
| Horizontal Overflow | `scrollWidth <= clientWidth` |
| Bento Grid Collision | No sibling overlap > 2px (O(n²) bounding-box check) |
| Fluid Math (Anti-Squish) | Dynamic spatial limits enforced via `clamp()` (no static margins) |
| Hover Accent | Color resolves to Data Cyan / Atompunk Amber / Action Gold |
| Tooltip | Visible, correct background (Void Black/Navy Slate), within viewport |
| Admin / Director Panels | `borderRadius === '0px'` |
| Player chamfer | `clipPath` contains `polygon` |
| Parent panels | `borderRadius >= 24px` |
| Z-Depth Architecture | Liquid Glassmorphism uses `drop-shadow()` on wrappers if `clip-path` destroys `box-shadow` |
| Responsive Viewports | Elements scale without layout breakage across Mobile, Tablet, and Desktop resolutions |
| Text Clipping & Overflow | No silent text clipping; proper ellipsis truncation (`text-overflow: ellipsis`) applied where intended |
| Accessibility & Contrast | Text meets WCAG contrast ratio requirements (≥ 4.5:1), especially on Void Black and Navy Slate |
| Keyboard Focus Rings | All interactive elements display visible, brand-aligned focus rings (`:focus-visible`) during tab navigation |
| Z-Index Layering | Strict layering assertion: Tooltips/Modals (Z4) > Nav (Z3) > Panels (Z2) > Background (Z0) |
| Cumulative Layout Shift | Page load and micro-interactions trigger zero unexpected layout shifts (CLS = 0) |

**Persona → Route Map:**

| Persona | Routes Tested |
|---|---|
| admin | overview, users, organizations, audit-log, system-settings, support-terminal |
| director | dashboard, compliance, events, uplinks |
| coach | dashboard, tactical, war-room, drills, match-day, daily-intel |
| player | dashboard, skill-tree, tracker, armory, proving-grounds |
| parent | dashboard, household, trust-center, payments |
| commissioner | matrix |
| public | landing, login, features, pricing, about |

---

### STEP 4: AUTONOMOUS REPAIR LOOP (THE TDD AUTO-FIX)

If the suite returns any failures:

1. **Diagnose the DOM:** Read the Playwright error output + generated screenshot to identify the exact element and CSS rule causing the failure. Verify the failure is not a `/login` redirect false positive.
2. **Two-File Governance System:** Do not modify more than 2 to 3 distinct architectural files at once to prevent context degradation.
3. **Apply Surgical Edits** to the Svelte component in `src/`:
   - Maintain the **60-30-10 palette** (Void Black, Structural Grey, Data Cyan/Amber accents).
   - Wrap any `$effect` routing or state mutations in `untrack()` closures.
   - No `!important` hacks. No inline `style=` overrides to game tests.
   - All Tailwind utility classes must be prefixed with `tw-`.
   - Do not use legacy colors like `#fbbf24` in Commissioner OS.
   - Do not use legacy data maps (query the nested `armory` map over `player_stats`).
   - Global edits (e.g., `sed -i`) are strictly forbidden; edits must be surgical.
4. **Re-run the spec.** Repeat until the console returns `X passed (0 failed)`.

---

### STEP 5: PESSIMISTIC DEFINITION OF DONE & VERIFICATION

Once Playwright tests are 100% green, you MUST mathematically prove stability:

1. **Run Compiler Checks:**
   ```bash
   npm run check
   npx eslint .
   ```
2. **Run Unit Tests:** Execute `pnpm test:unit` to ensure zero regressions in functionality.
3. **Zero Error Mandate:** If Svelte 5 compiler or ESLint returns any errors or TypeScript `any` violations, fix them. A task is ONLY "Done" with 0 errors.

---

### STEP 6: HUMAN-IN-THE-LOOP SCREENSHOT GATE

1. Screenshots are saved to `audit-artifacts/[persona-name]/[route]-desktop.png`.
2. **PAUSE EXECUTION.** Print terminal alert:
   ```
   ⏸ PAUSED FOR HUMAN REVIEW
   ─────────────────────────────────────────────────────
   Visual audit completed for: [PERSONA] OS
   Screenshots → audit-artifacts/[persona-name]/
   
   Review bento layouts, computed typography, and hover/tooltip states.
   Press [Enter] to commit the visual lock and proceed.
   ─────────────────────────────────────────────────────
   ```
3. Wait for physical keyboard `[Enter]` before finalizing.

---

## 🔒 POST-VERIFICATION PROCEDURES

Once the operator approves:

```bash
git add src/ audit-artifacts/
git commit -m "style: visual styling lock — [Persona] OS verified [$(date -u +%Y-%m-%d)]"
```

Then synchronously update `ROADMAP.md` to mark the matching Epic checkpoint as `✅ COMPLETE`.
