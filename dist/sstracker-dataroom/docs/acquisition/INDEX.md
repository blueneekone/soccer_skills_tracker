# SSTracker — Acquisition Data Room

**Product:** Sports Skill Tracker (SSTracker / Nexus Command)  
**Stage:** Pre-commercial launch · functional OS · owner Phase 5 exec-cut QA pending  
**Live QA environment:** [https://sstracker.app](https://sstracker.app) (Firebase project `sports-skill-tracker-dev`)  
**Last updated:** 2026-06-25 · ACQ-DATAROOM-COMPLETE

---

## Before NDA (public / first touch only)

Share **only** these materials until a mutual NDA is executed:

| Document | Format |
|----------|--------|
| [ONE_PAGER.md](./ONE_PAGER.md) | Markdown |
| Executive brief PDF | https://sstracker.app/acquisition/sstracker-executive-brief.pdf |

**Do not send:** full INDEX, repo access, architecture docs, zip bundle, or agent manifests. See [INBOUND_PLAYBOOK.md](./INBOUND_PLAYBOOK.md).

Regenerate PDFs: `npm run build:acquisition-pdfs` (requires Playwright Chromium)

---

## After NDA (full data room index)

### Executive

| Document | Purpose |
|----------|---------|
| [ONE_PAGER.md](./ONE_PAGER.md) | 60-second product + moat summary |
| [PROSPECTUS.md](./PROSPECTUS.md) | Full product, market, technical narrative |
| [Executive brief PDF](https://sstracker.app/acquisition/sstracker-executive-brief.pdf) | Printable exec summary |
| [Prospectus PDF](https://sstracker.app/acquisition/sstracker-prospectus.pdf) | Printable full prospectus |
| [VALUATION_FRAMING.md](./VALUATION_FRAMING.md) | Pre-revenue deal framing (not a financial model) |
| [TRACTION.md](./TRACTION.md) | Build signals · $0 ARR · honest metrics |
| [FAQ.md](./FAQ.md) | Common diligence questions |
| [OUTREACH.md](./OUTREACH.md) | Acquirer outreach templates |
| [INBOUND_PLAYBOOK.md](./INBOUND_PLAYBOOK.md) | LinkedIn / inbound qualify → NDA → zip workflow |

### Product state & vision

| Document | Purpose |
|----------|---------|
| [PRODUCT_STATE.md](./PRODUCT_STATE.md) | **Canonical where we are** — shipped / partial / planned |
| [NOTABLE_GAPS.md](./NOTABLE_GAPS.md) | Intentional non-parity vs TeamSnap / SportsEngine |
| [LIMITATIONS.md](./LIMITATIONS.md) | Honest scope boundaries |
| [PLATFORM_GAP_REGISTER.md](./PLATFORM_GAP_REGISTER.md) | Gap register — BuildOwner, ManualQaId |
| [COMPETITIVE_LAUNCH_ASSESSMENT.md](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) | Parity matrix vs incumbents |
| [FUNCTIONAL_MVP.md](../vision/FUNCTIONAL_MVP.md) | Launch checklist + VPC golden path |
| [SPORTS_CONFIGS.md](../SPORTS_CONFIGS.md) | Multi-sport `sports_configs` architecture |
| [ROADMAP.md](../../ROADMAP.md) | Sprint delivery tracker (when, not duplicate tables here) |

### Personas

| Document | Purpose |
|----------|---------|
| [PERSONA_DILIGENCE.md](./PERSONA_DILIGENCE.md) | **Acquirer persona matrix** — capabilities + demo scope |
| [PERSONA_ECOSYSTEM.md](../PERSONA_ECOSYSTEM.md) | Canonical roles, routes, handoffs |
| [PRODUCT_SURFACE_REGISTRY.md](../vision/PRODUCT_SURFACE_REGISTRY.md) | Gospel truth — routes, tiers, workflow_id |

### Architecture & flows

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Four-tier stack, cells, Trinity pattern |
| [ARCHITECTURE_DATA_FLOWS.md](./ARCHITECTURE_DATA_FLOWS.md) | **Gold-path sequence diagrams** for diligence |
| [DATA_FLOW.md](../DATA_FLOW.md) | Liability-heavy async loops (CV, COPPA, staff) |
| [FUNCTIONS_DEPLOY.md](../FUNCTIONS_DEPLOY.md) | Multi-codebase deploy playbook |
| [CELLS.md](../CELLS.md) · [CELL_ROUTING.md](../CELL_ROUTING.md) | Cell isolation detail |

### Security

| Document | Purpose |
|----------|---------|
| [SECURITY.md](./SECURITY.md) | COPPA, SafeSport, cells, subprocessors |
| [legal/PRIVACY_AND_MINORS_DILIGENCE.md](./legal/PRIVACY_AND_MINORS_DILIGENCE.md) | Privacy counsel brief |

### QA & demo

| Document | Purpose |
|----------|---------|
| [OWNER_QA_CHECKLIST.md](../vision/OWNER_QA_CHECKLIST.md) | Owner bible — Phase 5 exec cut = acquisition P0 |
| [PLATFORM_WORKFLOW_CANON.md](../vision/PLATFORM_WORKFLOW_CANON.md) | GP-ACQ / GP-COACH / GP-PARENT / GP-GATE |
| [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) | Persona walkthrough on dev tenant |
| [QA_DEV_PERSONA_VERIFICATION.md](../QA_DEV_PERSONA_VERIFICATION.md) | Legacy phased notes (superseded by owner checklist) |

### Legal

| Document | Purpose |
|----------|---------|
| [legal/README.md](./legal/README.md) | Legal diligence checklist |
| [legal/MUTUAL_NDA_TEMPLATE.md](./legal/MUTUAL_NDA_TEMPLATE.md) | Mutual NDA template — **counsel review required** |
| [legal/IP_AND_ENTITY_CHECKLIST.md](./legal/IP_AND_ENTITY_CHECKLIST.md) | Entity + IP fill-in |
| [CAP_TABLE_TEMPLATE.md](./CAP_TABLE_TEMPLATE.md) | Cap table placeholder |

### Operations

| Document | Purpose |
|----------|---------|
| [TRANSFER.md](./TRANSFER.md) | Handoff — repos, Firebase, secrets |
| [FUNCTIONAL_AUDIT_BACKLOG.md](../FUNCTIONAL_AUDIT_BACKLOG.md) | Closed wiring gaps A–F |
| [DOC_SYNC_REPORT.md](./DOC_SYNC_REPORT.md) | Doc sync audit log |

**Download full zip (post-NDA):** `npm run bundle:dataroom` → `dist/sstracker-dataroom.zip`

---

## Internal only — do not share with acquirers

| Path | Reason |
|------|--------|
| [SLICE_LOG.md](./SLICE_LOG.md) | Agent progress log |
| [PARALLEL_STATUS.md](./PARALLEL_STATUS.md) · [PARALLEL_SUMMARY.md](./PARALLEL_SUMMARY.md) | Sprint orchestration |
| [MERGE_ORDER.md](./MERGE_ORDER.md) | Branch merge sequence |
| [WAVE_3_MANIFEST.md](./WAVE_3_MANIFEST.md) · [WAVE_4_MANIFEST.md](./WAVE_4_MANIFEST.md) | Agent fleet manifests |
| `docs/acquisition/agents/**` | Agent slice specs |
| `.cursor/rules/` | Agent constraints |
| Owner credentials | Use provision script on acquirer-controlled accounts |

---

## Recommended diligence order

1. **NDA** — [legal/MUTUAL_NDA_TEMPLATE.md](./legal/MUTUAL_NDA_TEMPLATE.md) (counsel-reviewed) or advisor NDA
2. **ONE_PAGER** + executive brief PDF — first substance after NDA
3. **PRODUCT_STATE** + **PERSONA_DILIGENCE** — honest shipped vs partial
4. **ARCHITECTURE** + **ARCHITECTURE_DATA_FLOWS** + **SECURITY** — technical depth
5. **DEMO_SCRIPT** + live exec cut on https://sstracker.app (`qa_launch_2026`)
6. **Full zip** — `npm run bundle:dataroom` or VDR upload

Extended path: [PROSPECTUS.md](./PROSPECTUS.md) → [COMPETITIVE_LAUNCH_ASSESSMENT.md](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) + [NOTABLE_GAPS.md](./NOTABLE_GAPS.md) → [TRANSFER.md](./TRANSFER.md)

---

## Contact / access

- **QA tenant:** club `qa_launch_2026`, team `qa_launch_2026_ppc` — `node scripts/dev-tenant-reset.mjs --provision`
- **Firebase projects:** dev `sports-skill-tracker-dev` · prod alias `soccer-skills-tracker` ([`.firebaserc`](../../.firebaserc))
- **Regression guard:** `npm test -- docs/acquisition/__tests__/acquisitionVisionDocSync.test.ts`
- **Acquisition PDFs:** `/acquisition/sstracker-executive-brief.pdf` · `/acquisition/sstracker-prospectus.pdf`
