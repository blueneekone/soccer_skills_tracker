---
description: TDD Swarm Build — The Zero-Trust Document Vault & Legal Gateway
---

### Workflow: Execute TDD Zero-Trust Document Vault
**Priority:** P0 🔴 CRITICAL
**Persona Context:** Swarm Orchestrator (CSO, Architect, CRO)
**Mission:** Build the impenetrable legal gateways for all personas, enforcing COPPA 2.0, HIPAA, E-Sign Act, California AB 379, and AB 506 Live Scan requirements before any platform access is granted.

#### Execution Steps

1. **Security & Cryptography (CSO):**
   * Build the E-Sign Act enforcement layer. The backend MUST silently capture, encrypt, and store the user's IP address, date, timestamp, and email verification for every submitted document.
   * Apply this strict E-Sign logging to the following mandatory checkpoints: Assumption of Risk waivers, Medical Authorizations (with HIPAA clauses), Code of Conduct, Photo/Video Release opt-ins, and AB 379 Concussion/Sudden Cardiac Arrest Information Sheets.
   * Implement AES-256 (or equivalent) HIPAA-compliant encryption at rest for all emergency contact data, health insurance information, government-issued identifiers (birth certificates, passports, state IDs), and biometric/photo data (player headshots).

2. **Compliance & Eligibility Gates (Architect):**
   * **Parent/Player Gate (VPC & Identity):** Integrate WebAuthn Biometric Enclaves (FaceID/TouchID) to capture Verifiable Parental Consent (VPC) under COPPA 2.0. Gate all data-collection routes behind `isDataCollectionRoute()`.
   * **Player Eligibility Vault:** Build a secure upload portal for birth certificates, proof of residency, and player headshots for tournament age/grade verification. This portal MUST remain mathematically locked and inaccessible until the parent's VPC token is explicitly verified.
   * **Coach/Volunteer Gate:** Implement the Checkr API integration to mandate National Criminal Database clearance (AB 506 Live Scan). Build secure document upload gates for annual SafeSport training, CDC HEADS UP Concussion Training, and Eric Paredes SCA Training certificates. A coach MUST NOT be able to view minor data or access team rosters until all clearances are verified and certificates are uploaded.

3. **Data Minimization (CSO & Architect):**
   * Build the automated 24-hour PII Shredder script for ghost data to comply with GDPR/CCPA.
   * Ensure the `consents` collection is strictly exempted from the shredder to maintain multi-year legal audits.

4. **Validation (CRO):**
   * Write backend tests asserting that a coach's database read request is mathematically rejected if their `clearanceStep` is not verified.
   * Write backend tests asserting that the Player Eligibility Vault rejects uploads if the VPC token is missing or invalid.
   * Run `pnpm run check` to verify zero Svelte 5 compilation errors and zero TypeScript `any` violations.
