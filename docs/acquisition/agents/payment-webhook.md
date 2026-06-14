# Agent — payment-webhook

**Branch:** `closure/payment-webhook`

**Owns:** `functions/commerce.js`, `functions-commerce/**`, `functions/__tests__/*commerce*`, `functions/__tests__/*registration*webhook*`

## Task

Fix register **B-01**: `handleRegistrationWebhook` / Stripe PI success must set `users/{email}.activeSeasonStatus = 'active'` **only when all installments for the season registration are paid**, not on the first partial installment.

1. Read installment ledger logic in `src/lib/parent/paymentInstallments.ts` and `loadSeasonPaymentLedger.ts` — mirror aggregation server-side.
2. Update webhook handler to compare cumulative paid cents vs total fee before unlocking season.
3. Add/update functions unit test proving partial PI does not unlock; final installment does.

**Acceptance:** Test demonstrates partial → `activeSeasonStatus` unchanged; full ledger paid → `active`.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: `npm test -- src/lib/parent/__tests__/paymentInstallments.test.ts` + webhook tests, npm run check, npm run build. Do not ask questions.
