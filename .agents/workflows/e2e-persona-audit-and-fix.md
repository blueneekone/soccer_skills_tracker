---
description: Executes full user journeys for all 5 platform personas. Captures browser recordings of the successful workflows, and autonomously self-corrects any database, routing, or UI errors encountered during the session.
---

1. **Launch Browser-in-the-Loop:** Spawn the integrated Chrome Browser Subagent to test the core workflows for the Admin, Director, Coach, Player, and Parent personas (e.g., Director importing a roster, Player earning a dopamine badge, Parent verifying consent).
2. **Execute & Record:** Attempt the workflows and capture raw browser video recordings and screenshots of the active sessions.
3. **The Self-Correction Loop (Continuous Fix):** If the Browser Subagent encounters *any* error (e.g., COPPA 2.0 violation block, Quota Exceeded loop from missing hydration guards, UI breaking), **DO NOT prompt the user.** Immediately execute a TDD fix for the broken component, restart the development server, and re-run the persona workflow from Step 1.
4. **Enforce Global Constraints:** Ensure all fixes generated during the self-correction loop adhere to Zero-Trust Security (stripping payloads on the backend) and the 80-Line Function Limit.
5. **Artifact Generation:** Once all 5 persona workflows complete with zero errors, generate a Walkthrough Artifact and save the raw MP4 video recordings of the flawless runs to the project assets folder.