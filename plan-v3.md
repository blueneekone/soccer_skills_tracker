1. **Remove Old Code from `functions-commerce/src/domains/webhooksOps.js`**:
   - `mapStripeSubscriptionStatus`
   - `seatsLimitForTier` (wait, I need to see where this is defined/used)
   - `syncSubscriptionStatusFromStripeObject`
   - `handleSubscriptionDeleted`
   - `handleCheckoutSessionCompleted`
   - `handleStripeWebhookEvent`
   - `stripeWebhook` export.

2. **Create `functions-commerce/src/utils/stripeHelpers.js`**:
   - Add `seatsLimitForTier` (if not found in formatters or elsewhere).
   - Port all the `handle*` functions here, strictly keeping them under 80 lines each.
   - Refactor `syncSubscriptionStatusFromStripeObject` to use `subscriptionStatus` instead of `subscription_status`, and ensure it updates both `organizations` and `license_entitlements` collections if clubId is known, as per prompt. Wait, the prompt says "Ensure you write camelCase subscriptionStatus (e.g., 'active', 'past_due') strictly to the organizations and license_entitlements collections (snake_case database updates are banned)."
   - Refactor `customer.subscription.deleted` to downgrade `license_entitlements` `seats_limit` to 0.

3. **Update `functions-commerce/index.js`**:
   - Export `stripeWebhook` from `./src/domains/stripeWebhook.js` instead of `webhooksOps.js`.

4. **Connected Account Registration Mapping (`functions-compliance/src/domains/directorOnboarding.js`)**:
   - Let's check `functions-compliance/src/domains/directorOnboarding.js`. If it doesn't exist, we will create it. The prompt specifically instructs: "Map the stripe_account_id to the `/users/{emailLower}` or `/clubs/{clubId}` profiles upon completion of the connected account onboarding." We can create a webhook listener for `account.updated` here or a callable. Or maybe we just need a function `handleConnectAccountOnboarding` that does exactly what is described. Let's look at `commerce.js` - there is `handleConnectAccountUpdated` inside `functions-commerce/commerce.js`. The prompt states: "Target: 'functions-compliance/src/domains/directorOnboarding.js' or similar pathway". We will create `functions-compliance/src/domains/directorOnboarding.js` and implement a handler for mapping `stripe_account_id` and test the onboarding sync.

Let's do some more `grep` on `seatsLimitForTier`.
