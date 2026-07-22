# Workflow: Enforce b815 Defensive Hydration

**Description**: Systematically audits and repairs all Firestore `getDocs` and `onSnapshot` queries to enforce strict defensive hydration per the b815 rule in `GEMINI.md`.

## Step 1: Scan and Identify Targets
- **Action**: Scan `src/lib/services/org.svelte.ts`, `src/lib/services/league.svelte.ts`, and other key service files for raw `getDocs` calls.
- **Task**: Identify any data-fetching functions that lack the explicit hydration guard: `if (!db || !authStore.isAuthenticated) return;`

## Step 2: Implement Defensive Guards
- **Action**: Modify the identified functions to inject the strict hydration guards.
- **Constraint**: Ensure all function bodies remain under the 80-line limit. If adding guards pushes a function over 80 lines, extract the data fetching logic into smaller modular functions.

## Step 3: Local Verification
- **Action**: Run `npm run check` and `npx eslint` to ensure no Svelte 5 or TypeScript errors were introduced during the refactor.
- **Output**: Present a summary of modified services to the user and mark the workflow as complete.
