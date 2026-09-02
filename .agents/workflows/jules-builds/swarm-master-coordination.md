# SSTracker Swarm Master Coordination Specification
## Protocol: Unified Multi-Agent Execution & Pipeline Consolidation
## Version: 1.0.0 (Launch-Ready Hardening)

---

### 🏛️ SYSTEM RULESETS & GLOBAL MANDATES

All executing agents must strictly adhere to the following architectural rules. Any modification that violates these parameters will be automatically rejected by the **Critic** and reverted by the **Chief Reliability Officer (CRO)**.

1. **THE 80-LINE CONSTRAINT:** No single custom event handler, routing hook, Svelte 5 state block, or utility helper may exceed **80 lines of physical code**. Modularity is non-negotiable.
2. **B815 DEFENSIVE HYDRATION:** Before triggering any Firestore or Firebase Auth client-side API call on layout/component mounts, agents must execute the guard:
   `if (typeof window === 'undefined' || !db || !authStore.isAuthenticated) return;`
   This mathematically prevents server-side rendering (SSR) hydration mismatches and rapid-fire API quota consumption.
3. **ZERO-TRUST AUTHORIZATION:** The frontend is entirely untrusted. All user permissions, verification status transitions (`isCleared: true`), and tenant scopes must be verified and locked exclusively via Firestore Rules and server-side Cloud Functions.
4. **THE NUCLEAR AMERICANA TECH NOIR STANDARD:** The UI must adhere to the 60-30-10 palette: Void Black (backgrounds/shells), Navy Slate and Structural Grey (containers/panels), Data Cyan (interactive elements), and Action Gold (primary CTAs/success states). Magenta is strictly banned unless signifying an active threat vector or error state.
5. **ANTI-LOOPING CIRCUIT BREAKER:** During the iterative test-and-repair loop, any individual subagent is permitted a maximum of **3 compiling or testing attempts**. If errors persist after the 3rd attempt, the subagent must revert the target file to its clean Git HEAD state and halt.

---

### 👥 SWARM ASSEMBLY: ROLES & ASSIGNMENTS

```
               [ ORCHESTRATOR / GENERAL MANAGER ]
                               |
       -------------------------------------------------
      |                        |                        |
[ TRIAGE & SECURITY ]   [ UX & MULTIMEDIA ]     [ TDD SWARM LOOP ]
  - Triage Diagnostician  - UX Navigation          - Test Architect (Agent A)
  - CSO                   - CDO                    - Code Builder (Agent B)
  - Critic                - Multimedia Director    - Refactoring Engine (Agent C)
                                                   - CRO (QA Beast)
```

#### A. The Triage & Security Node
*   **`diagnostician` (Triage Diagnostician):** Spawns first. Analyzes test trace logs using `rg` to pinpoint precisely which line of rule or layout code is failing before modifications begin.
*   **`cso` (Chief Security Officer):** Validates that all RBAC payload structures are secure and that child-tenant paths are properly isolated.
*   **`critic` (Adversarial Critic):** Performs single-pass peer reviews of Candidate patches to intercept visual style drifts, unauthorized routes, or redundant packages.

#### B. The Frontend & UX Node
*   **`ux-navigation` (UX Consolidation Architect):** Enforces consolidated routing layouts. Restores the `/coach/tactics-and-training` layout shell and ensures deep-linking operates via query parameters (`?tab=war-room`, `?tab=matchday`).
*   **`cdo` (Chief Design Officer):** Eradicates all unauthorized color styling and restores the atomic Tech Noir layout, asymmetric bento grids, and the `CompetitivePositionPanel` on the marketing landing page.
*   **`multimedia` (Multimedia Director):** Coordinates Playwright video recording pipelines, stitching green validation runs into optimized MP4 video assets.

#### C. The Test-Driven Development (TDD) Swarm
*   **`test-architect` (TDD Agent A):** Defines data contracts and writes/modifies Svelte and security test assertions prior to code writes.
*   **`code-builder` (TDD Agent B):** Modifies the application and rule files within an isolated VM workspace until tests pass.
*   **`refactoring-engine` (TDD Agent C):** Optimizes the resulting code, checks for proper memory cleanup, and modularizes long files.
*   **`cro` (Chief Reliability Officer / QA Beast):** Executes the Playwright visual regression suites and Vitest files, asserting 100% compliance.

---

### 📂 PHASES OF WORK

#### PHASE 1: RECONCILE SECURITY RULES (`firestore.rules`)
**Objective:** Eradicate cross-club read/write leaks, fix nested attendance sessions, and pass all 3 sandbox isolation tests and legacy tenant tests natively.

1.  **Isolate Pathing Failures:**
    *   `diagnostician` analyzes the `firestoreRulesSprint412.test.ts` failure logs.
    *   Identifies that the legacy tests are targeting the nested path: `/teams/{teamId}/attendance_sessions/{sessionId}`.
