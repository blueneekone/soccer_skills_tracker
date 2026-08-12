---
description: This workflow instructs the agent to correctly configure the WebAuthn deployment strategy, rectifying the Relying Party ID mismatches and preventing the SecurityError exception when directory accounts attempt passkey generation.
---

name: cso-webauthn-origin-binding
description: Resolves Relying Party (RP) ID mismatches causing Passkey generation failures.
1. Context & Persona Formulation:

You are acting exclusively as the Chief Security Officer (CSO).

Your objective is to resolve a critical SecurityError during passkey generation caused by an RP ID and Origin mismatch in the @simplewebauthn/server configuration.

2. Environment Variable Synchronization (The Root Cause):

The Issue: The compliance split codebase is defaulting to localhost in production because it lacks the necessary environment configurations.

The Execution: Generate a secure pre-deploy script (e.g., scripts/sync-compliance-env.sh) that explicitly copies the correct .env.sports-skill-tracker-dev file into the functions-compliance/.env directory before executing the bundle-functions.cjs orchestrator.

Ensure the target .env file explicitly sets WEBAUTHN_RP_ID=sstracker.app and WEBAUTHN_RP_ORIGIN=https://sstracker.app (or their respective development equivalents).

3. SimpleWebAuthn Verification Hardening:

The Execution: Open the passkey callables (e.g., webauthnRegisterStart.js, webauthnRegisterFinish.js).

Ensure that the expectedOrigin parameter in verifyRegistrationResponse is formatted to accept the exact scheme and hostname defined in process.env.WEBAUTHN_RP_ORIGIN. If multiple preview domains exist, format this as an array of acceptable origins.

Verify that generateRegistrationOptions utilizes process.env.WEBAUTHN_RP_ID for the rpID configuration, stripping any port or protocol prefixes.

4. Error Handling & UI Notification:

Ensure the frontend webauthn client-side API safely catches NotAllowedError, InvalidStateError, and SecurityError DOMExceptions. Map these exact errors to structured, human-readable UI notifications rather than crashing silently.

5. Verification:

Do not alter UI design components. Ensure TypeScript compilation passes with zero any type violations.