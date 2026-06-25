# SSTracker — Product State (Acquirer Summary)

**Purpose:** Honest state-of-the-union for M&A diligence — what is live, partial, planned, and commercially real today.  
**Authority:** [`PRODUCT_SURFACE_REGISTRY.md`](../vision/PRODUCT_SURFACE_REGISTRY.md) · [`NOTABLE_GAPS.md`](./NOTABLE_GAPS.md) · [`TRACTION.md`](./TRACTION.md)  
**Last updated:** 2026-05-22 · ACQ-QA-DOC-SYNC

---

## Executive summary

SSTracker is a **multi-sport youth sports operating system** — one tenant for addictive player training, parent co-op, coach development, and club/business management. Sport semantics (attribute trees, drill labels, radar axes) configure per `sportId` via `sports_configs/{sportId}`; the same Train → XP → coach-intent loop applies across team sports. **Soccer is the live QA configuration** (`qa_launch_2026`), not the product ceiling. The platform is **pre-revenue**, functionally built on SvelteKit 5 + Firebase, with Wave 0–4 competitive parity code merged and **owner Phase 5 sign-off complete (2026-05-22)**; **GP-ACQ-06 SafeSport messages pending**; **demo video pending** before broad diligence.

---

## What is shipped

Evidence: Tier 1 routes in [`PRODUCT_SURFACE_REGISTRY.md`](../vision/PRODUCT_SURFACE_REGISTRY.md) §1, callables in [`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md), regression tests cited below.

### Trust & compliance gates (Tier 1)

| Surface | Route | Evidence |
|---------|-------|----------|
| Login / router / setup | `/login`, `/home`, `/setup` | `WF-TRUST-*` workflows; `personaFunctionalMvp.test.ts` |
| VPC gate | `/vpc-pending` | Blocks minors until household + VPC complete |
| Coach clearance | `/compliance` | Checkr embed + panopticon matrix |
| Privacy | `/privacy` | Legal surface shipped |

### Parent OS (Tier 1)

| Surface | Route | Callable / data |
|---------|-------|-----------------|
| Household | `/parent/household` | `parentSignCoppaWaiver` → `households.coppaSigned` |
| VPC ceremony | `/parent/vpc` | `parentGrantVpcConsent` → `consent_records`, `users.vpcStatus` |
| Co-op Command | `/parent/dashboard` | RSVP strip, Car Ride debrief, bounty terminal |

### Coach OS (Tier 1)

| Surface | Route | Callable / data |
|---------|-------|-----------------|
| Daily Intel | `/coach` | Squad telemetry hub |
| The Forge | `/coach/forge` | `secureDeployIntent` → `team_assignments` |

### Player OS (Tier 1)

| Surface | Route | Callable / data |
|---------|-------|-----------------|
| HQ | `/player/dashboard` | `ActiveBounties`, `AdaptiveHomework`; `activeBounties.test.ts` |
| Train | `/player/workout` | `logTrainingSession` (functions-core) → `drill_completions`, `users`/`player_stats` XP |
| Stats | `/stats` | Telemetry investigation workspace |

### Comms (Tier 1)

| Surface | Route | Enforcement |
|---------|-------|-------------|
| SafeSport messages | `/messages` | `sendCoachPlayerMessage` blocks coach→minor DM; `commsSprint42.test.ts` |

### Club / table stakes (code shipped — Tier 2+ in registry)

- **RSVP** — `setEventRsvp`
- **Registration-lite + Stripe path** — `createRegistrationIntent`, `/parent/payments`
- **Roster invite** — `claimRosterSpot`
- **Tryout lifecycle** — `upsertTryoutProgram`, `registerForTryout`, `submitTryoutEvaluation`, `promoteTryoutToRoster` (deploy:core)
- **Eligibility matrix** — `upsertClubEligibilityMatrix`
- **Director hub** — `/director` (Tier 2 demo; full Act 4 optional)
- **Multi-sport config** — `sports_configs/{sportId}`; soccer active; architecture ready for additional sports ([`SPORTS_CONFIGS.md`](../SPORTS_CONFIGS.md))

### Engineering quality

- `npm run check` → 0 errors (CI gate)
- Vitest persona + launch guards green (`personaFunctionalMvp.test.ts`, `acquisitionRegression.guard.test.ts`)
- Wave 3B deploy + `npm run smoke:dev` green on `sports-skill-tracker-dev`

---

## What is partial

Honest partials from [`NOTABLE_GAPS.md`](./NOTABLE_GAPS.md) and [`PLATFORM_GAP_REGISTER.md`](./PLATFORM_GAP_REGISTER.md):

| Area | Status | Detail |
|------|--------|--------|
| **Native App Store binaries** | Partial | Capacitor 6 shell in repo; no iOS/Android store submission |
| **Federation / NGB export** | Partial | CSV v1 via `exportStateRoster`; Phase 4 API per governing body not shipped |
| **RL adaptive homework** | Partial | HQ mount + callables shipped; launch default `abPercent: 0` (heuristic only) — see [`RL_ADAPTIVE_WORKOUTS.md`](../RL_ADAPTIVE_WORKOUTS.md) |
| **CV bounty + Tremendous escrow** | Partial | Code paths in `DATA_FLOW.md` §1 and `functions-rl/`; not acquisition-demo scope; `feature_cv_bounty_enabled` gated |
| **Parent co-op log + proof review** | Partial | `/parent/log-workout`, `submitCompletionProof`, `parentReviewCompletionProof` shipped; **parent JWT `householdId` claim sync** can cause permission-denied on operative profile load until re-auth — **monitoring** (does not block demo) |
| **Theme light/dark** | Partial | Dark-first; token split incomplete |
| **Live streaming** | Partial | URL embed MVP only (YouTube/Vimeo/Mux) |
| **Avatar PNG art** | Deferred | `defaultPortraitV2` SVG + initials fallback |
| **Comms UX** | Partial | Mid-migration to unified hub per [`COMMS_CHANNEL_CANON.md`](../vision/COMMS_CHANNEL_CANON.md) — fragmented compose (`/coach/logistics`, `/director?tab=comms`), minor-CC-only parent delivery, receipt UX gap; Phase 1 (4.13a) |

---

## What is planned / post-close

**Not marketed as live today:**

| Item | Notes |
|------|-------|
| **Team Manager JWT** | `/team-manager` route planned; `team_manager` role not in JWT — [`TEAM_MANAGER_OS.md`](../vision/TEAM_MANAGER_OS.md) |
| **Curriculum AI / licensed PD search** | Drill libraries + Forge intents today; no internet PD ingest |
| **App Store / Play binaries** | Acquirer distribution ops |
| **Federation API Phases 2–4** | Owner GTM decision unless soccer federation path |
| **Recruiter / Tutor personas** | Vision stubs; clearance-gated future roles |
| **Platform visual redesign** | Gemini research exports read-only |
| **Gemini bust / avatar ingest** | Post-launch per `LAUNCH-defer-avatar` |

Path citations: [`ROADMAP.md`](../../ROADMAP.md) current sprint header — LAUNCH-functional-os Done, Wave 3B/4 Done, owner Phase 5 signed 2026-05-22.

---

## Commercial reality

From [`TRACTION.md`](./TRACTION.md):

| Metric | Value |
|--------|-------|
| ARR / MRR | **$0** |
| Paying clubs | **None documented** |
| MAU / DAU | **Not tracked** in repository |
| App Store ratings | N/A — no store binaries |
| Live environment | https://sstracker.app — Firebase `sports-skill-tracker-dev` (QA tenant, not commercial production) |

**Interpretation:** Deal value is **technology + architecture + launch-ready functional OS**, not recurring revenue. Do not infer user counts or revenue from this repository.

---

## QA status

Authority: [`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md)

