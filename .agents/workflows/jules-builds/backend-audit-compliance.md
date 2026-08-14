# JULES BACKEND PIPELINE: COMPLIANCE & IDENTITY (PARENT, PLAYER, ADMIN)
## Codebase Target: `functions-compliance/`
## Domain: SafeSport Shadow CC, COPPA 2.0 VPC, WebAuthn Passkeys, Checkr Clearance, Minor PII TTL Shredder

### Critical Architectural Constraints:
1. **SafeSport Shadow CC Mandate:** All squad and player communication triggers must ensure direct 1:1 adult-to-minor channels are blocked, automatically injecting `ccParentEmails` into dispatch metadata.
2. **COPPA 2.0 Verifiable Parental Consent (VPC):** Data collection callables must strictly gate on verified parent tokens before activating minor tracking.
3. **PII Vault & 24h Shredder:** Automated cron jobs must shred inactive PII in `users` and `passports` after 24h while preserving legal audit trails in `consents`.
4. **80-Line Function Limit:** Split heavy cryptographic or Checkr webhook processing into `src/domains/` utilities.

### Target Handlers to Audit in `functions-compliance/`:
- `vaultSealPii`, `vaultUnsealPii`, `shredSensitiveData`
- `sendParentalConsentEmail`, `verifyParentalConsent`, `parentGrantVpcConsent`, `parentSignCoppaWaiver`, `generateConsentAttestationChallenge`, `attestParentalConsent`
- `webauthnRegisterStart`, `webauthnRegisterFinish`, `webauthnLoginStart`, `webauthnLoginFinish`
- `generateCheckrEmbedToken`, `checkrSessionTokens`, `backgroundCheckCallback`, `checkrWebhook`, `directorInitiateCoachClearance`, `directorOutOfBandClearance`, `revokeCoachClearance`
- `enqueueMinorRetentionPurge`, `processMinorRetentionQueue`, `purgeExpiredMinorData`
- `parentProvisionOperative`, `parentLinkOperativeToTeam`, `parentReconcileHousehold`, `operativeSignInWithDispatch`, `generatePlayerOTP`, `validatePlayerOTP`

### Verification Steps:
1. Run `node scripts/smoke-require-codebase.cjs compliance` — must return OK.
2. Run targeted tests:
   `node --test functions/__tests__/complianceCheckr.guard.test.js`
   `node --test functions/__tests__/complianceOpsVpc.test.js`
   `node --test functions/__tests__/egressGuard.test.js`
3. Verify all compliance tests pass 100% green.

### Commit:
Commit with message: `audit(backend-compliance): verify SafeSport shadow CC, COPPA 2.0 VPC, and PII TTL shredder`
