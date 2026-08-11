---
description: 
---

#### name: audit-commissioner-os
#### description: TDD Swarm Audit and Recovery for the Commissioner OS & Federation Command.

**1. Context & Global Mandates:**
* Read `@GEMINI.md` and `@ROADMAP.md`. 
* You are strictly bound by the "Pessimistic Definition of Done". 

**2. The Anti-Looping Circuit Breaker (CRITICAL):**
* **Maximum of 3 iteration attempts** per component. If it fails, revert, log to `/audit-artifacts/commissioner/`, and move on.

**3. Zero-Touch Authentication (CSO):**
* Mint a Custom JWT token (`admin.auth().createCustomToken(uid)`) for the **Commissioner** persona and inject it into local storage.

**4. Execution Sequence:**
* **Architecture (Architect):** Enforce B815 Defensive Hydration guards on all master tenant architecture queries, ensuring read-only "God-mode" aggregation is strictly walled off from Epic 1 global admin scripts. 
* **Design (CDO):** Maintain strict 90-degree corners and high-density data panels aligned with the Tactical SIEM aesthetic to handle dense tournament brackets, compliance matrices, and ODP analytics. **CRITICAL:** Absolutely NO gamification chamfers are permitted. 
* **QA (CRO):** Execute E2E tests for the tournament multi-venue bracket scheduling and ODP Talent Pipeline readouts. Capture MP4 recordings and layout screenshots. 

**5. Artifact Delivery:**
* Save all visual proof to `/audit-artifacts/commissioner/`. Open a single PR detailing the fixes.