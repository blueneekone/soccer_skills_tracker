---
name: jules-functional-recovery-v2
description: Strict functional recovery, account purge stabilization, and B815 auth hydration gate enforcer.
---

# ⚙️ SSTracker Functional Recovery & Zero-Trust Data Plane Lock (CSA/CSO)

@jules, act as our joint task force consisting of the Chief Software Architect (CSA) and Chief Security Officer (CSO). You are instructed to systematically audit, refactor, and verify the backend mutations, Svelte 5 state models, authentication lifecycles, and database security gates. 

Your mission is to permanently resolve the 10,000ms cold-start deployment timeouts, secure the account purge modal actions, sanitize Google Sign-In email indexing, and enforce SafeSport compliance triggers. You must perform these modifications *directly* within your cloud virtual machine to deliver a production-ready, verified codebase.

---

### 🛡️ Part 1: Eliminating Global Scope Initialization Leaks

**The Issue**: The Firebase CLI deployment parser crashes with a "Timeout after 10000" error because database connections and third-party SDK clients (such as Stripe) are initialized at the global root of Cloud Function files during deployment discovery [cite: 264, 371].

**Your Action**: Perform a comprehensive, recursive sweep of `functions/index.js`, `functions/subscription.js`, `functions-compliance/`, `functions-commerce/`, and `functions-platform/` [cite: 265, 374].
*   Move all instances of `admin.initializeApp()`, `admin.firestore()`, and `require('stripe')` strictly **inside** the execution blocks of individual callable functions [cite: 265, 374].
*   Enforce lazy-loading of heavy dependencies (such as the `sharp` media binary in `functions-integrations/`) inside individual operational blocks [cite: 492].
*   Configure the deployment environment variable `FUNCTIONS_DISCOVERY_TIMEOUT = '120'` inside the deployment and package configurations [cite: 265, 374].

---

### 🔒 Part 2: Persona-Specific Functional Implementations

You must audit and refactor the backend mechanics, Svelte 5 state files, and database security rules to strictly implement the following targeted requirements:

#### 1. Global Admin OS (The Command Plane)
*   **Secure Impersonation**: Refactor `functions-platform/src/domains/adminOps.js` to ensure `admin.auth().createCustomToken(uid)` is securely wired inside `impersonateUserFn` [cite: 610]. Unauthenticated clients must be blocked with a 401 [cite: 610].
*   **PII Shredding Cascade**: Audit `scripts/triggerRightToBeForgotten.cjs` to enforce CCPA/GDPR compliance [cite: 610]. Securely execute a cascading `writeBatch` deletion of users and sub-collections [cite: 610], but **strictly exempt** `consent_logs` and `consent_records` (COPPA 2.0 legal audit trails) [cite: 480, 610].
*   **The Aggies FC Shield**: At the top of the compliance shredder function, inject an early return: if the target document has `clubId === 'aggies-fc'` or the target email ends with `@aggiesfc.com`, log a bypass notification and safely abort deletion to protect the CEO's personal assets [cite: apply_ceo_launch_hotfixes-v2.py].
*   **Role Mutation Prevention**: Ensure `updateUserRole` is a secure, server-side Cloud Function [cite: 610]. Update `firestore.rules` to prevent client-side updates from directly mutating the `role` field on user documents using the canonical map diffing pattern:
    `!request.resource.data.diff(resource == null ? {} : resource.data).affectedKeys().hasAny(['role'])` [cite: 610].

#### 2. Commissioner OS (State Federation Command)
*   **God-Mode Scoping**: Enforce read-only bounds in `src/lib/services/federation.svelte.ts` [cite: 611]. Multi-tenant federation queries reading rosters across different `clubIds` must be strictly read-only and bounded by the commissioner's master `tenantId` claim [cite: 611].
*   **ODP Telemetry Ordering**: Verify the ODP Talent Pipeline data flow [cite: 611]. Confirm that player physical telemetry (1000Hz metrics) is correctly mapped to the 6-axis data array in the exact order: **`[PACE, ACCEL, AGILITY, STAMINA, POWER, COMP]`** before being sent to the client [cite: 611].

#### 3. Director OS (B2B Revenue Engine)
*   **The Vampire Importer**: Audit `functions/src/domains/interoperabilityOps.js` [cite: 612]. It must write raw legacy roster data to `roster_staging` in atomic batches capped at a hard limit of **500 operations** per Firestore transaction [cite: 612]. Chunk N+1 queries up to 30 items using the `in` operator [cite: 612].
*   **Stripe Connect Entitlements**: Ensure Stripe active seat calculations are handled server-side via webhooks, updating `subscriptionStatus` on the canonical organization collection [cite: 612].
*   **Dual-Track Registration**: Build the B2B enrollment pipelines [cite: 667]. Flow A (Independent Director) must provision a new, standalone `tenantId` and `clubId` and trigger Stripe Connect onboarding [cite: 667]; Flow B (Governed Director) must parse single-use invite tokens and securely nest the newly generated `clubId` beneath the Commissioner's master `tenantId` [cite: 667].

