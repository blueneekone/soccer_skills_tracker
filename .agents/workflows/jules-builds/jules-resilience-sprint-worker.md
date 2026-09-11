---
name: jules-resilience-sprint-worker
description: Cloud VM implementation blueprint dispatched by Antigravity (Lead Orchestrator) to execute modular resilience sprints with strict auth and zero-regression gates.
---

# 🛰️ SSTracker Cloud VM Sprint Worker Specification
## Lead Systems Architect & Orchestrator: Antigravity
## Cloud Builder: Google Jules (@jules)

@jules, you are instructed to execute the assigned codebase resilience sprints inside your GitHub Actions Cloud VM environment under the direct orchestration of Antigravity.

You are STRICTLY FORBIDDEN from committing code that causes regressions, breaks authentication, or bypasses test suites.

---

### 🏛️ PART 1: ARCHITECTURAL BOUNDARIES & GATES (NON-NEGOTIABLE)

1. **The Two-File Governance Law**: No single sprint branch may modify more than 2 to 3 related files. Massive multi-directory PRs will be automatically rejected by the Orchestrator.
2. **The 80-Line Function Limit**: No function body, script block, or handler may exceed 80 lines of code. Extract heavy logic into utility modules (`src/lib/utils/` or `src/lib/components/shell/guards/`).
3. **B815 Defensive Hydration Guard**: Every raw Firestore query (`getDoc`, `getDocs`, `onSnapshot`) must begin with:
   ```typescript
   if (!db || !authStore.isAuthenticated) return;
   ```
4. **Svelte 5 Untrack Mandate**: Any programmatic navigation (`goto`) or state mutation inside a Svelte `$effect` rune MUST be wrapped in an `untrack(() => { ... })` closure.
5. **Zero Bypassed Tests**: You are mathematically barred from adding `it.skip`, `describe.skip`, or dummy template comments (e.g. `<!-- HUD -->`).

---

### 🛡️ PART 2: ASSIGNED SPRINT CONTRACTS

#### SPRINT 1.2: Guard Extraction — Security & License Boundaries
* **Target Files**:
  * `src/lib/components/shell/guards/PasskeyGateGuard.svelte` [NEW]
  * `src/lib/components/shell/guards/ImpersonationGuard.svelte` [NEW]
  * `src/lib/components/shell/guards/LicenseSyncGuard.svelte` [NEW]
  * `src/routes/(app)/+layout.svelte` [MODIFY]
* **Contract**:
  * Extract WebAuthn passkey checks from `+layout.svelte` into `<PasskeyGateGuard />`.
  * Extract cross-tab impersonation detection into `<ImpersonationGuard />`.
  * Extract club license synchronization into `<LicenseSyncGuard />`.
  * Reduce `+layout.svelte` to a lightweight shell (`<180` lines).

#### SPRINT 1.3: Multi-Persona Dual-Role State (`authStore`)
* **Target Files**:
  * `src/lib/stores/auth.svelte.js` [MODIFY]
  * `src/lib/stores/__tests__/authMultiRole.test.ts` [NEW]
* **Contract**:
  * Add `activeContext: 'parent' | 'coach' | 'director' | 'player' | 'admin'`.
  * Add `switchContext(targetRole)` function that toggles active context without overwriting custom claims or stripping primary role.
  * Write comprehensive unit tests verifying that switching from Parent to Assistant Coach never triggers layout unmounts or auth redirect loops.

#### SPRINT 5.1: Auth Regression Guard Master Suite
* **Target Files**:
  * `src/lib/auth/__tests__/authRegressionGuard.test.ts` [NEW]
* **Contract**:
  * Test session token hydration and IndexedDB-to-cookie synchronization.
  * Test lowercase canonical email mapping (`users/{emailLower}`).
  * Test all 8 persona login waterfall destinations.
  * Assert zero infinite redirect loops on route transitions.

---

### 🧪 PART 3: DEFINITION OF DONE & PR DISPATCH

Before creating your Pull Request to `dev`, you must verify:
```bash
pnpm run check
pnpm test -- src/lib/components/shell/guards src/lib/stores/__tests__/authMultiRole.test.ts src/lib/auth/__tests__/authRegressionGuard.test.ts
```

1. Svelte compiler returns **0 errors**.
2. TypeScript returns **0 `any` violations**.
3. All target test suites return **100% green**.

Submit the PR targeting branch `dev` with a clear sprint summary. The Orchestrator (Antigravity) will conduct the architectural review, run pre-commit verification, and execute the merge.
