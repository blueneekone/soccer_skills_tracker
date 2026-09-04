---
name: admin-os-gap-remediation
description: Implement System Maintenance Kill Switch, Cell Migration HUD, Stripe Entitlement Reconciliation, Ingestion Exception Replay, and Origin Verification Tabs inside the Admin OS.
---

# 🛰️ SSTracker Admin OS Global Gap Closure Specification (v1.0)

@jules, act as our joint **Chief Software Architect (CSA)**, **Chief Security Officer (CSO)**, and **Lead Frontend Architect**. Your objective is to build, secure, and integrate the five missing launch-day operational tools inside the Global Admin OS (Z4 Command Plane) split codebase. 

---

### 🛡️ Part 1: Global Architectural Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No single function body (Svelte component markup, SvelteKit loader, serverless callable, or script helper) may exceed 80 lines. Extract database queries, permission assertions, and transactional calculations to isolated utility modules.
2. **Universal Admin Gate**: All server-side endpoints, layouts, and callable functions added under this specification must assert super-administrative privileges immediately at entry:
   `assertDirectorOrSuper(context);` or equivalent server-side claim verification.
3. **Pessimistic Definition of Done**: Exactly 0 Svelte compiler errors, 0 SvelteKit hydration exceptions, 0 TypeScript "any" type violations, and 100% green test runs under our Vitest harness.

---

### 🛠️ Part 2: Execution Sequence & Targets

#### Task 1: Global System "Kill Switch" & SSR Maintenance Interceptor
*   **Targets**: `src/hooks.server.ts` and `src/routes/maintenance/+page.svelte`
*   **Action**: Implement an isomorphic, zero-leak server-side interceptor:
    1. During SvelteKit's server request cycle (`hooks.server.ts`), query the Firestore config path `/platform_config/maintenance`.
    2. Cache this state in memory using an ephemeral 5-second TTL variable to prevent Firestore read quota exhaustion under high traffic.
    3. If `maintenanceMode === true` and the user does not possess the `admin` custom claim, intercept the request and redirect immediately with an HTTP 307 temporary redirect to `/maintenance`.
    4. Implement `/maintenance/+page.svelte` utilizing a high-contrast, offline-styled layout (90-degree corners, Amber colors, and a real-time count down tracker).

#### Task 2: Multi-Tenant Cell Migration Console
*   **Target**: `src/routes/admin/cell-migrations/+page.svelte`
*   **Action**: Scaffold a visual monitor and controller inside our asymmetric Bento Grid layout:
    1. Bind responsive grid cards (`lg:tw-col-span-6`) to list existing tenant cells and active migration tasks.
    2. Wire up buttons to execute server-side callable commands: `provisionTenantCell`, `executeCutover`, and `rollbackTenantMigration`.
    3. Track and display the active transfer speed, row migration progress (processed/total), and cell resource thresholds using micro-polling or Firestore real-time snapshots.

#### Task 3: Stripe Connect Sub-Ledger Dispute & Entitlement Reconciliation Panel
*   **Target**: `src/routes/admin/billing-reconciliation/+page.svelte`
*   **Action**: Construct a payment audit and manual reconciliation tab:
    1. Display discrepancy rows where current active seat allocations do not align with Stripe metadata records.
    2. Provide a single-click server-side administrative override button: **"Force Entitlement Sync"**.
    3. When triggered, this invokes `reconcileSubscriptionEntitlements` server-side, which queries the live Stripe subscription API and programmatically updates the `/license_entitlements/{clubId}` seat capacity, bypassing client-side parameters.

#### Task 4: "The Vampire Importer" Ingestion Replay and Exception Queue
*   **Target**: `src/routes/admin/interoperability/+page.svelte`
*   **Action**: Build a visual dashboard to repair and replay corrupt roster uploads:
    1. Subscribe to the `/roster_ingestion_exceptions/` Firestore collection to list rows that failed schema validation or encountered parsing exceptions.
    2. Provide an inline, editable modal allowing you to correct malformed parent emails, edit minor date-of-birth entries, or assign team bindings directly from the screen.
    3. Implement a **"Replay Row"** batch execution tool that bundles corrected records and pushes them through our serverless intake parser in transactions strictly capped at **500 writes**.

#### Task 5: Live Cryptographic Origin & WebAuthn Health Check Tool
*   **Target**: `src/routes/admin/security-diagnostics/+page.svelte`
*   **Action**: Build a cryptographic alignment validator:
    1. Dynamically read and display the environment variable config flags: `WEBAUTHN_RP_ID` and `WEBAUTHN_RP_ORIGIN`.
    2. Compare these configuration values against SvelteKit's active client-side origin (`window.location.origin`) and the incoming request headers.
    3. Render a highly visible **Red-Alert Banner** if there is a mismatch (e.g., origin is running on `localhost:5173` but relying party is locked to `sstracker.com`), preventing browser-level `SecurityError` DOMExceptions from blocking onboarding.

---

### 🧪 Part 3: TDD Verification Harness

You must write or extend the integration test suite under `tests/adminGapClosure.spec.ts` to assert:

1. **Maintenance Hook Gate**: Mocking `maintenanceMode = true` in Firestore successfully blocks a coach or parent from accessing `/dashboard`, and routes them to `/maintenance` with a 307. Admins must retain access.
2. **Replay Queue Transaction limits**: Verifying that batch replay mutations under the interoperability panel strictly throttle and commit under the 500-document transaction cap.
3. **Entitlement Reconciliation**: Asserting that triggering the override button executes the server-side callback and mutates the `/license_entitlements/` table cleanly.

---

### 🚀 Part 4: Jules Headless Cloud Execution Loop

Run targeted validation sweeps before deploying your final PR:
```bash
# 1. Sync structures
pnpm exec svelte-kit sync

# 2. Run lint and Svelte type verification
pnpm run check

# 3. Execute new Admin OS gap closure tests
pnpm test admin-gap-closure
```
Open the Pull Request targeting the `dev` branch only after your test suite executes with 100% green status and exactly zero skipped assertions.
