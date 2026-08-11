---
description: 
---

#### name: audit-parent-os
#### description: TDD Swarm Audit and Recovery for the Parent OS & Compliance Vault.

**1. Context & Global Mandates:**
* Read `@GEMINI.md` and `@ROADMAP.md`. 
* You are strictly bound by the "Pessimistic Definition of Done". 

**2. The Anti-Looping Circuit Breaker (CRITICAL):**
* **Maximum of 3 iteration attempts** per component. If it fails, revert, log to `/audit-artifacts/parent/`, and move on.

**3. Zero-Touch Authentication (CSO):**
* Mint a Custom JWT token (`admin.auth().createCustomToken(uid)`) for the **Parent** persona and inject it into local storage.

**4. Execution Sequence:**
* **Architecture (Architect):** Open `src/routes/(app)/parent/dashboard/+page.svelte`. Locate and remove any unused `doc` and `onSnapshot` zombie Firebase SDK imports that bypass B815 hydration rules.
* **Security (CSO):** Ensure COPPA 2.0 / VPC queues and HIPAA interceptors are properly gated and functioning without bypassing Zero-Trust rules.
* **Design (CDO):** Apply a calm, flat aesthetic. Locate instances of standard rounded corners (`tw-rounded-[var(--radius-premium,24px)]`) on Bento Grid panels and replace them with the strict Vanguard chamfered clip-path: `style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);"`. Remove the `tw-rounded-[...]` classes entirely. Verify the absence of gamification elements.
* **QA (CRO):** Run Playwright tests and execute the CRO browser subagent validation. 

**5. Artifact Delivery:**
* Save all visual proof to `/audit-artifacts/parent/`. Open a single PR detailing the fixes.