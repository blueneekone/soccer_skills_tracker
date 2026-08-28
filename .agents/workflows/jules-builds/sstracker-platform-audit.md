# SSTracker Unified Command Plane: Platform-Wide Technical Audit & Gap Assessment

This system-wide audit is conducted on **August 28, 2026**, in preparation for the commercial launch of **SSTracker** (`sstracker.app`) [cite: 187]. The platform is evaluated against our strict architectural mandates: the **Vanguard Trinity Pattern** [cite: 256], the **B815 Defensive Hydration Protocol** [cite: 256], the **80-Line Function/Component Limit** [cite: 256], and **Zero-Trust Role-Based Access Control (RBAC)** [cite: 256, 271].

Below is the exhaustive architectural gap assessment across the five pillars of the platform, followed by a concrete, single-execution master remediation prompt designed for immediate delivery to **Subagent Jules** on launch night [cite: 256].

---

## 🏛️ PART 1: THE FIVE-PILLAR SYSTEM AUDIT

```
   ┌────────────────────────────────────────────────────────┐
   │             SSTRACKER PRODUCTION AUDIT COHESION        │
   └───────────────────────────┬────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
 📊 PILLAR 1: Svelte 5     🔒 PILLAR 2: Zero-Trust   ⚡ PILLAR 3: Weather
  Compiler & Hydration     Database Boundaries     Lockout Persistence
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       💳 PILLAR 4: Stripe Connect     🛡️ PILLAR 5: COPPA 2.0
         Dual-Track Splits              Athlete Privacy Gating
```

### 📊 PILLAR 1: SVELTE 5 COMPILER RUNES & HYDRATION BOUNDARIES

#### **1. The Universal Guard Loop (Resolved)**
*   **Audit Find:** Previously, uncoordinated client-side redirects inside layout files competed with server-side authentication state handshakes [cite: 256, 271]. This caused infinite hydration refreshes and locked the browser session during login redirects [cite: 256, 271].
*   **Remediation Status:** Verified [cite: 256]. By enforcing a strict, deterministic routing waterfall inside the universal layout loader (`src/routes/(app)/+layout.js`), the application cleanly handles unauthenticated sessions, role-selection redirections, and clearance "purgatory" [cite: 256].
*   **Gap Remaining:** High-priority sub-routes under the Player OS and Parent OS still lack optional chaining on layout-injected data bindings (e.g., reading `data.userProfile.role` directly) [cite: 256]. This throws server-side `500` null pointer exceptions if the Svelte client attempts to hydrate before the Firestore profile document has finished minting [cite: 256].

#### **2. Svelte 5 Reactivity Leakage (Gapped)**
*   **Audit Find:** In-progress visual sweeps have identified several script blocks exceeding our **80-line maximum line-length cap** (specifically within legacy dashboard widgets) [cite: 256].
*   **Gap Remaining:** Multiple page transitions and sub-navigation parameters (e.g., changing active filters in the Coach War Room or changing players in Player Card lists) are triggered directly inside `$effect` blocks without being wrapped inside an `untrack()` closure [cite: 256].
*   **Risk:** This causes silent memory leaks and recursive state invalidation cascades, which degrade mobile performance during live sideline tracking.

---

### 🔒 PILLAR 2: ZERO-TRUST DATABASE BOUNDARIES & FIREBASE RULES

#### **1. Firebase Security Rules (Gapped)**
*   **Audit Find:** The `firestore.rules` file contains excellent structural rules isolating user profile modifications [cite: 271]. However, a critical security vulnerability was introduced in earlier revisions by permitting `request.auth.token.get('isCleared', true) == true` to facilitate backward compatibility with older test suites [cite: 256, 271].
*   **Gap Remaining:** The current ruleset lacks a strict, default-deny enforcement of the `isCleared` claim on core roster, health tracker, and tactical coordinate collections.
*   **Risk:** Leaving default-true overrides in database queries allows any newly created user, un-vetted coach, or malicious external client to bypass background vetting check screens completely, violating HIPAA and SafeSport mandates [cite: 256].

#### **2. The Tutoring Marketplace Isolation (SafeSport Moat - Gapped)**
*   **Audit Find:** The new B2B2C Tutoring Marketplace must strictly separate minors (athletes) from adult tutors to eliminate unmonitored communication lines [cite: 271].
*   **Gap Remaining:** The client-side search indexing does not restrict direct Firestore collection fetches on `/tutors`. 
*   **Risk:** Any logged-in minor player could craft a console fetch command and pull personal tutor contact documents. The database must mathematically enforce the **SafeSport Moat** and **Sport-Containment Boundary** natively within Firestore Rules [cite: 271].

---

### ⚡ PILLAR 3: SIDELINE WEATHER SAFETY & EMERGENCY AUTO-LOCKOUTS

#### **1. Tomorrow.io Lightning Proximity Radar (Verified)**
*   **Audit Find:** The real-time Tomorrow.io lightning webhook processor successfully parses coordinates and flags reservation states [cite: 224]. Playwright automated checks (`tests/ultimate-war-room.spec.ts`) accurately verify the lockout mechanics under headed browser simulation.

