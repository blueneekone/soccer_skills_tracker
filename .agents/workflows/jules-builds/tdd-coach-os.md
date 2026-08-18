---
name: tdd-coach-os
description: Master production-ready specification to audit, secure, and build the Coach OS (Tactical SIEM). Focuses strictly on backend logic and database security.
---

# 🛰️ SSTracker Master Specification: Coach OS (Tactical SIEM)

@jules, act as our Principal Backend Architect, Chief Security Officer, and Lead Frontend Architect. You are instructed to execute the full functional and visual stabilization of the Coach OS.

This build is gated by our strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 TypeScript 'any' violations, and 100% green unit tests.

---

### 🛡️ Critical Architectural Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No function body may exceed 80 lines. Heavy calculation, RSVPs, or evaluation parsers must be extracted to `functions-core/src/domains/` or `src/lib/utils/`.
2. **Defensive Hydration (B815)**: Wrap all raw Firestore 'getDocs' and 'onSnapshot' queries in:
   `if (!db || !authStore.isAuthenticated) return;`
3. **Pessimistic Definition of Done**: You are strictly forbidden from opening a PR until the Svelte 5 compiler yields 0 warnings and TypeScript returns 0 errors.

---

### ⚙️ Complete Backend Feature Matrix & APIs

You must audit and fully implement the functional codebases across these Svelte routes: `dashboard`, `assignments`, `daily-intel`, `drills`, `forge`, `logistics`, `match-day`, `scouting`, `tactical`, `tactics-board`, `trial-builder`, `war-room`.

#### 📂 Collection 1: Tryouts & Prospect Evaluation Engine (CTO/CSA)
*   **Target**: `functions-core/src/domains/tryoutsOps.js`
*   **APIs**: `upsertTryoutProgram`, `registerForTryout`, `upsertTryoutSession`, `assignTryoutSession`, `setTryoutSessionRsvp`, `checkInTryoutRegistration`, `submitTryoutEvaluation`, and `promoteTryoutToRoster`
*   **Security**: Promoting a tryout player to a roster must execute as a server-side atomic `writeBatch` capped at exactly **500 operations** per batch.

#### 📂 Collection 2: Standardized Scheduling & Player Workouts (CTO)
*   **Target**: `functions-core/src/domains/schedulingOps.js`
*   **APIs**: `logTrainingSession` and `submitCompletionProof`
*   **Security**: Eliminate database mismatches. All scheduling writes and reads must target the canonical `schedules` collection (not `team_workouts`) and standardize on the `startTimestamp` timestamp field (not `startAt`).

#### 📂 Collection 3: Granular Team-Scoped Staff Permissions (CSO)
*   **Target**: `functions-core/src/domains/staffPermissionsOps.js`
*   **APIs**: `callableUpdateStaffRole`
*   **Security**: Assign assistant coaches, team managers, schedule managers, and event managers strictly scoping writes under `/clubs/{clubId}/teams/{teamId}/staff/{userId}` to prevent lateral privilege escalations. Client-side mutations of roles are blocked.

#### 📂 Collection 4: Legally Mandated SafeSport Shadow CC (CSO)
*   **Target**: `functions-compliance/src/domains/commsOps.js`
*   **APIs**: `onChannelCreated` onCreate Firestore trigger.
*   **Security**: Completely strip client-side parent email queries. The frontend must only pass `memberId`. The trigger must:
    1. Initialize channel status as `BLOCKED_VPC_PENDING`.
    2. Query user age on the backend; if under 18, resolve linked guardian emails and write them to `ccParentEmails`.
    3. Promote channel status to `ACTIVE`. Direct message callables must reject writes unless status is `ACTIVE`.

#### 📂 Collection 5: Tomorrow.io Weather Facility Locks (CTO)
*   **Target**: `functions-integrations/src/domains/weatherOps.js`
*   **APIs**: Integrate weather webhook telemetry. When Lightning, Heat, or Air Quality indices cross safety thresholds, write `facility_weather_locks` to Firestore and dynamically lock active SvelteKit calendar routes.

---

### 🎨 Part 3: Svelte 5 Visual & Layout Controls

*   **HTML5 Spatial Canvas Coordinate Math**:
    *   **Target**: `src/lib/components/coach/tactical/TacticalArena.svelte`
    *   **Task**: Eliminate coordinate drift on the SVG tactical pitch designer. Calculate exact mouse positions using: `matrixTransform(getScreenCTM().inverse())`.
*   **Asymmetric Bento Grids**: Force all dashboard views to use the 12-column Bento Grid (8-col Primary, 4-col Sidecar) with fluid clamp math. Enforce strict flat 90-degree corners and Navy Slate backgrounds. Geist Mono is mandatory for all numerical cells.

---

### 🚦 Part 4: Test & Handover

1. Run Svelte compilation checks: `pnpm run check && pnpm run build`.
2. Run targeted Vitest suites: `pnpm test functions/core` and `pnpm test functions/compliance`.
