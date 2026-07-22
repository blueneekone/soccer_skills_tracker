---
description: TDD Swarm Build — The Zero-Trust Document Vault & Legal Gateway
---

### Workflow: Execute TDD Zero-Trust Document Vault
**Priority:** P0 🔴 CRITICAL
**Persona Context:** Swarm Orchestrator (CSO, Architect, CRO)
**Mission:** Build the impenetrable legal gateways for all personas, enforcing COPPA 2.0, HIPAA, E-Sign Act, and AB 506 Live Scan requirements before any platform access is granted.

#### Execution Steps

1. **Security & Cryptography (CSO):**
   * Build the E-Sign Act enforcement layer. The backend MUST silently capture, encrypt, and store the user's IP address, date, timestamp, and email verification for every submitted Assumption of Risk waiver and Code of Conduct [3, 4].
   * Implement the HIPAA-compliant encryption schema for emergency contact and health insurance data collection [5].

2. **Compliance Gates (Architect):**
   * **Parent/Player Gate:** Integrate WebAuthn Biometric Enclaves (FaceID/TouchID) to capture Verifiable Parental Consent (VPC) under COPPA 2.0 [4].
   * **Coach/Volunteer Gate:** Implement the Checkr API integration (`src/lib/compliance/checkrCoachClearance.ts`) to mandate National Criminal Database clearance (AB 506 Live Scan) and SafeSport training uploads. A coach MUST NOT be able to view minor data without this clearance [6-8].

3. **Data Minimization (CSO & Architect):**
   * Build the automated 24-hour PII Shredder script for ghost data to comply with GDPR/CCPA [4].
   * Ensure the `consents` collection is strictly exempted from the shredder to maintain multi-year legal audits [4].

4. **Validation (CRO):**
   * Write backend tests asserting that a coach's database read request is mathematically rejected if their `clearanceStep` is not verified [9].
   * Run `pnpm run check` to verify zero Svelte 5 compilation errors and zero TypeScript `any` violations.
