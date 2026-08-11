---
description: 
---

#### name: audit-admin-os
#### description: TDD Swarm Audit and Recovery for the Global Admin Console.

**1. Context & Global Mandates:**
* Read `@GEMINI.md` and `@ROADMAP.md`. 
* You are strictly bound by the "SSTracker Nexus Command: Engineering Protocols and Master Roadmap".
* **Pessimistic Definition of Done:** You must mathematically prove the code and layout are stable via passing tests before marking this complete.

**2. The Anti-Looping Circuit Breaker (CRITICAL):**
* You are authorized a **maximum of 3 iteration attempts** per component or failing test in your Critic-Augmented Generation loop. 
* If a visual regression or hydration bug remains red after 3 attempts, revert the file, log the failure in `/audit-artifacts/admin/`, and immediately move on.

**3. Zero-Touch Authentication (CSO):**
* Utilize the Firebase MCP Server tools to programmatically mint a Custom JWT token (`admin.auth().createCustomToken(uid)`) for the **Admin** persona. Inject this into the browser subagent's local storage.

**4. Execution Sequence:**
* **Architecture (Architect):** Scan the Admin OS. Ensure all `getDocs` and `onSnapshot` queries are wrapped in strict B815 Defensive Hydration guards (`if (!db || !authStore.isAuthenticated) return;`). Enforce the 80-line function limit.
* **Security (CSO):** Verify that all protected RBAC fields (`role`, `clubId`) are explicitly stripped from frontend payloads before any database mutation.
* **Design (CDO):** Enforce the 12-column asymmetric Bento Grid using fluid `clamp` math. Ensure top telemetry cards do not squish. Enforce the 60-30-10 palette (Void Black Z0 Canvas, Navy Slate Z2 Panels) and ensure `Geist Mono` is strictly used for numerical data readouts.
* **QA (CRO):** Run Playwright/Puppeteer. Capture MP4 recordings and layout screenshots. 

**5. Artifact Delivery:**
* Save all visual proof to `/audit-artifacts/admin/`. Open a single PR detailing the fixes.