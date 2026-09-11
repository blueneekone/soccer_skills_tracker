---
name: sprint-1.3-multi-role-auth
description: Sprint 1.3 implementation of multi-persona dual-role state in authStore to prevent role clobbering between Parent and Assistant Coach personas.
---

# 🛡️ Sprint 1.3: Multi-Persona Dual-Role State (authStore)
## Orchestrator: Antigravity | Assigned Worker: Google Jules (@jules)

### Goal
Upgrade `src/lib/stores/auth.svelte.js` to support dual-role multi-context switching without wiping primary claims or triggering unmount/redirect loops.

---

### 🏛️ Strict Architectural Constraints (Non-Negotiable)
1. **The Two-File Law**: Modify ONLY:
   - `src/lib/stores/auth.svelte.js` [MODIFY]
   - `src/lib/stores/__tests__/authMultiRole.test.ts` [NEW]
2. **80-Line Function Limit**: No function or helper block may exceed 80 lines.
3. **B815 Defensive Hydration**: Maintain `if (!db || !authStore.isAuthenticated) return;` on all Firestore operations.
4. **Svelte 5 Untrack**: Wrap state mutations and navigations inside `untrack(() => { ... })`.
5. **Zero Any & Zero Skips**: Zero TypeScript `any` and no `it.skip`.

---

### 📦 Exact Implementation Specifications

#### 1. `authStore` Enhancements (`src/lib/stores/auth.svelte.js`)
- Add reactive state `activeContext` (`$state<'parent' | 'coach' | 'director' | 'player' | 'admin' | null>`).
- Add `switchContext(targetRole: string)`:
  - Validates that the user's custom claims or profile permissions include `targetRole`.
  - Updates `activeContext` without overwriting the user's root `role` or wiping custom claims (`clubId`, `tenantId`).
  - Does NOT trigger full layout reload cascades or wipe session cookies.

#### 2. Unit Test Suite (`src/lib/stores/__tests__/authMultiRole.test.ts`)
- Test user with dual roles (`roles: ['parent', 'assistant_coach']`).
- Test that `switchContext('coach')` switches `activeContext` to `'coach'`.
- Test that `switchContext('parent')` restores `activeContext` to `'parent'`.
- Assert custom claims (`clubId`, `teamIds`) remain preserved throughout.
- Assert 0 unauthorized role escalations.

---

### 🧪 Acceptance Gate
```bash
pnpm run check
npm run test:regression:auth
pnpm test -- src/lib/stores/__tests__/authMultiRole.test.ts
```
All checks must return 100% green with 0 errors before opening a Pull Request targeting branch `dev`.
