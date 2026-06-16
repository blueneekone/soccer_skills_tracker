# SSTracker — Traction & Launch Status

**Purpose:** Factual build and quality signals for acquirer diligence — not inflated metrics.  
**Last updated:** 2026-06-15 · orch-wave4 merge · Wave 3B + Wave 4 Done

---

## Commercial traction

| Metric | Status |
|--------|--------|
| Paying clubs | **None documented in repo** (pre-commercial) |
| MAU / DAU | **Not tracked** in repository |
| ARR / MRR | **$0** — no billing production path sign-off |
| App Store ratings | N/A — no store binaries (Capacitor shell in repo) |

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
| Overnight P2 + check=0 + CI vitest | **Done** | Merged to dev 2026-06-13; Wave 3A closure merged 2026-06-14 |
| Wave 3A gap closure (16 slices) | **Done** | [`PLATFORM_GAP_REGISTER.md`](./PLATFORM_GAP_REGISTER.md) — 76/86 rows Done |
| Wave 3B deploy + smoke | **Done** | `live-deploy-dev` + `post-deploy-guards` · `npm run smoke:dev` green 2026-06-15 |
| Wave 4 competitive parity | **Done** | orch-wave4 merge — B-03, E-03, C-03, D-03, D-04 closed |
| Owner FUNCTIONAL_MVP QA | **Pending** | Checkboxes in [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md) Phase 0–4 |

---

## Engineering quality signals

| Signal | Detail |
|--------|--------|
| Version | `5.0.0` ([`package.json`](../../package.json)) |
| Type-check | `npm run check` → **0 errors** (CI gate) |
| Unit tests | Vitest — **142** green files in CI allowlist; persona + launch guards pass |
| Key regression | `personaFunctionalMvp.test.ts` — includes functional audit A–F block |
| E2E | Playwright scaffold (`npm run test:e2e`) |
| Functions deploy guards | `functionsDeploy.guard.test.js`, `verify-codebase-deps.cjs` |
| Build | `npm run build` — Vite production bundle with content-hash assets |

### Test commands (reproducible)

```bash
npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts
npm test -- src/lib/parent/__tests__/launchWave2Complete.test.ts
npm run check    # 0 errors gate
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
| At parity | RSVP, registration, roster invite, eligibility, parent calendar/push, PWA, payment installments |
| Partial (accept v1) | Live deploy confirm (Wave 3B) |
| Behind | App Store / Play Store binaries |
| Launch gate | **Partial** — 4 Agent rows (3B deploy) → owner QA |

---

## Wave 3 closure sprint (2026-06-14) — 3A complete

16 `closure/*` branches merged to `dev`. Progress in [`SLICE_LOG.md`](./SLICE_LOG.md) · status in [`PARALLEL_STATUS.md`](./PARALLEL_STATUS.md).

| Track | Outcome |
|-------|---------|
| Commerce + eligibility (payment-webhook, eligibility-ux) | Done |
| Integrations (fcm-broadcast, checkr-webhooks, smoke-dev-script) | Done |
| Federation + tournament P2 | Done |
| Player OS 6f/6j + diegetic modals | Done |
| Vitest burn-down (129→142 CI files) + RL export fix | Done |
| Doc sync (functional-mvp, orch-wave3) | Done |
| Wave 3B (live-deploy-dev, post-deploy-guards) | **Pending launch** |
| Gemini ingest 2/3 (3C) | Blocked (no owner assets) |

---

## Overnight parallel sprint (2026-06) — complete

Phase 1 + Phase 2 merged to `dev`. Progress in [`SLICE_LOG.md`](./SLICE_LOG.md) · status in [`PARALLEL_SUMMARY.md`](./PARALLEL_SUMMARY.md).

| Track | Outcome |
|-------|---------|
| P0 + P2 parity (02–07) | Done |
| svelte-check burn-down (08–13, 22) | Done (check=0) |
| Federation, live stream, marketing, native shell (14–17) | Done |
| CI vitest + deploy scripts (23–24) | Done / Partial (live deploy = owner) |
| Gemini ingest 2/3 (19–20) | Blocked (no owner assets) |

---

## What "traction" means for this deal

| Buyer profile | Relevant signal |
|---------------|-----------------|
| **Strategic (TeamSnap / NBC / stack vendor)** | Moat architecture + compliance depth + tryout OS |
| **PE / roll-up** | Speed to market vs 12–18 mo rebuild |
| **Acqui-hire** | Svelte/Firebase/ML homework expertise in codebase |

---

## Next milestones (pre-close)

1. Wave 3B live deploy — `node scripts/launch-overnight-agents.mjs --wave 3b` (requires `FIREBASE_TOKEN`)
2. Owner QA on `qa_launch_2026` — [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md)
3. First paying pilot club (outside QA tenant)
4. App Store binary via Capacitor (acquirer)
5. Federation Phase 4 API if soccer GTM proceeds

→ [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) · [PROSPECTUS.md](./PROSPECTUS.md) · [GAP_CLOSURE_PLAN.md](./GAP_CLOSURE_PLAN.md)
