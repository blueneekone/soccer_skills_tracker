# SSTracker — Inbound Playbook

**Purpose:** Founder workflow after LinkedIn / advisor inbound — qualify, gate, and escalate diligence without oversharing.  
**Last updated:** 2026-06-25 · ACQ-DATAROOM-COMPLETE

---

## 1. Qualify inbound

| Signal | Category | Action |
|--------|----------|--------|
| VP Corp Dev / Product at TeamSnap, SportsEngine, LeagueApps, GameChanger, Stack, Hudl | **Strategic platform** | High priority — proceed to step 2 |
| PE ops / multi-club holding company | **Roll-up** | Medium-high — emphasize compliance + standardization |
| "We build apps for sports clubs" dev shop | **Services** | Low — polite decline unless white-label partnership intent |
| No company email, vague "interested in your startup" | **Tire-kicker** | Send ONE_PAGER only; no NDA until qualified |
| Press / journalist | **Media** | No data room — redirect to public `/acquisition` landing |
| GotSport-only federation API interest | **Mismatch** | Share NOTABLE_GAPS; qualify for multi-sport OS interest |

**Qualifying questions (one email):**

1. Are you evaluating **technology acquisition** or partnership/integration?
2. Which persona surface matters most — player development loop, parent mobile, or club ops?
3. Timeline and decision-maker role?

---

## 2. First reply — executive brief only (no repo)

**Send:**

- [`ONE_PAGER.md`](./ONE_PAGER.md) or PDF: https://sstracker.app/acquisition/sstracker-executive-brief.pdf
- One paragraph positioning (from [`OUTREACH.md`](./OUTREACH.md))
- Offer 15-minute exec cut demo on live QA tenant

**Do not send:** repository access, full INDEX, architecture docs, or zip.

---

## 3. NDA

Before full data room:

- [`legal/MUTUAL_NDA_TEMPLATE.md`](./legal/MUTUAL_NDA_TEMPLATE.md) — **founder must have counsel review before use**
- Or advisor-provided mutual NDA if M&A advisor leads process

Track: counterparty legal name, signatory, effective date, term.

---

## 4. After NDA — INDEX + ONE_PAGER + schedule exec cut

**Send:**

1. [`INDEX.md`](./INDEX.md) — gated data room front door (post-NDA section)
2. [`ONE_PAGER.md`](./ONE_PAGER.md) + executive brief PDF
3. [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) exec cut section
4. Calendar link for **15-minute exec cut** (Session A in [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md))

**Provision:** QA tenant instructions only after serious scheduling — `node scripts/dev-tenant-reset.mjs --provision`.

---

## 5. After serious interest — full zip / VDR

**Send:**

```bash
npm run bundle:dataroom
```

Artifact: `dist/sstracker-dataroom.zip` — see [`INDEX.md`](./INDEX.md) for contents.

Optional: upload zip to virtual data room (Datasite, Ansarada, etc.) with access logging.

**Include:** [`PRODUCT_STATE.md`](./PRODUCT_STATE.md), [`PERSONA_DILIGENCE.md`](./PERSONA_DILIGENCE.md), [`ARCHITECTURE_DATA_FLOWS.md`](./ARCHITECTURE_DATA_FLOWS.md), legal starters, PDFs.

---

## 6. Do NOT send

| Item | Reason |
|------|--------|
| [`SLICE_LOG.md`](./SLICE_LOG.md) | Agent orchestration noise |
| [`PARALLEL_STATUS.md`](./PARALLEL_STATUS.md) / [`PARALLEL_SUMMARY.md`](./PARALLEL_SUMMARY.md) | Internal sprint board |
| `docs/acquisition/agents/**` | Agent manifests — not buyer-facing |
| `LAUNCHED_AGENTS.json` | Internal automation |
| `.cursor/rules/` | Agent constraints |
| Owner credentials / Firebase tokens | Transfer via [`TRANSFER.md`](./TRANSFER.md) post-LOI |
| Unreviewed legal templates as final | Counsel review required |

---

## 7. Sample 3-line DM replies

### Interested (strategic)

> Thanks for reaching out — SSTracker is a sport-configurable youth sports OS (player training loop + COPPA-native parent/coach/club surfaces). Happy to share our executive brief and schedule a 15-min live walkthrough on our QA environment. Are you open to a mutual NDA before we send the full diligence index?

### Not sure / early

> Appreciate the note. We're pre-revenue with a functional OS on Firebase — strongest fit for platforms wanting a development-engagement layer vs schedule-only tools. I can send a one-pager PDF if helpful; full materials after NDA if there's a real strategic fit.

### Press / not a fit

> Thanks for connecting. We're not running a public sale process — for product background see https://sstracker.app/acquisition. For press inquiries please email [founder@] with your outlet and deadline.

---

## Related documents

- [`OUTREACH.md`](./OUTREACH.md) — email templates + objection handlers
- [`INDEX.md`](./INDEX.md) — diligence order
- [`legal/README.md`](./legal/README.md) — legal checklist
