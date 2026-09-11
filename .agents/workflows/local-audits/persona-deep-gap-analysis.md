# SSTracker Deep Multi-Persona Gap Analysis & Resilience Architecture Blueprint

**Target Platform**: SSTracker (Project Phoenix) — Svelte 5 + Firebase Modular v12 SaaS  
**Architectural Governance**: 20-Year Veteran Council (Architect, CDO, CPO, CSO, CRO)  
**Status**: AUDIT COMPLETE & STRATEGIC BLUEPRINT ACTIVE  

---

## 1. Executive Summary & The "Fragility Root Cause"
The platform has achieved significant core capabilities across match-day telemetry, COPPA 2.0 WebAuthn biometric gates, CSV roster parsing, and drill diagramming. However, the system suffers from high regression fragility—where **"fixing one thing breaks three things."** 

Our microscopic static scan and test suite analysis isolated the five systemic architectural root causes:

1. **The 744-Line God Layout (`src/routes/(app)/+layout.svelte`)**:
   * Runs eight asynchronous, uncoordinated Svelte 5 `$effect` runes on every single route transition.
   * Couples global auth, feature flags, license entitlements, passkey gates, maintenance checks, impersonation, branding, and COPPA locks in a single un-isolated parent container.
   * Any state variation or unhandled rejection in one domain causes cascading re-renders, unmounting child screens, or triggering infinite `goto()` navigation loops.

2. **424 Skipped Tests & Test Coupling (`describe.skip` / `it.skip`)**:
   * Over 424 test blocks across 20+ suites have been bypassed or skipped to force PR merges through CI.
   * Large functional surfaces (such as the Intent Engine deployment cadence and Admin recruiter verification) operate without regression safety nets.
   * Vitest runs globally across 370 files, taking 70+ seconds and failing on legacy modules, which incentivizes bypassing pre-commit hooks with `--no-verify`.

3. **55 Missing B815 Defensive Hydration Gates**:
   * 55 core components and utility modules invoke raw Firestore `getDocs()` or `onSnapshot()` without checking `if (!db || !authStore.isAuthenticated) return;`.
   * On route navigation or session expiration, these raw queries trigger unauthenticated permission errors and quota burns.

4. **Flat Single-Role State Collision (`authStore.role`)**:
   * Real youth sports users possess multi-persona roles (e.g., Parent + Assistant Coach, Director + Coach).
   * The app stores identity as a single flat string `authStore.role`. Setting a contextual role overwrites the global auth state, kicking users out of their primary dashboard.

5. **Trinity Pattern Erosion & Ghost Routes**:
   * Out of dozens of routes, only 14 adhere to the mandated Vanguard Trinity Pattern (Shell `+page.svelte`, Brain `*Engine.svelte.ts`, Glass `*Arena.svelte`, HUD `*HUD.svelte`).
   * Player OS has **0 out of 9 routes** compliant with the Trinity pattern.
   * Ghost duplicate routes exist (`/coach/match-day` vs `/coach/matchday`, `/parent/vpc` vs `/parent/dashboard/vpc`, `/admin/audit-log` vs `/admin/audit-logs`), routing users to outdated or divergent codebases.

---

## 2. Granular Persona-by-Persona Breakdown

### 0. Login, Auth & Onboarding Router
* **What Works**:
  * Lowercase email canonical mapping (`users/{email}`).
  * Firebase Auth custom token minting and session hydration.
  * Role selection cards for Coach, Director, Parent, Player.
* **What is Broken**:
  * **Missing Fan Routing**: Role `'fan'` is completely missing from `applyLoginWaterfall` in `loginRouting.js`. A fan user is permanently dumped into `/onboarding`.
  * **Layout Routing Loop**: Unprotected `$effect` checks in `+layout.svelte` cause redirect loops between `/onboarding` and `/onboarding/role-select` if profile completion flags desync.
* **Resilience Fix**:
  * Add `'fan'` route target (`/fan/watch`) to `loginRouting.js`.
  * Extract auth, passkey, and maintenance guard logic into dedicated, isolated middleware handlers in `src/lib/auth/guards/`.

---

### 1. Global Admin OS (`admin`)
* **What Works**:
  * Overview KPIs, global user search (`globalUsersMapper.ts`), organization management, support terminal with Gemini AI triage, and impersonation engine.
* **What is Broken**:
  * Route duplication: `/admin/audit-log` (Trinity complete) vs `/admin/audit-logs` (monolithic legacy).
  * Monolithic sub-pages lacking Trinity Pattern: `/admin/billing-reconciliation`, `/admin/cell-migrations`, `/admin/coach-clearance`, `/admin/interoperability`.
  * Dummy template comment hack `<!-- HUD -->` present in `src/routes/(app)/admin/sports-configs/SportsConfigEditorArena.svelte:90` (P0 violation of `test-integrity.md`).
  * 3 skipped test suites in `src/lib/admin/__tests__/recruitersEngine.test.ts`.
