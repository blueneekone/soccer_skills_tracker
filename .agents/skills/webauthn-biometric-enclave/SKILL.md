---
name: webauthn-biometric-enclave
description: Binds COPPA 2.0 compliance and Verifiable Parental Consent (VPC) directly to hardware FaceID/TouchID attestations using the WebAuthn API for Epic 5.
---

### Execution Protocol: WebAuthn Biometric Enclave

When tasked with implementing Verifiable Parental Consent (VPC), biometric logins, or high-security data gates, you MUST adhere to the following WebAuthn API and COPPA 2.0 compliance constraints.

#### 1. Hardware Attestation (The WebAuthn API)
*   **The Mandate:** You must never rely on simple checkboxes or passwords for Verifiable Parental Consent. 
*   **Execution:** You MUST utilize the browser's native WebAuthn API (`navigator.credentials.create()` for registration and `navigator.credentials.get()` for authentication) to invoke the device's hardware biometric sensors (FaceID, TouchID, Android Biometrics).
*   **Challenge Generation:** The cryptographic `challenge` buffer used in the WebAuthn options MUST be generated securely on the backend (Firebase Cloud Functions) and passed to the client, never generated locally.

#### 2. Zero-Trust Verification (CSO Mandate)
*   **Client Distrust:** The frontend client is inherently compromised. The success of a WebAuthn prompt on the frontend does NOT mean consent is granted.
*   **Execution:** The frontend must send the raw `AttestationAssertion` payload to the backend. The Firebase backend must verify the signature and the challenge before flipping the `vpcGranted: true` flag in the database.

#### 3. Svelte 5 Reactivity & State
*   Store the biometric challenge and verification status using Svelte 5 `$state` runes (e.g., `let isVerifying = $state(false)`).
*   If the biometric verification triggers a successful route change (e.g., navigating to the Parent OS dashboard), safely enclose the programmatic routing logic within an `untrack()` closure to prevent infinite reactivity loops.

#### 4. The 80-Line Function Limit
*   The WebAuthn configuration objects (`PublicKeyCredentialCreationOptions` and `PublicKeyCredentialRequestOptions`) are massive and will easily break the global 80-line function limit. 
*   You MUST extract the credential configuration logic and ArrayBuffer conversions into a separate utility file located at `src/lib/utils/webAuthnConfig.ts`.