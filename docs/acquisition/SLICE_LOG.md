# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

## payment-webhook — 2026-06-14 (B-01)

**Branch:** `closure/payment-webhook`  
**Slice:** Payment webhook full-season unlock — gate `activeSeasonStatus` on installment ledger  
**Register:** B-01 · ManualQaId QA-202

### Shipped
- `functions/paymentInstallments.js` — server mirror of client ledger helpers + `shouldUnlockSeasonAfterPayment`
- `functions/commerce.js` — `handlePaymentSucceeded` sets `activeSeasonStatus = 'active'` only when ledger `effectiveStatus === 'paid'`
- `functions/__tests__/commerceWebhookInstallments.test.js` — partial PI unchanged; final installment unlocks
- `scripts/bundle-functions.cjs` — bundle `paymentInstallments.js` into `functions-commerce`

### Verify
- `npm test -- src/lib/parent/__tests__/paymentInstallments.test.ts` — 8 passed
- `node --test functions/__tests__/commerceWebhookInstallments.test.js` — 10 passed
- `npm run check` — 0 errors
- `npm run build` — ok

### Deploy
- `npm run deploy:commerce` — **Blocked** (non-interactive CI missing `APP_BASE_URL`, `STRIPE_PRICE_*` dotenv params; owner deploy required)

| Slice | Branch | Tests | Check | Build | Deploy | Notes |
|-------|--------|-------|-------|-------|--------|-------|
| payment-webhook | closure/payment-webhook | 18 pass | 0 errors | pass | blocked | QA-202 owner partial→full installment walkthrough |

## eligibility-ux (B-04) — 2026-06-14

**Branch:** `closure/eligibility-ux`  
**Status:** Done  
**Slice:** Director eligibility matrix UX edge cases

**Shipped:**
- `eligibilityMatrixUi.js` — active gate count, validation summary, callable error formatting
- `ClubEligibilityMatrixPanel.svelte` — empty state (no club), default-matrix note, validation feedback banner, improved save/load errors
- `eligibilityLaunch.test.ts` — B-04 guard tests (empty state, validation, error helper, upsert regression)

**Verify:** `npm test -- src/lib/director/__tests__/eligibilityLaunch.test.ts` (9 passed) · `npm run check` (0 errors) · `npm run build`
