---
description: 
---

#### name: audit-director-os
#### description: TDD Swarm Audit and Recovery for the Director OS & B2B Revenue Engine.

**1. Context & Global Mandates:**
* Read `@GEMINI.md` and `@ROADMAP.md`. 
* You are strictly bound by the "Pessimistic Definition of Done". You must mathematically prove the code and layout are stable via passing tests before marking this complete.

**2. The Anti-Looping Circuit Breaker (CRITICAL):**
* You are authorized a **maximum of 3 iteration attempts** per component or failing test in your Critic-Augmented Generation loop. 
* If a visual regression or hydration bug remains red after 3 attempts, revert the file, log the failure in `/audit-artifacts/director/`, and immediately move on.

**3. Zero-Touch Authentication (CSO):**
* Utilize the Firebase MCP Server tools to programmatically mint a Custom JWT token (`admin.auth().createCustomToken(uid)`) for the **Director** persona. Inject this into the browser subagent's local storage.

**4. Execution Sequence:**
* **Architecture (Architect):** Open `src/routes/(app)/director/dashboard/+page.svelte`. Fix critical Svelte 5 reactivity violations that trigger memory loops during context switching. Wrap direct mutations of `clubId`, `activeTab`, or `workspaceContextStore.setActiveClubId` inside strict `untrack(() => { ... })` closures. Ensure the 80-line function limit is maintained. 
* **Security (CSO):** Verify that all protected RBAC fields (`role`, `clubId`) are explicitly stripped from frontend payloads before any database mutation.
* **Design (CDO):** Locate legacy CSS grids (`bento-grid`, `bento-grid--liquid`) inside `<section>` elements. Replace legacy classes with strict Vanguard Tailwind grid structures (e.g., `tw-grid`, `tw-grid-cols-12`, `lg:tw-col-span-8`). Maintain strict 90-degree corners on all core layout panels.
* **QA (CRO):** Run `npm run check` to verify zero type or reactivity compilation errors. Capture MP4 recordings and layout screenshots. 

**5. Artifact Delivery:**
* Save all visual proof to `/audit-artifacts/director/`. Open a single PR detailing the fixes.