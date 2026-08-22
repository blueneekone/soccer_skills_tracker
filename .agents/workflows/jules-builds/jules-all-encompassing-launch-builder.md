# =============================================================================
# SSTRACKER ALL-ENCOMPASSING ENTERPRISE LAUNCH BUILDER (MASTER WORKFLOW)
# =============================================================================
# This master-level workflow directs Google Jules to autonomously audit, 
# implement, compile-check, and E2E test EVERY missing feature and component 
# across the entire SSTracker suite to ensure a flawless B2B deployment.
# =============================================================================

# 🏛️ I. COMPILATION & TESTING CONSTRAINTS
*   **Active Skills:** Load and enforce `.agents/skills/vanguard-trinity/` and `.agents/skills/svelte5-strictness/`.
*   **The 80-Line Function Limit:** Every helper function, endpoint controller, or component method you write or modify must not exceed **80 lines of code**. Keep operations modular.
*   **The Atompunk Visual Aesthetic:** Use sharp 90-degree corners (exactly `0px` border-radii) on all Athlete, Coach, Admin, and Director interfaces. Use soft 24px rounded corners exclusively on Parent OS views.
*   **Zero-Warning Policy:** All code updates must compile with exactly 0 errors and 0 warnings via `pnpm run check`.
*   **Pessimistic Definition of Done:** No code may be merged to `dev` unless its respective Playwright E2E browser test runs 100% green under Chromium.

---

# 🤖 II. SYSTEMATIC SPRINT DEPLOYMENT MAP

You must execute these modules in sequence, validating each with its designated spec file:

## 🎛️ MODULE 1: PLAYER OS (Dopamine Engine Integration)

### A. Deliberate Play Tracker & Hour Caps (`src/lib/components/player/DailyArena.svelte` & `hourCaps.ts`)
*   **Requirements:**
    1. Implement a reactive touch-logging input where players record self-directed backyard sessions.
    2. Add chronological training checks in `hourCaps.ts`: if total weekly hours exceed the player's chronological age in years, flash a warning.
*   **Test Command:** `pnpm playwright test tests/player-arena.spec.ts`

### B. Skill Decay Persistence (`src/lib/services/player/skillDecay.ts`)
*   **Requirements:** Build a server-side Cloud Function cron trigger that decrements target skill nodes in the database by exactly 1% for every 72 hours of training inactivity.
*   **Test Command:** `pnpm playwright test tests/skill-decay.spec.ts`

### C. 1000Hz MediaPipe Telemetry Camera (`src/lib/services/tracking/mediapipe.ts`)
*   **Requirements:** Implement the local canvas frame grabber to process high-speed ball-touches from camera streams, ensuring coordinates resolve within a 15ms window.
*   **Test Command:** `pnpm playwright test tests/mediapipe-tracking.spec.ts`

---

## 📋 MODULE 2: STAFF & STATE CONTROLS (Coach OS Integration)

### A. Multi-Assistant Scoping Guard (`src/lib/services/coach/staffScoping.ts`)
*   **Requirements:** Restrict database collection queries inside SvelteKit middleware so secondary assistant coaches can only access the metrics of players on their designated rosters.
*   **Test Command:** `pnpm playwright test tests/staff-scoping.spec.ts`

### B. ODP State-Wide God-Mode Aggregate (`src/routes/api/odp/analytics/+server.ts`)
*   **Requirements:** Create a restricted B2B endpoint that returns anonymized, aggregated team metrics across clubs for Olympic Development Programs, stripping all PII.
*   **Test Command:** `pnpm playwright test tests/odp-analytics.spec.ts`

---

## 🛡️ MODULE 3: THE COMPLIANCE SHIELD (Parent OS Ingestion)

### A. COPPA Challenge Gates & Digital Waivers (`src/routes/parent/compliance/+page.svelte`)
*   **Requirements:**
    1. Implement a mandatory DOB-gated birth challenge on minor registration. If age is < 13, halt execution until verified parent consent is committed.
    2. Generate cryptographic signature records for SafeSport and general athletic liability waivers, storing PDF streams inside Firebase Cloud Storage.
*   **Test Command:** `pnpm playwright test tests/parent-coppa.spec.ts`

### B. Emotional Safety Enjoyment Feed (`src/routes/parent/feed/+page.svelte`)
*   **Requirements:** Build a clean feed rendering qualitative card metrics ("Self-Worth", "Caring Climate Score") with a strict compile-level block on any numeric statistics (goals, assists) to eliminate parent-induced burnout.
*   **Test Command:** `pnpm playwright test tests/parent-enjoyment-feed.spec.ts`

---

## 📈 MODULE 4: OUTREACH & RECRUITER HUD (Public Sites & Recruiting)

### A. Savings Calculator & Video Mascot Widget (`src/routes/public/calculator/+page.svelte`)
*   **Requirements:**
    1. Build an interactive pricing table comparing per-player costs against TeamSnap ($749/year).
    2. Embed an HTML5/WebM video container executing the marketing play loop within a strict Void Black border layout.
*   **Test Command:** `pnpm playwright test tests/landing-page.spec.ts`

### B. Verified Recruiter Vetting (`src/routes/recruiter/vetting/+page.svelte`)
*   **Requirements:**
    1. Query user token custom claims (`role === 'recruiter'`). If false, block recruitment searches.
    2. Construct a filter mapping that strips all minor contact info and PII dynamically unless explicit parental waiver flags are verified in the database.
*   **Test Command:** `pnpm playwright test tests/recruiter-vetting.spec.ts`

---

# 🛡️ III. PESSIMISTIC DEFINITION OF DONE & CIRCUIT BREAKERS
*   **Capped Iterations:** You are limited to a maximum of **3 test-and-repair runs per module**. If compilation loops or test timeout failures occur on the 3rd iteration, automatically abort, revert code changes inside that directory, log the exact errors, and move to the next section.
*   **PR Generation:** Once all tests pass, submit a clean, squash-merged Pull Request directly to the `dev` branch with complete test coverage reports.
