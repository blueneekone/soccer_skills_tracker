# Transaction-Based Pricing (Phase 2, Epic 2)

This document is the developer reference for the post-cutover Vanguard pricing
model.  It supersedes the legacy per-seat SaaS plan documented in
`EPIC5_STATUS.md`.

## TL;DR

- Vanguard takes **$0** to onboard a club, NGB, or tournament.
- Vanguard takes a **micro-percentage** of every dollar that moves through
  the platform — registrations, tickets, hotel rebates, tournament entries.
- Recruiters run on a **hybrid** model: small annual access fee plus a flat
  per-export charge billed onto the same Stripe invoice.

## Architecture

```
┌──────────────┐    onCall      ┌────────────────┐   pricing_policy/default-v1
│  client      │ ──────────────►│ Cloud Function │ ─────────► (registry DB)
│  /pricing UI │                │ commerce.js    │ ──────► computePlatformFee()
└──────────────┘                │ ticketing.js   │
                                │ hotelRebates.js│
                                │ recruiterBilling
                                └──────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ Stripe Connect   │   destination charges
                              │ + invoiceItem    │   per-export metered
                              └──────┬───────────┘
                                       │ webhook
                                       ▼
                              ┌──────────────────┐
                              │ platform_fee_    │  ledger row + YTD/monthly
                              │ ledger/*         │  counters (incrementally)
                              └──────────────────┘
```

## Core modules

| File | Purpose |
|------|---------|
| `src/lib/types/pricing.ts` | TS contract: `RateCard`, `PricingPolicyDoc`, `TransactionType`, `BillingModel`. |
| `functions/pricingConstants.js` | CommonJS mirror — DEFAULT_POLICY_ID, BP_DIVISOR, TRANSACTION_TYPES, isTransactionType. |
| `functions/pricingEngine.js` | `loadActivePolicy()` + `computePlatformFee()` — pure functions. |
| `src/lib/services/pricingEngine.svelte.ts` | Client mirror + reactive `pricingPolicyStore`. |
| `functions/feeLedger.js` | `recordPlatformFee(batch, db, entry)` — appends ledger + counters to an open batch. |
| `functions/pricingPolicyOps.js` | super_admin callables: `bootstrapPricingPolicy`, `updatePricingPolicy`. |

## TransactionType taxonomy

| Tag | Source flow | Stripe primitive |
|-----|-------------|-----------------|
| `season_registration` | `commerce.js#createRegistrationIntent` | PaymentIntent (destination charge) |
| `digital_ticketing` | `ticketing.js#createTicketSaleIntent` | PaymentIntent (destination charge) |
| `tournament_entry` | reserved; future use | TBD |
| `merch_sale` | reserved; future use | TBD |
| `hotel_rebate` | `hotelRebates.js#submitHotelRebateRecord` | Transfer to NGB |
| `recruiter_lead_export` | `recruiterBilling.js#recordRecruiterExport` | InvoiceItem on sub |

To add a new TransactionType:

1. Extend `TransactionType` in `src/lib/types/pricing.ts`.
2. Mirror in `functions/pricingConstants.js#TRANSACTION_TYPES`.
3. Seed a rate card entry via `updatePricingPolicy`.
4. Document it in `docs/PLATFORM_FEE_LEDGER.md`.

## Math contract

- Fees are **integer cents** in, **integer cents** out.
- Basis points (`rateBp`) are integers; 10000 = 100%.
- Negative `rateBp` expresses platform-pays-tenant flows (hotel rebate).
- BigInt is used internally for safe multiplication on 8-figure amounts.
- Round-half-up is applied **exactly once** at the boundary back to Number.

## Cutover playbook

1. Deploy code.
2. Run `bootstrapPricingPolicy` (super_admin onCall) — seeds an empty
   `default-v1` doc.  No fees are taken until a rate card is configured.
3. Run `updatePricingPolicy` with the real rate card.  Each invocation
   increments `version` and writes a row to `pricing_policy_audit`.
4. Run `sunsetLegacySubscription` per-tenant OR wait for the weekly
   `sweepLegacySubscriptions` schedule to migrate everyone on
   tutor/team/club tiers.  Recruiters are excluded — they remain on the
   hybrid model.
5. Monitor `platform_fee_ledger` for the first 72 hours.  Volume spikes or
   conservation violations (`gross - fee != net`) page the on-call.

## Director UI

Directors see live pricing/fee state in two places:

- **Director OS Command Center → Revenue Ledger module**: YTD volume, fees,
  effective rate, monthly sparkline, breakdown by channel, savings vs the
  legacy SaaS plan.
- **EntitlementModule**: shows a "you're on transaction-based billing"
  banner once `licenseEntitlementStore.isTransactionBilled` flips true.

## Security rules

- `pricing_policy/{id}` — authed-read, server-only write.
- `pricing_policy_audit/{id}` — super_admin read, server-only write.
- `platform_fee_ledger/{id}` — readable by super, the tenant's director,
  or (for recruiter exports) the recruiter themselves.  No client writes.
- `organizations/{tid}/fee_summary/{bucketId}` — readable by super or
  the tenant's club scope.  No client writes.

See `firestore.rules` for the canonical bodies.
