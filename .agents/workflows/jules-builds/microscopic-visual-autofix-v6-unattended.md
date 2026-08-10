---
name: microscopic-visual-autofix-v6-unattended
description: HEADLESS UNATTENDED UI HEALING WORKFLOW (v6.0). Enforces strict design-tokens-v2.css compliance, prevents layout overlaps/zero-margins, standardizes data tables, and locks exact text wrapping, button scaling, and viewport bounds across all Svelte 5 personas.
---

# 🛡️ UNATTENDED WORKFLOW: COHESIVE VISUAL HEALING & STYLING LOCK (v6.0)

This workflow legally binds the Antigravity/Jules execution loops to perform a strict, physical, browser-in-the-loop visual audit and structural layout repair against **exactly ONE persona at a time**, with absolutely zero human-in-the-loop pauses [cite: 1115].

It specifically overrides the generic visual-autofix routines by enforcing **strict design-token and component consistency**, permanently eliminating the "random styling drift" where different runs result in chaotic tables, missing margins, and mismatched buttons [cite: 830, 831].

--
v6.0 Upgrades: Hardened against layout squishing, text clipping, and overlapping viewport metrics.
--

### 🚨 MANDATORY PRE-FLIGHT CHECK: TARGET ISOLATION
The operator **MUST** provide exactly one target persona when invoking this workflow:
*   Usage: `/microscopic-visual-autofix-v6-unattended [Persona]` (e.g., `/microscopic-visual-autofix-v6-unattended Admin` or `/microscopic-visual-autofix-v6-unattended Player`) [cite: 1115].
*   If no persona is explicitly specified in the prompt, **HALT EXECUTION IMMEDIATELY** and ask the operator: *"Which persona dashboard are we auditing right now?"* [cite: 1115]

---

## 🏛️ PART 1: GLOBAL LAYOUT INTEGRITY & COMPONENT STANDARDS

To maintain multi-billion-dollar enterprise cohesion, all Svelte 5 components, data tables, list views, and structural grids must share the exact same CSS architecture and design variables [cite: 807].

### 1. The Design Tokens Grounding Guard
Before executing any visual audit or auto-healing pass:
1. The agent must verify if `src/design-tokens.css` or `src/design-tokens-v2.css` exists in the repository.
2. If it is missing or outdated, the agent **MUST** programmatically copy `/workspace/artifacts/design-tokens-v2.css` directly to `src/design-tokens.css` [cite: 782, 803].
3. The agent must ensure that `src/design-tokens.css` is imported at the top of the global `src/app.css` or root `src/routes/+layout.svelte` [cite: 782, 803]:
   ```css
   @import "./design-tokens.css";
   ```
4. This locks the compiler to utilize our unified variables (`--color-void-black`, `--color-navy-slate`, `--color-data-cyan`, `--color-action-gold`) instead of inventing random hex codes or default Tailwind values on each run [cite: 782, 803].

### 2. The Spacing Safeguard (No Spacing Erasures)
LLM agents are inherently lazy and often resolve 2D layout collisions by setting margins and padding to zero (e.g. `tw-m-0`, `tw-p-0`), causing widgets to squish against each other [cite: 830].
*   **The Spacing Law:** The gap between Bento cards and layout components **MUST NEVER** drop below `12px` or `clamp(12px, 2vw, 24px)` [cite: 782, 1140].
*   **The Grid Law:** All dashboards must use the 12-column asymmetric Bento Grid topology locked with fluid clamp math [cite: 782, 1140]:
   ```css
   grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));
   ```
*   **The Margin Law:** No component or page shell is permitted to sit directly against a navigation menu [cite: user_query]. All pages must enforce a minimum of `tw-p-6` or `clamp(16px, 3vw, 24px)` outer spacing [cite: 1140].

### 3. Anti-Clipping Typography & Layout Reset
Text clipping, overflow bleeding, and label truncations are treated as critical visual regressions.
*   **The `min-width: 0` Law:** Every parent flex container and grid item containing text metrics, charts, or labels must explicitly apply `tw-min-w-0` or `min-width: 0` [cite: 1135]. This resets the HTML auto-minimum-width calculation and forces children to stay strictly bounded [cite: 1135].
*   **Dynamic Font Scaling:** Giant KPI values (such as system load readouts or status indicators like "NOMINAL") must use responsive clamp sizes (e.g., `tw-text-[clamp(1.5rem,5vw,3rem)]` or CSS variables) so they mathematically shrink on tablets and mobile instead of crashing into adjacent columns [cite: 1135].
*   **Automatic Text Wrapping:** All labels and descriptions inside cards must either apply `tw-break-words` / `tw-whitespace-normal` to support clean wrapping, or `tw-truncate` / `tw-overflow-hidden` with explicit text-overflow rules if single-line truncation is desired [cite: 1135]. They must never overflow layout boxes under any circumstances.

