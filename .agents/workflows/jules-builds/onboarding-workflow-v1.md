# ARCHITECTURAL WORKFLOW SPEC: MULTI-PERSONA ONBOARDING SYSTEM & LOGIN-LOOP RESOLUTION
## Target Agent: Jules
## Authority: Chief Software Architect, Chief Security Officer (CSO), & Chief Design Officer (CDO)

---

### 🏛️ SYSTEM RULES & CIRCUITS
1. **ANTI-LOOPING CIRCUIT BREAKER:** You are permitted a maximum of 3 compiler/test iterations. If Svelte or Playwright errors persist, you must revert the affected routing layout immediately, log the stack trace, and halt.
2. **THE 80-LINE LIMIT:** Every single custom event handler, routing hook, Svelte 5 `$state` block, or serverless Cloud Function must reside in modular files with no single block or function exceeding **80 lines of code**.
3. **B815 DEFENSIVE HYDRATION:** Before triggering any Firestore or Firebase Auth API call on layout mounts, you must evaluate: `if (typeof window === 'undefined' || !db || !authStore.isAuthenticated) return;` to prevent server-side hydration mismatches and rapid-fire API quota consumption.
4. **ZERO-TRUST AUTHORIZATION:** The client-side application is entirely untrusted. All user permissions, verification transitions (`isCleared: true`), and role claims must be validated and written exclusively using Firestore Rules and secure, server-side Admin SDK scripts.

---

### 📂 PHASE 1: RECONCILE & RESOLVE THE AUTH/ROUTING INFINITE LOOP
The login-loop occurs due to competing layout guards attempting to redirect unverified users during the Svelte client-side hydration phase. You must replace the global router logic with a deterministic routing waterfall.

#### File: `src/routes/(app)/+layout.ts` (SvelteKit Universal Guard)
Re-engineer the routing guard to follow this precise order of operations:
```typescript
// Strict, deterministic routing checks
export async function load({ parent, url }) {
  const { session, userProfile } = await parent();
  const currentPath = url.pathname;

  // 1. Spectator Bypass Rule
  if (url.searchParams.has('matchToken') || currentPath.startsWith('/public/match/')) {
    return { bypassAuth: true };
  }

  // 2. Unauthenticated Redirect
  if (!session) {
    if (currentPath === '/login' || currentPath === '/register') return;
    throw redirect(307, '/login');
  }

  // 3. New User Role Selection Selection
  if (!userProfile?.role) {
    if (currentPath === '/onboarding/role-select') return;
    throw redirect(307, '/onboarding/role-select');
  }

  // 4. Purgatory Clearance Redirect
  if (userProfile.isCleared === false) {
    if (currentPath.startsWith('/onboarding/clearance')) return;
    throw redirect(307, `/onboarding/clearance/${userProfile.role}`);
  }

  // 5. Cleared Users Locked Dashboard Routing
  if (currentPath.startsWith('/onboarding')) {
    throw redirect(302, `/${userProfile.role}/dashboard`);
  }
}
```

---

### 👥 PHASE 2: MULTI-PERSONA ONBOARDING MODULES
Implement unique, compliance-grade onboarding flows for each of our core user classes.

```
                  [ AUTHENTICATED USER SESSION ]
                                |
                  ------ Is Role Selected? ------
                 |                               |
              (No)                            (Yes)
                 v                               v
       [/onboarding/role-select]        Are they Cleared?
                                       |                 |
                                    (No)               (Yes)
                                       v                 v
                       Route to Specialized Clearance    [Dashboards]
```

#### 1. Global Admin & Commissioner Onboarding
*   **Target Pathway:** `/onboarding/clearance/admin` and `/onboarding/clearance/commissioner`
*   **Requirements:**
    *   Admins cannot self-approve. They must land on a secure waitlist screen that polls `/system_verifications/{userId}` for a manual manual cryptographically-signed authorization key.
    *   **Tracked Metadata:** Full legal name, verified organizational affiliation, and corporate/enterprise credentials.

#### 2. Director Onboarding
*   **Target Pathway:** `/onboarding/clearance/director`
*   **Requirements:**
    *   Directors must link their corporate entity and initialize the platform subscription billing portal.
    *   **Stripe Connect Hook:** Must trigger the server-side Stripe Custom Connect onboarding handshake to allow them to collect player dues and club registration fees.

