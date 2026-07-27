---
description: Master Multi-Persona E2E Swarm Audit & Recovery
---

#### Description
A comprehensive, zero-touch Swarm Development workflow that sequentially audits all 5 platform personas (Admin, Director, Coach, Player, Parent). It bypasses frontend logins via the Firebase MCP Server, meticulously crawls every route, records all visual artifacts, and deploys specialized subagents (Architect, CDO, CSO, CPO, CRO) to immediately fix any deviations from the global architecture.

#### Steps
1.  **Persona Execution Loop:** The main orchestrator agent MUST execute Steps 2-5 sequentially for all 7 platform personas: Admin, Commissioner, Director, Coach, Player, Parent, and Fan [6]. Do not proceed to the next persona in the loop until the current one has zero failing tests and zero UI/UX bugs [6].
2. **Zero-Touch Authentication (CSO):** Do NOT attempt UI logins. Utilize the Firebase MCP Server tools to programmatically mint a custom JWT token via `admin.auth().createCustomToken(uid)` for the current persona [3]. Inject this token into the Browser Subagent's local storage to instantly bypass the login screen.
3. **Microscopic Traversal & Recording (CRO):** The Chief Reliability Officer (QA) subagent must navigate every accessible page, modal, and user journey for the active persona. It must generate continuous screenshots and MP4 browser recordings of the session, saving them to `/audit-artifacts/[persona-name]/`.
4. **The Master Assembly Line Auto-Fix:** If the CRO encounters any blocked route, Svelte 5 proxy error, memory leak, or layout bug, immediately halt the traversal and deploy the specialized subagents to fix the components [1, 2]:
    *   **Architect:** Fixes backend logic, ensuring Svelte 5 `$state` and `untrack()` closures are strictly used [9]. Wraps all `getDocs` calls in strict Defensive Hydration guards (`if (!db || !authStore.isAuthenticated) return;`) to prevent quota loops [10]. Extracts logic to ensure no function exceeds the 80-Line Limit [11].
    *   **CDO:** Fixes the UI to strictly adhere to the Vanguard Trinity Pattern (Shell, Brain, Glass, HUD) and the Nuclear Americana Tech Noir aesthetic [9, 11]. Ensures the 60-30-10 palette (Void Black, Navy Slate, Data Cyan) and chamfered clip-path corners are perfectly implemented [9].
    *   **CSO:** Enforces Zero-Trust Security by explicitly stripping `role` and `clubId` from all frontend payloads before database mutation [11]. Guarantees COPPA 2.0 and SafeSport mathematical routing gates are intact [11].
    *   **CPO:** Ensures gamification mechanics (like the Dopamine Engine) and behavioral rules fire correctly without blocking rendering [6].
5. **Artifact Finalization:** Once the persona's journey runs flawlessly end-to-end, compile the video recordings, screenshots, and a Code Diff Fix Summary into the `/audit-artifacts/[persona-name]/` folder before looping to the next persona in the sequence.