---
name: sprint-3.3-parent-household-management-trinity
description: Sprint 3.3 Vanguard Trinity fracturing for Parent Household Management, roster stubs, and assistant coach delegations.
---

# 🛡️ Sprint 3.3: Parent Household Management Vanguard Trinity
## Orchestrator: Antigravity | Assigned Cloud Worker: Google Jules (@jules)

### Goal
Decompose and fracture the Parent Household Management route (`src/routes/(app)/parent/household/`) into the strict Vanguard Trinity Pattern:
1. **The Shell** (`+page.svelte`): Lightweight reactive routing container.
2. **The Brain** (`ParentHouseholdEngine.svelte.ts`): Svelte 5 `$state` / `$derived` runes managing athlete profiles, household contacts, SafeSport CC emails, and staff roles.
3. **The Glass** (`ParentHouseholdArena.svelte`): Liquid Bento card layout displaying athletes, season fees, tournament fees, and emergency info.
4. **The HUD** (`ParentHouseholdHUD.svelte`): Household compliance status, active athletes count, and fee clearance badges.

---

### 🏛️ Non-Negotiable System Constraints
1. **The Scope Law**: Target strictly `src/routes/(app)/parent/household/`.
2. **80-Line Function Limit**: Extract complex mapping or validation into `src/lib/utils/`.
3. **Strict Svelte 5 Runes**: Use `$state`, `$derived`, `$effect`, and wrap any route navigations or mutations inside `$effect` with `untrack(() => { ... })`.
4. **B815 Defensive Hydration Guard**: Every Firestore call (`getDoc`, `getDocs`, `onSnapshot`) must begin with `if (!db || !authStore.isAuthenticated) return;`.
5. **No Regressions**: All existing tests must pass 100% green (`npm run test:regression:auth`, `npm run check`, `npm run build`).

---

### 🧪 Verification Steps for Jules
Run before committing:
```bash
node ./node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json --threshold error
npm run test:regression:auth
npm run build
```
Commit format:
`feat(sprint-3.3): fracture parent household into vanguard trinity pattern`