### 4. Cohesive Button Taxonomy & Auto-Scaling
*   **The Button Spacing Rule:** All action buttons must reject fixed-pixel widths (e.g. `tw-w-[120px]`) that cut off text labels when translated or viewed on small mobile screens. They must exclusively use responsive auto-scaling horizontal padding (such as `tw-px-4 tw-py-2 md:tw-px-6`) with wrapping explicitly allowed (`tw-whitespace-normal`) to protect text integrity [cite: 1135].
*   **Player & Fan OS (Gamified HUD):** Exactly **ONE** primary CTA button styled with the `.primary-mission-cta` class (using var(--color-action-gold)) is permitted per viewport [cite: 808]. All secondary buttons on these routes must use outline styles with `var(--color-data-cyan)` [cite: 808].
*   **Admin, Commissioner, Coach, and Director OS (Tactical SIEM):** Gamification chamfers, clip-paths, and Action Gold CTAs are **STRICTLY PROHIBITED** [cite: 808]. All action buttons must use strict 90-degree corners and flat, high-contrast states in alignment with the `.siem-panel` visual style [cite: 808].

### 5. The Universal Table Standard
Data tables must never vary across routes or personas [cite: 807]. Every data table generated or repaired **MUST** strictly adhere to this markup blueprint:
*   **Grid Placement:** Nested cleanly inside a `.z2-panel` container with a crisp 1px Structural Grey border (`tw-border-slate-800` or `#334155`) [cite: 807].
*   **Background:** Solid, opaque backgrounds using var(--color-navy-slate) to completely obscure the canvas below and prevent text bleeding [cite: 813].
*   **Layout:** Edge-to-edge layout with Geist Mono typography (`.telemetry-readout` or `.stats-column`) applied to all numerical cells, scoring values, and metadata readouts to leverage its tabular-nums scaling [cite: 804, 807].

---

## 🛠️ THE RUNTIME REPAIR LOOP (STEP-BY-STEP)

### STEP 1: INITIALIZE ENVIRONMENT & EMULATORS
1. Start the Svelte development server on `http://localhost:5173`.
2. Confirm the Firebase Local Emulator suite is running against the `demo-sstracker` project to prevent live 403 referrer blocks [cite: 1041, 1077].
3. Dynamically inject necessary mock entries (e.g., parent, admin, or club profiles) into the emulator's Firestore before running visual checks to ensure hydration complete [cite: 1041, 1077].

### STEP 2: RUN THE COHESIVE PLAYWRIGHT AUDIT
Execute the Playwright E2E visual-regression test with the target persona isolated:
```bash
npx playwright test visual-regression-v5.spec.ts -g "[Persona] OS" --project=desktop-chrome
``` [cite: 1115]

### STEP 3: HEADLESS STYLE HEALING (THE AUTO-FIX LOOP)
If any visual overlaps, text clipping, or button cut-offs are detected:
1. **Locate the Component:** Open the failing route in `src/routes/` or component in `src/lib/components/` [cite: 1115].
2. **Apply Unified CSS Classes:** Remove inline styles and apply our CSS standard classes (`.bento-grid-container`, `.z2-panel`, `.telemetry-readout`, or `.primary-mission-cta`) directly from `src/design-tokens.css` [cite: view_file].
3. **Assert Spacing & Wrapping Math:** Replace any hardcoded `p-0` or `m-0` layout hacks with fluid clamp spacing (`clamp(12px, 2vw, 24px)`) and apply the typography boundary overrides (such as parent `tw-min-w-0` and button `tw-whitespace-normal`) [cite: 1140].
4. **Re-Run Integration Tests:** Execute both Vitest and Playwright. The agent must loop locally on the cloud VM until the console returns a 100% green pass [cite: 1115].

---

## 🔒 COMMIT & DELIVER PROCEDURES

Once the automated validations are fully green:
1. Verify that `npm run check` compiles with exactly 0 errors and 0 type violations [cite: 1134].
2. Commit the styling adjustments to your branch using our strict automated author identity to avoid self-triggering loop traps [cite: 835]:
   ```bash
   git config user.name "SSTracker Automation"
   git add .
   git commit -m "style: unattended visual styling lock, button wrapping, and text boundary fixes for [Persona] OS"
   ``` [cite: 835, 1115]
3. Proceed to update `ROADMAP.md` and check off ([x]) the corresponding visual lock item [cite: 1134].
