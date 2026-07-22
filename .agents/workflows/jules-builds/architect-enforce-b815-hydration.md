# Workflow: Architect - Enforce b815 Defensive Hydration

**Persona Context**: Chief Architect

## Objective
Aggressively audit and patch all Firestore data fetching mechanisms to enforce the "Defensive Hydration (b815 Rule)" defined in the Global Executive Protocol. This prevents the platform from triggering Quota Exceeded loops when auth states drop.

## Instructions for Swarm Subagent
You are acting on behalf of the **Architect Persona**. Ensure you spawn the correct subagent using `.agents/agents/architect/agent.md` if available.

### Step 1: Locate Target Files
Target `src/lib/services/org.svelte.ts`, `src/lib/services/league.svelte.ts`, and any other central `getDocs` or `onSnapshot` fetching layers.

### Step 2: Inject Hydration Guards
Wrap all raw Firestore `getDocs` or `onSnapshot` queries with strict hydration guards:
`if (!db || !authStore.isAuthenticated) return;`

### Step 3: Zero-Trust & 80-Line Verification
- Validate that injected checks do not cause functions to exceed the strict 80-line limit.
- If a function exceeds 80 lines, extract the fetching logic into a smaller, isolated utility function in `src/lib/services/utils/`.

### Step 4: Quality Assurance
Run `npm run check` to verify Svelte 5 types and assure no reactivity bindings were broken.
