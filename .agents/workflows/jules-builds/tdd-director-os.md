---
name: tdd-director-os
description: Master production-ready specification to audit, secure, and stabilize the Director OS (B2B Revenue Engine). Focuses strictly on backend logic and database security.
---

# 🛰️ SSTracker Master Specification: Director OS (B2B Revenue Engine)

@jules, act as our Principal Backend Architect and Chief Technical Officer. Execute this targeted functional audit and Stripe Connect payment lock. You must ignore all styling, animations, and non-logical visual layouts.

This build is gated by our strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 TypeScript 'any' violations, and 100% green unit tests.

---

### 🛡️ Critical Architectural Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract CSV chunking or subscription mapping to helpers in `functions-commerce/src/domains/`.
2. **Batched Mutations**: Limit database writes to a maximum of 500 operations per Firestore transaction to prevent quota exhaustion.
3. **No Client-Side Calculation**: Stripe connect seats and payments must strictly use server-side triggers. Client-side math is banned.

---

### ⚙️ Complete Backend Feature Matrix & APIs

You must audit and fully implement the functional codebases across these Svelte routes: `dashboard`, `compliance`, `events`, `exceptions`, `scan`, `uplinks`.

#### 📂 Collection 1: "The Vampire Importer" CSV Roster Parser (CSA)
*   **Target**: `functions/src/domains/interoperabilityOps.js`
*   **APIs**: Ingestion pipeline for legacy rosters.
*   **Security**: Enforce writeBatch limits of 500, chunking N+1 queries up to 30 items with the 'in' operator to avoid performance blocks. Validate email and age constraints before committing.

#### 📂 Collection 2: Stripe Connect Connected Accounts & Entitlement Webhooks (CSA/CTO)
*   **Target**: `functions/subscription.js` and `functions-commerce/`
*   **APIs**: Connected account checkout session creation and Active Seat Calculation.
*   **Security**: Verify active seat entitlements are computed server-side via Stripe Webhook triggers. Update `subscriptionStatus` on the canonical organization collection.

#### 📂 Collection 3: Role-Verification Sanitizer & Bouncers (CSO)
*   **Target**: All Director callable functions inside `functions-commerce/`
*   **APIs**: Ensure every entry point utilizes `assertDirectorOrSuper` or `assertDirectorClubOrSuper` from auth middleware.

#### 📂 Collection 4: Logistics & Field Ops Weather Matrix (CTO)
*   **Target**: `src/routes/(app)/director/logistics/radar`
*   **APIs**: Integrate with Tomorrow.io lightning webhooks. Dynamically lock active routes and schedule calendars when facility weather locks are written.

---

### 🎨 Part 3: Svelte 5 Visual & Layout Controls

*   **Asymmetric 12-Column Grid**: Enforce a strict 12-column layout (8-column Primary for rosters, 4-column Sidecar for billing logistics) using clamp math to prevent card overlapping.
*   **Typography & Colors**: stats must render in Geist Mono (`tw-font-mono`). Apply color-coded compliance status dots (Green for nominal, Amber for caution, Red for warning) on the Compliance Tab. Flat 90-degree corners must be applied globally.

---

### 🚦 Test & Handover

1. Run Svelte compilation checks: `pnpm run check && pnpm run build`.
2. Run targeted tests: `pnpm test functions/vampire` and `pnpm test functions/commerce`.
