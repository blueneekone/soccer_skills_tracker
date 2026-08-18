---
name: tdd-commissioner-os
description: Master production-ready specification to audit, secure, and stabilize the Commissioner OS (Federation Command). Focuses strictly on backend logic and database security.
---

# 🛰️ SSTracker Master Specification: Commissioner OS (Federation Command)

@jules, act as our Principal Backend Architect and Chief Security Officer. Execute this targeted functional audit and database lock. You must ignore all styling, animations, and non-logical visual layouts.

This build is gated by our strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 TypeScript 'any' violations, and 100% green unit tests.

---

### 🛡️ Critical Architectural Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract complex routing or lookup tables into utilities under `src/lib/utils/`.
2. **Defensive Hydration (B815)**: Wrap all raw Firestore 'getDocs' and 'onSnapshot' federation queries in:
   `if (!db || !authStore.isAuthenticated) return;`
3. **Pessimistic Definition of Done**: The build is complete only when the Svelte 5 compiler yields 0 warnings and TypeScript returns 0 errors.

---

### ⚙️ Complete Backend Feature Matrix & APIs

You must audit and fully implement the functional codebases across these Svelte routes: `dashboard`, `matrix`, `tournaments`, `federation`.

#### 📂 Collection 1: Cross-Tenant Boundaries & Roster Isolation (CSA)
*   **Target**: `src/lib/services/federation.svelte.ts`
*   **Security**: Ensure queries reading rosters across different `clubIds` are strictly read-only and bounded by the commissioner's master `tenantId` claim. Prevent cross-tenant exposure.
*   **Database Rules**: Write a strict rule inside `firestore.rules` denying Commissioner-side writes to local club rosters or direct messages.

#### 📂 Collection 2: ODP Talent Pipeline Telemetry (CSA)
*   **Target**: `src/lib/components/commissioner/VanguardPrism.svelte`
*   **Task**: Validate player physical telemetry (1000Hz metrics) is correctly mapped to the 6-axis data array in the exact order: `[PACE, ACCEL, AGILITY, STAMINA, POWER, COMP]` before being transmitted.
*   **Constraint**: If metrics are improperly ordered, throw a validation error.

#### 📂 Collection 3: Tournament Operations & Brackets (CTO)
*   **Target**: `src/lib/components/commissioner/TournamentEngine.svelte.ts`
*   **Task**: Implement read-only federation aggregation queries, team rankings, and tournament bracket updates.

---

### 🎨 Part 3: Svelte 5 Visual & Layout Controls

*   **Tactical SIEM Layout**: All views must use sharp 90-degree corners, Navy Slate (`#0f172a`) panels, and 1px Structural Grey (`#334155`) borders.
*   **Zero Gamification**: Absolutely no gamification chamfers, rounded panel corners, or Action Gold elements are permitted on the Commissioner's viewport.
*   **Progressive Disclosure**: Force skeleton loading screens on all dense tables to prevent visual layout shifts during initial hydration.

---

### 🚦 Test & Handover

1. Run Svelte compilation checks: `pnpm run check && pnpm run build`.
2. Run targeted tests: `pnpm test components/commissioner`.
