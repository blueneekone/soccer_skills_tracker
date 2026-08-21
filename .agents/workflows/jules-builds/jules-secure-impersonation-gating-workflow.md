# =============================================================================
# SSTRACKER SECURE IMPERSONATION, AGE-GATING & FIRESTORE RULES WORKFLOW (V2)
# =============================================================================
# This master-level workflow file directs Google Jules to deploy the full
# security architecture for Admin Impersonation, implement the Firestore 
# rules schema, enforce minor gating, and protect existing developer access.
# =============================================================================

# 🏛️ 1. SECURE IMPERSONATION RULES & TRUST GATING
We do not bypass standard security frameworks. The system must enforce a multi-layered trust gate to isolate active admin access while maintaining strict tenant boundaries:

## A. Firestore Security Rules Schema (`firestore.rules`)
Configure and deploy these exact rules for the `/impersonations/` collection inside the root `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1. Strict Impersonation Ledger Protection
    match /impersonations/{impersonationId} {
      // Only authenticated users with the 'admin' custom JWT claim can read or write impersonation tickets
      allow read, write: if request.auth != null 
                         && request.auth.token.role == 'admin';
    }

    // 2. Uninhibited Developer & Admin Operational Access
    // Ensure that your standard developer/admin testing account is NEVER blocked
    // from creating teams, modifying rosters, or managing club organizations.
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && (request.auth.token.role == 'admin' 
                       || request.auth.token.role == 'director' 
                       || request.auth.token.role == 'coach');
    }

    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && (request.auth.uid == userId 
                       || request.auth.token.role == 'admin' 
                       || request.auth.token.role == 'director');
    }
  }
}
```

## B. Absolute Minor Impersonation Block (P0 Compliance)
*   **The Guard:** Under no circumstances can any account under 18 years of age be impersonated.
*   **Validation Check:** Before writing a lease ticket to `/impersonations/`, the API server must calculate the target user's age from their database DOB profile.
    *   If `target.isMinor === true` or if `calculateAge(target.dateOfBirth) < 18`, the endpoint must hard-block and return `403 Forbidden` with the payload `IMPERSONATION_BLOCKED: TARGET_IS_MINOR`.
    *   No lease ticket may be written, and a security warning must commit atomically to the `/audit_logs/` collection.

## C. Account Age & Date of Birth Enforcement
*   **Date of Birth Requirement:** All user profiles must include a validated `dateOfBirth` attribute (`YYYY-MM-DD`).
*   **Server-Side Claims Minting:** On profile creation or update, a secure server Cloud Function (`onUserProfileWrite`) automatically computes current age and mints custom JWT claims (`isAdult: true` or `isMinor: true`) directly onto the Firebase Auth account. 
*   **Access Preservation:** The age gating must *only* trigger during active admin-to-user impersonation handshakes. It must never inhibit standard admins or directors from logging into their own accounts, testing features, managing teams, or importing CSV rosters.

---

# 🤖 2. THE JULES STEP-BY-STEP EXECUTION ROADMAP
@jules, please perform the following deployment steps inside your remote cloud environment:

## Step 1: Append Rules to `firestore.rules`
*   Open the repository's local `firestore.rules` file.
*   Locate the global match block and append the `/impersonations/` match rules cleanly without overwriting other collection scopes.

## Step 2: Implement Age-Gated Handshake Code
*   In the server-side endpoint (`src/routes/api/auth/impersonate/+server.ts`), inspect the target's DOB.
*   If `calculateAge(target.dateOfBirth) < 18`, reject immediately.
*   Otherwise, generate the 15-minute lease token and write the audit document to `/impersonations/` using Svelte 5 modular helper methods.

## Step 3: Run Compiler and Test Suite
Run local checks to prove Svelte 5 and Firebase Rules compile flawlessly:
```bash
pnpm run check
pnpm playwright test tests/secure-impersonation-gating.spec.ts --project=chromium
```

---

# 🛡️ 3. PESSIMISTIC DEFINITION OF DONE & CIRCUIT BREAKERS
*   **Circuit Breaker:** Limit to **3 test-and-repair runs**. If compilation or tests fail on the 3rd attempt, revert files to stable, log the errors, and abort to protect credit balances.
*   **Zero-Shifting:** Ensure Svelte layout hydration handles redirects silently, keeping type checking at 100% green before submitting the Pull Request.
