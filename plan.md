1. **Move Stripe Helpers & Isolations**:
   - Create `functions-commerce/src/utils/stripeHelpers.js`.
   - Extract `mapStripeSubscriptionStatus`, `seatsLimitForTier`, `syncSubscriptionStatusFromStripeObject`, `handleSubscriptionDeleted`, `handleCheckoutSessionCompleted`, and `handleStripeWebhookEvent` into `functions-commerce/src/utils/stripeHelpers.js` ensuring 80-lines limit for each function.
   - Refactor them to accept `db` and `admin` instances as arguments instead of depending on globals. (Or require them securely).
   - Ensure `stripe_account_id` mapping when onboarding. Wait, the prompt says: "Map the stripe_account_id to the `/users/{emailLower}` or `/clubs/{clubId}` profiles upon completion of the connected account onboarding." The onboarding is handled in `handleConnectAccountUpdated` which seems to be in `functions-commerce/commerce.js` or `functions-commerce/src/domains/stripeWebhook.js`. We will target `functions-commerce/src/domains/stripeWebhook.js` as instructed. Wait, `stripeWebhook.js` doesn't exist, the prompt says "Target: 'functions-commerce/src/domains/stripeWebhook.js' or 'functions-commerce/index.js'". Let's create `functions-commerce/src/domains/stripeWebhook.js` and move the `stripeWebhook` function from `functions-commerce/src/domains/webhooksOps.js` to `functions-commerce/src/domains/stripeWebhook.js`, updating `functions-commerce/index.js` to point to it.

2. **Boot Safety Protocol**:
   - In `functions-commerce/src/domains/stripeWebhook.js`, initialize `stripe` client lazily inside the handler.
   - Remove global `require('stripe')` and use `defineSecret('STRIPE_SECRET_KEY')` properly inside the handler.

3. **HMAC Webhook Signature & Idempotency**:
   - In `stripeWebhook.js`, use `stripeClient.webhooks.constructEvent` with `defineSecret('STRIPE_WEBHOOK_SECRET')`.
   - Query `/processed_webhooks/{eventId}` to prevent duplicate processing.

4. **Handle Connected-Account Lifecycles (in `stripeHelpers.js`)**:
   - Update `checkout.session.completed`: Extract `tenantId` (from metadata) and `clubId`. Map these to `/organizations/{tenantId}` and `/license_entitlements/{clubId}`. Wait, "checkout.session.completed: Extract the tenantId and clubId metadata from the session. Map these to your /organizations/{tenantId} and /license_entitlements/{clubId} documents."
   - Update `customer.subscription.updated`: Reconcile active seats. "Ensure you write camelCase subscriptionStatus (e.g., 'active', 'past_due') strictly to the organizations and license_entitlements collections (snake_case database updates are banned)." Wait! A test we just ran verified that `subscription_status` snake_case is required for `license_entitlements`. Let's re-read the test output and the instruction. Wait, the prompt says: "Ensure you write camelCase subscriptionStatus (e.g., 'active', 'past_due') strictly to the organizations and license_entitlements collections (snake_case database updates are banned)." This explicitly overrides memory/tests! I must follow the prompt exactly and fix the tests if necessary, or just follow the prompt! (Wait, "The build must compile with exactly 0 Svelte compiler warnings...").
   - Update `customer.subscription.deleted`: Instantly downgrade target organization's `license.entitlements.seats_limit` to 0. (Actually `seats_limit: 0` in `license_entitlements`).

5. **Connected-Account Registration Mapping**:
   - The prompt says "Target: 'functions-compliance/src/domains/directorOnboarding.js' or similar pathway. Action: Map the stripe_account_id to the /users/{emailLower} or /clubs/{clubId} profiles upon completion of the connected account onboarding." Let's create `functions-compliance/src/domains/directorOnboarding.js` and add a hook or just modify `handleConnectAccountUpdated` in `commerce.js` (wait, the target is `directorOnboarding.js` in `compliance`). I'll create it and add the logic.

Let's refine.
