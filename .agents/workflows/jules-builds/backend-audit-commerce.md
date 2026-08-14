# JULES BACKEND PIPELINE: COMMERCE OS (DIRECTOR & RECRUITER BILLING)
## Codebase Target: `functions-commerce/`
## Domain: Stripe Checkout, Webhooks, Tournament Ticketing, Subscriptions, Hotel Partner Rebates, Recruiter Billing

### Critical Architectural Constraints:
1. **Stripe Idempotency & Webhook Signature:** Every Stripe webhook handler (`stripeWebhook`, `handleTicketingWebhook`) must verify HMAC signatures and enforce event idempotency against `processed_webhooks` in Firestore.
2. **80-Line Function Limit:** No function body may exceed 80 lines. Extract pricing math, dunning logic, and payout calculations to `src/domains/`.
3. **Zero-Trust Pricing Guard:** Pricing calculations (registration fees, ticket tiers, multi-seat licenses) must always be computed server-side via `pricingEngine.js` — never trust client-provided currency amounts.
4. **Boot Safety:** Stripe SDK initialization must use `defineSecret('STRIPE_SECRET_KEY')` lazily inside handler scopes.

### Target Handlers to Audit in `functions-commerce/`:
- `createStripeCheckoutSession`, `stripeWebhook`, `createSubscription`, `sunsetLegacySubscription`, `sweepLegacySubscriptions`
- `createRegistrationIntent`, `handleRegistrationWebhook`, `getRegistrationStatus`
- `createTicketSaleIntent`, `handleTicketingWebhook`, `upsertTournamentEvent`, `publishTournamentEvent`, `verifyScanToken`, `sendTicketReceiptOnCreate`
- `submitHotelRebateRecord`, `approveHotelRebatePayout`, `provisionHotelPartner`, `rotateHotelPartnerKeys`, `setHotelPartnerStatus`
- `recordRecruiterExport`, `cancelRecruiterAccount`
- `bootstrapPricingPolicy`, `updatePricingPolicy`

### Verification Steps:
1. Run `node scripts/smoke-require-codebase.cjs commerce` — must return OK.
2. Run targeted tests:
   `node --test functions/__tests__/commerceWebhookInstallments.test.js`
   `node --test functions/__tests__/subscriptionGate.test.js`
3. Verify all tests pass 100% green.

### Commit:
Commit with message: `audit(backend-commerce): enforce server-side pricing guards, stripe idempotency, and 80-line limits`
