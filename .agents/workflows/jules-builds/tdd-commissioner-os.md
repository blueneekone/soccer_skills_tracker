---
description: TDD Swarm Build — Commissioner OS (The Federation Command)
---

### Workflow: Execute TDD Commissioner OS
**Priority:** P1 🔴 HIGH
**Persona Context:** Swarm Orchestrator (Architect, CSO, CDO, CRO)
**Mission:** Build the state-level Commissioner dashboard, focusing on the master `tenantId` hierarchy, God-mode ODP analytics, and the Tournament Operations & Live Results Hub.

#### Execution Steps

1. **Security & RBAC (CSO & Architect):**
   * Write the backend tests first. Assert that a Commissioner's Custom JWT Claim contains a master `tenantId`.
   * Enforce Zero-Trust Payload Stripping: The Commissioner MUST have read-only access to all child `clubId` `player_stats` and `scoutsSix` collections.
   * Verify via tests that backend Firestore rules explicitly reject any attempt by a Commissioner to mutate local club rosters or direct messages.

2. **The Vanguard Trinity Pattern (Architect):**
   * Fracture the Commissioner OS into the required Svelte 5 files: `CommissionerShell.svelte` (+page.svelte), `CommissionerEngine.svelte.ts` (Brain), `CommissionerArena.svelte` (Glass), and `CommissionerHUD.svelte` (HUD).
   * Ensure no single function or Svelte `$state` block within `CommissionerEngine.svelte.ts` exceeds the 80-line limit.

3. **High-Density Data UI (CDO):**
   * Construct the Tournament Operations matrix and Federation Compliance matrix inside `CommissionerArena.svelte`.
   * Enforce the 12-column asymmetric Bento Grid using fluid anti-squish math (`clamp(280px, 30vw, 350px)`). 
   * Apply strict 90-degree corners (Tactical SIEM aesthetic) and use Geist Mono typography for all bracket scheduling and scorekeeping numbers. Absolutely NO gamification chamfers are permitted.

4. **Validation (CRO):**
   * Run `pnpm run check` to verify absolutely zero Svelte 5 compilation errors or TypeScript `any` violations.
   * Ensure Playwright automated visual regression tests pass with no layout drift or grid squishing.

5. **Roadmap Sync & Delivery:**
   * Upon passing all tests, autonomously update `ROADMAP.md` to mark the Commissioner OS tasks as complete.
   * Open the Pull Request.