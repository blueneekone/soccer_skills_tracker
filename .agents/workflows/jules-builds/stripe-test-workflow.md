### Workflow: Jules — Robust Stripe Connect & Commerce Flow TDD Verification
**Owner**: Google Jules (Cloud VM Sandbox)  
**Priority**: P0 — CRITICAL LAUNCHGATE  
**Persona Context**: Chief Security Officer (CSO) & Lead Architect  
**Constraint Alignment**: @GEMINI.md (Zero-Trust, 80-line function limits, 500-max batching)

---

#### 🏛️ Part 1: Objectives & Scope
This workflow enforces strict Test-Driven Development (TDD) validation against the Stripe Connect Direct Charges payment pipeline. It isolates the commerce engine from client-side manipulation and ensures the platform's transaction-based monetization models run flawlessly on the emulated server without direct visual dependencies.

---

#### 🛠️ Part 2: Execution Protocol for Jules

##### Step 1: Audit & Align Types
*   **Target File**: `src/lib/types/commerce.ts` (or equivalent types directory)
*   **Task**: Verify and enforce clean TypeScript schemas for transaction payloads.
*   **Rule**: Under no circumstances should client-side payloads dictate transaction splits or fee calculations.

##### Step 2: Establish the Stripe TDD Harness
*   **Target File**: `functions/src/domains/__tests__/stripeCommerce.test.ts`
*   **Task**: Before modifying or deploying functions, write comprehensive backend Vitest suites that assert:
    1.  **Unauthenticated Block**: Any request to initialize a Stripe Checkout Session without a valid Firebase Auth token must throw an explicit `401 Unauthenticated` exception.
    2.  **Fee Calculation Integrity**: Assert that the checkout payload constructed for the connected Standard Account dynamically calculates and injects the correct `application_fee_amount` on `stripe.checkout.sessions.create()`, matching our $0 platform base fee model.
    3.  **Webhook Validation**: Emulate Stripe signature header headers and fire a mock `checkout.session.completed` event at the webhook function. Assert that it processes cleanly and returns a `200 OK`.
    4.  **Database Entitlement Hydration**: Assert that upon processing `checkout.session.completed`, the webhook successfully mutates the Firestore `entitlements` collection for the corresponding `tenantId`/`clubId`, granting access without manual intervention.

##### Step 3: Implement & Validate the Payment Engine
*   **Target File**: `functions/subscription.js` (and linked Cloud Functions)
*   **Task**: Implement or refactor the checkout creation and webhook listener functions to satisfy Step 2's test assertions.
*   **80-Line Limit Check**: If the webhook parser or checkout payload builder exceeds 80 lines of code, you MUST extract the calculations into pure helper modules in `functions/src/utils/stripeHelpers.ts`.

##### Step 4: Secure the Firestore Rules
*   **Target File**: `firestore.rules`
*   **Task**: Ensure the `entitlements` and `payments` collections are strictly read-only for clients:
    ```javascript
    match /clubs/{clubId}/entitlements/{docId} {
      allow read: if isAuthenticated();
      allow write: if false; // Server-only trigger
    }
    ```
*   **Zero-Trust Rule**: Direct client-side database writes to payment history, streak freezes, or billing tiers must be rejected with 100% mathematical certainty.

---

#### 🚦 Part 3: Compiler & Validation Sweep
1. Run `pnpm run check` and ensure 0 Svelte compilation errors.
2. Run the newly written tests: `pnpm test functions/commerce`.
3. Verify that the Critic-Augmented loop compiles and passes with zero warnings.
4. Push all passing changes to the `dev` branch and open a Pull Request with complete test logs.
