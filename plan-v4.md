1. **Remove Old Code from `functions-commerce/src/domains/webhooksOps.js`**:
   - Strip `seatsLimitForTier`, `mapStripeSubscriptionStatus`, `handleCheckoutSessionCompleted`, `handleSubscriptionDeleted`, `handleStripeWebhookEvent`, `syncSubscriptionStatusFromStripeObject`, and `stripeWebhook` function out of `webhooksOps.js`.

2. **Boot Safety Protocol & Sandbox Execution**:
   - `STRIPE_SECRET_KEY` and `stripe` require lazy initialization in the webhook functions handler.

3. **`functions-commerce/src/utils/stripeHelpers.js`**:
   - Implement `seatsLimitForTier` and `mapStripeSubscriptionStatus`.
   - `syncSubscriptionStatusFromStripeObject`: Write `subscriptionStatus` (camelCase) and `seats_limit`. Update both `organizations` and `license_entitlements` per prompt directives ("Ensure you write camelCase subscriptionStatus strictly to the organizations and license_entitlements collections (snake_case database updates are banned)").
   - `handleSubscriptionDeleted`: "Instantly downgrade the target organization's license.entitlements.seats_limit to 0, restricting layout and functional read-access." Update `seats_limit: 0` in `license_entitlements`.
   - `handleCheckoutSessionCompleted`: "Extract the tenantId and clubId metadata from the session. Map these to your `/organizations/{tenantId}` and `/license_entitlements/{clubId}` documents."
   - Keep each function <= 80 lines.
   - Use dependency injection for `db` and `admin` to avoid circular or stateful dependencies. Or require them from `firebase-admin`.

4. **`functions-commerce/src/domains/stripeWebhook.js`**:
   - Re-implement `stripeWebhook` (already started).
   - Require `stripeHelpers` correctly.
   - Handle HMAC and idempotency logic.

5. **Update `functions-commerce/index.js`**:
   - Switch `exports.stripeWebhook` to point to `stripeWebhook.js` rather than `webhooksOps.js`.

6. **Connected-Account Registration Mapping (`functions-compliance/src/domains/directorOnboarding.js`)**:
   - We need to handle mapping `stripe_account_id` to `/users/{emailLower}` or `/clubs/{clubId}` on completion of connected account onboarding.
   - Create `functions-compliance/src/domains/directorOnboarding.js`.
   - Export an `onCall` or a helper `mapDirectorStripeAccount(emailLower, clubId, stripeAccountId)` depending on "similar pathway". Looking at `functions-commerce/commerce.js` (`handleConnectAccountUpdated`), it updates `stripeOnboardingComplete` inside `organizations`. We can just write a function `mapConnectedAccountRegistration` inside `directorOnboarding.js` that takes an event or an account object and does this mapping.

7. **Test and Fix**:
   - Run the specified tests: `commerceWebhookInstallments.test.js` and `subscriptionGate.test.js`.
   - Modify the tests if they fail due to snake_case -> camelCase changes, since the prompt says: "The build must compile with exactly 0 Svelte compiler warnings and 0 TypeScript "any" type violations. Run tests locally; skipping assertions is strictly forbidden." - Wait, if we can't skip assertions, can we MODIFY assertions to expect camelCase? Yes, the prompt says "Ensure you write camelCase subscriptionStatus... (snake_case database updates are banned)", so the test that asserts snake_case (`subscriptionGate.test.js`) MUST be updated to assert camelCase to be compliant with this new strict requirement!

8. **Pre-commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
