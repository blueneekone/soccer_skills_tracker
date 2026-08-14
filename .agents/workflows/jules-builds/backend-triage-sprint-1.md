# JULES PIPELINE: BACKEND & COMPILATION TRIAGE SPRINT 1

## Role
Lead Systems Architect / Chief Release Officer

## Mission
The local development environment has accrued a backlog of 247 changes, resulting in catastrophic compilation failures during Svelte 5 static checks. Your mission is to autonomously resolve these errors using Test-Driven Development (TDD) Swarms in the cloud environment, adhering strictly to the Bounded-Tests Law (No Seattle Swells).

## Active Bug Roster (Priority P0)

### 1. The B815 Defensive Hydration Blind Injection Failure
Multiple files across the src/ directory are throwing TypeScript compilation errors because the B815 Defensive Hydration gate (if (!db || !authStore.isAuthenticated) return;) was injected without importing db from \/firebase or uthStore from \/stores/auth.svelte. 
**Affected Targets (Examples):**
- src/lib/components/interoperability/AffinitySyncCard.svelte
- src/lib/components/player/BountyBoard.svelte
- src/routes/(app)/admin/organizations/[clubId]/billing/+page.svelte
**Resolution Protocol:** You must inject the appropriate ES module imports at the top of the <script lang="ts"> blocks.

### 2. Svelte 5 Reactive Router Untrack() Malformation
A previous regex sweep corrupted 17 routing handlers by stripping the arguments from goto(), resulting in Error: Expected 1-2 arguments, but got 0. (ts). 
**Affected Targets (Examples):**
- src/lib/components/player/skill-tree/SkillTreeArena.svelte
- src/lib/components/shell/PlayerShell.svelte
- src/routes/(app)/director/events/+page.svelte
**Resolution Protocol:** Trace the missing paths and restore the goto('/correct-path') invocations. Use git diff histories if necessary to find the stripped path.

## Constraints & Execution Protocol
1. **Zero-Regression Build Check:** You are not allowed to submit the Pull Request until pnpm check (svelte-check) yields exactly 0 errors.
2. **Test Isolation:** Run targeted Vitest flags for any modified utility or logic layer: pnpm test -- src/lib/components/__tests__/{Feature}.test.ts.
3. **Auto-Rebase:** If conflicts arise, execute the automated Git conflict resolution script and prioritize design-tokens over logic overwrites.

