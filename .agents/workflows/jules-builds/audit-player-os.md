---
description: 
---

#### name: audit-player-os
#### description: TDD Swarm Audit and Recovery for the Gamified Player OS.

**1. Context & Global Mandates:**
* Read `@GEMINI.md` and `@ROADMAP.md`. 
* You are strictly bound by the "Pessimistic Definition of Done". No untested code is permitted.

**2. The Anti-Looping Circuit Breaker (CRITICAL):**
* **Maximum of 3 iteration attempts** per component in your Critic-Augmented Generation loop. If it fails, revert, log to `/audit-artifacts/player/`, and move on.

**3. Zero-Touch Authentication (CSO):**
* Mint a Custom JWT token (`admin.auth().createCustomToken(uid)`) for the **Player** persona and inject it into local storage.

**4. Execution Sequence:**
* **Architecture (Architect):** Enforce B815 Defensive Hydration guards on all queries. Wrap any Svelte 5 `$effect` side-effects mutating state in `untrack()` closures to prevent infinite rendering loops.
* **Gamification (CPO):** Verify the Dopamine Engine. Ensure that visual rewards (`canvas-confetti`) are fired strictly by verified database commits (`dopamineOnCommit`), not client-side clicks. Verify the 2% skill decay logic is intact.
* **Design (CDO):** Transform the UI into a 40% Void Black Gaming HUD. Render the 6-axis Vanguard Prism radar charts. Ensure there is exactly ONE Action Gold (`#fbbf24`) primary CTA per viewport. Enforce chamfered clip-paths on player specialty cards.
* **QA (CRO):** Run visual regression tests. Capture MP4 recordings and layout screenshots. 

**5. Artifact Delivery:**
* Save all visual proof to `/audit-artifacts/player/`. Open a single PR detailing the fixes.