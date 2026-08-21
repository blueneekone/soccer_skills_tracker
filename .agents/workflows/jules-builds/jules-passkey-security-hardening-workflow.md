# =============================================================================
# SSTRACKER SECURE AUTHENTICATION: PASSKEY HARDENING JULES WORKFLOW
# =============================================================================
# This master-level workflow file directs Google Jules to audit, harden,
# and verify the WebAuthn Passkey login gate, blocking insecure silent fallbacks
# to Magic Links and enforcing mandatory passkey re-enrollment when credentials are deleted.
# =============================================================================

# 🏛️ 1. THE AUTHENTICATION SECURITY GAP
SSTracker enforces a strict Zero-Trust Security model. Currently, an authentication bypass vulnerability exists when a user account that previously held a WebAuthn passkey is deleted and subsequently recreated, or when local passkey references are missing:
*   **The Defect:** When a user logs in, if their WebAuthn credential check fails or is missing (because their account was deleted and recreated, or because their passkey token was cleared), the login handler automatically and silently falls back to sending a raw **Magic Link** via email.
*   **Why This is Insecure:** Silently falling back to a Magic Link completely bypasses the elevated biometric factor that WebAuthn guarantees. It lets a compromised email inbox gain absolute access to elevated dashboards (such as Director OS and Billing) without validating a passkey.
*   **The Security Fix Required:** If an account was previously marked as possessing a passkey, or if the login gateway detects a credential mismatch/missing state, **under no circumstances must it silently fall back to an insecure Magic Link**. It must instead route the user strictly to a mandatory **WebAuthn Passkey Re-enrollment & Setup Gate** (`/auth/passkey-setup`) where they must satisfy high-entropy validation before gaining access.

---

# 🤖 2. JULES STEP-BY-STEP EXECUTION ROADMAP
@jules, you must execute the following automated steps within your isolated cloud container to resolve this auth bypass:

## Step 1: Scan & Audit Authentication Endpoints
Locate and analyze the following backend authentication files:
*   `src/routes/api/auth/login/+server.ts` (Login Handler Endpoint)
*   `src/routes/api/auth/webauthn/+server.ts` (Passkey Validation & Setup)
*   `src/routes/api/auth/magic-link/+server.ts` (Magic Link Fallback Gate)
*   `functions/src/domains/authOps.js` (Firebase Cloud Functions Auth Trigger)

## Step 2: Implement Strict Passkey Re-enrollment Guards
Ensure your written updates comply with our strict security rules:
1.  **Block Magic Link Fallback:** Modify the login endpoint. If the user profile contains a `passkeyEnrolled: true` flag, or if the user's historical metadata indicates they previously held a biometric credential, **hard-block** any automatic Magic Link dispatches.
2.  **Redirect to Passkey Setup Gate:** Force the user's session to be flagged with a temporary `re-enrollment-pending` restriction. Redirect them strictly to `/auth/passkey-setup`.
3.  **Mandatory Age-Verification Checks:** During passkey re-enrollment, ensure that the profile's `dateOfBirth` string is parsed, and that only verified adults (age >= 18) can enroll a primary biometric credential, fully keeping minors safe from unmonitored authentication state modifications.
4.  **The 80-Line Limit:** Every validation helper, routing trigger, or security guard you modify or write must not exceed **80 lines of code** per function.

## Step 3: Run Security Verification Specs
Execute Svelte compilation checks and run the E2E verification test suite:
```bash
pnpm run check
pnpm playwright test tests/passkey-re-enrollment.spec.ts --project=chromium
```

---

# 🛡️ 3. PESSIMISTIC DEFINITION OF DONE & CIRCUIT BREAKERS
*   **Circuit Breaker:** You are capped at a maximum of **3 test-and-repair attempts** in your Critic-Augmented Generation loop. If compiling warnings or Playwright timeouts occur on the 3rd run, immediately abort, revert your changes to the last stable state, log the error, and stop.
*   **Delivery Standard:** Your code must compile with exactly **0 errors and 0 warnings** before you open a Pull Request straight to `dev`.
