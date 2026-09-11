---
name: sprint-5.1-auth-regression-suite
description: Sprint 5.1 implementation of the master authentication regression guard test suite covering token hydration, canonical lowercase email mapping, and loop integrity.
---

# 🔒 Sprint 5.1: Auth Regression Guard Master Suite
## Orchestrator: Antigravity | Assigned Worker: Google Jules (@jules)

### Goal
Create a comprehensive, airtight unit test suite in `src/lib/auth/__tests__/authRegressionGuard.test.ts` to permanently prevent auth regressions on token hydration, email case-sensitivity, cookie synchronization, and route waterfall loops.

---

### 🏛️ Strict Architectural Constraints (Non-Negotiable)
1. **The Two-File Law**: Modify ONLY:
   - `src/lib/auth/__tests__/authRegressionGuard.test.ts` [NEW]
   - `package.json` [MODIFY — expand `test:regression:auth` if needed]
2. **80-Line Function Limit**: Break test helpers into modular assertions.
3. **Zero Mocks of Real Logic**: Test actual functional pure evaluators (`loginRouting.js`, `route-policies.js`, `authRoutingEvaluator.ts`).
4. **Zero Skips**: No `it.skip` or `describe.skip`.

---

### 📦 Exact Test Matrix Specifications

1. **Lowercase Email Canonical Mapping**:
   - Verify that all lookup paths (`users/{emailLower}`) normalize emails to lowercase (`doc(db, 'users', email.toLowerCase())`).
   - Prevent mixed-case email fragmentation (`User@Club.org` vs `user@club.org`).

2. **Session Cookie Synchronization**:
   - Verify that token hydration correctly syncs the session cookie payload without clearing valid tokens.
   - Assert graceful error recovery if IndexedDB is temporarily unavailable.

3. **Multi-Role Login Waterfall Destinations**:
   - Test all 8 persona destinations:
     - `director` -> `/director/dashboard`
     - `coach` -> `/coach/dashboard`
     - `parent` -> `/parent/dashboard`
     - `player` -> `/player/dashboard`
     - `commissioner` -> `/commissioner/dashboard`
     - `fan` -> `/fan/watch`
     - `admin` -> `/admin/dashboard`
     - `recruiter` -> `/recruiter`
   - Assert zero route loops.

4. **Programmatic Navigation Untrack Safety**:
   - Assert that evaluation of route guards never triggers infinite reactivity loops.

---

### 🧪 Acceptance Gate
```bash
pnpm run check
npm run test:regression:auth
```
Must pass 100% green with 0 errors before opening a Pull Request targeting branch `dev`.