| Phase | Scope | Status |
|-------|-------|--------|
| **0–4** | Trust gates, coach clearance, automated deploy gates | **Complete** (owner notes preserved in checklist) |
| **4b** | NAV-IMPL chrome @390px all personas | **Pass with issues** — QA-NAV-04/06 open ([`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md)) |
| **5** | Core loop exec cut (GP-ACQ-03 through GP-ACQ-04b) | **Complete** (owner signed 2026-05-22) |
| **GP-ACQ-06** | SafeSport messages (`/messages`) | **Pending** — owner deferred for demo video |
| **6–12** | Depth / diligence | **In progress** — waivable for functional sale |

### Known open risks (owner QA findings — not claimed fixed)

Document honestly for acquirer diligence:

1. **Parent JWT household** — `householdId` custom claim may lag after household link; parent co-op log can show permission-denied until sign-out/sign-in. Mitigation copy shipped; **monitoring** — does not block exec-cut demo.
2. **GP-ACQ-06 SafeSport messages** — coach→minor DM block on `/messages` not owner-verified live; deferred for demo video session (QA-153, QA-406).
3. **NAV-IMPL polish** — QA-NAV-04 pin customize and QA-NAV-06 swipe-up menu remain open (Phase 4b pass with issues).

**Do not claim full exec cut 6/6 or demo video in data room until GP-ACQ-06 live check + recording complete.**

---

## Vision (12–24 months)

North star (owner-confirmed): **One multi-sport youth sports OS** — addictive cross-sport training HUD, parent co-op with VPC depth, coach development loop, club/registrar business in one tenant.

| Horizon | Target |
|---------|--------|
| **Players** | Cross-sport operative command deck — daily missions, RL-informed homework at scale, skill telemetry |
| **Parents** | Co-op partner on mobile — VPC, proof review, payments, SafeSport comms |
| **Coaches** | Intent → prescription → observable fulfillment; flat sideline analytics |
| **Clubs** | Director mission control — compliance matrix, tryouts, registration, field ops |
| **Platform** | Additional `sports_configs` documents; optional federation GTM for soccer |

Vision docs: [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) · persona `*_OS.md` under `docs/vision/`

---

## Path to commercial launch

1. **GP-ACQ-06 + demo video + Phases 6–12 depth QA** — Owner Phase 5 signed; SafeSport messages live check + recorded exec cut before broad diligence
2. **First pilot club** — Real club tenant beyond QA; Stripe Connect production path; support playbook
3. **Store binaries** — Capacitor build → App Store / Play submission (acquirer or post-close ops)
4. **Optional federation GTM** — Phase 4 API per governing body if soccer state-body strategy proceeds
5. **RL policy rollout** — Raise `abPercent` from 0 after ops validation

---

## Path to strategic value (why buy now)

See [`VALUATION_FRAMING.md`](./VALUATION_FRAMING.md) for deal-type framing.

| Buyer angle | SSTracker advantage |
|-------------|---------------------|
| **Incumbent platform** (TeamSnap, SportsEngine, LeagueApps, GameChanger, Stack) | Add **daily development engagement** + COPPA-native architecture without 12–18 month rebuild |
| **PE roll-up** | Standardize compliance + player development across club portfolio |
| **Soccer vertical** | Tryout lifecycle OS depth + household graph; federation export on roadmap |

**Moat summary:** Train → XP → coach intent loop · household-gated comms · VPC ceremony · cell-isolated Firestore · tryout OS · sport-configurable platform.

---

## Related diligence docs

| Document | Purpose |
|----------|---------|
| [`PERSONA_DILIGENCE.md`](./PERSONA_DILIGENCE.md) | Per-persona capabilities matrix |
| [`ARCHITECTURE_DATA_FLOWS.md`](./ARCHITECTURE_DATA_FLOWS.md) | Gold-path sequence diagrams |
| [`NOTABLE_GAPS.md`](./NOTABLE_GAPS.md) | Intentional non-parity vs incumbents |
| [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) | 15-minute exec cut walkthrough |
| [`ONE_PAGER.md`](./ONE_PAGER.md) | 60-second summary |
