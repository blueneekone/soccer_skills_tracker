---
name: cso-webauthn-origin-binding
description: Resolves Relying Party (RP) ID and subdomain origin mismatches causing browser-level SecurityError exceptions during Passkey generation [591].
---

# Blueprint 2: Security Engineering of Cryptographic Origin Binding (v2)

This workflow instructs Google Jules to align WebAuthn configurations across development and production environments, resolving the `SecurityError` DOMExceptions during biometric passkey ceremonies [576, 591].

## 1. Context & Persona Formulation
* **Persona**: Act exclusively as the **Chief Security Officer (CSO)** [40/533, 51/664, 591].
* **Objective**: Establish secure cryptographic bindings between client biometrics and the backend relying party credentials across both testing subdomains and main domains [578, 591].

---

## 2. Environment Variable Synchronization (The Root Cause)
* **The Problem**: The `functions-compliance/` directory lacks the appropriate context when deployed because variables default to `localhost`, throwing an invalid RP ID domain suffix abort on live HTTPS domains [576, 592].
* **The Solution**: Update `scripts/bundle-functions.cjs` or generate a secure script `scripts/sync-compliance-env.sh` to synchronize configurations prior to deployment [592].
* **Action**: Inject these variables into the compliance codebase execution workspace [592]:
  ```bash
  WEBAUTHN_RP_ID=sstracker.app
  WEBAUTHN_RP_ORIGIN=https://sstracker.app,https://preview.sstracker.app
  ```

---

## 3. SimpleWebAuthn Server-Side Hardening
* **Action**: Edit compliance routines, including `webauthnRegisterStart.js` and `webauthnRegisterFinish.js` [593]:
  1. **Sanitize RP ID**: Ensure `rpID` is parsed dynamically from the environment. Strip any protocol scheme (`http://` or `https://`) and port suffixes [533, 593].
     ```typescript
     const rpID = process.env.WEBAUTHN_RP_ID?.replace(/^https?:\\/\\//, '').split(':')[0] || 'sstracker.app';
     ```
  2. **Subdomain Array Mapping**: Map the `expectedOrigin` parameter in `verifyRegistrationResponse()` and `verifyAuthenticationResponse()` to accept an array of strings [533, 578]:
     ```typescript
     const expectedOrigins = process.env.WEBAUTHN_RP_ORIGIN?.split(',') || ['https://sstracker.app', 'https://preview.sstracker.app'];
     ```
     This supports validation across both preview deployments and the live production domain safely [533, 578].

---

## 4. Client-Side Error Boundary Interception
* **Action**: Refactor the browser biometric integration block to explicitly capture WebAuthn exceptions and translate them into actionable on-screen notices instead of failing silently [533, 577]:
  ```typescript
  try {
      // Passkey ceremony execution
  } catch (error: any) {
      if (error.name === 'SecurityError') {
          ui.showError('Security Guard: Passkeys require an encrypted HTTPS connection with matching Relying Party ID.');
      } else if (error.name === 'NotAllowedError') {
          ui.showError('Biometric Cancelled: The biometric prompt was dismissed or timed out.');
      } else if (error.name === 'InvalidStateError') {
          ui.showError('State Conflict: This authenticator is already registered or unsupported on this device.');
      } else {
          ui.showError(`Passkey Generation Failed: ${error.message}`);
      }
  }
  ```

---

## 5. Verification & Compliance Sign-Off
* Prepend the mandatory SafeSport Audit compliance banner to all modified trigger files:
  `// 🛡️ SafeSport Compliance Mandate: Secure WebAuthn Verification Protocol Active`
* Validate that Svelte compiles with 0 errors and TypeScript contains 0 `any` types [112, 594].
