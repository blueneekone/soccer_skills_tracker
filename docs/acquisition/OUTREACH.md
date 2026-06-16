# SSTracker — Acquirer Outreach

**Purpose:** Templates and targeting notes for strategic outreach. Customize before sending.  
**Last updated:** 2026-06-13

---

## Target acquirer categories

| Tier | Examples | Fit rationale |
|------|----------|---------------|
| **A — Strategic platform** | NBC Sports Next (SportsEngine), TeamSnap, LeagueApps | Add development OS + COPPA depth to existing parent base |
| **B — Vertical soccer** | GotSport, US Club Soccer tech partners | Tryout OS + household graph; federation export on roadmap |
| **C — Youth sports roll-up** | Private equity portfolio clubs / multi-club orgs | Standardize compliance + player development across holdings |
| **D — Fitness / ed-tech adjacency** | Companies expanding into youth sports compliance | VPC architecture transferable to other minor-facing products |

**Not a fit:** Buyers requiring day-one club website CMS or 38-body live federation sync — see [NOTABLE_GAPS.md](./NOTABLE_GAPS.md).

---

## Positioning line

> **SSTracker is the development OS for clubs that have outgrown schedule-and-chat — with SafeSport-native comms and COPPA depth incumbents cannot match.**

Supporting docs: [ONE_PAGER.md](./ONE_PAGER.md) · [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md)

---

## Cold email — strategic (short)

**Subject:** Development OS + COPPA architecture — diligence materials available

Hi [Name],

I'm reaching out because [Company] owns parent-facing club ops at scale, while athlete **development loops** and **COPPA-native consent** are still bolted on via spreadsheets and waiver checkboxes.

We've built **SSTracker** — a shipped Player · Parent · Coach · Director platform on SvelteKit + Firebase with:

- Coach intent → locked Train prescriptions → XP (daily engagement incumbents lack)
- Household-gated comms (no coach→minor unsupervised DM)
- Full tryout lifecycle OS (reg → eval → callback → roster)
- Cell-isolated multi-tenant Firestore for federation scale

Wave 0–2 table stakes (RSVP, registration-lite, eligibility, parent calendar/push) are **in code**; we're pre-revenue and opening a structured data room for strategic acquirers.

**15-min exec demo** available on our live QA environment, or I can send the one-pager + architecture index.

Best,  
[Founder]

Attach: [ONE_PAGER.md](./ONE_PAGER.md) · PDF: https://sports-skill-tracker-dev.web.app/acquisition/sstracker-executive-brief.pdf · link to [INDEX.md](./INDEX.md) and [/acquisition](https://sstracker.app/acquisition)

---

## Cold email — technical founder / corp dev

**Subject:** Firebase cell-routed youth sports platform — acquisition data room

Hi [Name],

Sharing a pre-launch asset that may fit [Company]'s youth sports roadmap:

**Stack:** Svelte 5 + Firebase Functions v2 (7 codebases) + cell-based Firestore routing  
**Moat:** RL adaptive homework path, VPC ceremony with auditable `consent_records`, SafeSport callable enforcement  
**Status:** Functional audit closed; deploy QA pending on `sports-skill-tracker-dev`

Data room includes ARCHITECTURE, FUNCTIONAL_MVP, SECURITY, TRANSFER, and a live demo script against https://sstracker.app.

Happy to walk through the VPC golden path and coach→player intent loop in one session.

[Founder]

---

## Follow-up — after NDA

Send:

1. [INDEX.md](./INDEX.md) — diligence order
2. [PROSPECTUS.md](./PROSPECTUS.md) — or PDF: https://sports-skill-tracker-dev.web.app/acquisition/sstracker-prospectus.pdf
3. [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) + QA tenant provision instructions
4. [`ARCHITECTURE.md`](../ARCHITECTURE.md)
5. [SECURITY.md](./SECURITY.md)
6. [NOTABLE_GAPS.md](./NOTABLE_GAPS.md) — intentional non-parity

Offer: 45-min technical session + 15-min exec cut (see DEMO_SCRIPT exec section).

---

## Objection handlers

| Objection | Response |
|-----------|----------|
| "We already have TeamSnap" | SSTracker is the **development layer** — Train/XP/intent — not a calendar replacement. Complement or upsell to clubs outgrowing chat. |
| "No revenue" | Priced as **technology acquisition** — compare rebuild cost of compliance + 4 persona OS + tryout cycle. |
| "Firebase lock-in" | Cell model is portable conceptually; acquirer can migrate to GCP-native or hybrid over time. ARCHITECTURE documents boundaries. |
| "Missing website builder" | **Intentional** — public `/club`, `/register`, `/tryouts` routes cover conversion; CMS is P3 reject per competitive assessment. |
| "No App Store app" | PWA + Capacitor path in flight; store submission is acquirer ops task. |

More: [FAQ.md](./FAQ.md)

---

## Demo scheduling checklist

- [ ] Confirm Phase 0 deploy green on dev
- [ ] Provision `qa_launch_2026` tenant
- [ ] Prepare 3 browser profiles (parent / coach / player)
- [ ] Send [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) exec cut to attendees ahead of call
- [ ] Have [LIMITATIONS.md](./LIMITATIONS.md) ready for transparent Q&A

---

## Materials export

For PDF data room zip, include hosted PDFs plus repo docs:

```
https://sports-skill-tracker-dev.web.app/acquisition/sstracker-executive-brief.pdf
https://sports-skill-tracker-dev.web.app/acquisition/sstracker-prospectus.pdf
docs/acquisition/INDEX.md
docs/acquisition/ONE_PAGER.md
docs/acquisition/PROSPECTUS.md
docs/acquisition/TRACTION.md
docs/acquisition/LIMITATIONS.md
docs/acquisition/NOTABLE_GAPS.md
docs/acquisition/SECURITY.md
docs/acquisition/TRANSFER.md
docs/acquisition/DEMO_SCRIPT.md
docs/acquisition/FAQ.md
docs/ARCHITECTURE.md
docs/vision/FUNCTIONAL_MVP.md
docs/QA_DEV_PERSONA_VERIFICATION.md
docs/FUNCTIONS_DEPLOY.md
docs/FUNCTIONAL_AUDIT_BACKLOG.md
docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md
```

---

## Internal only — do not send

- [`SLICE_LOG.md`](./SLICE_LOG.md) · [`PARALLEL_STATUS.md`](./PARALLEL_STATUS.md) — agent orchestration noise
- `.cursor/rules/` — agent constraints
- Owner email credentials — use provision script on acquirer-controlled accounts instead
