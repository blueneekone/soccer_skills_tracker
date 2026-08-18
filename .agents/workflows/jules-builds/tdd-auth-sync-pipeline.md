---
name: tdd-auth-sync-pipeline
description: Asynchronous Cloud VM workflow to design, secure, and build the autonomous B2B enrollment, club creation, and independent coach intake pipelines.
---

# 🛰️ SSTracker Unified TDD Onboarding & Auth Sync Pipeline Specification (v3.0)

@jules, act as our Principal Backend Architect, Chief Security Officer, and Lead Frontend Architect. You are instructed to implement, secure, and test the unified authentication synchronization, self-serve B2B club creation, and independent (orphan) coach onboarding pipelines. 

This build is gated by our strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 Svelte Kit hydration warnings, 0 TypeScript 'any' violations, and 100% green backend/frontend test runs.

---

### 🛡️ Part 1: Global Architectural Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No function body (serverless or frontend) may exceed 80 lines. Extract complex orchestration, database routing, or encryption into `functions-platform/src/utils/` or `src/lib/utils/` helper modules [cite: 781].
2. **B815 Defensive Hydration**: Every raw Firestore query (`getDocs`, `onSnapshot`) on onboarding views and directories must be gated at component mount to prevent unauthenticated read loops [cite: 781]:
   `if (!db || !authStore.isAuthenticated) return;`
3. **Infinite Loop Prevention**: Any programmatic navigation (`goto`) or state mutations occurring inside a Svelte 5 `$effect` block MUST be safely wrapped in an `untrack()` closure [cite: 781].
4. **Trusted Environment Rules**: The client is inherently compromised [cite: 676]. All role assignments, club creations, and token elevations must occur on the trusted serverless backend using the Admin SDK [cite: 676].

---

### ⚙️ Part 2: Complete Backend Onboarding & Sync APIs

You must verify, implement, and secure the full production suite of self-serve synchronization and onboarding features:

#### 1. Serverless Cloud Auth Sync Trigger (`authOnCreate`)
*   **Target**: `functions-platform/src/triggers/authSync.js`
*   **Task**: Implement the Firebase Authentication `onCreate` background trigger:
    *   On user registration (email/password or magic-link), automatically extract `uid`, `email`, and `displayName`.
    *   Convert the email to a standard lowercase string index to prevent lookup path mismatches.
    *   Atomically write the initial profile document directly to the canonical database path: `/users/{emailLower}` [cite: 787].
    *   Ensure any unhandled promise rejections are safely caught, and log the profile creation event to `security_audits`.

#### 2. Dual-Track Club Creation Engine
*   **Target**: `functions-platform/src/domains/clubCreationOps.js`
*   **Task**: Implement the `createClub` serverless callable API to handle self-serve club generation:
    *   **Director Flow (Independent)**: If an independent Director signs up, the function must provision a brand-new, standalone `tenantId` and `clubId`, write them to the `clubs` collection, and initiate the Stripe Connect express connected-account onboarding sequence [cite: 871].
    *   **Commissioner Flow (State/Federation)**: If a Commissioner creates a club, the function must parse the Commissioner's custom `tenantId` claim and nest the newly generated `clubId` record beneath that federation parent, securing the data hierarchy [cite: 871, 873].
    *   **Constraint**: Database writes must execute as an atomic transaction capped at **500 operations** [cite: 820]. Direct client-side creation of club collections is strictly banned.

#### 3. Independent (Orphan) Coach Intake Protocol
*   **Target**: `functions-compliance/src/domains/orphanCoachOps.js`
*   **Task**: Implement the `registerIndependentCoach` callable to handle individual coaches signing up without a club invite or pre-existing team reference:
    *   To prevent 403 access blocks or user onboarding dead-ends, the handler must automatically provision a secure, isolated "Independent Coach Sandbox" club (e.g., `independent-coach-{emailLower}`).
    *   Associate this independent space with a default platform-managed "Orphan Cell" to preserve multi-tenant routing boundaries.
    *   **Zero-Trust Clearance Gate**: Automatically assign `role: 'independent_coach'` and set `isCleared: false` [cite: 872]. The coach's account remains mathematically restricted from viewing any minor athlete telemetry or querying active player cards until they complete their background Checkr Live Scan and CDC Concussion cert uploads [cite: 872, 894].

---

### 🎨 Part 3: Onboarding Client Routing & Claims Flushing

Enforce seamless frontend coordination inside Svelte 5 onboarding routes (`src/routes/onboarding/`):

#### 1. Instant Token Cache Flushing
*   **Target**: `src/lib/auth/onboardingHandshake.ts` or client onboarding Svelte page templates.
*   **Task**: Immediately following the successful server callback from `createClub` or `registerIndependentCoach`, the client MUST call:
    `await auth.currentUser?.getIdToken(true);`
    This forces the Firebase Authentication client SDK to immediately dump its browser-local IndexedDB cache and retrieve the newly minted Custom Claims payload [cite: 369, 451].

#### 2. SvelteKit Isomorphic Cookie Sync
*   **Target**: Global auth state observer.
*   **Task**: Ensure the newly refreshed JWT is serialized directly into a secure, HTTP-only browser cookie named `"token"` [cite: 668]. If the cookie was previously empty, trigger a clean `window.location.reload()` to hydrate the SvelteKit layout server with the verified tenant parameters [cite: 669].

#### 3. Untracked Client Redirection
*   **Target**: Onboarding routing loops.
*   **Task**: Wrap all programmatic redirects inside an `untrack` block to avoid creating infinite dependencies within Svelte 5 `$effect` cycles:
    `untrack(() => goto('/coach/dashboard'));`

---

### 🧪 Part 4: TDD Verification Harness

You must write or extend the backend Vitest integration suite under `functions/src/domains/__tests__/authSyncPipeline.test.js` to assert the following behaviors under the local Firebase Emulator:

1.  **Auth Sync Assertion**: Creating a Firebase Auth credential programmatically generates a lowercase-email-indexed document `/users/{email}` in Firestore [cite: 714].
2.  **Orphan Gate Assertion**: An independent coach signup allocates the sandboxed `independent-coach-{email}` club, assigns the `independent_coach` role, and returns `isCleared = false` to block minor data leaks [cite: 872].
3.  **B2B Club Assertion**: A Director's club creation writes a standalone `tenantId`, while a Commissioner's club creation inherits the Commissioner's parent `tenantId` claim [cite: 871, 873].
4.  **Transaction Boundary**: Assert that massive bulk registrations or operations are chunked and batch-processed under our strict **500-write limit** [cite: 820].

---

### 🚀 Part 5: Jules Headless Cloud Execution Loop

To execute this pipeline asynchronously in your Google Cloud VM environment, run:

```bash
# 1. Sync Svelte schemas
pnpm exec svelte-kit sync

# 2. Run static Svelte and TypeScript checks (Must return 0 errors)
pnpm run check

# 3. Execute the newly written TDD onboarding tests
pnpm test functions/onboarding
```

Open the Pull Request ONLY when the entire pipeline compiles with 0 Svelte compiler errors and all test suites pass 100% green.
