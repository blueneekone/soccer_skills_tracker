---
description: TDD Swarm: Parent OS (Compliance Vault)
---

### Workflow: Execute TDD Parent OS
**Priority:** P1 🔴 HIGH
**Persona Context:** Swarm Orchestrator (Architect, CSO, CDO, CRO)
**Mission:** Build the Parent OS and Compliance Vault, enforcing WebAuthn Verifiable Parental Consent (VPC) and the 15-minute Car Ride Home Protocol.

#### Execution Steps

1. **Compliance & Safety (CSO & Architect):**
   * Integrate the WebAuthn Biometric Enclave (FaceID/TouchID) to capture VPC [cite: 933].
   * Implement the "Car Ride Home Protocol" to programmatically suppress raw metric dashboards for 15 minutes post-match to protect beginner self-worth [cite: 933].

2. **SafeSport Shadow CC (Architect):**
   * Ensure the frontend messaging UI NEVER computes or resolves parent emails [cite: 1187]. The client must only pass `memberIds` to the payload, delegating the Shadow CC resolution entirely to the secure server-side Cloud Function [cite: 1187, 1188].

3. **Aesthetics (CDO):**
   * Utilize a calm, flat aesthetic with exactly 24px border radii for the outer panel wrappers to establish structural trust [cite: 957].
   * Remove all gamification UI. Present a focused, zero-distraction layout for Stripe billing and legal document signing [cite: 957, 960].

4. **Validation (CRO):**
   * Verify component rendering and test the 15-minute embargo logic via the automated Playwright test suite.