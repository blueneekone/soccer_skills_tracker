# Workflow: Architect — Patch B815 Hydration Guards in org & league Services

**Owner**: Jules (Backend)
**Priority**: P0 — CRITICAL
**Persona Context**: Chief Architect

## Objective
Inject strict B815 Defensive Hydration guards into `org.svelte.ts` and `league.svelte.ts` where raw `getDocs` calls exist without proper `!db || !authStore.isAuthenticated` gating. These unguarded calls can trigger Firebase Quota Exceeded loops when the auth state drops between render cycles.

## Step 1: Patch org.svelte.ts — _refreshAggregates
- **File**: `src/lib/services/org.svelte.ts`
- **Target**: `_refreshAggregates(tenantId: string)` — line ~249
- **Task**: At the top of `_refreshAggregates`, inject the B815 guard BEFORE the `try` block:
  ```typescript
  private async _refreshAggregates(tenantId: string) {
    if (!db || !authStore.isAuthenticated) return; // B815
    try {
      ...
    }
  }
  ```
- **Also verify**: The `onSnapshot` calls in the `connect()` method (lines ~230–241) are already gated by the `connect()` caller's auth check. Confirm this is true — if not, add guards there too.
- **Constraint**: Ensure the function body does not exceed 80 lines after the patch. If it does, extract the `getCountFromServer` call and the `getDocs` call into separate private methods `_refreshPlayerCount()` and `_refreshAvgRating()`.

## Step 2: Patch league.svelte.ts — loadMoreFixtures
- **File**: `src/lib/services/league.svelte.ts`
- **Target**: `loadMoreFixtures()` — line ~318
- **Task**: Inject `!db` check into the existing early-return guard at line 319:
  ```typescript
  // BEFORE:
  if (!this.fixturesHasMore || this.fixturesLoadingMore || !this._fixtureLastDoc || !this._tenantId) return;
  // AFTER:
  if (!db || !this.fixturesHasMore || this.fixturesLoadingMore || !this._fixtureLastDoc || !this._tenantId) return;
  ```
- **Also patch**: The second `getDocs` call at line ~487. Identify the function containing it and apply the same guard pattern.

## Step 3: Verify No Regression
- Run `npm run check` — must return 0 errors.
- Run the full regression suite: `npm run test:regression:acquisition`
- Confirm no `LeagueManager` or `OrgManager` tests are broken by the new guards.

## Step 4: Summary Output
Present a diff of the exact lines modified in each file and confirm the B815 guard is present and verified.
