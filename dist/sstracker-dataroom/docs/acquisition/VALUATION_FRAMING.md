# SSTracker — Valuation Framing (Pre-Revenue)

**Purpose:** Honest acquisition economics framing for founder and advisor conversations — **not** a financial model or price recommendation.  
**Disclaimer:** This document is for internal diligence preparation only. Engage qualified M&A counsel and a valuation advisor for term sheets.

**Last updated:** 2026-06-25 · ACQ-DATAROOM-COMPLETE

---

## Deal type

| Attribute | SSTracker today |
|-----------|-----------------|
| **Stage** | Pre-commercial launch · pre-revenue |
| **Likely structure** | Technology / strategic acquisition or acqui-hire |
| **Revenue multiple** | Not applicable — **$0 ARR** documented in [`TRACTION.md`](./TRACTION.md) |
| **Primary value drivers** | Architecture, compliance depth, functional OS, speed-to-market vs rebuild |

---

## Buyer categories

| Category | Examples | Typical interest |
|----------|----------|------------------|
| **Strategic platform** | NBC Sports Next (SportsEngine), TeamSnap, LeagueApps, GameChanger (Dick's), Stack Sports, Hudl (adjacency) | Bolt-on development OS + COPPA layer to existing parent base |
| **Vertical soccer** | GotSport partners, US Club Soccer tech | Tryout OS + household graph; federation export roadmap |
| **PE / multi-club roll-up** | Portfolio operators standardizing club stack | Compliance + development standard across holdings |
| **Fitness / ed-tech adjacency** | Minor-facing products needing VPC architecture | Transferable consent + household model |
| **Acqui-hire** | Engineering-led buyers | Svelte 5 / Firebase / RL homework expertise in codebase |

See [`OUTREACH.md`](./OUTREACH.md) for targeting notes and objection handlers.

---

## Rebuild-cost framing (qualitative)

**Illustrative only — not a quoted price.** Actual rebuild cost depends on team rates, scope cuts, and compliance audit requirements.

A buyer rebuilding SSTracker's **documented scope** from scratch would need to deliver:

| Workstream | Complexity signal |
|------------|-------------------|
| Four persona OS (Player, Parent, Coach, Director) | 15 Tier 1 routes + vision canon + test guards |
| COPPA/VPC + consent records | Callable ceremony + rules + minor retention queue |
| SafeSport comms model | Coach→minor block + household threads |
| Coach intent → Train → XP loop | `secureDeployIntent`, `logTrainingSession`, cadence triggers |
| Tryout lifecycle OS | Registration through roster promote callables |
| Cell-routed multi-tenant Firestore | `ARCHITECTURE.md` perimeter + 7 function codebases |
| Competitive table stakes | RSVP, registration, eligibility, parent push/calendar |
| Test + deploy infrastructure | Vitest guards, split `deploy:*` playbooks |

**Time-to-market signal:** Competitive assessment positions SSTracker as **12–18 months ahead** of a greenfield rebuild for equivalent compliance + development-loop depth — assuming a senior full-stack team familiar with Firebase.

**What the buyer is not buying:** Audited financials, SOC 2 report, paying customer base, or App Store distribution.

---

## What increases vs decreases price

### Increases buyer willingness to pay

| Factor | Evidence |
|--------|----------|
| **Owner Phase 5 QA sign-off** | [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md) exec cut complete |
| **First pilot club** | Production tenant with real guardians + coaches |
| **Clean IP chain** | 100% founder assignment documented — [`legal/IP_AND_ENTITY_CHECKLIST.md`](./legal/IP_AND_ENTITY_CHECKLIST.md) |
| **Competitive process** | Multiple strategic LOIs |
| **RL policy live** | `abPercent` > 0 with ops validation |
| **Additional sport configs** | Beyond soccer — proves multi-sport GTM |

### Decreases price or buyer interest

| Factor | Detail |
|--------|--------|
| **Pre-revenue / no pilots** | Current state — priced as technology bet |
| **Firebase perceived lock-in** | Mitigated by documented cell boundaries in [`ARCHITECTURE.md`](../ARCHITECTURE.md) |
| **Missing store binaries** | Parent mobile adoption gap vs TeamSnap |
| **Federation API gap** | If buyer's GTM is soccer state-body sync only |
| **Open QA findings** | Parent JWT household, Train handoff — see [`PRODUCT_STATE.md`](./PRODUCT_STATE.md) |
| **No SOC 2 / no audited financials** | Enterprise procurement friction — see below |

---

## Explicit non-claims

**Do not represent these unless documentation exists outside this repo:**

| Claim | SSTracker status |
|-------|------------------|
| SOC 2 Type I or II | **Not claimed** — no report in data room |
| PCI DSS certification | **Not claimed** — Stripe handles card data; no PCI attestation in repo |
| Audited financial statements | **Not available** — pre-revenue |
| Paying customer count | **Not documented** |
| HIPAA compliance | **Not in scope** — youth sports platform |
| Production SLA / uptime guarantees | **Not offered** — QA tenant is live-fire dev project |

Security posture summary: [`SECURITY.md`](./SECURITY.md) · subprocessors and controls documented; formal certifications are post-close acquirer ops.

---

## Suggested diligence sequence before term sheet

1. [`PRODUCT_STATE.md`](./PRODUCT_STATE.md) — honest shipped vs partial
2. Live exec cut — [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) on `qa_launch_2026`
3. Technical review — [`ARCHITECTURE_DATA_FLOWS.md`](./ARCHITECTURE_DATA_FLOWS.md) + [`SECURITY.md`](./SECURITY.md)
4. Legal starter pack — [`legal/README.md`](./legal/README.md)
5. Transfer planning — [`TRANSFER.md`](./TRANSFER.md)

---

## Related documents

- [`TRACTION.md`](./TRACTION.md) — build signals, $0 ARR
- [`PROSPECTUS.md`](./PROSPECTUS.md) — full product narrative
- [`FAQ.md`](./FAQ.md) — diligence Q&A
- [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) — parity matrix
