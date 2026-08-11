---
description: 
---

#### name: audit-fan-os
#### description: TDD Swarm Audit and Recovery for the Fan OS & Broadcast Monetization.

**1. Context & Global Mandates:**
* Read `@GEMINI.md` and `@ROADMAP.md`. 
* You are strictly bound by the "Pessimistic Definition of Done". 

**2. The Anti-Looping Circuit Breaker (CRITICAL):**
* **Maximum of 3 iteration attempts** per component. If it fails, revert, log to `/audit-artifacts/fan/`, and move on.

**3. Zero-Touch Authentication (CSO):**
* Mint a Custom JWT token (`admin.auth().createCustomToken(uid)`) for the **Fan** persona and inject it into local storage.

**4. Execution Sequence:**
* **Architecture (Architect):** Ensure the Stripe-powered Superdraw Fundraising Engine correctly validates `endTime` and integrates the Stripe SDK safely. 
* **Gamification (CPO):** Verify that gamification overlays on live streams correctly allow remote fans to vote on MVP and react with digital confetti.
* **Design (CDO):** Apply interactive broadcast overlays and gamification aesthetics. Maintain the Z0 Void Black canvas, but aggressively utilize Data Cyan and Action Gold accents to drive audience engagement and frictionless digital ticketing.
* **QA (CRO):** Run visual regression tests. Capture MP4 recordings and layout screenshots. 

**5. Artifact Delivery:**
* Save all visual proof to `/audit-artifacts/fan/`. Open a single PR detailing the fixes.