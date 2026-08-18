---
name: tdd-parent-os
description: Master production-ready specification to audit, secure, and build the Parent OS (Compliance Vault). Focuses strictly on backend logic and database security.
---

# 🛰️ SSTracker Master Specification: Parent OS (Compliance Vault)

@jules, act as our Principal Backend Architect and Chief Security Officer. Execute this targeted functional audit and compliance lock. You must ignore all styling, animations, and non-logical visual layouts.

This build is gated by our strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 TypeScript 'any' violations, and 100% green unit tests.

---

### 🛡️ Critical Architectural Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract complex processing or household graph lookups to helpers in `functions-compliance/src/domains/`.
2. **COPPA 2.0 Compliance**: Minor player telemetry and biometric data collection must remain fully paused and blocked until the parent's biometric Verifiable Parental Consent (VPC) token is authenticated.
3. **Pessimistic Definition of Done**: Run our local tests before submitting. The build must compile with exactly 0 Svelte compiler warnings and 0 TypeScript violations.

---

### ⚙️ Complete Backend Feature Matrix & APIs

You must audit and fully implement the functional codebases across these Svelte routes: `dashboard`, `compliance`, `household`, `log-workout`, `payments`, `trust-center`, `vpc`.

#### 📂 Collection 1: "The Car Ride Home Protocol" Embargo (CPO/CSA)
*   **Target**: `src/lib/services/compliance.svelte.ts`
*   **APIs**: Lockout mechanism on youth match metrics.
*   **Security**: Mathematically enforce a strict 15-minute embargo on match metrics post-game. Ensure unauthenticated bypass attempts return empty, unhydrated states.

#### 📂 Collection 2: COPPA 2.0 Biometric VPC & Document Signing (CSO)
*   **Target**: `functions-compliance/src/domains/webauthnOps.js`
*   **APIs**: Biometric Verifiable Parental Consent (VPC) and E-Sign legal waivers.
*   **Security**: Securely bind parental consent options to TouchID/FaceID credentials. Strip port/protocol values from Relying Party IDs during verification to prevent SecurityError exceptions. Cryptographically sign and timestamp Assumption of Risk, Medical, and AB 379 waivers for legal audit trails.

#### 📂 Collection 3: SafeSport Shadow CC Mapping (CSO)
*   **Target**: `functions/src/domains/commsOps.js`
*   **APIs**: Channel monitoring integrations.
*   **Security**: Verify that the client messaging UI never computes or resolves parent emails. Roster player messaging must delegate all parent CC resolution entirely to the server-side Cloud Function trigger.

---

### 🎨 Part 4: Svelte 5 Visual & Layout Controls

*   **Atompunk Trust Aesthetic**: Force a calm, flat trust aesthetic using strict 24px border radii for outer panel card wrappers.
*   **Warning Styling**: Force the 15-minute post-match embargo countdown and emergency lockout notices to render exclusively in Atompunk Amber (`#f59e0b`).
*   **Grid Isolation**: Prevent layout shifts by aligning dashboard elements to a responsive 12-column Bento Grid.

---

### 🚦 Test & Handover

1. Run Svelte compilation checks: `pnpm run check && pnpm run build`.
2. Run targeted tests: `pnpm test services/parent-vault` and `pnpm test functions/compliance`.
