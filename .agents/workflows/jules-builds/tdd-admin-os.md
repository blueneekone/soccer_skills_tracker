---
name: tdd-admin-os
description: Master production-ready specification to audit, secure, and stabilize the Global Admin Command Plane (Z4). Focuses strictly on backend logic and database security.
---

# 🛰️ SSTracker Master Specification: Global Admin OS (Command Plane)

@jules, act as our joint task force consisting of the Chief Security Officer (CSO) and the Chief Software Architect (CSA). Execute this exhaustive functional audit and database lock. You must ignore all styling, animations, and non-logical visual layouts.

This build is gated by our strict **Pessimistic Definition of Done**: 0 Svelte compiler errors, 0 TypeScript 'any' violations, and 100% green unit tests.

---

### 🛡️ Critical Architectural Constraints (Non-Negotiable)

1. **80-Line Function Limit**: No function body may exceed 80 lines. Extract complex processing or lookup tables to helpers in `functions-platform/src/domains/` or `src/lib/utils/adminHelpers.ts`.
2. **Defensive Hydration (B815)**: Wrap all raw Firestore 'getDocs' and 'onSnapshot' queries in:
   `if (!db || !authStore.isAuthenticated) return;`
3. **Pessimistic Definition of Done**: You are strictly forbidden from opening a PR until the Svelte 5 compiler yields 0 warnings and TypeScript returns 0 errors.

---

### ⚙️ Complete Backend Feature Matrix & APIs

You must audit and fully implement the functional codebases across these Svelte routes: `dashboard`, `overview`, `organizations`, `users`, `recruiters`, `sports-configs`, `support-terminal`, `system-settings`, `audit-log`, `interoperability`, `rebates`, `rl-policy`.

#### 📂 Collection 1: Multi-Tenant Cell Registry & Scoping (CTO/CSA)
*   **Target**: `functions-platform/src/domains/cellRegistry.js`
*   **APIs**: `bootstrapCellRegistry`, `registerDedicatedCell`, `activateCell`, `provisionTenantCell`, and `peekTenantCell`
*   **Security**: Direct un-scoped database queries are banned. All database calls must resolve via isolated cell IDs (`getActiveDb() / getAdminDb(cellId)`).

#### 📂 Collection 2: Asynchronous Cell Migrations (CSA)
*   **Target**: `functions-platform/src/domains/cellMigration.js`
*   **APIs**: `startTenantMigration`, `markExportComplete`, `markImportComplete`, `verifyTenantOnCell`, `executeCutover`, and `rollbackTenantMigration`
*   **Security**: Ensure transitions execute as multi-user writeBatch transactions capped at exactly **500 operations per batch** to prevent quota exhaustion.

#### 📂 Collection 3: API Gateway & Cache Purging (CTO)
*   **Target**: `functions-platform/apiGateway.js`
*   **APIs**: Gateway routing table on `/v1` and memory cache clearing via `purgeGatewayCaches`.

#### 📂 Collection 4: Sports Configuration Engine (CTO)
*   **Target**: `src/lib/services/sportsConfigs.ts`
*   **APIs**: Create, edit, and audit sport-specific rules, parameters, icon assets, and projection constants under the `sports_configs` collection.

#### 📂 Collection 5: Enterprise Licensing & Partner Rebates (CSA/CSO)
*   **Target**: `functions-commerce/`
*   **APIs**: Implement `generateLicense` to mint multi-seat organization license keys. Secure hotel partner rebates using `submitHotelRebateRecord` and `approveHotelRebatePayout`.

#### 📂 Collection 6: Custom Claims, Impersonation & Audit Trails (CSO/CSA)
*   **Target**: `functions-platform/src/domains/claimsOps.js`
*   **APIs**: `syncUserClaims`, `assignTenantClaims`, `impersonateUserFn`, and `repairUserClaims`
*   **Security**: `impersonateUserFn` must verify caller credentials before generating a custom token using `admin.auth().createCustomToken(uid)`. Atomically log all role changes and elevations to the `security_audits` collection (SIEM log trail).

#### 📂 Collection 7: PII Shredding Cascade (CSO)
*   **Target**: `scripts/triggerRightToBeForgotten.cjs`
*   **APIs**: `shredSensitiveData` callable Cloud Function in `functions-compliance/`
*   **Security**: On user request, run a cascading `writeBatch` deletion on profiles and assignments.
*   **Hard Safeguard**: Inject an early return to strictly bypass deletion if `clubId === 'aggies-fc'` or email ends with `@aggiesfc.com` to protect the CEO's personal assets. Exempt `consent_logs` and `consent_records` (COPPA 2.0 legal audit trails).

---

### 🎨 Part 3: Svelte 5 Visual & Layout Controls

*   **Anti-Squish Bento Grids**: Force all layout containers under `/admin/` to use:
    `style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"` with child elements enforcing `tw-min-w-0` to block visual layout shifts.
*   **Universal Table Standard**: Force tables under organizations/users to use opaque Navy Slate backgrounds, crisp 1px borders in Structural Grey (`#334155`), and tabular alignment in Geist Mono (`tw-font-mono`).
*   **No Gamification**: Sharp 90-degree corners are mandatory. No chamfers or yellow accents are permitted on Admin OS views.

---

### 🚦 Test & Handover

1. Run Svelte compilation checks: `pnpm run check && pnpm run build`.
2. Run targeted tests: `pnpm test functions/admin`.
