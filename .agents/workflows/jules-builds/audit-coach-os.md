---
description: 
---

#### name: audit-coach-os
#### description: TDD Swarm Audit and Recovery for the Coach OS and Logistics Engine.

**1. Context & Global Mandates:**
* Read `@GEMINI.md` and `@ROADMAP.md`. 
* You are strictly bound by the "Pessimistic Definition of Done". 

**2. The Anti-Looping Circuit Breaker (CRITICAL):**
* **Maximum of 3 iteration attempts** per component. If a test loop fails after 3 tries, revert, log to `/audit-artifacts/coach/`, and proceed.

**3. Zero-Touch Authentication (CSO):**
* Mint a Custom JWT token (`admin.auth().createCustomToken(uid)`) for the **Coach** persona and inject it into local storage.

**4. Execution Sequence:**
* **Architecture (Architect):** Enforce Vanguard Trinity Pattern decoupling. Ensure monolithic files are fractured into Shell, Brain, Glass, and HUD. Enforce B815 Defensive Hydration guards.
* **Security (CSO):** Audit the SafeSport Shadow CC communications flow. Ensure client-side parent email fetching is stripped and replaced with secure server-side Firestore triggers (`onChannelCreated`).
* **Design (CDO):** Enforce the 12-column Bento Grid for the team roster and daily intel views. Strip out legacy flex wrappers causing layout collapses.
* **QA (CRO):** Execute E2E tests for the roster editing and message creation workflows. Capture MP4 recordings and layout screenshots. 

**5. Artifact Delivery:**
* Save all visual proof to `/audit-artifacts/coach/`. Open a single PR detailing the fixes.