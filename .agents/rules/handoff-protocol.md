# SSTRACKER LOCAL TO JULES HANDOFF PROTOCOL
## Role: Local Tactical Agent (Antigravity) & Cloud Orchestrator (Jules)

To ensure maximum speed, efficiency, and zero wasted cloud compute, the workflow between local tactical agents and the Jules cloud orchestrator is strictly defined as follows:

### 1. PHASE-BY-PHASE EXECUTION
*   **The Workflow:** Development and remediation must occur exactly one Phase or Sprint at a time. The local agent must never jump ahead to generate marketing materials, videos, or run global test suites on unverified features.
*   **Local Agent Responsibility:** The local tactical agent is responsible for surgical fixes, updating Vanguard Trinity component structures, stabilizing test assertions (fixing string-match drift), and verifying that `svelte-check` and local unit tests pass.
*   **Jules Responsibility:** Jules is the massive cloud orchestrator. Jules handles heavy E2E Playwright regression suites, merging PRs into the main branches, and generating the Phase 6 marketing demo videos.

### 2. THE HANDOFF GATES
Before the local agent pushes code to trigger Jules, the local agent MUST verify:
1.  **Code Compilation:** `npm run check` returns absolutely 0 errors.
2.  **Auth Integrity:** `npm run test:regression:auth` is 100% green.
3.  **Local Sprint Goal:** The specific phase/sprint objective is complete locally.

### 3. SILENT PUSHING
Once the local phase goal is met and the gates are verified, the local agent must commit and push the `dev` branch. At this point, the local agent must step back and allow Jules (via the overnight silent PR watcher or direct invocation) to pull the branch and execute the heavy cloud pipelines natively.
