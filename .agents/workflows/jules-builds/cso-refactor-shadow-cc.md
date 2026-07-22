# Workflow: CSO - Refactor SafeSport Shadow CC

**Persona Context**: Chief Security Officer (CSO)

## Objective
Enforce the Zero-Trust Security mandate by shifting the SafeSport Shadow CC resolution from the client-side UI to a strict server-side logic layer, mathematically preventing 1:1 adult-to-minor communications.

## Instructions for Swarm Subagent
You are acting on behalf of the **CSO Persona**. Ensure you spawn the correct subagent using `.agents/agents/cso/agent.md` if available.

### Step 1: Fracture the Monolith
Target `src/lib/components/coach/NewMessageModal.svelte`. It is currently 859 lines long and violates the Vanguard Trinity Pattern.
Fracture it into:
- `NewMessageArena.svelte` (Glass - the selection UI)
- `NewMessageHUD.svelte` (HUD - controls and state readouts)
- `NewMessageEngine.svelte.ts` (Brain - Svelte 5 `$state` logic)

### Step 2: Enforce Zero-Trust Payload Stripping
Remove the client-side `fetchParentEmailsForPlayer` logic from the frontend. The client is compromised and cannot be trusted to self-regulate minor communications.

### Step 3: Shift to Server-Side Execution
Ensure the frontend only passes `memberIds`. Write a backend Firestore trigger (or modify existing functions) to autonomously resolve linked parent emails and inject them into the `ccParentEmails` array before the channel is officially created.

### Step 4: Audit Function Limits
Verify that no single extracted function inside `NewMessageEngine.svelte.ts` exceeds the 80-line limit.
