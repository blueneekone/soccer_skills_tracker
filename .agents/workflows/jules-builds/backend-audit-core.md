# JULES BACKEND PIPELINE: CORE OS (COACH & DIRECTOR OPERATIONS)
## Codebase Target: `functions-core/`
## Domain: Training Operations, Tryouts, Rosters, Club Eligibility Matrix, NGB State Export

### Critical Architectural Constraints:
1. **80-Line Function Limit:** No function handler in `functions-core/` may exceed 80 lines. Heavy logic must be extracted into `functions-core/src/domains/` or `functions-shared/`.
2. **Zero-Trust Multi-Tenancy:** Verify that all team, roster, and tryout writes enforce `request.auth.token.clubId == clubId` or require verified `super_admin`/`director` claims.
3. **No Global-Scope Network Calls:** All external SDK initializations must reside strictly inside function execution blocks.
4. **Codebase Boundary:** NEVER write imports across codebase boundaries (e.g., importing from `functions-rl` or `functions-compliance`).

### Target Handlers to Audit in `functions-core/`:
- `logTrainingSession`, `submitCompletionProof`, `parentReviewCompletionProof`
- `secureDeployIntent`, `secureCancelIntent`, `secureExtendIntent`
- `upsertTryoutProgram`, `getPublicTryoutProgram`, `registerForTryout`, `upsertTryoutSession`, `assignTryoutSession`, `setTryoutSessionRsvp`, `checkInTryoutRegistration`, `submitTryoutEvaluation`, `promoteTryoutToRoster`, `dispatchTryoutComms`
- `upsertClubEligibilityMatrix`, `getClubEligibilityMatrix`
- `exportStateRoster`, `listNgbExportFormats`

### Verification Steps:
1. Run `node scripts/smoke-require-codebase.cjs core` — must return OK.
2. Run targeted tests: `node --test functions/__tests__/coachRosterIngestOps.test.js` and any related core tests.
3. Verify zero TypeScript/Lint violations.

### Commit:
Commit with message: `audit(backend-core): enforce zero-trust multi-tenancy and 80-line limits on core functions`
