---
description: Jules Backend TDD & Data Flow Fix
---

#### Description
An asynchronous, cloud-executed workflow dedicated strictly to fixing backend logic, database mutations, and Svelte 5 data flows. This agent MUST completely ignore UI, CSS, layout, and visual aesthetic tasks.

#### Steps
1. **Context Ingestion:** Read `@GEMINI.md` to load the global architecture constraints. Focus exclusively on Zero-Trust Security, the 80-Line Function Limit, Defensive Hydration (b815 Rule), and Svelte 5 `$state` strictness.
2. **Test Architecture (TDD):** Before modifying any application code, write or update the backend unit and integration tests for the target feature (e.g., verifying that the Coach Persona can successfully batch-assign tactical drills via The Forge). 
3. **Implementation & Refactoring:** Modify the Svelte 5 `$state` logic, API routes, and Firebase database mutations to fix the broken feature. Ensure all `$effect` side-effects are safely enclosed in `untrack()` closures.
4. **Execution & Verification:** Run the local test suite within the cloud VM. Iterate on the code autonomously until all tests pass.
5. **Delivery:** Once the tests are green, commit the changes and open a Pull Request with a summary of the backend fixes.
