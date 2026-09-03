1. **Move Stripe Helpers & Isolations**: Done and verified.
2. **Boot Safety Protocol & Sandbox Execution**: Done and verified.
3. **Update `functions-commerce/index.js`**: Done and verified.
4. **Test updates for camelCase (`subscriptionStatus`)**: Done and verified.

5. **Director Onboarding Logic (Dual-Track)**:
   - The user has provided an explicit command to implement `initializeIndependentDirector` and `initializeGovernedDirector` in `functions-compliance/src/domains/directorOnboarding.js` (or similar pathways) and export them.
   - Flow A: `initializeIndependentDirector`
     - Generate a new `tenantId` and `clubId`.
     - Write to `organizations/{tenantId}` and `clubs/{clubId}` atomically.
     - Trigger Connect (create a Stripe account with metadata `tenantId`).
     - Secure using `assertDirectorOrSuper`.
   - Flow B: `initializeGovernedDirector`
     - Parse and validate the single-use invite token.
     - Fetch the Commissioner's `tenantId`.
     - Securely nest the newly generated `clubId` beneath the master `tenantId` (write to `clubs/{clubId}` with `tenantId: masterTenantId`).
   - Structural constraints:
     - 80 lines max.
     - Lazy load Stripe/Admin SDKs.
     - Atomic batch limit 500.
     - Export them cleanly from `functions-compliance/index.js`.

6. **Testing and Verification**:
   - Make sure `pnpm run test:functions-deploy` is entirely green.
   - Resolve any remaining failures in `pnpm run test` or `pnpm run check`.
   - Complete Pre-commit checklist (`pre_commit_instructions`).
   - Finally submit the PR.
