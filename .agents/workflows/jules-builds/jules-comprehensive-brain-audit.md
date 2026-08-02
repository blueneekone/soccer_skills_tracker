---
name: jules-comprehensive-brain-audit
description: An asynchronous, cloud-executed backend and data flow audit/fix workflow designed specifically for Google Jules. It systematically verifies, tests, and auto-heals database wiring, security, and compliant "brains" across all seven personas.
---

# 🧠 SSTracker "Atomic Brain" Backend Audit & Auto-Healing Pipeline
**Owner**: Google Jules (Cloud Execution Environment)  
**Priority**: P0 — CRITICAL SYSTEM LAUNCHGATE  
**Scope**: All backend domains, Firebase Cloud Functions, Firestore Security Rules, Svelte 5 state controllers, and legal gateways across all seven operating system personas.

---

## 🏛️ PART 1: GLOBAL COMPLIATION & ARCHITECTURAL GATES (CRITICAL)
Subagent Jules **MUST** run these checks before evaluating any persona. If these baseline metrics fail, halt the pipeline and fix them immediately:

1. **The 80-Line Function Limit**: No function body shall exceed 80 lines. If a function is too large, extract the logic into modular helper units under `functions/src/utils/` or `src/lib/utils/`.
2. **Strict Svelte 5 Reactivity**: All front-end state files must exclusively utilize Svelte 5 compile-time runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`). Legacy Svelte 4 reactivity syntax is completely banned.
3. **Infinite Loop Prevention**: Any programmatic routing, state mutation, or client-side navigation occurring inside a Svelte `$effect` block MUST be safely wrapped in an `untrack()` closure.
4. **B815 Defensive Hydration**: Every raw Firestore `getDocs()` or `onSnapshot()` database transaction on both SvelteKit pages and services must be wrapped in an early-return check to prevent Firebase Quota Exceeded loops:
   ```typescript
   if (!db || !authStore.isAuthenticated) return;
   ```
5. **Pessimistic Definition of Done**: A persona's logic is only "Done" when the compiler returns exactly 0 Svelte compilation errors, 0 TypeScript `any` violations, and the unit tests are 100% green. **We do not merge red pipelines.**

---

## 🔒 PART 2: PERSONA-BY-PERSONA BRAIN AUDIT & AUTO-FIX SPECIFICATIONS

Jules must traverse the following seven directories sequentially. At each stage, write/run the Vitest tests first, apply the fixes, and verify the backend database rules.

### 1. Global Admin OS (The Command Plane)
*   **Target Route**: `src/routes/(app)/admin/` & `functions/src/domains/adminOps.js`
*   **Backend Verification Tasks**:
    *   Verify that `admin.auth().createCustomToken(uid)` is securely wired inside `impersonateUserFn` across Cloud Functions. Assert that unauthenticated clients cannot invoke this.
    *   Verify the PII Shredder script (`triggerRightToBeForgotten.cjs`) is active and triggers the cascade delete of user profiles using the correct Firestore sub-collection cleanups.
    *   Verify that `updateUserRole` is a secure, server-side Cloud Function and that unauthenticated clients have absolutely zero client-side `updateDoc` capabilities to set the `role` field on a user document.
*   **TDD Test Suite**: Run `pnpm test functions/admin` and verify `updateUserRole` security validations.

### 2. Commissioner OS (State Federation Command)
*   **Target Route**: `src/routes/(app)/commissioner/` & `src/lib/services/federation.svelte.ts`
*   **Backend Verification Tasks**:
    *   Verify "God-mode" aggregation queries. Ensure that queries reading rosters across different `clubIds` are strictly read-only and filtered by the commissioner's master `tenantId`.
    *   Audit the ODP Talent Pipeline data flow. Confirm that player physical telemetry (1000Hz metrics) is correctly mapped to the 6-axis data array before being sent to the client.
    *   Ensure that absolutely NO client-side data mutations or Action Gold accents exist in this workspace.

### 3. Director OS (B2B Revenue Engine)
*   **Target Route**: `src/routes/(app)/director/` & `functions/src/domains/interoperabilityOps.js`
*   **Backend Verification Tasks**:
    *   Verify **The Vampire Importer** CSV parser. It must write raw legacy roster data to `roster_staging` in atomic batches capped at a hard limit of **500 operations** per Firestore transaction.
    *   Verify the Stripe Connect checkout session creation in `functions/subscription.js`. Ensure that active seat calculations are handled server-side via Stripe Webhooks rather than calculated directly on the client.
*   **TDD Test Suite**: Run `pnpm test functions/vampire` and assert cursor-based batch pagination.

### 4. Coach OS (The Sideline SIEM)
*   **Target Route**: `src/routes/(app)/coach/` & `functions/src/domains/commsOps.js`
*   **Backend Verification Tasks**:
    *   **Legally Mandated SafeSport Shadow CC**: Remove any client-side parent email resolution logic. Write or verify the `onChannelCreated` Firestore `onCreate` trigger:
        1. When an adult coach creates a chat channel, the trigger must intercept the `memberIds`.
        2. Identify any player under the age of 18.
        3. Resolve the linked guardian emails and dynamically write them to the `ccParentEmails` array.
        4. If a minor is found without a linked guardian, set the channel status to `BLOCKED_VPC_PENDING`.
    *   Verify Tomorrow.io webhooks. Ensure that upon field lightning status updates, SvelteKit reactive states automatically lock schedule routes.
*   **TDD Test Suite**: Run `pnpm test functions/shadow-cc`. Verify that client-side attempts to manually set `ccParentEmails` are blocked by Firestore Security Rules.

### 5. Player OS (The Dopamine Engine)
*   **Target Route**: `src/routes/(app)/player/` & `src/lib/components/player/DopamineEngine.svelte.ts`
*   **Backend Verification Tasks**:
    *   **The Dopamine Engine**: Audit `dopamineOnCommit` triggers. Assert that visual celebration events (like confetti explosions) are strictly fired inside the `.then()` success handlers of a *verified database write*, never on optimistic client clicks.
    *   **Loss Avoidance (Daily Streak Decay)**: Audit the daily cron job that reduces a player's physical metrics by **2%** after 24 hours of inactivity. Verify that the script checks for the existence of an active `streakFreeze` token in the player's collection and consumes it rather than applying the decay penalty.
*   **TDD Test Suite**: Run `pnpm test components/player` and verify that `scoutsSix` radar objects decrement mathematically on decay trigger runs.

### 6. Parent OS (Compliance Shield)
*   **Target Route**: `src/routes/(app)/parent/` & `src/lib/services/compliance.svelte.ts`
*   **Backend Verification Tasks**:
    *   **The Car Ride Home Protocol**: Mathematically verify that the Svelte state engine locks out match metric dashboards for exactly **15 minutes** post-game. Ensure that unauthenticated calls to bypass the timestamp check return unhydrated, empty states to prevent parents from over-evaluating young athletes.
    *   **COPPA 2.0 / VPC Verification**: Ensure that player data collection remains fully paused until an adult's Verifiable Parental Consent token is authenticated.
*   **TDD Test Suite**: Run `pnpm test services/parent-vault` and assert timeline embargo gates.

### 7. Fan OS & Recruiter OS (Broadcast & Recruitment Gateways)
*   **Target Route**: `src/routes/(app)/fan/` & `src/routes/(app)/recruiter/`
*   **Backend Verification Tasks**:
    *   **Checkr Recruiter Gate**: Verify that the Recruiter Search Engine strictly returns empty results if the recruiter's Checkr background check status is not explicitly set to `clear`.
    *   **Fan Ticketing**: Ensure that the 60-minute fundraising superdraw campaigns write transactions server-side using atomic, read-only structures.
*   **TDD Test Suite**: Run `pnpm test components/recruiter` and confirm search blocks.

---

## 🛠️ PART 3: PIPELINE EXECUTION PROTOCOL

Jules is instructed to run this entire multi-persona brain audit using the following loop:

```bash
# 1. Boot up the local test frameworks in your cloud VM
pnpm install
pnpm run check

# 2. Run the complete backend test harness
pnpm test

# 3. For any failing test:
# Spawn specialized subagent (Architect for backend logic/CSO for database permissions)
# Perform surgical refactoring inside the cloud container
# Enforce the 80-line cap and B815 hydration rules on all modifications
# Re-run pnpm test until 100% green

# 4. Update the Roadmap upon completion
# Modify @ROADMAP.md to reflect that the reviewed backend integrations are successfully complete.
# Open the Pull Request with detailed, verified, and compiled test logs.
```
