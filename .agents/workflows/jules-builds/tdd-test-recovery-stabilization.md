# Workflow: Test Suite Recovery and Codebase Stabilization (CRO)
**Owner**: Jules (Backend) / Antigravity (Frontend) | **Priority**: P1 — PIPELINE STABILITY | **Persona**: Chief Reliability Officer (CRO)

## Objective
Isolate, audit, and systematically repair broken or skipped tests across the SSTracker test suite without introducing feature drift. This dedicated workflow separates the stabilization of legacy, layout, and regression tests from functional feature branches (like the B2B registration pipeline) to prevent pipeline blockers.

---

### Phase 1: Isolation & Dependency Mapping
1. **Target Identification**: Identify failing test suites from the main branch. Determine if the errors are:
   * **Visual/Structural Regressions**: Failing due to updated "Nuclear Americana Tech Noir" design classes (e.g., `.quest-hero` to `.quest-row`).
   * **Reactivity Loops**: Infinite loops caused by un-gated $effect blocks inside Svelte 5 views.
   * **Mock/Hydration Issues**: Failing due to missing Firebase mock states or lack of B815 defensive hydration guards.
2. **Selective Execution**: Run specific targets to prevent a cascade of unrelated failures from blocking local checks:
   ```bash
   pnpm test -- <specific-test-file-path>
   ```

---

### Phase 2: Systematic Cleanup & Refactoring
1. **Structural Repair (No Proxy Hacks)**: 
   * If a test asserts the presence of older DOM elements, rebuild the target test assertions or adapt the Svelte 5 components legitimately.
   * **P0 Violation Ban**: You are strictly forbidden from using empty HTML comments (e.g., `<!-- HUD -->`) or dummy files solely to trick string-matching/regex-based test checkers.
2. **Global Exemption Refactoring**: 
   * If a page legitimately deviates from the Vanguard Trinity Pattern, you must programmatically update `vanguardTrinity.test.ts` by adding the route to the explicit, hardcoded exemption array at the top of the file.
3. **Core Rules Enforcement during Refactors**:
   * Wrap Svelte 5 side-effects inside `$effect` blocks in `untrack()` closures to eliminate reactivity memory loops.
   * Enforce the 80-line maximum limit on all modified functions. Extract heavy parsing or array manipulation to `src/lib/utils/`.
   * Ensure B815 Defensive Hydration guards (`if (!db || !authStore.isAuthenticated) return;`) are present on all getDocs/onSnapshot queries.

---

### Phase 3: Authentication & Verification Gating
1. **Zero-Touch Traversal**: Bypassing UI-based auth checks in visual tests using backend tools:
   * Programmatically mint custom JWT tokens on the backend using the Firebase Admin SDK (`admin.auth().createCustomToken(uid)`) and inject them into browser session storage.
2. **Execution Gates**:
   * Run Svelte type-checking to ensure exactly 0 compilation errors:
     ```bash
     npm run check
     ```
   * Clear the test cache and execute the suite to ensure all target assertions pass cleanly without dummy stubs or fakes:
     ```bash
     pnpm test --no-cache
     ```

---

### Phase 4: Roadmap Update & PR Creation
1. **PR Submission Guidelines**: Commit only the refactored test files and Svelte components. Do not group backend operations or database schema migrations into this stabilization PR.
2. **Done Definition**: The workflow is only complete when the target pipeline is 100% green, all compilation checks return 0 errors, and no tests have been bypassed with temporary workaround bypasses.
