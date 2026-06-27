# Legal diligence — data room checklist

> **DRAFT — NOT LEGAL ADVICE — FOUNDER MUST HAVE QUALIFIED COUNSEL REVIEW BEFORE USE**

**Purpose:** Founder checklist before sharing full data room or signing NDAs.  
**Last updated:** 2026-06-25 · ACQ-DATAROOM-COMPLETE

---

## Before full data room

- [ ] **Mutual NDA executed** — use [`MUTUAL_NDA_TEMPLATE.md`](./MUTUAL_NDA_TEMPLATE.md) only after counsel review, or advisor-provided form
- [ ] Counterparty legal name and signatory verified
- [ ] Confirm acquirer is strategic / qualified (see [`INBOUND_PLAYBOOK.md`](../INBOUND_PLAYBOOK.md))

---

## Corporate & entity

- [ ] **Legal entity name** and state/country of formation documented — [`IP_AND_ENTITY_CHECKLIST.md`](./IP_AND_ENTITY_CHECKLIST.md)
- [ ] **Cap table** current — [`CAP_TABLE_TEMPLATE.md`](../CAP_TABLE_TEMPLATE.md) (replace placeholder with actual)
- [ ] Good standing / charter copies (outside repo — founder provides)
- [ ] No undisclosed liens on IP or code repo

---

## Intellectual property

- [ ] **100% IP assignment** from founders/contractors to entity — fill [`IP_AND_ENTITY_CHECKLIST.md`](./IP_AND_ENTITY_CHECKLIST.md)
- [ ] Open-source license inventory (`package.json`, `functions/package.json`)
- [ ] Third-party assets documented (`ASSET_LICENSES.md` if applicable)
- [ ] No employer/conflict IP from day jobs (founder attestation)

---

## Privacy, minors & terms

- [ ] **Privacy policy** live at `/privacy` — counsel review for minors
- [ ] **Terms of service** live at `/terms`
- [ ] COPPA/VPC flow documented — [`PRIVACY_AND_MINORS_DILIGENCE.md`](./PRIVACY_AND_MINORS_DILIGENCE.md)
- [ ] Parent proof Storage paths reviewed for InfoSec
- [ ] SafeSport comms policy documented — [`SECURITY.md`](../SECURITY.md)

---

## Security & compliance claims

- [ ] **Do not claim SOC 2** unless report exists and is in data room
- [ ] **Do not claim PCI certification** — Stripe handles card data; document integration only
- [ ] Subprocessors list — pointer to [`SECURITY.md`](../SECURITY.md) § subprocessors / Firebase GCP
- [ ] Firebase / GCP project ownership documented — [`TRANSFER.md`](../TRANSFER.md)

---

## Operations transfer (post-LOI)

- [ ] [`TRANSFER.md`](../TRANSFER.md) checklist started
- [ ] Secrets inventory (not in repo) — Firebase, Stripe, Checkr, Tremendous, SendGrid, etc.
- [ ] Domain ownership (`sstracker.app`)
- [ ] GitHub org/repo transfer plan

---

## Documents in this folder

| File | Purpose |
|------|---------|
| [`MUTUAL_NDA_TEMPLATE.md`](./MUTUAL_NDA_TEMPLATE.md) | Mutual NDA starter |
| [`IP_AND_ENTITY_CHECKLIST.md`](./IP_AND_ENTITY_CHECKLIST.md) | Entity + IP fill-in |
| [`PRIVACY_AND_MINORS_DILIGENCE.md`](./PRIVACY_AND_MINORS_DILIGENCE.md) | InfoSec / privacy counsel brief |
| [`../CAP_TABLE_TEMPLATE.md`](../CAP_TABLE_TEMPLATE.md) | Cap table placeholder |

---

## Related

- [`INDEX.md`](../INDEX.md) — gated data room index
- [`INBOUND_PLAYBOOK.md`](../INBOUND_PLAYBOOK.md) — when to share what
