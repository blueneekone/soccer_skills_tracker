# Jules Sprint 5.2: Multi-Tenant Custom Claims & Cell Boundary Gates

## Objectives
Your task is to implement the Multi-Tenant Custom Claims and Cell Boundary Gates for Phase 5 of the SSTracker Architecture.
1. Implement test suite `tenantClaimsBoundary.test.ts` to enforce zero cross-tenant leakages.
2. Update the backend Firebase rules or backend custom claim validators to strictly scope database mutations and reads by `tenantId` / `clubId` via the token claims.
3. Validate that "God-mode" analytics metrics are strictly scoped by regional boundaries and cannot leak across tenants.

## Constraints & Requirements
- **Rule Adherence**: You MUST strictly adhere to the `AGENTS.md` boundaries (e.g. `request.auth.token.clubId == clubId`).
- **Defensive Hydration**: Any new data access must include the B815 defensive hydration check `if (!db || !authStore.isAuthenticated) return;`
- **Zero-Trust**: Ensure client-side mutation functions are fully blocked or validated server-side to prevent unauthorized impersonation of custom claims.
- **TDD Mandate**: You MUST ensure that the test `tenantClaimsBoundary.test.ts` runs 100% green with 0 compiler errors.

## Definition of Done
When `npm run test` executes against the new test suite, it must return 100% green. Execute Svelte checks and typescript compilation and ensure 0 errors.

End of instructions.
