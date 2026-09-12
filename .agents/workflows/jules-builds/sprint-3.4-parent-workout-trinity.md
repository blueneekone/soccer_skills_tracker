---
name: sprint-3.4-parent-workout-log-compliance-trinity
description: Sprint 3.4 Vanguard Trinity fracturing for Parent Workout Log and 15-min Car Ride Home lockout isolation.
---

# 🛡️ Sprint 3.4: Parent Workout Log & Compliance Trinity
## Orchestrator: Antigravity | Assigned Cloud Worker: Google Jules (@jules)

### Goal
Decompose and fracture the Parent Workout Log and Match Day viewing routes (`src/routes/(app)/parent/log-workout/` and associated match view) into the Vanguard Trinity Pattern:
1. **The Shell** (`+page.svelte`): Lightweight reactive routing container.
2. **The Brain** (`ParentWorkoutEngine.svelte.ts`): Svelte 5 `$state` runes managing match telemetry, the mandatory 15-minute "Car Ride Home" protocol countdown timer, and workout logging.
3. **The Glass** (`ParentWorkoutArena.svelte`): Renders workout logging form, exercises, and post-match embargo overlay.
4. **The HUD** (`ParentWorkoutHUD.svelte`): Displays embargo status, remaining lockout countdown, and parental attestation badge.

---

### 🏛️ Non-Negotiable System Constraints
1. **The Scope Law**: Target strictly `src/routes/(app)/parent/log-workout/`.
2. **80-Line Function Limit**: Extract complex timer or formatting routines into `src/lib/utils/`.
3. **Strict Svelte 5 Runes**: Use `$state`, `$derived`, `$effect`, and wrap any route navigations or mutations inside `$effect` with `untrack(() => { ... })`.
4. **Car Ride Home Mandate**: Match metric dashboards must lock out for exactly 15 minutes post-game.
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
`feat(sprint-3.4): fracture parent workout log and compliance into vanguard trinity`
