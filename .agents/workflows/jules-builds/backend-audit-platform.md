# JULES BACKEND PIPELINE: PLATFORM & CELL GATEWAY (ADMIN & COMMISSIONER)
## Codebase Target: `functions-platform/`
## Domain: API Gateway (/v1), Multi-Tenant Cell Provisioning & Cutover, Custom Claims Sync, Support Terminal, Security SIEM

### Critical Architectural Constraints:
1. **Multi-Tenant Cell Isolation:** All database calls must resolve the tenant's isolated cell ID (`getActiveDb()` / `getAdminDb(cellId)`). Direct un-scoped database queries are banned.
2. **Zero-Trust Custom Claims:** `syncUserClaims`, `assignTenantClaims`, and `impersonateUserFn` must strictly verify caller credentials before mutating custom claims tokens.
3. **80-Line Function Limit:** API gateway routing tables and cell migration orchestration must be factored into `cellMigration.js`, `cellRouter.js`, and `src/domains/`.
4. **Security SIEM Audit:** All administrative overrides, role elevations, and user purges must atomically write to `security_audits`.

### Target Handlers to Audit in `functions-platform/`:
- `apiGateway`, `purgeGatewayCaches`
- `bootstrapCellRegistry`, `registerDedicatedCell`, `activateCell`, `provisionTenantCell`, `peekTenantCell`
- `startTenantMigration`, `markExportComplete`, `markImportComplete`, `verifyTenantOnCell`, `executeCutover`, `rollbackTenantMigration`
- `flagTenantForPromotion`, `acknowledgePromotionFlag`, `evaluateCellPromotions`
- `syncUserClaims`, `assignTenantClaims`, `impersonateUserFn`, `repairUserClaims`, `updateUserRole`
- `logSecurityAudit`, `generateLicense`, `directorSaveClubBranding`, `directorInviteCoach`, `claimCoachInvite`
- `secureAllocateTeamSeats`, `secureAddPlayer`, `secureBulkAddPlayers`, `secureRemovePlayer`, `secureUpdateJersey`, `directorUpsertField`, `secureBookField`
- `onAnalyticsUserWritten`, `onAnalyticsClubWritten`, `onAnalyticsLicenseWritten`

### Verification Steps:
1. Run `node scripts/smoke-require-codebase.cjs platform` — must return OK.
2. Run targeted tests:
   `node --test functions/__tests__/claimSyncParity.guard.test.js`
   `node --test functions/__tests__/ironVaultRBAC.test.js`
3. Verify all platform tests pass 100% green.

### Commit:
Commit with message: `audit(backend-platform): enforce cell isolation, claims sync parity, and SIEM security logging`
