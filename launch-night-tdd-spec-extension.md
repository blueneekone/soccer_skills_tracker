# 🛰️ SSTRACKER LAUNCH-NIGHT COMPREHENSIVE TDD SPECIFICATION INDEX (EXTENSION)
**Target Audience:** Google Jules (asynchronous cloud vm agent)
**Scope:** Standalone, decoupled feature blueprints with mandatory unit, integration, and security test gates.
**Goal:** Mathematically verify and launch the remaining B2B Onboarding, Compliance Vault, and Legal Gating backlogs.

---

## 🛰️ MASTER DIRECTORY: THE 5 MISSING COMPLIANCE & ONBOARDING SPRINT BLUEPRINTS

14. **Epic 2 / Part 2:** Independent Director Onboarding & Stripe Connect Handshake
15. **Epic 7 / Part 2:** Governed Director Single-Use Federation Invite Links
16. **Part 2 Vault:** HIPAA & Medical Release Integrated Intake Gate
17. **Part 2 Vault:** Sport-Hazard Liability Waivers & Granular Media Releases
18. **Part 2 Vault:** Coach Mandated Reporter Upload Gating & Verification

---

### 🚀 PROMPT 14: Independent Director Onboarding & Stripe Connect Handshake (Epic 2 / Part 2)

```text
Task: Standalone TDD: Independent Director Onboarding & Stripe Connect Provisioning

@jules, please implement the self-serve Independent Director onboarding and verification pipeline:

1. THE BACKEND BRAIN (functions/src/domains/directorOnboarding.ts)
- Create 'initializeIndependentDirector' as a secure server-side Callable Cloud Function.
- It must generate a cryptographically secure, standalone tenantId and clubId for the registering user.
- Initialize the Stripe Connect custom account provisioning flow by calling stripe.accounts.create() with the type: 'custom' and requested capabilities.
- Write a placeholder document into 'account_verifications' requiring a business license or government-issued ID upload.
- Keep the function body under 80 lines.

2. THE FRONTEND ENGINE (DirectorOnboardingEngine.svelte.ts)
- Manage onboarding registration steps, file upload progress, and Stripe onboarding URLs using Svelte 5 compile-time runes ($state, $derived).
- Wrap all Firestore mutations inside untrack() closures to prevent reactivity loops during redirection.
- Enforce the B815 Defensive Hydration guard:
  if (!db || !authStore.isAuthenticated) return;

3. TDD SPECIFICATION
- Write 'functions/src/__tests__/directorOnboarding.test.ts'.
- Assert that unauthenticated requests are rejected with a 401 code.
- Assert that a valid payload generates a distinct, non-nested tenantId and correctly records the pending verification state in Firestore.

Run 'pnpm run check' and 'pnpm test functions/directorOnboarding'. Once green, commit as 'feat: implement Independent Director self-serve onboarding and Stripe integration'.
```

---

### 🚀 PROMPT 15: Governed Director Single-Use Federation Invite Links (Epic 7 / Part 2)

```text
Task: Standalone TDD: Single-Use Cryptographic Federation Invite Gating

@jules, please build the secure invitation and auto-nesting pipeline for Governed Directors:

1. THE BACKEND BRAIN (functions/src/domains/federationInvites.ts)
- Create 'consumeFederationInvite' as a secure Callable Cloud Function.
- It receives an inviteToken. Query the 'federation_invites' collection to locate the active token.
- Verify that is_used === false and current_time < expiration_timestamp.
- Mark the inviteToken as used atomically within a writeBatch transaction.
- Create the new Governed Director profile, automatically nesting their new clubId under the Commissioner's master tenantId to preserve structural cell-isolation.
- Restrict the function body to 80 lines.

2. TDD SPECIFICATION
- Write 'functions/src/__tests__/federationInvites.test.ts'.
- Mock an expired token and assert the transaction rejects the write.
- Mock an active, valid token. Assert that the transaction atomically marks the token as used and binds the new clubId directly under the Commissioner's master tenantId.

Run 'pnpm run check' and 'pnpm test functions/federationInvites'. Once green, commit as 'feat: enforce single-use cryptographic federation invites'.
```

---

### 🚀 PROMPT 16: HIPAA & Medical Release Integrated Intake Gate (Part 2 Vault)

