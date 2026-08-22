# =============================================================================
# SSTRACKER COACH OS: ULTIMATE MATCH DAY CONSOLE DEPLOYMENT WORKFLOW
# =============================================================================
# This master-level workflow file directs Google Jules to build, verify,
# and self-heal the high-density Match Day Event & Sports Psychology Console.
# It enforces strict Svelte 5 runes, 90-degree Atompunk HUD styling, and 
# the revolutionary "Car Ride Home" pediatric burnout prevention protocol.
# =============================================================================

# 🏛️ 1. ARCHITECTURAL OBJECTIVE: THE MULTI-BILLION-DOLLAR MATCH DAY HUB
SSTracker replaces the fragmented, high-anxiety match trackers of legacy platforms with a professional tactical flight deck that balances hyper-accurate performance telemetry with developmental mental-health gates:

## A. The "Car Ride Home" Metric Shield (P0 Burnout Protection)
*   **The Rule:** Research proves that immediate post-game metric scrutiny by parents/recruiters is a primary driver of youth athletic burnout and dropout.
*   **The Guard:** We implement a hard, server-side locking switch: `isCarRideHomeShieldActive` (Default: TRUE).
*   **The Action:** When active, the server blocks all client-side rendering of match metrics, player scorecards, and physical telemetry (GPS/Vanguard) in the Parent and Fan OS dashboards for exactly **15 minutes following the final whistle**.
*   **The HUD Indicator:** Render a monospaced, golden warning light: `⚠️ [ SHIELD_ACTIVE: CAR_RIDE_HOME_LOCKOUT ]`.

## B. The TARGET Mastery HUD (Autonomy-Supportive Prompts)
*   **The Strategy:** Incorporate the psychological TARGET model (Task, Authority, Recognition, Grouping, Evaluation, Timing) to maintain a task-focused, caring, and non-ego-driven team environment.
*   **The UI:** Instead of generic match stats, render real-time, context-specific prompts for the coach during match events:
    *   *Task-Oriented feedback:* "Praise movement mechanics, focus on transition spatial width."
    *   *Autonomy support:* "Prompt players for tactical modifications rather than directing every run."

## C. Halftime Choice Syncer
*   **The Integration:** Syncs active tactical voting and player choice metrics directly from our `HalftimeChoicePlanner` component (e.g., Choice A: High-Press Transition vs. Choice B: Compact Mid-Block Counter).
*   **The Rendering:** Show a high-contrast, double-lined monospaced block detailing the active selection and the player-consensus vote margins.

---

# 🤖 2. THE JULES STEP-BY-STEP EXECUTION ROADMAP
@jules, you must execute the following automated steps within your isolated Ubuntu container to deploy these updates:

## Step 1: Locate Target Files
Audit and refactor:
*   `src/routes/coach/matchday/+page.svelte` (Match Day layout and tactical logger)
*   `src/lib/services/coach/MatchDayTelemetry.svelte.ts` (State engine for match tracking)

## Step 2: Implement Secure Logic Boundaries
*   **State Limits:** Restrict all functions inside `MatchDayTelemetry.svelte.ts` to **under 80 lines of code**. Keep state calculations modular.
*   **Car Ride Home Timer:** Implement an atomic Firebase Cloud Function or server-side hook that listens for the final whistle click, starts the 15-minute countdown, and enforces the data lock across client requests.
*   **Zero-Rounded Borders:** Enforce strict CSS Atompunk specifications: absolute Void Black (`#0a0a0a`), Data Cyan (`#06b6d4`) telemetry text, and perfectly square (`0px` rounded) buttons.

## Step 3: Local Verification Sweep (Playwright & Vitest)
Run compilation audits, type checks, and trigger the custom test suite:
```bash
pnpm run check
pnpm playwright test tests/coach-matchday.spec.ts --project=chromium
```

---

# 🛡️ 3. PESSIMISTIC DEFINITION OF DONE & CIRCUIT BREAKERS
*   **Circuit Breaker:** You are capped at a maximum of **3 test-and-repair iterations**. If Svelte 5 throws compiler errors, layout-shifting bugs, or Playwright timeout failures on the 3rd run, revert all changes to the last stable state, log the compile trace, and exit safely to prevent credit waste.
*   **Delivery Standard:** Your final codebase must compile with exactly **0 errors and 0 warnings** before you open a Pull Request straight to `dev`.