* **Resilience Fix**:
  * Remove `/admin/audit-logs` and redirect to `/admin/audit-log`.
  * Remove dummy comments and implement authentic HUD component.
  * Unskip and restore `recruitersEngine.test.ts`.

---

### 2. Commissioner OS (`commissioner`)
* **What Works**:
  * Federation dashboard (`/commissioner/dashboard`) implements the Vanguard Trinity Pattern.
  * Multi-club state federation metric aggregation.
* **What is Broken**:
  * Only 2 routes exist (`dashboard` and `matrix`). The `matrix` route is an incomplete monolith.
  * Tests are skipped (`it.skip('defines isCommissioner function')` in `commissionerAuthGuard.test.ts`).
  * Cross-tenant regional scoping lacks automated boundary tests.
* **Resilience Fix**:
  * Fracture `/commissioner/matrix` into Trinity Pattern (`FederationMatrixArena.svelte`, `FederationMatrixHUD.svelte`, `FederationMatrixEngine.svelte.ts`).
  * Unskip `commissionerAuthGuard.test.ts` and test with in-memory auth mocks.

---

### 3. Director OS (`director`)
* **What Works**:
  * The Vampire CSV Roster Importer (`/director/dashboard/vampire`) with 500-write batching.
  * Household entity graph separation (splitting players from guardians under COPPA 2.0).
  * Club management and compliance operations views.
* **What is Broken**:
  * Root `/director` has NO `+page.svelte` (relies purely on layout redirection).
  * Monolithic pages: `/director/billing`, `/director/events`, `/director/import`, `/director/logistics/radar`, `/director/scan`, `/director/uplinks`, `/director/team/[teamId]/roster`.
  * Database race conditions: Direct concurrent writes to `teams/{teamId}` when coach and director edit simultaneously.
* **Resilience Fix**:
  * Add default redirect `+page.svelte` in `/director`.
  * Fracture high-traffic sub-pages (`/director/billing`, `/director/events`) into Trinity components.
  * Enforce atomic `writeBatch` transactions on team roster edits.

---

### 4. Coach OS (`coach`)
* **What Works**:
  * Matchday attribution console (goals, assists, cards, saves, fouls) with +/- scoreboard.
  * The Forge 3-tab tactical suite (Intent Engine, Drill Designer whiteboard, Drill Library) with Scout's Six trait alignment.
  * AEGIS Weather Lockout Radar (NFHS 30-30 Rule 8/15/30-mile proximity rings).
  * Sandbox Mode for uncleared coaches.
* **What is Broken**:
  * Route fragmentation & dead ends:
    * `/coach/match-day` (outdated monolith) vs `/coach/matchday` (Vanguard Trinity).
    * `/coach/tactical` vs `/coach/tactics-and-training` vs `/coach/tactics-board`.
  * 8 skipped test blocks in `intentModule.test.ts` (Intent Engine deploy & cadence tests are completely bypassed).
  * Missing B815 hydration guards in `CoachTeamRosterPanel.svelte`, `platformDrillLibrary.ts`, and `SquadTelemetryView.svelte`.
* **Resilience Fix**:
  * Deprecate `/coach/match-day` and `/coach/tactics-board`, standardizing on `/coach/matchday` and `/coach/tactics-and-training`.
  * Add B815 hydration guards across all coach roster and drill libraries.
  * Unskip and fix `intentModule.test.ts`.

---

### 5. Player OS (`player`)
* **What Works**:
  * XP level progression, active bounty cards, 6-axis skill tree radar, and cosmetic loadout schemas.
* **What is Broken**:
  * **0 of 9 routes implement the Vanguard Trinity Pattern.** The entire Player OS is built on monolithic `.svelte` views.
  * High test flakiness: 143 test files rely on fragile DOM selectors (`.player-card`, `#xp-bar`) that break on any CSS change.
  * Avatar cosmetic customization CSS leaks into the parent container.
  * Missing B815 hydration guards in `MediaVault.svelte`.
* **Resilience Fix**:
  * Fracture `/player/dashboard`, `/player/armory`, and `/player/skill-tree` into Trinity components (`PlayerDashboardEngine.svelte.ts`, `PlayerArena.svelte`, `PlayerHUD.svelte`).
  * Encapsulate avatar CSS to prevent style bleeding.
  * Add B815 guards to `MediaVault.svelte`.

---

### 6. Parent OS (`parent`)
* **What Works**:
  * COPPA 2.0 WebAuthn biometric VPC attestation.
  * Car Ride Home Protocol 15-minute match metric lock.
  * Household operative linking and 4-tab Roster view.
