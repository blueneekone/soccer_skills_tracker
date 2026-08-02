# Master Sequential Platform-Wide Visual Audit & Recovery (v2)

## 🏛️ Phase 1: Local Firestore Emulator Seeding

To bypass the unauthenticated `/setup` redirect gate (`authStore.isProfileComplete` redirection loop), the orchestrator automatically seeds the local Firestore emulator on port `8080` with standard verified profiles before initiating the browser audits.

Seeded profiles are generated using the following properties:
*   **Admin:** `mock-admin-uid` (role: `admin`, isProfileComplete: `true`)
*   **Director:** `mock-director-uid` (role: `director`, isProfileComplete: `true`)
*   **Coach:** `mock-coach-uid` (role: `coach`, isProfileComplete: `true`)
*   **Player:** `mock-player-uid` (role: `player`, isProfileComplete: `true`)
*   **Parent:** `mock-parent-uid` (role: `parent`, isProfileComplete: `true`)

---

## 🚀 Phase 2: Sequential Traversal Sequence

The master suite traverses and verifies every platform area in strict architectural sequence to prevent context drift and data leaks:

1.  **Public Landing Pages:** Public-facing marketing copy, responsive 12-column asymmetric Bento Grid sections, and unauthenticated CTAs.
2.  **Global Admin OS:** Command plane, telemetry dashboard, system health diagnostics, and unauthenticated bypass controls.
3.  **Director OS:** Vampire Importer rosters, Stripe Connect checkout sessions, and compliance score metrics.
4.  **Coach OS:** Tron War Room, HTML5 SVG spatial drill designer, and SafeSport Shadow CC communication routing.
5.  **Player OS:** 40% Void Black HUD dashboard, 6-axis Vanguard Prism radar charts, TCG player cards, and Dopamine Engine streak commitments.
6.  **Parent OS:** SafeSport message monitoring queues, Household Graph alignments, and the Car Ride Home post-game metric embargo.

---

## 🛡️ Phase 3: Action-Driven Playwright Testing & Self-Correction

Each persona route is audited physically in a headless Chrome browser using `scripts/audit-computed-styles-v4.js` to ensure zero layout regressions:

*   **Audit Checkpoints:** Viewport responsiveness audits at `1280px` (desktop), `768px` (tablet), and `375px` (mobile). Colors are compared against Void Black background density metrics (>= 40%) and Navy Slate panel limits.
*   **Visual Regression Gate:** Captures video recordings (MP4/WebM) and raw screenshots of all transitions.
*   **Self-Healing Loop:** If a test fails, the orchestrator triggers the Antigravity subagent `agy -p "/ui-ux-audit-v3 [PERSONA]"` to auto-heal the CSS grid parameters and Svelte 5 reactivity scopes before committing.
*   **Git Automation:** Successfully verified code locks are automatically committed with `style: visual styling lock...`, merged into the development branch, and pushed to the remote origin.