#### 4. Coach OS (The Sideline SIEM)
*   **SafeSport Shadow CC Trigger**: Completely strip client-side `fetchParentEmailsForPlayer` and parental email lookup hooks from `NewMessageModal.svelte` and `NewMessageEngine.svelte.ts` [cite: 542, 613]. Write/verify the backend `onChannelCreated` Firestore onCreate trigger in `functions-compliance/` [cite: 543].
*   **Server-Side Resolution**: On channel registration, parse `memberIds` [cite: 543]. If any member is a minor under 18, resolve their linked parent/guardian emails and write them to `ccParentEmails` [cite: 543]. Initialize the channel status as `BLOCKED_VPC_PENDING` [cite: 543]. Message dispatch callables must strictly reject writes unless the status is promoted to `ACTIVE` by the server-side validator [cite: 543].
*   **Weather Lockouts**: Coordinate Tomorrow.io weather webhooks to write `facility_weather_locks` on threshold breach, triggering SvelteKit reactive route locks [cite: 613].

#### 5. Player OS (The Dopamine Engine)
*   **2% Daily Skill Decay (Loss Avoidance)**: Implement the 2% daily scoutsSix stats decrement after 24 hours of inactivity in `functions/src/domains/skillDecayOps.js` and `src/lib/utils/gamificationMath.ts` [cite: 530]. It must check for and consume `streakFreeze` tokens [cite: 530]. Mutate the nested armory map inside the canonical `users/{email}` doc (never use isolated collections like `player_stats`) [cite: 530, 614].
*   **Commit-Bound Celebrations**: Never trigger visual rewards (confetti) optimistically [cite: 614]. Confetti must strictly execute in the `.then()` or `try/catch` success blocks of verified Firestore writes [cite: 614].

#### 6. Parent OS (Compliance Shield)
*   **The Car Ride Home Protocol**: Mathematically enforce a strict 15-minute post-match embargo on youth match metrics inside `src/lib/services/compliance.svelte.ts` and Svelte routes [cite: 615]. Unauthenticated or bypassed reads must return empty, unhydrated states [cite: 615].
*   **COPPA 2.0 Biometric Gates**: Player data collection and biometric/photo uploads must remain fully paused and blocked until the parent's biometric Verifiable Parental Consent (VPC) token is authenticated via WebAuthn FaceID/TouchID enclaves [cite: 615].

#### 7. Fan & Recruiter OS (Broadcast & Recruitment Gateways)
*   **Checkr Recruiter Gate**: Open `src/lib/components/recruiter/RecruiterSearchEngine.svelte` [cite: 519]. Inject an early-return check: if the recruiter's `checkr_status` is not strictly equal to `'clear'`, abort the search and return an empty state [cite: 519]. Enforce cursor-based pagination using `startAfter` and `limit(20)` to maintain performance targets [cite: 519].

#### 8. Tutoring Marketplace (Direct-to-Parent Network)
*   **B815 Hydration Guard**: Wrap the marketplace's Svelte 5 `$effect` query subscription in the unified defensive hydration check `if (!isFirestoreReady()) return;` to prevent unauthorized read leaks [cite: 690, 694].
*   **Access Exclusions**: Block access for `Players` (SafeSport safety), `Admins`, and `Commissioners` at both Svelte load boundaries and Database Rules [cite: 688, 689].
*   **Secure Stripe Bookings**: Deploy `bookTutoringSession` Stripe handler inside `functions-commerce/` [cite: 691]. Processes parent bookings via Stripe Connect Destination Charges, collecting a microcharge platform application fee server-side [cite: 691].

---

### 🔄 Part 3: Path Sanitation & Reactivity Safeguards

1.  **Google Sign-In Email Indexing**: Refactor all social signup triggers and onboarding views (`LoginEngine.svelte.ts`, `auth.ts`) to write user records strictly to the canonical lowercase email document path: `doc(db, 'users', user.email.toLowerCase())` [cite: 534]. Under no circumstances should profiles be indexed under raw Google UIDs (`users/{uid}`), which blocks claim synchronization [cite: 534].
2.  **Custom Claim Token Refreshes**: Immediately following a successful asynchronous call to `claimCoachInvite` or any role assignment, inject the programmatic token refresh check `await auth.currentUser?.getIdToken(true)` [cite: 535]. This forces the client SDK to discard the stale IndexedDB JWT and fetch updated custom claims, immediately restoring the user's read access [cite: 535].
3.  **SvelteKit SSR Session Cookie Sync**: Inside your `onIdTokenChanged` observer block, ensure that when the token resolves, it is serialized directly to a secure HTTP cookie named "token" with `SameSite=Strict; Secure` settings [cite: 536].
4.  **Svelte 5 Reactivity Navigation Loops**: All programmatic redirects (SvelteKit's `goto()`) and page context switches executed inside reactive `$effect` blocks must be wrapped inside `untrack()` closures:
    `untrack(() => goto('/dashboard'));` [cite: 278, 381]
    Refactor all legacy reactive array mutations from `.push()` or `.splice()` over to Svelte 5-compatible immutable spreads (e.g., `array = [...array, newItem]`) to prevent infinite evaluation cascades [cite: 278, 304].

---

### 🚦 Part 4: Test-Driven Verification

1. Run the local Firebase emulator deployment dry-run: `pnpm run test:functions-deploy`.
2. Run targeted Vitest suites in the cloud VM to verify your logic: `pnpm test functions/compliance` and `pnpm test functions/admin`.
3. The Critic-Augmented Generation loop is forbidden from halting if tests are failing. You must iteratively refactor the files until the pipeline passes with exactly 0 Svelte compiler errors and a 100% green test run.
