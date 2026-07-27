---
description: TDD Swarm Build — B2B Enrollment & Identity Pipeline
---

### Workflow: Execute TDD B2B Registration Pipeline
**Priority:** P0 🔴 CRITICAL
**Persona Context:** Swarm Orchestrator (Architect, CSO, CRO)
**Mission:** Build the dual-track B2B enrollment pipeline for Independent and Governed Directors, locking down the platform with Firebase MFA and strict ID Token timeouts.

#### Execution Steps

1. **Security & Identity (CSO):**
   * Implement mandatory Firebase Multi-Factor Authentication (MFA) for the Director and Commissioner registration flows.
   * Configure the Firebase Auth lifecycle to strictly enforce 1-hour ID Token timeouts, writing background refresh logic to silently request new tokens if the session remains active.

2. **Dual-Track Registration Logic (Architect):**
   * **Flow A (Independent Director):** Build the self-serve signup route. The backend MUST provision a new, standalone `tenantId` and `clubId`, verify business licenses/IDs, and subsequently trigger the Stripe Connect onboarding sequence.
   * **Flow B (Governed Director):** Build the invite-resolution route. The backend MUST parse the single-use invite token and securely nest the newly generated `clubId` beneath the inviting Commissioner's master `tenantId`.
   * **Constraint:** No single function or Svelte `$state` block may exceed the 80-line limit.

3. **Validation (CRO):**
   * Write backend tests asserting that Flow A creates a distinct `tenantId` and Flow B inherits the master `tenantId`.
   * Run `pnpm run check` to verify zero Svelte 5 errors.