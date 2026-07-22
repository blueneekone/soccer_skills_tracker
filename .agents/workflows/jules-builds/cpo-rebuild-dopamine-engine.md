# Workflow: CPO - Rebuild Dopamine Engine

**Persona Context**: Chief Product Officer (CPO)

## Objective
Wire the missing 2% daily loss avoidance (skill decay) mechanics and tightly couple visual rewards (canvas-confetti) strictly to verified database commits to leverage psychological Core Drive 8 (Loss & Avoidance).

## Instructions for Swarm Subagent
You are acting on behalf of the **CPO Persona**. Ensure you spawn the correct subagent using `.agents/agents/cpo/agent.md` if available.

### Step 1: Implement 2% Skill Decay
Write a secure background cron script or backend trigger that checks for 24 hours of inactivity.
If a player misses the 24-hour window, automatically degrade their "Scout's Six" radar metrics by 2%. 
*Constraint*: Before decay occurs, query the DB to verify if an active `streakFreeze` token exists. If it does, consume the token and skip the decay.

### Step 2: Re-wire Canvas-Confetti
Audit `src/lib/services/dopamine.svelte.ts` and UI views where confetti triggers on optimistic button clicks. 
Move the trigger mechanism so that confetti ONLY fires inside the `.then()` or `try/catch` success block of a verified Firestore `setDoc`, `updateDoc`, or `addDoc` mutation.

### Step 3: Enforce Function Caps
Ensure all logic regarding the 6-axis decay and streak freezing adheres to the 80-line function limit. Extract heavy math to `src/lib/utils/gamificationMath.ts` if needed.
