# SSTracker — Security & Compliance Overview

**Audience:** Acquirer InfoSec, privacy counsel, and platform engineering.  
**Canonical architecture:** [`ARCHITECTURE.md`](../ARCHITECTURE.md)  
**Last updated:** 2026-06-13

---

## 1. Security model summary

SSTracker implements **defense in depth** across client, Firestore rules, and Cloud Functions:

| Layer | Control |
|-------|---------|
| **Authentication** | Firebase Auth — email magic link, phone OTP, WebAuthn/passkeys, operative dispatch OTP |
| **Authorization** | JWT custom claims (`tenantId`, `cellId`, `role`) + Firestore rules + callable guards |
| **Privileged mutations** | Cloud Functions v2 only — client cannot bypass server validation |
| **Tenant isolation** | `cellId`-scoped Firestore databases; `getActiveDb()` / `getAdminDb(cellId)` accessors |
| **PII boundary** | Vault seal/unseal callables; no cross-cell PII without admin-minted context |
| **Audit** | `security_audit` writes; consent attestation records |

---

## 2. Identity & access

### Custom claims

Issued server-side (`syncUserClaims`, `assignTenantClaims`). Client **never** selects `cellId` — backend embeds in ID token per [`ARCHITECTURE.md`](../ARCHITECTURE.md) §1.2.

### Roles (shipped)

`player`, `parent`, `coach`, `director`, `admin`, `super_admin` — see [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md). Planned roles (`team_manager`, etc.) are **not** in JWT until explicit sprint.

### WebAuthn

Passkey registration/login via `functions-compliance` callables. **Critical:** `WEBAUTHN_RP_ID` and `WEBAUTHN_RP_ORIGIN` must match deployed hosting origin ([`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md)).

---

## 3. COPPA & minor protection

### Verifiable Parental Consent (VPC)

| Step | Mechanism |
|------|-----------|
| Household waiver | `parentSignCoppaWaiver` → `households.coppaSigned` |
| Per-child VPC | `parentGrantVpcConsent` on `/parent/vpc` |
| Auto-finalize | Same request sets `users.vpcStatus = verified`, writes `consent_records` |
| Operative login | `operativeSignInWithDispatch` + OTP — child cannot bypass pending VPC |

**Director approval is not required** for standard VPC — director queue is read-only audit. `directorApproveVpc` is super_admin override only.

Golden path: [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) § Permanent VPC golden path

### Minor data retention

- `enqueueMinorRetentionPurge` / `processMinorRetentionQueue` / `purgeExpiredMinorData`
- Scheduled burn per compliance policy — see `functions-compliance` exports

---

## 4. SafeSport & communications

Authority: [`COMMS_HUB.md`](../vision/COMMS_HUB.md)

| Policy | Enforcement |
|--------|-------------|
| No coach→minor unsupervised DM | `sendCoachPlayerMessage` blocks minors · Epic 4.2 Done |
| Household visibility | Parent Lounge + household threads (4.11) |
| Staff broadcast | `safeSportBroadcast`, `clubSportBroadcast` with audit trail |
| Incident reporting | `reportMessageIncident` callable |

Regression: `commsSprint42.test.ts`, `commsSprint411.test.ts`

---

## 5. Firestore security rules

- Tenant-scoped reads/writes keyed by `tenantId` / membership
- Emulator tests: `npm run test:firestore-rules`
- Sprint guards: `firestoreRulesSprint412.test.ts`, `firestoreTenantIsolation.test.ts`

**Transfer action:** Deploy rules with every production release:

```bash
firebase deploy --only firestore:rules,storage
```

---

## 6. API gateway & rate limiting

`/v1/**` ingress via `apiGateway` (`functions-platform`):

- ID token verification
- Idempotency cache (`registry/gateway_idempotency`)
- Rate buckets (`registry/gateway_rate_buckets`)
- Cell-bound handler dispatch

Direct client → Firestore writes limited to read-only or self-scoped documents per rules.

---

## 7. Coach clearance & background checks

| Component | Status |
|-----------|--------|
| Checkr embed token | Callable scaffold in compliance |
| Webhook handler | `checkrWebhook`, `backgroundCheckCallback` |
| Director panopticon | UI for clearance status |
| Manual override | `directorOutOfBandClearance`, `requestManualOverride` |

**Limitation:** Not full NCSI/SafeSport enterprise parity — vendor contract is acquirer responsibility. See [LIMITATIONS.md](./LIMITATIONS.md).

---

## 8. Data classification

| Class | Examples | Storage |
|-------|----------|---------|
| Public | Club slug, tryout program public fields | Firestore + Hosting |
| Operational | Drills, schedules, RSVP | Tenant-scoped Firestore |
| PII / minor | Player profile, consent, household | Cell Firestore + vault seal |
| Payment | Stripe customer refs | Commerce codebase + Stripe |

---

## 9. Dependency & supply chain

- npm lockfiles at root and in function codebases
- `prebuild` checks: no Phosphor icons, file budget
- Firebase/Google Cloud as primary vendor — **concentration risk** documented in [LIMITATIONS.md](./LIMITATIONS.md)

**Recommended acquirer actions:**

- [ ] Run `npm audit` and remediate critical CVEs
- [ ] Enable Dependabot / Snyk on acquirer org
- [ ] SOC 2 / penetration test on deployed dev environment before production traffic

---

## 10. Incident response (recommended)

Not implemented as runbook in repo. Acquirer should define:

1. Firebase/GCP compromise — rotate service account keys, revoke refresh tokens
2. Stripe webhook abuse — rotate signing secret
3. Checkr webhook spoofing — verify signature headers
4. Minor data breach — COPPA notification workflow with counsel

Audit query starting point: `security_audit` collection + Cloud Logging for Functions.

---

## 11. Related documents

- [TRANSFER.md](./TRANSFER.md) — secrets handoff
- [LIMITATIONS.md](./LIMITATIONS.md) — honest boundaries
- [`FUNCTIONAL_AUDIT_BACKLOG.md`](../FUNCTIONAL_AUDIT_BACKLOG.md) — closed security-adjacent wiring bugs (A6, C1, etc.)
