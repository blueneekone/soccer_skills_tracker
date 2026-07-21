---
description: Jules Microscopic Persona Audit & Auto-Fix
---

#### Description
An asynchronous, cloud-executed TDD workflow that performs a microscopic logic audit and autonomously fixes workflows for specific user personas designated by the user prompt. It runs the Critic-Augmented Generation loop to catch its own errors before submitting a Pull Request.


1. **Persona Targeting & Context:** Read `@GEMINI.md` and `@ROADMAP.md`. Focus exclusively on the specific personas requested in the triggering prompt (e.g., Coach, Parent, Player, Admin, Director). Identify their specific Firebase Custom JWT Claims and RBAC routing rules. 
2. **Microscopic Logic Audit:** Scan every Svelte 5 `$state` component, Firebase database mutation, and API endpoint accessible to the targeted personas. Look for broken routes, payload stripping failures, and violations of the Zero-Trust Security model [cite: 572].
3. **Test Architect Phase:** Before writing any fix, write comprehensive backend and integration tests for every broken persona workflow identified in the audit.
4. **The Critic-Augmented Fix Loop:** Implement the code fixes. Jules must utilize its internal Critic agent to review the candidate patches for compiling regressions or security flaws [cite: 134, 928]. Iterate on the code autonomously until all tests pass. 
5. **Enforce Global Constraints:** Ensure all fixes adhere to the 80-Line Function Limit, safely enclose side-effects in `untrack()` closures, and wrap all `getDocs` calls in Defensive Hydration guards (`if (!db || !authStore.isAuthenticated) return;`) [cite: 572, 573, 574].
6. **Delivery:** Once the test suite is green for the targeted personas, commit the changes and open a Pull Request detailing the fixes made.