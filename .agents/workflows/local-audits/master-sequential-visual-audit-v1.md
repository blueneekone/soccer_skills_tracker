# Master Sequential Visual Audit & Self-Correction Protocol (v1)

This document establishes the absolute, non-negotiable architectural, aesthetic, and behavioral verification standards for the SSTracker Enterprise SaaS platform. It governs the sequential visual traversal, layout auditing, and automated self-correction of the entire multi-persona ecosystem before final production delivery.

---

## 🏛️ Part 1: Global Visual & Reactivity Mandates

All components across all views must strictly adhere to the **Nuclear Americana Tech Noir** design system and the Svelte 5 reactivity rules:

1. **The 60-30-10 Color Taxonomy:**
   * **60% Dominant Base:** Void Black (`#000000`) for the canvas background. Navy Slate (`#0f172a` or `#1e293b`) for structural panels and cards.
   * **30% Structural Trim:** Structural Grey (`#334155`) or deep slate for 1px borders and division lines.
   * **10% Action & Telemetry:** Action Gold (`#fbbf24`) for ONE primary mission CTA. Data Cyan (`#14b8a6`) for metrics, neon traces, and active telemetry. Atompunk Amber (`#f59e0b`) for warning states and accents.
   * **The Singular Directive:** To prevent cognitive overload, each viewport must contain **exactly ONE Action Gold (`#fbbf24`) primary Call-To-Action (CTA)**. All other auxiliary actions must use muted Structural Grey or outline-only states.
2. **Anti-Squish Layout Physics:**
   * Symmetrical dashboards are strictly forbidden. All layout panels must utilize an asymmetric 12-column Bento Grid.
   * Grids must be locked using fluid CSS clamp math to prevent element compression on mobile viewports:
     `grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));`
   * Every text-container or flex child must enforce `tw-min-w-0` to forbid text layout bleeding.
3. **Contrast & Micro-Typography:**
   * To prevent visual halation, pure white text on absolute black backgrounds is forbidden. Muted zinc/gray tones (`#FAFAFA`, `#D4D4D8`, `#A1A1AA`) are mandated.
   * Never use `rgba()` text opacities or Tailwind opacity modifiers (e.g., `text-white/50`) over dark backgrounds.
   * Enforce **Geist Mono** for all technical metrics, tables, and numerical telemetry. Use **Switzer** for body copy (boasting a 79% x-height for optimal legibility) and **Geist Sans** for headers.
4. **Svelte 5 Reactivity Guards:**
   * Exclusively utilize Svelte 5 compile-time reactivity (`$state`, `$derived`, `$props`, `$effect`).
   * **Infinite Loop Prevention:** Any programmatic routing, state mutation, or external side-effect executed within a `$effect` rune MUST be securely wrapped inside an `untrack(() => { ... })` closure.

---

## 🔒 Part 2: Sequential Persona Traversal & Verification Gates

The local orchestrator executes a zero-touch, automated E2E sweep of all 5 core platform personas sequentially. Each area is audited, auto-healed, committed, and merged before the script triggers the next in sequence:

### 1. Unauthenticated Marketing Landing
* **Gating:** Public-facing static route (`prender = true`). The testing engine is strictly forbidden from invoking Firebase auth or checking credentials on this route.
* **Layout Check:** Verify the asymmetric "Training Triangle" Bento Grid (Player Development spans 6 cols, Coach Tactics spans 4 cols, Parent Shield spans 2 cols).
* **CTA Check:** Assert the presence of exactly one Action Gold CTA ("Deploy Your Club") and the unillustrated interactive product loop preview.

### 2. Global Admin OS (The Command Plane)
* **Auth Bypassing:** Programmatically mint a custom developer JWT token via the Firebase Admin SDK (`admin.auth().createCustomToken(uid)`) using the Firebase MCP utility. Inject this token into local storage to instantly bypass frontend logins.
* **Layout Check:** Verify the high-density Telemetry Single Pane and system-level maintenance logs. All tabular arrays must share the crisp 1px Structural Grey borders and Geist Mono readouts.
* **Security Check:** Ensure the presence of the structural Right to be Forgotten and Database Defragmentation trigger scripts.

### 3. Director OS (B2B Revenue Engine)
* **Visual Check:** Verify the **Vampire Importer** layout. Ingestion grids must remain functional and scale gracefully during large-scale CSV parsing.
* **Financial Layer:** Verify the Stripe Connect onboarding progress bars and the flat-rate fee structure views.
* **Compliance:** Enforce the display of the **Compliance Health Score Matrix** tracking parent VPC and SafeSport clearances with crisp Green, Amber, and Red telemetry indicators.

### 4. Coach OS (The Sideline SIEM)
* **The Tron War Room:** Audit the HTML5 Spatial Drill Designer. The tactical field canvas must render with a 1200x800 coordinate-locked box with Vantablack player discs, neonBloom glow filters, and precise matrix transformations:
  `matrixTransform(getScreenCTM().inverse())`
* **Layout check:** Verify that the Coach Dashboard utilizes strict 90-degree corners on all structural panels, with zero gamification chamfers.

### 5. Player OS (The Dopamine Engine)
* **Visual Aesthetic:** Overhaul the view into a cinematic **40% Void Density Gaming HUD**. Apply premium chamfered clip-paths exclusively to the outer specialty cards:
  `clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);`
* **The Dopamine Loop:** Verify that the canvas-confetti bursts and XP multiplier notifications trigger **strictly inside database commit success blocks** (`dopamineOnCommit`), preventing optimistic UI spoofing.
* **Attributes:** Render the 6-axis Vanguard Prism radar SVG charts.

### 6. Parent OS & Recruiter Marketplace (The Shield)
* **SafeSport CC Hub:** Verify the server-side Firestore trigger that intercepts coach-to-minor DMs, resolves the household graph, and automatically CCs parent emails, mathematically eliminating 1:1 adult-to-minor channels.
* **Emotional Safety:** Enforce the **Car Ride Home Protocol** which blocks performance metrics for exactly 15 minutes post-game. Muted, empathetic dialog indicators must occupy the space to protect beginner self-worth.

---

## 🛠️ Part 3: The Critic-Augmented Auto-Fix Loop

When a visual drift or functional layout anomaly is detected by the Playwright engine (`audit-computed-styles-v4.js`):
1. The orchestrator halts the traversal, captures the failure logs, and spawns the specialized **CDO** (design) or **Architect** (reactivity) subagents.
2. The subagents rewrite the offending Svelte files or Tailwind classes.
3. The server is auto-rebooted, and the Playwright visual validation is executed again.
4. Once the suite returns a 100% green status, the orchestrator commits the files with a dedicated Git prefix: `style: visual styling lock and grid-alignment fix for [Persona] dashboard`
5. The script automatically merges the branch into the main development stream and initiates the next persona's cloud trigger asynchronously.
