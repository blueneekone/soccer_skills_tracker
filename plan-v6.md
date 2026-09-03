1. **Move Stripe Helpers & Isolations**:
   - Use `replace_with_git_merge_diff` on `functions-commerce/src/domains/webhooksOps.js` to delete the extracted functions (`mapStripeSubscriptionStatus`, `seatsLimitForTier`, `syncSubscriptionStatusFromStripeObject`, `handleSubscriptionDeleted`, `handleCheckoutSessionCompleted`, and `handleStripeWebhookEvent`, and `stripeWebhook`).
   - Verify the lines were correctly removed using `cat functions-commerce/src/domains/webhooksOps.js | grep "stripeWebhook"`.
   - Verify the newly created helper logic by running `cat functions-commerce/src/utils/stripeHelpers.js` and checking that it implements the strict camelCase enforcement for `subscriptionStatus` and seats degradation.

2. **Boot Safety Protocol & Sandbox Execution**:
   - Verify `functions-commerce/src/domains/stripeWebhook.js` exists and contains the correct lazy-loading Stripe init logic by running `cat functions-commerce/src/domains/stripeWebhook.js`.

3. **Update `functions-commerce/index.js`**:
   - Use `replace_with_git_merge_diff` on `functions-commerce/index.js` to replace `exports.stripeWebhook = webhooksOps.stripeWebhook;` with `exports.stripeWebhook = require('./src/domains/stripeWebhook').stripeWebhook;`.
   - Verify the export is correctly linked with `cat functions-commerce/index.js | grep "stripeWebhook"`.

4. **Connected-Account Registration Mapping (`functions-compliance/src/domains/directorOnboarding.js`)**:
   - Verify `functions-compliance/src/domains/directorOnboarding.js` (which was already created via `cat`) is properly structured by using `cat`.
   - Use `replace_with_git_merge_diff` on `functions-compliance/index.js` to append `exports.mapDirectorStripeAccount = require('./src/domains/directorOnboarding').mapDirectorStripeAccount;` at the end of the file.
   - Verify the modification with `cat functions-compliance/index.js | grep "mapDirectorStripeAccount"`.

5. **Test updates for camelCase (`subscriptionStatus`)**:
   - Use `replace_with_git_merge_diff` on `src/lib/auth/billing.js` to change `ent.subscription_status` to `ent.subscriptionStatus`.
   - Use `replace_with_git_merge_diff` on `src/lib/enterprise/playerOsAccess.js` to change `licenseEntitlementSnap.subscription_status` to `licenseEntitlementSnap.subscriptionStatus`.
   - Use `replace_with_git_merge_diff` on `functions/__tests__/subscriptionGate.test.js` to enforce and expect camelCase `subscriptionStatus` instead of snake_case `subscription_status`.
   - Use `replace_with_git_merge_diff` on `functions/subscription.js` to write `subscriptionStatus: 'active'` instead of `subscription_status`.
   - Use `replace_with_git_merge_diff` on `functions-commerce/subscription.js` to write `subscriptionStatus: 'active'` instead of `subscription_status`.
   - Verify all file modifications with `grep -r "subscriptionStatus" src/lib/ functions/ functions-commerce/`.

6. **Verification & Testing**:
   - Execute `cd functions-commerce && pnpm run check && pnpm run build`.
   - Execute `node --test functions/__tests__/commerceWebhookInstallments.test.js`.
   - Execute `node --test functions/__tests__/subscriptionGate.test.js`.
   - Execute `pnpm run test` on the root of the project to guarantee no regressions were introduced across the broader codebase.

7. **Pre-commit checks**:
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

8. **Submit Work**:
   - Submit the PR with standard conventions targeted to the `dev` branch.