#### **2. Lockout State Persistence (Gapped)**
*   **Audit Find:** The active 30-minute weather lockout is maintained exclusively as an ephemeral, client-side memory state [cite: 224].
*   **Gap Remaining:** If a coach refreshes their browser, restarts their mobile phone, or loses internet connectivity on the pitch during a lightning storm, the safety countdown is wiped out [cite: 224]. Upon reconnecting, the SVG tactical canvas will mistakenly unlock, allowing on-field play to resume in violation of severe weather policies [cite: 224].
*   **Fix Required:** The lockout timestamp and threat distance must be written to the active Firestore Team Document on trigger, forcing the Svelte engine to poll and lock the layout against the server clock [cite: 224].

---

### 💳 PILLAR 4: FINANCIAL MECHANICS & DUAL-TRACK STRIPE CONNECT

#### **1. Monetization Split Accuracy (Gapped)**
*   **Audit Find:** SSTracker charges $0 upfront, routing payments through **Stripe Connect Destination Charges** with a strict 95/5 split (95% to the tutor, 5% to the platform) [cite: 187, 271].
*   **Gap Remaining:** While Svelte’s `TutoringCheckoutEngine.svelte.ts` successfully triggers checkout redirect handshakes, the server-side Cloud Function (`createTutoringCheckoutSession`) lacks an automated, cryptographic validation of the currency amount and sport metadata [cite: 271].
*   **Risk:** A tech-savvy user could manipulate the client checkout payload and force-payout arbitrary amounts to custom accounts, creating an avenue for financial arbitrage and payment sync drift.

---

### 🛡️ PILLAR 5: COPPA 2.0 & MINOR DATA PRIVACY COMPLIANCE

#### **1. The PII Minimization Daemon (Gapped)**
*   **Audit Find:** Sstracker.app is bound to minimize minor PII by running a daily data minimization pass [cite: 47, 54, 250].
*   **Gap Remaining:** The 24-hour background PII shredder script does not check compliance exemptions [cite: 250]. 
*   **Risk:** If a coach submits their SafeSport compliance certification or mandated reporter upload, the background clean-up script will wipe their document, destroying legal audit logs [cite: 250]. We must explicitly isolate the `safesport_certificates` collections from the PII shredder daemon [cite: 250].

#### **2. Fan OS Minor Masking (Gapped)**
*   **Audit Find:** Fan OS provides real-time digital overlays ("Spot the Ball") for public match-day broadcasts [cite: 227].
*   **Gap Remaining:** The system does not dynamically inspect the age of players before rendering their biometric stats, telemetry, or full names [cite: 47, 250].
*   **Risk:** Publicly broadcasting location data and biometrics of minors under 18 violates COPPA 2.0 and California sports safety acts [cite: 47, 49, 250].

---

## 🛰️ PART 2: THE COMPREHENSIVE RECOVERY RESOLUTION PLAN

| Ref | Epic / Vault | Vulnerability / Gap | File Location | Resolution Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Pillar 1 (Svelte 5)** | Missing Null Guards on Profile Load [cite: 256] | `src/routes/(app)/+layout.svelte` | Add strict optional chaining (`userProfile?.role`) to prevent SSR 500 reference failures [cite: 256]. |
| **02** | **Pillar 1 (Svelte 5)** | Missing `untrack()` closures inside layout effects [cite: 256] | `src/routes/(app)/+layout.js` | Wrap all side-effect redirects inside `untrack()` wrappers [cite: 256]. |
| **03** | **Pillar 2 (Security)** | Vulnerable `isCleared` fallback inside rules [cite: 271] | `firestore.rules` | Remove the default-true override and enforce hard `request.auth.token.isCleared == true` verification [cite: 271]. |
| **04** | **Pillar 2 (Security)** | SafeSport Tutoring Marketplace leak [cite: 271] | `firestore.rules` | Enforce strict rule blocking: block Players from viewing tutor profiles, and enforce sport containment [cite: 271]. |
| **05** | **Pillar 3 (Weather)** | Lockout State Client-Side Volatility [cite: 224] | `src/lib/components/coach/grid/TacticalArena.svelte` | Read severe weather locks directly from Firestore Team Document timestamps to survive browser reloads [cite: 224]. |
| **06** | **Pillar 4 (Finance)** | Unguarded Stripe split payload parameters | `functions/src/domains/directorOnboarding.ts` | Force payment split math (95/5) to compile and execute server-side via the Admin SDK [cite: 271]. |
| **07** | **Pillar 5 (Privacy)** | SafeSport verification document wipeout [cite: 250] | `functions/src/domains/clearanceOps.ts` | Create an explicit database exemption preserving `safesport_certificates` from daily PII shredder passes [cite: 250]. |
| **08** | **Pillar 5 (Privacy)** | Minor PII Leakage during Livestreams [cite: 250] | `src/routes/(app)/fan/broadcast/+page.svelte` | Dynamic masking engine: check athlete age and replace minor details with generic initials & masked coordinates [cite: 47, 250]. |

---

## 🛠️ PART 3: THE CONSOLIDATED MASTER ORCHESTRATION PROMPT FOR JULES

