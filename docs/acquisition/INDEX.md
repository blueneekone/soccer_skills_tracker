# SSTracker — Acquisition Data Room

**Product:** Sports Skill Tracker (SSTracker / Nexus Command)  
**Stage:** Pre-commercial launch · functional OS + overnight P2 merged · owner QA pending  
**Live QA environment:** [https://sstracker.app](https://sstracker.app) (Firebase project `sports-skill-tracker-dev`)  
**Last updated:** 2026-06-14 · platform gap register + Wave 3 manifest

---

## Start here

| Document | Audience | Purpose |
|----------|----------|---------|
| [ONE_PAGER.md](./ONE_PAGER.md) | Exec / first touch | 60-second product + moat summary |
| [PROSPECTUS.md](./PROSPECTUS.md) | Acquirer diligence | Full product, market, and technical narrative |
| [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) | Sales / QA | Persona walkthrough on dev tenant |
| [TRACTION.md](./TRACTION.md) | Investor / acquirer | Build status, test coverage, launch gate |
| [LIMITATIONS.md](./LIMITATIONS.md) | Legal / eng | Honest scope boundaries |
| [NOTABLE_GAPS.md](./NOTABLE_GAPS.md) | Product / GTM | Intentional non-parity vs TeamSnap / SportsEngine |
| [PLATFORM_GAP_REGISTER.md](./PLATFORM_GAP_REGISTER.md) | Eng / owner | **Canonical** full-platform gap register (all sections A–M) |
| [WAVE_3_MANIFEST.md](./WAVE_3_MANIFEST.md) | Eng / agents | Parallel closure fleet — slice IDs, merge order, agent prompts |
| [GAP_CLOSURE_PLAN.md](./GAP_CLOSURE_PLAN.md) | Eng / owner | Historical pre-QA backlog (superseded by register for execution) |
| [DOC_SYNC_REPORT.md](./DOC_SYNC_REPORT.md) | Eng | Audit log of doc sync vs merged code |
| [SECURITY.md](./SECURITY.md) | InfoSec / compliance | Architecture, COPPA, SafeSport, cells |
| [TRANSFER.md](./TRANSFER.md) | Acquirer ops | Handoff checklist — repos, Firebase, secrets |
| [FAQ.md](./FAQ.md) | All | Common diligence questions |
| [OUTREACH.md](./OUTREACH.md) | Founder | Acquirer outreach templates |

---

## Technical due diligence (canonical repo docs)

These live outside `docs/acquisition/` and are **source of truth** for engineering review:

| Document | Path | Covers |
|----------|------|--------|
| **Architecture** | [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) | Four-tier stack, cell routing, Cloud Functions v2, Trinity pattern |
| **Functional MVP** | [`docs/vision/FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) | Player · Parent · Coach launch checklist + VPC golden path |
| **QA / Dev personas** | [`docs/QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md) | Phased pair-program QA on `sports-skill-tracker-dev` |
| **Functions deploy** | [`docs/FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md) | Multi-codebase deploy playbook (`core`, `rl`, `compliance`, …) |
| **Functional audit** | [`docs/FUNCTIONAL_AUDIT_BACKLOG.md`](../FUNCTIONAL_AUDIT_BACKLOG.md) | A–F backlog closed 2026-06-10; deploy checklist remains |

### Related authority

- [`ROADMAP.md`](../../ROADMAP.md) — sprint delivery tracker (orchestrator may sync from `SLICE_LOG.md`)
- [`docs/PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) — roles, routes, handoffs
- [`docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) — parity matrix vs TeamSnap / SportsEngine / GotSport

---

## Overnight parallel work (complete — merged to dev)

| File | Purpose |
|------|---------|
| [`SLICE_LOG.md`](./SLICE_LOG.md) | Append-only agent progress (do not edit prior rows) |
| [`MERGE_ORDER.md`](./MERGE_ORDER.md) | Branch merge sequence → `overnight/base` → `dev` |
| [`PARALLEL_STATUS.md`](./PARALLEL_STATUS.md) | Final agent status board |
| [`PARALLEL_SUMMARY.md`](./PARALLEL_SUMMARY.md) | Phase 1 + 2 summary |
| [`PLATFORM_GAP_REGISTER.md`](./PLATFORM_GAP_REGISTER.md) + [`WAVE_3_MANIFEST.md`](./WAVE_3_MANIFEST.md) | **Next:** Wave 3 closure fleet |

---

## Recommended diligence order

1. [ONE_PAGER.md](./ONE_PAGER.md) → [PROSPECTUS.md](./PROSPECTUS.md)
2. [COMPETITIVE_LAUNCH_ASSESSMENT.md](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) + [NOTABLE_GAPS.md](./NOTABLE_GAPS.md)
3. [`ARCHITECTURE.md`](../ARCHITECTURE.md) + [SECURITY.md](./SECURITY.md)
4. [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) on https://sstracker.app with QA tenant
5. [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) + [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md)
6. [PLATFORM_GAP_REGISTER.md](./PLATFORM_GAP_REGISTER.md) + [WAVE_3_MANIFEST.md](./WAVE_3_MANIFEST.md) — closure backlog + agent fleet
7. [TRANSFER.md](./TRANSFER.md) + [`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md)

---

## Contact / access

- **QA tenant:** club `qa_launch_2026`, team `qa_launch_2026_ppc` — provision via `node scripts/dev-tenant-reset.mjs --provision`
- **Firebase projects:** dev `sports-skill-tracker-dev` · prod alias `soccer-skills-tracker` (see [`.firebaserc`](../../.firebaserc))
- **Regression guard:** `npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts`
