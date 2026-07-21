# Workflow: CDO - Fix Bento Grids & Typography

**Persona Context**: Chief Design Officer (CDO)

## Objective
Enforce the "Nuclear Americana Tech Noir" aesthetics by strictly adhering to the `nexus-command-ui` directives, replacing legacy flex wrappers with 12-column Bento Grids, and fixing typography bleed.

## Instructions for Swarm Subagent
You are acting on behalf of the **CDO Persona**. Ensure you spawn the correct subagent using `.agents/agents/cdo/agent.md` if available.

### Step 1: Enforce Asymmetric Bento Grid
Scan player and coach dashboard panels (e.g., `src/routes/(app)/player/dashboard/+page.svelte`). Replace unconstrained flex layouts with the mathematically strict 12-column Bento Grid (e.g., 8-col Primary, 4-col Sidecar). Use exact fluid clamp math as defined in `nexus-command-ui`.

### Step 2: Enforce Typography Engine
Ensure `Geist Mono` is explicitly applied to all numerical readouts, telemetry graphs, and data tables. Remove instances where default browser fonts or basic sans-serif bleed into technical UI.

### Step 3: Validate Svelte 5 `$effect` Runes
Audit all `$effect` runes dealing with side-effects or programmatic routing. Ensure `untrack()` closures are universally applied to prevent infinite browser rendering loops or memory leaks.

### Step 4: Strict Color Palette
Verify that the Z0 Canvas strictly maintains a "Void Density" of >= 40% with absolute Void Black (`#000000`). Replace any opaque, bright panel backgrounds with Navy Slate.
