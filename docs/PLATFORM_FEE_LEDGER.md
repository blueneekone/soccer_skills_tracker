# Platform Fee Ledger

Append-only audit log of every dollar Vanguard takes (or pays out) on the
platform.  Lives at `platform_fee_ledger/{ledgerId}` with denormalized
aggregate counters at `organizations/{tenantId}/fee_summary/{bucketId}`.

## Doc shape

```ts
interface PlatformFeeLedgerEntry {
  id: string;                  // === upstream idempotency key
  tenantId: string;            // org scope; recruiter exports use the recruiter email
  transactionType: TransactionType;
  sourceDocPath: string;       // e.g. 'season_registrations/abc123'
  grossCents: number;
  platformFeeCents: number;    // signed: positive = take, negative = rebate credit
  netCents: number;            // grossCents - platformFeeCents (conservation invariant)
  rateBp: number;              // basis points actually applied (post volume-tier modifier)
  policyId: string;            // 'default-v1' unless tenant has an override
  policyVersion: number;       // bumped on every updatePricingPolicy call
  stripeChargeId: string | null;
  paymentIntentId: string | null;
  recordedAt: Timestamp;       // server-stamped
}
```

## Idempotency

The doc ID is **always** the upstream idempotency key:

| Flow | Doc ID |
|------|--------|
| Season registration | `paymentIntent.id` |
| Digital ticketing | `paymentIntent.id` |
| Hotel rebate | `idempotencyKey` (caller-supplied = partner settlement ref) |
| Recruiter export | `recruiter_export_{exportId}` |

Webhook retries from Stripe (or replays from the partner reconciliation
pipeline) are no-ops because the writer uses `set({merge: true})` against
the same path.

## Counters

Every ledger write also increments two denormalized docs in the same
`writeBatch`:

```
organizations/{tenantId}/fee_summary/ytd     // YTD aggregate
organizations/{tenantId}/fee_summary/2026-05 // monthly bucket
```

Each carries `{ grossCents, feesCents, txnCount, lastUpdatedAt }`.  All
increments use `FieldValue.increment()` for offline-safe commutativity
(Phase 1 atomic-batch contract).

The YTD doc is read by:

- `FeeLedgerEngine.connect()` — Director OS Revenue console.
- `commerce.js` / `ticketing.js` — to compute volume-tier modifiers
  inside `computePlatformFee({ ytdGrossCents })`.

## Reading the ledger

Three privileged read paths exist (see `firestore.rules`):

- `super_admin` / `global_admin` — every row, every tenant.
- `director` — rows where `resource.data.tenantId == tokenClub()`.
- `recruiter` — rows where `resource.data.tenantId == emailKey()` (their
  own export receipts only; lead-export ledger rows use the recruiter's
  email as the tenant scope because exports are not tied to a club).

## Conservation invariant

`feeLedger.js#validateEntry` enforces `grossCents - platformFeeCents ==
netCents` at write time.  This catches off-by-one math from any caller
that forgot to use `computePlatformFee()`.  Production monitoring should
also page on any row where this invariant doesn't hold (defense in depth
against a future regression).

## Adding a new transaction type

1. Append the tag to `TransactionType` in `src/lib/types/pricing.ts`
   AND `functions/pricingConstants.js#TRANSACTION_TYPES`.
2. Pick a doc-ID convention (use the existing flows as the template).
3. Add a rate-card entry via `updatePricingPolicy`.
4. Call `recordPlatformFee(batch, db, entry)` from the new flow's webhook
   handler — never write rows by hand.
5. Add the channel label to `RevenueLedgerModule.svelte#typeLabel()` so
   the Director console renders it.
