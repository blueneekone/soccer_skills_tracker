---
description: P0 — Patch all unguarded getDocs() calls to enforce the b815 Defensive Hydration Rule and prevent Quota Exceeded loops.
---

# Workflow: Fix b815 Auth Guards

**Priority:** P0 🔴 CRITICAL  
**Rule Enforced:** GEMINI.md §4 — "You MUST wrap all Firestore `getDocs` calls in strict hydration guards (`if (!db || !authStore.isAuthenticated) return;`) to prevent Quota Exceeded loops."

---

## Context
The audit identified 8+ files where `getDocs()` is called inside `$effect` blocks or async functions without verifying auth state. `DirectorAnalyticsCharts.svelte` is the highest risk — it reads full `clubs`, `teams`, and `player_lookup` collections without an auth gate, meaning it can fire on every SSR hydration or unauthenticated page visit.

---

## Step 1: Create the Shared Hydration Guard Utility

**File:** `src/lib/utils/firestoreGuard.ts`  
**Action:** [NEW]

Create a pure utility function that centralizes the b815 guard logic:

```typescript
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth/authStore.svelte.js';

/**
 * b815 Defensive Hydration Guard.
 * Call this at the top of every getDocs() block.
 * Returns true if safe to proceed, false if the call must abort.
 */
export function isFirestoreReady(): boolean {
  return !!db && authStore.isAuthenticated === true && !authStore.isLoading;
}
```

**Constraint:** Function body must remain under 80 lines. No side effects allowed.

---

## Step 2: Patch `DirectorAnalyticsCharts.svelte` (Highest Risk)

**File:** `src/lib/components/shell/DirectorAnalyticsCharts.svelte`  
**Action:** MODIFY  

**Target block (around line 54):**
```javascript
$effect(() => {
  if (!browser) return;
  // ... getDocs calls
```

**Replace with:**
```javascript
$effect(() => {
  if (!browser) return;
  if (!isFirestoreReady()) return; // b815 guard
  // ... getDocs calls
```

Add import at top of `<script>`: `import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';`

---

## Step 3: Patch `ActionInbox.svelte` (6 unguarded calls)

**File:** `src/lib/components/shell/ActionInbox.svelte`  
**Action:** MODIFY  

Add `if (!isFirestoreReady()) return;` as the **second line** inside each of the 6 async fetch functions at lines 53, 83, 105, 118, 124, 158.

---

## Step 4: Patch Medium-Risk Files

For each file below, add `if (!isFirestoreReady()) return;` immediately before the first `getDocs()` call within its `$effect` or async loader:

- `src/lib/components/shell/CoachTeamXpVelocityChart.svelte`
- `src/lib/components/coach/SquadMatrix.svelte` (lines 239–243, 446, 457)
- `src/lib/components/coach/PlaybookTab.svelte` (line 31)
- `src/lib/components/recruiter/RecruiterSearchEngine.svelte` (line 106)
- `src/routes/(app)/player/dashboard/+page.svelte` (line 315)
- `src/routes/(app)/messages/+page.svelte` (lines 166, 180, 200)

---

## Step 5: Write the Guard Test

**File:** `src/lib/utils/__tests__/firestoreGuard.test.ts`  
**Action:** [NEW]

Write a Vitest test that:
1. Asserts `isFirestoreReady()` returns `false` when `authStore.isAuthenticated === false`
2. Asserts `isFirestoreReady()` returns `false` when `authStore.isLoading === true`
3. Asserts `isFirestoreReady()` returns `true` only when both `db` and `authStore.isAuthenticated === true`

---

## Step 6: Verify

Run: `npm run check` — must return 0 Svelte errors.  
Run: `npx vitest run src/lib/utils/__tests__/firestoreGuard.test.ts`  
All tests must pass before marking complete.

---

## Step 7: Commit

```
git add .
git commit -m "fix(b815): enforce defensive hydration guards on all getDocs() calls"
git push origin dev
```
