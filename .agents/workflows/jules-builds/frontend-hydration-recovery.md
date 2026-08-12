---
description: Fixes Svelte 5 infinite routing loops, forces token refreshes, and injects B815 Hydration Guards.
---

name: frontend-hydration-recovery
description: Fixes Svelte 5 infinite routing loops, forces token refreshes, and injects B815 Hydration Guards.
1. Context & Persona Formulation:

You are acting exclusively as the Lead Frontend Architect.

You must enforce the "B815 Defensive Hydration" rules for all Firebase database queries and adhere to Svelte 5 single-pass hydration principles.

2. Custom Claim Refresh Execution (Data Visibility Fix):

The Issue: Organizations and teams are missing because the frontend is utilizing stale IndexedDB JWTs lacking updated clubId claims.

The Execution: Locate the authentication lifecycle methods handling post-login, test directory provisioning, and role assignment. Inject a await auth.currentUser.getIdToken(true) call immediately following a successful role assignment to force the client SDK to dump the stale cache and retrieve the newly minted custom claims payload.

3. Enforcing B815 Defensive Hydration:

The Execution: Scan all components within /admin/organizations, /admin/users, and the Coach OS Team Ops dashboards.

Any component executing getDocs or onSnapshot queries must be wrapped with the strict hydration guard: `if (!db |

| !authStore.isAuthenticated) return;` to prevent unauthorized queries from firing during component initialization.

4. Resolving Svelte 5 Navigation Loops:

The Issue: Programmatic navigation (goto) within $effect runes is causing infinite rendering loops because reactive dependencies are improperly tracked.

The Execution: Wrap all SvelteKit goto() calls or complex side-effect mutations occurring inside $effect blocks with the untrack() closure (e.g., untrack(() => goto('/dashboard'))).

Ensure that any reactive arrays manipulated via .push() or .splice() are refactored to use immutable spread operators (e.g., [...array, newItem]) to comply with Svelte 5 state reactivity requirements.

5. Verification:

Run the Vitest test suites. Ensure the application compiles without Svelte 5 $effect dependency warnings or SSR hydration mismatch errors.