---
title: "Jules Multi-Persona Stabilization, Parent Dispatch Codes & AEGIS Lightning Radar Verification"
description: "Comprehensive cloud build workflow for Jules to audit, test, and verify Director OS, Coach Dispatch Codes, and AEGIS Lightning Radar across all personas."
---

# 🚀 SSTRACKER (PROJECT PHOENIX) — JULES CLOUD BUILD WORKFLOW
**Role:** Cloud Systems Architect & Lead Reliability Engineer (Autonomous Swarm Executor)
**Target:** Director OS Club Resolution, Coach Parent Dispatch Codes, AEGIS Lightning System & Radar Map

---

## 📋 EXECUTIVE OBJECTIVES & SCOPE

1. **Director OS Hydration & Club Resolution**:
   - Ensure `DirectorDashboardEngine`, `TacticsTrainingEngine`, `ClubManagementEngine`, and `ComplianceOpsEngine` smoothly resolve the director's assigned `clubId` from `authStore.userProfile.clubId` or `users/{email}.clubId` even when `teamsStore.clubs` initially starts empty.
   - Verify that all club rosters, fields, and compliance vaults load with 0 blank screens.

2. **Coach Parent Dispatch Code & Onboarding Pipeline**:
   - Verify that coaches can view, copy, and regenerate team dispatch codes in `CoachTeamRosterPanel.svelte` (`/coach/logistics`) and `SquadMatrix.svelte` (`/coach/dashboard`).
   - Validate the end-to-end parent registration and player linking flow: Parent enters dispatch code on `/parent/household` or `/setup` -> links player to coach's team roster via `resolveDispatchCode`.

3. **AEGIS Weather & Lightning Safety Radar Pipeline**:
   - Verify real-time weather querying via `getWeatherConditions` (NOAA NWS + Open-Meteo).
   - Test lightning alert level transitions (`NORMAL` -> `CAUTION` -> `DANGER`) and 30-minute "Car Ride Home / 30-30 Rule" all-clear countdown.
   - Verify interactive satellite facility mapping in `FacilityMapVault.svelte` with shelter locations, turf status, and automated weather lockout triggers.

---

## 🏛️ MANDATORY ARCHITECTURAL LAWS & CONSTRAINTS

1. **80-Line Function Limit**: No function body, script helper, or utility may exceed 80 lines of code.
2. **Defensive Hydration Guard (B815)**:
   ```typescript
   if (!db || !authStore.isAuthenticated) return;
   ```
3. **Svelte 5 Reactivity Strictness**: All state mutations and route transitions inside `$effect` must be wrapped in `untrack(() => { ... })`.
4. **Zero-Trust Multi-Tenancy**: Tenant-scoped queries must respect `clubId` and `teamId` boundaries.

---

## 🧪 STEP-BY-STEP TDD VERIFICATION SUITE

### Step 1: Director OS Hydration & Navigation Tests
Run targeted vitest tests:
```bash
npx vitest run src/lib/director/__tests__/pickDirectorClubId.test.ts src/lib/director/__tests__/directorDashboardEngine.test.ts
```

### Step 2: Parent Onboarding & Dispatch Code Flow Tests
Run targeted vitest tests:
```bash
npx vitest run src/lib/parent/__tests__/householdOperatives.test.ts src/lib/parent/__tests__/householdClearanceLoad.test.ts src/lib/platform/__tests__/acquisitionRegression.guard.test.ts
```

### Step 3: AEGIS Weather & Lightning Lockout Tests
Run targeted vitest tests:
```bash
npx vitest run src/lib/components/director/os/__tests__/epic54WeatherLock.test.ts src/lib/states/__tests__/FieldOpsEngine.test.ts functions/src/tests/weatherLockout.test.ts
```

### Step 4: Workspace Compilation & Static Analysis
Run Svelte check and ESLint:
```bash
npm run check
```
*Requirement: Must return 0 errors.*

---

## 📦 PULL REQUEST & ARTIFACT SUBMISSION
When all tests are 100% green and compilation returns 0 errors:
1. Capture screenshots/logs in `/audit-artifacts/jules-builds/`.
2. Commit with conventional commit message: `feat(platform): stabilize director OS, parent dispatch codes, and lightning radar`.
3. Open a Pull Request into `dev`.
