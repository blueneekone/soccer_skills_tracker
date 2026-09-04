---
name: vampire-auto-onboarding-sync
description: Implement zero-touch B2B roster ingestion, automated household provisioning, and programmatic parent invitation dispatch with strict WebAuthn gates.
---

# 🛰️ SSTracker Zero-Touch B2B Roster Ingestion & Automated Household Provisioning (v1.0)

@jules, act as our joint **Chief Software Architect (CSA)**, **Chief Security Officer (CSO)**, and **Chief Technical Officer (CTO)**. Your objective is to design, implement, and test the next-generation autonomous onboarding pipeline inside the `interoperability` and `compliance` split codebases.

---

### 🛡️ Critical Operational & Compliance Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No single function body (callable, trigger, or helper) may exceed 80 lines. Extract roster chunk parsing, household document construction, and notification dispatch to helper utilities in `functions/src/utils/rosterHelpers.js`.
2. **500-Operation Firestore Batches**: Any batch creation of players, parent invite stubs, and households must execute in atomic batches hard-capped at **500 operations** per transaction to prevent Firebase quota overflows. If a roster exceeds 500 records, apply sequential cursor-based batching.
3. **COPPA 2.0 & SafeSport Compliance Locks**: Automated minor player profiles created via CSV imports must be strictly initialized with `status: 'AWAITING_PARENT_VERIFICATION'` and `isCleared: false`. Their physical metrics, telemetry, and chat channels must remain completely masked and inaccessible to coaches and recruiters until the parent logs in, completes the WebAuthn touch challenge, and signs the Verifiable Parental Consent (VPC).
4. **Trusted Server Execution**: The client is inherently compromised. All spreadsheet parsing, user creation, custom claim assignment, and household pairing must happen securely on the serverless backend using the Firebase Admin SDK.

---

### 🛠️ Execution Sequence & Targets

#### Task 1: The Automated Vampire CSV Roster Ingestion Parser
*   **Target**: `functions/src/domains/interoperabilityOps.js`
*   **Action**: Refactor the CSV roster ingestion endpoint to parse not only the athlete's details but also the accompanying parent details (`Parent Name`, `Parent Email`):
    ```typescript
    // Required Roster CSV Schema:
    // PlayerName, PlayerDOB, SportBranch, ParentName, ParentEmail
    ```
    For each record parsed:
    1. Verify if the `ParentEmail` already has a user document at the canonical path `/users/{parentEmailLower}`.
    2. If no parent document exists:
       - Generate an automated unique `inviteToken`.
       - Atomically write a "Shadow Parent" document to `/users/{parentEmailLower}` containing:
         `{ role: 'parent', isCleared: false, invitePending: true, inviteToken: 'tok_abc123' }`
       - Construct an automated `/households/{householdId}` record.
    3. If a parent document does exist, retrieve its existing `householdId`.
    4. Automatically link the child profile to that `householdId` and write the minor document to `/users/{childEmailLower}` with `status: 'AWAITING_PARENT_VERIFICATION'`.
    5. Safely handle deletions and modifications using transaction boundaries.

#### Task 2: Programmatic Notification & Invitation Dispatch
*   **Target**: `functions/src/domains/notificationOps.js`
*   **Action**: Implement `dispatchParentInviteNotification` inside the ingestion loop:
    - If a new shadow parent account is created, trigger an automated dispatch event logged to the `/security_audits/` or `/notifications/` collections.
    - The record must capture: `"Invite dispatched to parent_email with secure signup route: /register?inviteToken=tok_abc123"`.
    - Provide secure validation: Ensure the token is bound to that email and expires after 168 hours (7 days).

#### Task 3: The Parent Handshake & WebAuthn Claim Protocol
*   **Target**: `functions/src/domains/parentOnboardingOps.js`
*   **Action**: Implement `claimParentInviteToken` callable function:
    - When a real parent signs up with `inviteToken`:
      - Validate the token and map their real Firebase Auth `uid` to the lowercase email `/users/{parentEmailLower}`.
      - Transition `invitePending` to `false` and automatically set their custom claims to `{ role: 'parent', householdId: 'house_abc123' }`.
      - On Svelte layout mount, once they complete their WebAuthn biometric touch consent, atomically update all child profiles in the household from `AWAITING_PARENT_VERIFICATION` to `PARENTAL_CONSENT_VERIFIED` and flip `isCleared: true`.

---

### 🧪 TDD Verification Harness

You must write a comprehensive integration test suite under `functions/src/domains/__tests__/vampireAutoOnboarding.test.js` using Vitest:

1.  **Ingestion & Auto-Household Creation Test**: Assert that uploading a 5-athlete CSV roster programmatically yields exactly 5 child profiles linked to their respective parent emails, creates corresponding `households`, and populates shadow parent documents.
2.  **Shadow Security Gate Test**: Assert that a shadow parent profile lacks database access, and that minor athlete data returns empty arrays when queried by unauthenticated requests.
3.  **Token Redemption Test**: Assert that calling `claimParentInviteToken` with a valid token successfully transfers ownership, elevates claims, and initializes the parent's household context.
4.  **WebAuthn Promotion Test**: Assert that signing the biometric consent transitions the minor's status to `PARENTAL_CONSENT_VERIFIED` and writes a signed audit log into `/consent_logs/`.

---

### 🚀 Headless Compilation & Run Verification

Run these target compilation checks before opening the PR:
```bash
# 1. Compile Svelte types
pnpm exec svelte-kit sync

# 2. Run static Svelte syntax and TypeScript validations (0 errors allowed)
pnpm run check

# 3. Execute the newly written TDD auto-onboarding tests
pnpm test functions/vampire-onboarding
```
Open your Pull Request targeting the `dev` branch only after your test suite executes with 100% green status and exactly zero skipped assertions.