* **What is Broken**:
  * Route duplication: `/parent/vpc` (monolith) vs `/parent/dashboard/vpc` (Trinity).
  * Monolithic sub-pages: `/parent/household`, `/parent/log-workout`, `/parent/compliance`, `/parent/feed`, `/parent/payments`, `/parent/trust-center`.
  * Role collision: Assigning "Assistant Coach" to a parent overwrites `authStore.role`, locking them out of their Parent Portal.
  * Missing B815 hydration guard in `ParentLatestAnnouncements.svelte`.
* **Resilience Fix**:
  * Redirect `/parent/vpc` to `/parent/dashboard/vpc`.
  * Fracture `/parent/household` and `/parent/log-workout` into Trinity components.
  * Implement scoped dual-role switching (`activeContext: 'parent' | 'coach'`) in `authStore`.

---

### 7. Fan & Recruiter OS (`fan` / `recruiter`)
* **What Works**:
  * Recruiter Checkr background check verification gate.
* **What is Broken**:
  * **Fan OS is completely inoperable**: `/fan/watch` contains `BroadcastEngine.svelte.ts` but NO `+page.svelte` UI. Navigating to `/fan` yields a 404.
  * `applyLoginWaterfall` has no routing for `fan`.
  * Recruiter portal has 0 Trinity pattern components and only 4 unit tests.
* **Resilience Fix**:
  * Build the Fan OS Glass & HUD: `src/routes/(app)/fan/watch/+page.svelte`, `BroadcastArena.svelte`, `BroadcastHUD.svelte`.
  * Wire `'fan'` role into `loginRouting.js`.
  * Fracture Recruiter portal into `RecruiterEngine.svelte.ts`, `RecruiterArena.svelte`, `RecruiterHUD.svelte`.

---

### 8. Tutoring Marketplace (`tutor`)
* **What Works**:
  * Backend Stripe Connect callable `bookTutoringSession` in `functions-commerce`.
* **What is Broken**:
  * **0 unit tests in the entire frontend (`src/`) for `tutor`.**
  * Single monolithic `/tutor/+page.svelte` lacking Trinity pattern.
  * No client-side sport/skill filtering to enforce SafeSport and sport-containment boundaries.
  * No tutor onboarding or availability management UI.
* **Resilience Fix**:
  * Fracture `/tutor` into `TutorEngine.svelte.ts`, `TutorArena.svelte`, and `TutorHUD.svelte`.
  * Add unit test suite `src/lib/tutor/__tests__/tutorMarketplace.test.ts`.
  * Implement strict sport-scoped directory filtering.

---

## 3. Resilience Architecture & Anti-Fragility Action Plan

To stop "one fix breaking three things," the engineering Council mandates these five core architectural upgrades:

### Pillar 1: De-Monolith the God Layout (`src/routes/(app)/+layout.svelte`)
* Break down the 744-line layout into isolated, single-responsibility sub-components:
  * `<AuthRouteGuard />` (handles auth redirection with untracked navigation)
  * `<PasskeyEnrollmentGuard />` (handles WebAuthn challenge state)
  * `<PlatformMaintenanceGuard />` (handles emergency kill switch)
  * `<ImpersonationManager />` (handles cross-tab claims detection)
  * `<LicenseSyncManager />` (handles club license entitlements)
* Each guard must manage its own lifecycle cleanly with zero cross-talk or race conditions.

### Pillar 2: Clean Up Ghost Routes & Standardize Canonical Paths
* Create strict 301/client-side redirects for duplicate routes:
  * `/coach/match-day` ➔ `/coach/matchday`
  * `/coach/tactics-board` ➔ `/coach/tactics-and-training`
  * `/parent/vpc` ➔ `/parent/dashboard/vpc`
  * `/admin/audit-logs` ➔ `/admin/audit-log`

### Pillar 3: Multi-Persona Context Switcher (Dual-Role Resilience)
* Upgrade `authStore` from a flat string `role` to a structured session object:
  ```typescript
  interface AuthSessionState {
    primaryRole: 'parent' | 'coach' | 'director' | 'player' | 'admin';
    assignedRoles: string[];
    activeContext: 'parent' | 'coach' | 'director' | 'player' | 'admin';
  }
  ```
* Switching active context between Parent and Assistant Coach updates `activeContext` without stripping the user's primary claims or triggering full-page layout reloads.

### Pillar 4: B815 Defensive Hydration Bulk Patch
* Run automated AST/regex patching across all 55 identified files with missing hydration guards, inserting:
  ```typescript
  if (!db || !authStore.isAuthenticated) return;
  ```
  before any raw Firestore subscription or query execution.

### Pillar 5: Test Suite Modernization & Unskipping Campaign
* Target the 424 skipped test blocks in priority order:
  1. `intentModule.test.ts` (Coach Intent Engine deploy & cadence)
  2. `recruitersEngine.test.ts` (Recruiter verification)
  3. `commissionerAuthGuard.test.ts` (Commissioner security & RBAC)
* Implement scoped Vitest execution scripts so developers and CI only run tests relevant to modified personas, avoiding global timeouts.
