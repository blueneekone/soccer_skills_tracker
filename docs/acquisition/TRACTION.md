# SSTracker — Traction & Launch Status

**Purpose:** Factual build and quality signals for acquirer diligence — not inflated metrics.  
**Last updated:** 2026-06-13

---

## Commercial traction

| Metric | Status |
|--------|--------|
| Paying clubs | **None documented in repo** (pre-commercial) |
| MAU / DAU | **Not tracked** in repository |
| ARR / MRR | **$0** — no billing production path sign-off |
| App Store ratings | N/A — no store binaries |

**Interpretation:** Acquisition value is **technology + architecture + launch-ready functional OS**, not recurring revenue.

---

## Product delivery signals

Source: [`ROADMAP.md`](../../ROADMAP.md) · [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md)

| Milestone | Status | Evidence |
|-----------|--------|----------|
| LAUNCH-functional-os | **Done** | Persona routes wired |
| LAUNCH Wave 0 — household graph | **Done** | `deploy:compliance` household callables |
| LAUNCH Wave 1 — RSVP, reg, tryouts, eligibility | **Done** | `deploy:core` callable set |
| LAUNCH Wave 2 — parent push, calendar, PWA | **Done** | Parent dashboard parity |
| Player OS Phase 7 (G1–G10) | **Done** | `playerOsCohesion.test.ts`, G10 manifest |
| Functional audit A–F | **Done** | [`FUNCTIONAL_AUDIT_BACKLOG.md`](../FUNCTIONAL_AUDIT_BACKLOG.md) |
| LAUNCH-deploy-dev | **Pending** | Operator deploy checklist |
| Owner FUNCTIONAL_MVP QA | **Pending** | Checkboxes in [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) |

---

## Engineering quality signals

| Signal | Detail |
|--------|--------|
| Version | `5.0.0` ([`package.json`](../../package.json)) |
| Unit tests | Vitest — persona guards, player HUD sprints, comms sprints, firestore rules |
| Key regression | `personaFunctionalMvp.test.ts` — includes functional audit A–F block |
| E2E | Playwright scaffold (`npm run test:e2e`) |
| Functions deploy guards | `functionsDeploy.guard.test.js`, `verify-codebase-deps.cjs` |
| Build | `npm run build` — Vite production bundle with content-hash assets |

### Test commands (reproducible)

```bash
npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts
npm run check    # expect pre-existing TS debt
npm run build
```

---

## Live environment

| Environment | URL | Firebase project |
|-------------|-----|------------------|
| Dev QA (primary) | https://sstracker.app | `sports-skill-tracker-dev` |
| Prod hosting alias | https://soccer-skills-tracker.web.app | `soccer-skills-tracker` |

QA tenant: club `qa_launch_2026` — [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md)

---

## Competitive parity scorecard

From [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md):

| Dimension | Verdict |
|-----------|---------|
| Beat competitors on | Development loop, SafeSport comms, COPPA/VPC, coach intent, RL homework, tryout OS |
| At parity | RSVP, registration-lite, roster invite, eligibility, parent calendar/push, PWA |
| Behind | Native store apps, NGB export |
| Launch gate | **Partial** — code shipped; deploy + QA remain |

---

## Overnight parallel sprint (2026-06)

Multiple agents executing launch gaps in parallel — progress in [`SLICE_LOG.md`](./SLICE_LOG.md):

| Agent track | Branch focus |
|-------------|--------------|
| 01 | Data room (this document set) |
| 02 | Launch P0 |
| 03–07 | P2 reg, payments, tournament, Checkr, tracker nav |
| 08–13 | Route/component/store audits |
| 14 | Federation / NGB export |
| 17 | Native Capacitor shell |
| 24 | Deploy verify |

Merge order: [`MERGE_ORDER.md`](./MERGE_ORDER.md)

---

## What "traction" means for this deal

| Buyer profile | Relevant signal |
|---------------|-----------------|
| **Strategic (TeamSnap / NBC / stack vendor)** | Moat architecture + compliance depth + tryout OS |
| **PE / roll-up** | Speed to market vs 12–18 mo rebuild |
| **Acqui-hire** | Svelte/Firebase/ML homework expertise in codebase |

---

## Next milestones (post-acquisition)

1. Green Phase 0 deploy on dev — [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md)
2. First paying pilot club (outside QA tenant)
3. App Store binary via Capacitor (agent 17)
4. Federation CSV/export for soccer GTM (agent 14)

→ [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) · [PROSPECTUS.md](./PROSPECTUS.md)
