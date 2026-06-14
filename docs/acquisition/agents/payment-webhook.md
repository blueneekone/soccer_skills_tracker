# Agent — payment-webhook

**Slice ID:** payment-webhook  
**Branch:** `closure/payment-webhook`

**Owns:**
- `functions/commerce.js`
- `functions-commerce/**`
- `functions/__tests__/*commerce*`

## Task

Register **B-01**: `handleRegistrationWebhook` / Stripe PI success must set `activeSeasonStatus = 'active'` **only when all installments paid**, not first partial.

1. Mirror installment ledger from `src/lib/parent/paymentInstallments.ts` server-side.
2. Add functions unit test: partial PI → status unchanged; final installment → unlock.

**Acceptance:** Tests prove partial vs full ledger behavior.

## AutomatedVerify

```bash
npm test -- src/lib/parent/__tests__/paymentInstallments.test.ts
node --test functions/__tests__/commerce*.test.js
npm run check
npm run build
```

## ManualQaId

QA-202

---

Universal rules: Unattended overnight — do not ask questions. Append SLICE_LOG only. If FIREBASE_TOKEN missing, log Blocked and stop slice (do not claim Done). Each commit: npm test (slice), npm run check, npm run build. Permanent rejects #1–#3. Manual testing is OWNER_QA_CHECKLIST only — you ship code + automated verify.
