# Privacy & Minors — Diligence Brief

> **DRAFT — NOT LEGAL ADVICE — FOUNDER MUST HAVE QUALIFIED COUNSEL REVIEW BEFORE USE**

**Audience:** Acquirer InfoSec and privacy counsel.  
**Canonical security doc:** [`SECURITY.md`](../SECURITY.md)  
**Last updated:** 2026-06-25 · ACQ-DATAROOM-COMPLETE

---

## Summary

SSTracker is a **youth sports platform serving minors**. Architecture prioritizes **Verifiable Parental Consent (VPC)**, household-gated communications, auditable consent records, and server-side enforcement — not checkbox waivers alone.

**Soccer-configured QA tenant** (`qa_launch_2026`) exercises sport-agnostic gold paths; compliance model is not soccer-specific.

---

## COPPA / VPC

| Control | Implementation |
|---------|----------------|
| Household waiver | `parentSignCoppaWaiver` → `households.coppaSigned` |
| Per-child VPC | `parentGrantVpcConsent` on `/parent/vpc` |
| Consent audit | `consent_records` collection with server timestamps |
| Minor route gate | `/vpc-pending` blocks training until VPC verified |
| Operative child login | `operativeSignInWithDispatch` + OTP — cannot bypass VPC |

Golden path: [`FUNCTIONAL_MVP.md`](../../vision/FUNCTIONAL_MVP.md) · flow diagram: [`ARCHITECTURE_DATA_FLOWS.md`](../ARCHITECTURE_DATA_FLOWS.md) §2

---

## Minor data before VPC

- Training PII routes blocked at router + Firestore rules until `users.vpcStatus = verified`
- Director VPC approval **not required** for standard flow — director queue is read-only audit
- `directorApproveVpc` is super_admin override only

---

## Parent proof & Storage

| Path | Purpose |
|------|---------|
| Completion proof upload | `submitCompletionProof` — player-submitted evidence |
| Parent review | `parentReviewCompletionProof` — guardian approval queue |
| Video / media (Armory) | Cloud Storage paths scoped by `cellId` / `tenantId` / `playerId` — see [`DATA_FLOW.md`](../../DATA_FLOW.md) |

**Counsel review:** retention periods, parent access rights, deletion on VPC revocation — cross-ref minor retention callables:

- `enqueueMinorRetentionPurge`
- `processMinorRetentionQueue`
- `purgeExpiredMinorData`

---

## SafeSport communications

| Policy | Enforcement |
|--------|-------------|
| No coach→minor unsupervised DM | `sendCoachPlayerMessage` server block |
| Household threads | `sendHouseholdMessage` — `householdId` gate |
| Team broadcast | `safeSportBroadcast` — parent CC consent-filtered |
| Incident reporting | `reportMessageIncident` |

Regression tests: `commsSprint42.test.ts`, `commsSprint411.test.ts`

---

## Legal surfaces

| Route | Status |
|-------|--------|
| `/privacy` | Shipped — Tier 1 (`WF-TRUST-PRIVACY`) |
| `/terms` | Shipped — Tier 2 |

**Counsel action:** review copy for minors, COPPA disclosures, California minors (if applicable), state biometric laws if CV features enabled.

---

## What is NOT claimed

| Claim | Status |
|-------|--------|
| **SOC 2** Type I or II | **Not claimed** — no report in data room |
| **PCI DSS certification** | **Not claimed** — Stripe Checkout / Elements; card data not stored on SSTracker servers |
| **HIPAA** | **Not in scope** |
| **FERPA** | **Not in scope** unless acquirer expands to school districts |
| **SafeSport certification** | Platform enforces comms policy; not a SafeSport training vendor |

---

## Subprocessors (summary)

Point acquirer to [`SECURITY.md`](../SECURITY.md) for full list. Primary:

| Vendor | Purpose |
|--------|---------|
| Google Firebase / GCP | Auth, Firestore, Functions, Hosting, FCM, Storage |
| Stripe | Registration payments |
| Checkr | Coach/staff background checks |
| Tremendous | Bounty rewards (partial — not exec-cut scope) |
| SendGrid / email provider | Transactional email (verify in functions config) |

---

## Data residency & cells

- Multi-tenant **cell-isolated Firestore** databases per [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- `cellId` issued in JWT — client cannot select cell
- Cross-cell PII prohibited without admin-minted context

---

## Open diligence items (founder)

- [ ] Counsel review of `/privacy` and `/terms` for minor-facing language
- [ ] DPIA / COPPA compliance memo (outside repo)
- [ ] Confirm production data processing agreements with Firebase/Stripe
- [ ] Document parental deletion request workflow

---

## Related documents

- [`PRODUCT_STATE.md`](../PRODUCT_STATE.md) — QA status + open risks
- [`SECURITY.md`](../SECURITY.md) — full security overview
- [`legal/README.md`](./README.md) — legal checklist
