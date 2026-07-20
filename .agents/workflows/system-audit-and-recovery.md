---
description: Audit Workflow
---

# Workflow: Comprehensive System Audit and Swarm Recovery
**Description**: Acts as the Orchestrator for the "20-Year Veteran Council" (Architect, CDO, CPO, CSO, CRO) to audit the SSTracker codebase, aggressively map the gap between current reality and the Master Roadmap, and generate specialized recovery workflows for UI/UX, Gamification, Security, and Architecture [5, 6].

## Step 1: Multi-Persona Vision & Constraints Ingestion
- **Action**: Read `@ROADMAP.md` and `@GEMINI.md` in their entirety [7, 8].
- **Action**: Read the specific UI and gamification skills located in `@.agents/skills/`, specifically focusing on `nexus-command-ui`, `html5-spatial-svg-math`, and `dopamine-skill-decay`.
- **Task**: Internalize the strict separation of concerns for the 5 Personas. Understand the Svelte 5 `$state` constraints, the 80-line function limits, the b815 defensive hydration rules, and the "Nuclear Americana Tech Noir" design aesthetic (60-30-10 Void Black/Navy Slate palette, Bento Grid layouts) [9-13]. 
- **Constraint**: Do not write any code yet.

## Step 2: Deep Swarm Reconnaissance & Exploration
- **Action**: Use code search and file reading capabilities to scan `src/routes/`, `src/lib/`, `src/app.css`, and your Firebase configuration files. 
- **Task**: You must utilize a minimum exploration budget of 3 rounds of investigation to deeply map the codebase and catch underlying symptoms before forming conclusions [1-3].
- **Task**: Evaluate the codebase across four specific dimensions:
  1. **Architecture (Architect)**: Are the Firebase `getDocs` calls safely wrapped? Are functions capped at 80 lines? [7, 10]
  2. **UI/UX (CDO)**: Does the UI perfectly match the `nexus-command-ui` guidelines? Are Svelte 5 `$effect` runes properly wrapping side effects in `untrack()` closures to prevent memory leaks? Are components utilizing the asymmetric 12-column Bento Grid and exact typography (Geist Mono)? [9, 11, 13, 14]
  3. **Gamification (CPO)**: Are the 2% daily loss avoidance metrics and canvas-confetti mechanisms properly tied to verified database commits rather than client-side buttons? [15]
  4. **Security (CSO)**: Are COPPA 2.0 WebAuthn checks and SafeSport Shadow CC routings properly enforced on the backend? [7, 8, 16]

## Step 3: The Multi-Dimensional Gap Analysis
- **Action**: Based on the deep reconnaissance, pause and wait for the user to approve the findings.
- **Task**: Generate a **Gap Analysis Artifact**. This artifact must be categorized by Persona (Architect, CDO, CPO, CSO). For each category, brutally list:
  1. What is built and functioning correctly.
  2. What is built but violates the rules (e.g., UI elements missing the Void Black background, Svelte 5 reactivity loops, logic bypassing the Vanguard Trinity pattern).
  3. What is checked off in `ROADMAP.md` but is actually missing or broken.

## Step 4: The Parallel Recovery Pipeline Generation
- **Action**: Once the user approves the Gap Analysis, generate a suite of highly specific **Workflow Files** in the `.agents/workflows/` directory.
- **Task**: Do NOT generate monolithic fixes. You must generate isolated workflows targeting specific personas (e.g., `.agents/workflows/cdo-fix-bento-grids.md` or `.agents/workflows/cpo-rebuild-dopamine-engine.md`).
- **Constraint**: Every generated workflow must explicitly instruct Jules/Antigravity to spawn the correct subagent (via `.agents/agents/{agent_name}/agent.md`) so the UI/UX is handled solely by the CDO and the backend by the Architect [4, 17, 18]. 
- **Constraint**: All workflows must enforce the 80-line function limit and Zero-Trust payload stripping [7].

## Step 5: Jules Handoff Preparation
- **Action**: Present the user with the clean list of newly generated workflows.
- **Task**: Briefly explain that these workflows are now ready to be committed to GitHub and assigned to `@jules` via issues so that the cloud agent can execute them in parallel, asynchronous subagent swarms [19, 20]. Ask the user which workflow they want to test locally or push to the cloud first.