```text
Task: Standalone TDD: HIPAA Compliance Gating & Medical Intake

@jules, please implement the HIPAA-compliant player emergency and medical intake gating form:

1. THE FRONTEND ENGINE (MedicalIntakeEngine.svelte.ts)
- Manage emergency contact name, primary health insurance carrier, policy ID, and the electronic signature state for the integrated HIPAA Release Form using Svelte 5 runes.
- Enforce strict progressive disclosure: hide secondary, highly sensitive fields by default to minimize visual clutter.
- Force all numerical policy inputs and date strings to use Geist Mono typography (tw-font-mono).
- No function body may exceed 80 lines.

2. SECURITY & FIREBASE RULES
- Write Firestore security rules for the 'medical_records' collection.
- Enforce that client-side reads and writes are strictly forbidden. All medical records must be managed via secure Cloud Functions utilizing getAdminDb().
- Update the isDataCollectionRoute() routing hook in SvelteKit to intercept routing and redirect players to the intake route until the medical signature status is verified.

3. TDD SPECIFICATION
- Write 'src/lib/compliance/__tests__/hipaaMedicalIntake.test.ts'.
- Assert that the client-side Svelte component fails to read the 'medical_records' collection directly.
- Assert that players with uncompleted medical releases are intercepted and redirected safely.

Run 'pnpm run check' and 'npx vitest run hipaaMedicalIntake'. Once green, commit as 'feat: build HIPAA medical intake gate and security rules'.
```

---

### 🚀 PROMPT 17: Sport-Hazard Liability Waivers & Granular Media Releases (Part 2 Vault)

```text
Task: Standalone TDD: Assumption of Risk Waivers and Granular Photo/Video Releases

@jules, please implement the legal liability and video-release gateway:

1. THE GLASS LAYER (WaiverConsoleArena.svelte)
- Build a zero-distraction, single-column document viewer for the Assumption of Risk and Liability Waiver.
- The wrapper must use a Solid Canvas background (#000000 Void Black) with crisp 1px borders (#334155).
- Include granular opt-in/opt-out switches for the Fan OS livestreaming and Player OS video trial modules.
- On submit, capture and encrypt the user's IP address, current timestamp, and email verification for the E-Sign Act audit trail.

2. THE FRONTEND ENGINE (WaiverController.svelte.ts)
- Wrap all Firestore setDoc mutations inside untrack() closures.
- Hydration must be gated by the B815 defensive hydration guard:
  if (!db || !authStore.isAuthenticated) return;

3. TDD SPECIFICATION
- Write 'src/routes/(app)/parent/compliance/__tests__/waiverSignoff.test.ts'.
- Assert that clicking sign-off correctly registers the E-Sign payload (IP address, date, timestamp) and commits atomically.
- Assert that opting out of the video release successfully sets the 'fan_os_opt_in' and 'player_os_opt_in' flags to false in their Firestore profile.

Run 'pnpm run check' and 'npx vitest run waiverSignoff'. Once green, commit as 'feat: wire legal waivers and photo-video releases'.
```

---

### 🚀 PROMPT 18: Coach Mandated Reporter Upload Gating & Verification (Part 2 Vault)

```text
Task: Standalone TDD: Mandated Reporter SafeSport Training Upload Gates

@jules, please build the document upload and clearance gateway for Coaches:

1. THE HUD COMPONENT (ClearanceStatusHUD.svelte)
- Render an absolute-solidity panel (#0f172a Navy Slate) with 90-degree corners.
- Display a high-visibility status badge (Green/Amber/Red) representing the coach's active field clearance status based on the 'safesport_verification' document state.

2. THE BACKEND BRAIN (functions/src/domains/clearanceOps.ts)
- Write 'submitSafeSportCertificate' as a secure Callable Cloud Function.
- Accept a Cloud Storage file URI pointing to the coach's uploaded child abuse prevention training certificate.
- Write an atomic transaction updating the coach's Firestore profile to status: 'CLEARANCE_PENDING_AUDIT', strictly exempting this legal consent document from the 24-hour PII Shredder script to preserve multi-year audit logs.
- Keep the function body under 80 lines.

3. TDD SPECIFICATION
- Write 'functions/src/__tests__/coachClearance.test.ts'.
- Assert that un-vetted coaches are flagged with a status: 'CLEARANCE_REQUIRED'.
- Assert that the 24-hour PII Shredder script successfully leaves the 'safesport_certificates' collection untouched during data minimization passes.

Run 'pnpm run check' and 'pnpm test functions/coachClearance'. Once green, commit as 'feat: build coach SafeSport upload gate and verification pipeline'.
```