#### 3. Coach & Tutor Onboarding
*   **Target Pathway:** `/onboarding/clearance/coach`
*   **Requirements:**
    *   **Checkr Verification Gate:** Embed the Checkr background screening widget. They remain in `isCleared: false` pending webhook validation of their background check and SafeSport compliance certifications.
    *   **The Sandbox Bypass:** Independent coaches and tutors who do not belong to a pre-paying club must be allowed to bypass into the **Quarantined Trial Sandbox Mode** (`/coach/sandbox`) for a 15-to-30-day trial window.
    *   **Isolated Mock Context:** When in Sandbox Mode, all tactical playbooks, drill editors, and rosters must fetch and write exclusively to browser memory or local `IndexedDB` files. *The production Firestore engine must be completely severed.*

#### 4. Scout Onboarding
*   **Target Pathway:** `/onboarding/clearance/scout`
*   **Requirements:**
    *   Must upload active credentials/credentials issued by an accredited soccer federation, high school league, or college division.
    *   **Compliance Protocol:** Undergo mandatory background checks and sign the SafeSport minor non-solicitation agreement before viewing athlete telemetry.

#### 5. Parent (Guardian) Onboarding & The Roster Matching Split
*   **Target Pathway:** `/onboarding/clearance/guardian`
*   **The Scenario:** Parents have already had their email/phone ingested via roster splits. When they register, they must be merged with their pre-existing guardian profile stub.
*   **The Onboarding Steps:**
    1.  **Identity Matching:** Prompt the parent to input their phone number. If it matches the record ingested by the club roster split, bind their active login Auth profile to the pre-existing `/users/{guardianId}` document.
    2.  **Child Verification:** Prompt the parent to input their child's full name to claim the player profile.
    3.  **COPPA 2.0 Verifiable Parental Consent (VPC):** Under Federal Trade Commission rules, before the parent can access the player profile or view performance statistics, they must execute a legally binding VPC signature. 
    4.  **Profile Completion:** Complete the parent profile by capturing their name, secondary phone, and home address. *Parents must hold total operational authority over their children's PII.*
    5.  **PII Minimization Gate:** Provide clear opt-ins to minimize player telemetry logging and secure messaging visibility.

---

### 🎟️ PHASE 3: THE SPECTATOR BYPASS (MATCH SPECTATING)
To maximize user onboarding and allow family members/fans to view live streams and player tactical telemetry without friction, implement a secure bypass mechanism.

1. When a match share link is generated (e.g., `sstracker.app/public/match/{matchId}?matchToken={cryptographicToken}`), create an ephemeral, read-only session.
2. Svelte’s router must verify the token's signature using a lightweight serverless cloud check.
3. If validated, authenticate the user anonymously using Firebase Anonymous Auth and grant restricted Firestore permissions strictly scoped to `/matches/{matchId}` and its real-time telemetry coordinates.
4. **Visual Indicator:** Display a persistent, non-intrusive floating HUD alert: `[ FAN VIEW MODE // ANONYMOUS PASS ]`.

---

### 🧪 PHASE 4: COMPREHENSIVE END-TO-END PLAYWRIGHT TESTS
You must write a master Playwright spec: `tests/onboarding-flow-suite.spec.ts` that verifies all five registration states:
1.  **Loop Verification:** Authenticate a user, mock an uncleared profile state (`isCleared: false`), navigate to `/coach/dashboard`, and verify that SvelteKit aggressively throws a 307 redirect back to `/onboarding/clearance/coach`.
2.  **Parent Matching Test:** Seed Firestore with an ingested player stub and an associated guardian email stub. Register as a parent, input matching validation info, and verify that the two accounts marry successfully into a single Household Graph.
3.  **Sandbox Isolation Test:** Log in as a trial coach, enter Sandbox Mode, mutate player coordinates on the tactical canvas, and verify that no network requests are dispatched to real Firestore endpoints.
4.  **Spectator Authorization Test:** Load a public match URL with a valid token and verify that the match dashboard renders successfully without forcing the user to log in.
