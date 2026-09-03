1. **Move Stripe Helpers & Isolations**:
   - Create `functions-commerce/src/utils/stripeHelpers.js`
   - Extract `mapStripeSubscriptionStatus`, `seatsLimitForTier`, `syncSubscriptionStatusFromStripeObject`, `handleSubscriptionDeleted`, `handleCheckoutSessionCompleted`, and `handleStripeWebhookEvent`. (Wait, let's keep them under 80 lines).

2. **Handle Connected-Account Lifecycles**:
   - In `functions-commerce/src/domains/stripeWebhook.js`, extract the webhook logic, implement HMAC verification and idempotency check.
   - For `checkout.session.completed`: parse `tenantId` and `clubId` from metadata and map them to `/organizations/{tenantId}` and `/license_entitlements/{clubId}`.
   - For `customer.subscription.updated`: reconcile active seats and write `subscriptionStatus` (camelCase) strictly to `organizations` and `license_entitlements` collections. (Need to modify the test if there is one that asserts snake_case).
   - For `customer.subscription.deleted`: downgrade `seats_limit` to 0.

3. **Boot Safety Protocol**:
   - Import `Stripe` inside the webhook handler. Use `STRIPE_SECRET_KEY.value()` from `defineSecret`.

4. **Connected-Account Registration Mapping**:
   - Target `functions-compliance/src/domains/directorOnboarding.js`.
   - Update `stripe_account_id` to `/users/{emailLower}` or `/clubs/{clubId}` profiles when a connected account onboarding is completed. We can expose a function like `handleDirectorOnboardingStripeWebhook` or `handleConnectAccountUpdated` there, or just export an endpoint.

5. **Test and Handover**:
   - Run tests and fix any failing tests related to `subscriptionStatus` snake_case enforcement.
   - Run linter/tsc.
