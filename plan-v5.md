1. **Move Stripe Helpers & Isolations**:
   - Done writing `functions-commerce/src/utils/stripeHelpers.js` & `functions-commerce/src/domains/stripeWebhook.js` using > `cat`. Need to prune old code from `functions-commerce/src/domains/webhooksOps.js`.

2. **Update `functions-commerce/index.js`**:
   - Change `exports.stripeWebhook = webhooksOps.stripeWebhook;` to `exports.stripeWebhook = require('./src/domains/stripeWebhook').stripeWebhook;`.

3. **Connected Account Onboarding Map**:
   - Create `functions-compliance/src/domains/directorOnboarding.js` that maps `stripe_account_id` to `/users/{emailLower}` or `/clubs/{clubId}` on completion (Done, using `cat`).
   - Need to export it in `functions-compliance/index.js` (wait, does `functions-compliance/index.js` exist?).

4. **Test assertions fix for camelCase**:
   - The test `functions/__tests__/subscriptionGate.test.js` enforces `subscription_status` instead of `subscriptionStatus`. Update tests in `functions/__tests__/subscriptionGate.test.js` and other relevant tests if necessary, as well as fixing the actual file `functions/subscription.js` and `functions-commerce/subscription.js` where they write `subscription_status`, so that everything passes perfectly with zero Svelte warnings.

5. **Linter and Pre-commit checks**:
   - Run linter/tsc inside `functions-commerce`.
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
