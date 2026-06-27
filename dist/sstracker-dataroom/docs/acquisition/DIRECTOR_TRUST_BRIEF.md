# SSTracker — Registration Resilience

### Director Trust Brief · May 2026

**SSTRACKER · VANGUARD · CLUB OPERATING SYSTEM**

---

## The moment every director felt (June 2026)

Utah Soccer Federation **suspended registration** on Sports Connect (Stack Sports) after families reported **unauthorized credit card charges** following youth sign-ups. Registration and admin flows were taken **offline** during investigation. Stack Sports stated it was **not aware of a confirmed breach** while reviewing the reports ([FOX 13](https://www.fox13now.com/news/local-news/utah-soccer-warns-families-of-potential-data-breach-leaking-their-credit-information)).

Whether the root cause is fraud, credential abuse, or a third-party integration, the **operational lesson** is the same: when one vendor owns statewide **registration + payments + family PII**, your club inherits **concentration risk**—and parents hear about problems on their **card statements**, not from your compliance dashboard.

---

## What directors actually need

| Need | Legacy pattern | SSTracker approach |
|------|----------------|-------------------|
| **Payment safety** | High-volume registration hub; card flows centralized in vendor checkout | **Stripe Connect** — card data handled by Stripe; platform fee ledger tied to `paymentIntent`, not stored PANs |
| **Minor protection** | Registration checkbox + scattered profiles | **Household graph + VPC ceremony** — parent-granted consent; `consent_records` + `security_audit`; training routes blocked until VPC verified |
| **Data blast radius** | App-layer permissions; cross-club exposure on compromise | **Tenant-scoped Firestore rules + JWT claims** — `clubId` / role on token; cross-tenant reads blocked at the database layer |
| **Coach access** | Team chat / DM models vary by product | **SafeSport by design** — coach→minor unsupervised DMs blocked; parent CC on broadcasts; monitored channels |
| **Staff screening** | Manual or bolt-on | **Checkr-ready clearance** — sensitive PII stays in vendor iframe, not your club database |
| **Teen privacy (COPPA 2.0)** | Analytics/marketing add-ons | **Four-layer teen ad block** — rules, Cloud Functions, client suppression, egress whitelist |
| **Accountability** | Vendor investigation after families report fraud | **Append-only audit** — consent logs, security events; privileged writes via **Cloud Functions only** |

---

## Your director surfaces on day one

- **Field ops & deployment calendar** — season windows without gamification chrome
- **Household linker + VPC audit queue** — read-only consent queue; repair broken guardian links
- **Coach clearance matrix** — staff eligibility before roster assignment
- **Registration programs + roster assign** — season sign-up wired to placement (not a separate spreadsheet)
- **Club broadcasts** — SafeSport-monitored parent comms
- **Multi-team tenant isolation** — one club, scoped data; federation-scale without shared PII pools

**Development loop (why clubs stay):** Coach Forge → player Train → XP on HQ → parent visibility — on the same tenant as compliance, not a bolt-on PDF.

---

## Why PCI marketing wasn't enough

Sports Connect publicly describes **PCI-aligned** payment handling and **not storing card data on-platform**—language many registration vendors use. **Compliance statements don't replace architecture:**

1. **Concentration** — One statewide registration pipe = one outage stops the season.
2. **Detection lag** — Issuers and parents surface fraud before your board gets a dashboard alert.
3. **Youth + money + PII** — The highest-risk data mix belongs behind **household consent** and **tenant walls**, not a monolithic signup funnel.
4. **Enforcement vs. policy** — SSTracker gates minors in **Firestore rules** and **callables**, not only in terms of service.

---

## Trust stack (at a glance)

`COPPA / VPC` · `SafeSport comms` · `WebAuthn passkeys` · `Checkr-ready clearance` · `PII retention protocol` · `Tenant-isolated Firestore` · `Stripe Connect payments`

---

## Next step

**Live demo on your tenant** — household VPC golden path, coach bounty → player Train, director compliance audit.

**Contact:** acquisition@sstracker.com · **QA environment:** https://sstracker.app  
**Privacy architecture:** sstracker.app/privacy · **Full acquisition brief:** sstracker.app/acquisition

---

*Disclaimer: This brief describes SSTracker architectural choices for club evaluation. It does not assert that Stack Sports or Sports Connect failed specific security controls, and it does not claim SSTracker holds PCI, SOC 2, or other third-party certifications unless separately documented. Utah incident references reflect public news reporting as of May 2026; confirm current status with your counsel before external distribution.*

**PDF:** [/acquisition/sstracker-director-trust-brief.pdf](https://sstracker.app/acquisition/sstracker-director-trust-brief.pdf) · Print route: `/acquisition/print/director-trust-brief`
