---
description: An autonomous, single-session swarm that audits the current UI/UX against the Nuclear Americana Tech Noir design system, immediately writes failing tests for visual/structural discrepancies, and fixes the codebase until the tests pass.
---

#### Steps
1. **Visual & Data Flow Audit:** Spawn a Browser Subagent to navigate the local development server and evaluate the target UI against the 60-30-10 palette (Void Black, Navy Slate, Data Cyan), chamfered clip-path rules, and Svelte 5 `$state` data flows.
2. **Test Architect (Agent A):** Based on the audit discrepancies, write end-to-end integration tests (e.g., verifying the Vanguard Trinity structure, ensuring 150-250ms kinetic transitions, checking data hydration) *before* writing any application code.
3. **Code Builder (Agent B):** Enter an isolated terminal sandbox and iteratively modify the Svelte 5 components and CSS to fix the audited issues. **Do not stop or ask for human intervention until Agent A's integration tests pass.**
4. **Refactoring Engine (Agent C):** Once tests are green, refactor the code to strictly enforce the 80-Line Function Limit and ensure all side-effects inside `$effect` blocks are enclosed in `untrack()` closures.
5. **Final Output:** Generate a Code Diff artifact and an updated Screenshot artifact for human approval.