To execute all the remaining structural fixes, verify the platform’s technical standards, and compile the entire codebase with exactly **0 errors and 0 warnings**, copy and paste the master prompt block below into [jules.google.com](https://jules.google.com) [cite: 256].

```markdown
**Task: Platform-Wide Technical Hardening & Pre-Launch Test Suite Execution**

@jules, we are executing our final launch-night deployment [cite: 219]. You are directed to perform a systematic, multi-pillar remediation audit across our entire repository to enforce the Vanguard Trinity Pattern [cite: 256], the B815 Hydration Guard [cite: 256], and Zero-Trust access bounds [cite: 256, 271].

All files and functions modified must adhere to our strict **80-line maximum block limit** [cite: 256].

---

### 🏛️ TASK 1: HARDEN SVELTE 5 REACTIVITY & ROUTING GATES
1.  **Harden Universal Guard (`src/routes/(app)/+layout.js`):**
    *   Re-engineer the routing guard to follow a strict order of operations: Spectator bypass check, Unauthenticated session redirect, Null-guarded profile role selection, and Purgatory clearance redirect [cite: 256].
    *   Enforce Svelte 5 strictness: Any client-side navigation inside `$effect` blocks MUST be wrapped inside `untrack(() => { ... })` closures to eliminate infinite rendering loops [cite: 256].
2.  **Add Optional Chaining Guards (`src/routes/(app)/+layout.svelte`):**
    *   Audit and guard all raw bindings fetching data from the injected `userProfile` layout node with optional chaining (`data.userProfile?.role`) to prevent null reference `500` server crashes during hydration [cite: 256].

---

### 🔒 TASK 2: HARDEN ZERO-TRUST FIRESTORE SECURITY RULES (`firestore.rules`)
1.  **Enforce Strict Default Clearance:**
    *   Modify helper functions inside `firestore.rules`. Completely remove any request fallback defaults (such as `get('isCleared', true)`) [cite: 271].
    *   The clearance check must strictly evaluate:
        `function isCleared() { return request.auth.token.isCleared == true; }` [cite: 271].
2.  **Harden the SafeSport Tutoring Moat:**
    *   Gaurd the `/tutors/{tutorId}` collection [cite: 271]. Ensure reading a tutor profile strictly blocks any authenticated user with `role == 'player'` [cite: 271].
    *   Implement the sport-containment boundary: A reading user's profile sport value in `/users/{userId}` must match the target tutor's sport value [cite: 271].

---

### ⚡ TASK 3: IMPLEMENT WEATHER LOCKOUT & THE STRIPE DESTINATION SPLITS
1.  **Implement Sideline Lockout State Persistence:**
    *   Update the Tomorrow.io webhook receiver inside `functions/src/domains/weatherOps.ts` to write a high-fidelity lockout timestamp to the target Firestore `teams/{teamId}` document on strike detection [cite: 224].
    *   Configure `TacticalArena.svelte` to read this document. If current time is less than 30 minutes from the strike timestamp, render the Red Lockout HUD and freeze all spatial canvas drag events [cite: 224].
2.  **Harden Stripe Connect split checks:**
    *   Inside `createTutoringCheckoutSession` Cloud Function, secure the transaction split math: lock tutor payouts strictly to 95% and the platform fee strictly to 5% server-side, blocking any client payload parameter overrides [cite: 271].

---

### 🛡️ TASK 4: PROTECT MINOR DATA & RESTORE LEGACY TEST ALIGNMENT
1.  **Establish Daily PII Shredder Exemption:**
    *   Locate the background cleanup script (`functions/src/domains/clearanceOps.ts`) and create an explicit database exemption protecting the `safesport_certificates` records from daily data-minimization passes [cite: 250].
2.  **Implement Fan OS Livestream Masking:**
    *   Inside `src/routes/(app)/fan/broadcast/+page.svelte`, write a reactive masking filter [cite: 227]. If the active athlete's age is under 18, replace their full name with initials and mask live coordinates from the public broadcast layout [cite: 47, 250].
3.  **Restore Broken Legacy Test Suites:**
    *   Harden mock JWT tokens in `tests/firestoreTenantIsolation.test.ts` and `tests/firestoreRulesSprint412.test.ts` by appending explicit `'isCleared': true` claims [cite: 271].
    *   Correct the `workspaceNav.js` mapping mismatch to direct `War Room` cleanly to `/coach/tactical`.
    *   Reconstruct `src/routes/(app)/coach/dashboard/+page.svelte` using our fluid `.bento-grid-container` structure [cite: 72].

---

### 🧪 TASK 5: SYSTEM INTEGRATION VALIDATION RUN
1.  Execute Svelte 5 compilation and strict TS check [cite: 256]:
    `pnpm run check`
2.  Verify the complete test runner across Vitest and Playwright [cite: 219]:
    `npx vitest run firestoreTenantIsolation firestoreRulesSprint412`
    `npx playwright test tests/ultimate-war-room.spec.ts`
3.  Ensure **0 compiler errors, 0 warnings, and 100% green test results** before committing with:
    `style: perform comprehensive security and routing recovery audit` [cite: 256].
```