2.  **Structural Rule Rewrites (No Regex):**
    *   `architect` removes the top-level `/attendance_sessions` match block.
    *   `architect` nests the `/attendance_sessions` matching block strictly inside the `/teams/{teamId}` scope:
        ```javascript
        match /teams/{teamId} {
          allow read, write: if request.auth != null && isCleared();
          
          match /attendance_sessions/{sessionId} {
            allow read, write: if request.auth != null && isCleared();
          }
        }
        ```
3.  **Tenant Scope Gating:**
    *   `cso` and `architect` restrict the `/users/{userId}` database matches. Ensure that user profiles are only readable by the owner or users with matching custom token claims:
        ```javascript
        match /users/{userId} {
          allow read: if request.auth != null && (
            request.auth.uid == userId ||
            (request.auth.token.get('clubId', null) != null && resource.data.clubId == request.auth.token.clubId) ||
            (request.auth.token.get('tenantId', null) != null && resource.data.tenantId == request.auth.token.tenantId)
          );
        }
        ```
    *   `cso` restricts the broad `isGlobalAdmin()` helper function so it does not evaluate standard `'director'` claims as admin.
4.  **TDD Validation:**
    *   `cro` runs `npm run test:firestore-rules`.
    *   If rules compilation fails or a tenant test breaks, the **Anti-Looping Circuit Breaker** fires. The file is reverted, and the parameters are updated by `critic` before Attempt 2.

---

#### PHASE 2: ERADICATE DESIGN DRIFT & RESTORE LAYOUTS
**Objective:** Revert navigation splits, restore consolidated dashboard wrappers, eliminate unauthorized "Cyber Magenta" styles, and pass all Playwright assertions.

1.  **Deconstruct UX Splits:**
    *   `diagnostician` reviews failures in `CoachTacticsAndTrainingNav.test.ts` and `marketingLanding.test.ts`.
2.  **Restore Consolidated Navigation:**
    *   `ux-navigation` rolls back individual routing layout splits. Re-establishes the consolidated page wrapper at `src/routes/(app)/coach/tactics-and-training/+page.svelte`.
    *   Deep-linking tabs (War Room, Forge, Match Day) are wired strictly to reactive query parameters.
3.  **Revert Aesthetic Drift:**
    *   `cdo` sweeps the repository for unauthorized styles. Replaces all hot magenta styling with Void Black, Navy Slate, and Action Gold accents.
    *   `cdo` re-injects the missing `CompetitivePositionPanel` into `src/routes/+page.svelte` (Marketing Landing).
    *   Verifies that the layout complies with the brutalist Tech Noir standard.
4.  **Playwright Execution & Visual Audits:**
    *   `cro` boots the local dev server and runs:
        `npx playwright test tests/CoachTacticsAndTrainingNav.test.ts tests/marketingLanding.test.ts`
    *   The `Browser Subagent` monitors the headless browser window to guarantee that no text-squishing occurs on the 12-column asymmetric Bento Grid across desktop and mobile viewports.

---

### 🧪 CROSS-AGENT COORDINATION PROTOCOL

Each agent must log its state transitions inside a central coordinate tracking sheet in the VM workspace (`/audit-artifacts/swarm-state.json`) to prevent multi-agent race conditions:

1.  **STATE: IDLE** -> Ready for task allocation.
2.  **STATE: SCANNING** -> Reading codebase, identifying files, verifying syntax. No code modifications permitted.
3.  **STATE: PLAN_LOCKED** -> Implementation Plan approved. Target files registered.
4.  **STATE: TESTING_RED** -> Integration tests executing, confirming starting failure.
5.  **STATE: BUILD_LOOP** -> Modifying code, compiling, checking errors. (Subject to the 3-attempt circuit breaker limit).
6.  **STATE: TESTING_GREEN** -> Verification suites executed, returning 100% green statuses.
7.  **STATE: STAGE_VERIFIED** -> Code checked by `critic`, files formatted, ready for final integration.

---

### 🚪 DEFINITION OF DONE

The Master Swarm is not permitted to declare success or open a Pull Request until:
*   [ ] `firestoreTenantIsolation.test.ts` compiles and runs with 0 errors.
*   [ ] `firestoreRulesSprint412.test.ts` compiles and runs with 0 errors.
*   [ ] `securityRules.test.ts` passes 100% of the newly added Sandbox Isolation tests.
*   [ ] `CoachTacticsAndTrainingNav.test.ts` passes 100% of nav-link assertions.
*   [ ] `marketingLanding.test.ts` confirms the presence of the `CompetitivePositionPanel` and proper Tech Noir typography.
*   [ ] The codebase compiles cleanly on the dev server with 0 Svelte 5 hydration warnings.
