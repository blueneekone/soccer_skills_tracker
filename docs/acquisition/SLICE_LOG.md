# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

## 04-p2-payments — 2026-06-13

**Branch:** `overnight/p2-payments`  
**Slice:** P2 parent payment installments UX  
**Owner:** `src/lib/parent/**`, wired to `/parent/payments` + `SeasonRegistration`

### Shipped
- `paymentInstallments.ts` — split fees, schedule builder, ledger aggregation, display helpers
- `paymentInstallmentPrefs.ts` — persist plan choice on parent `users.preferences.paymentInstallmentPlans`
- `loadSeasonPaymentLedger.ts` — aggregate all `season_registrations` per player/season
- `/parent/payments` — per-player installment progress, schedule rows, partial status, next-due CTA
- `SeasonRegistration` — pay-in-full vs 2/3/4-payment picker, installment charge via existing Stripe CF

### Verify
- `npm test -- src/lib/parent/__tests__/paymentInstallments.test.ts` — 8 passed
- `npm run check` — 391 errors (pre-existing)
- `npm run build` — ok

### Notes
- Each installment uses existing `createRegistrationIntent` with partial `feeAmountDollars`; full-season unlock on first partial payment remains a backend follow-up (webhook sets `activeSeasonStatus` on any succeeded PI).

