# SSTracker — Acquisition Prospectus

**Confidential — for qualified acquirer diligence**  
**Version:** 2026-06-25 · Branch `dev` · cadence E2E verified

---

## 1. Executive summary

SSTracker (internal codename **Nexus Command**) is a **compliance-first youth sports operating system** for **any team sport** — one platform where **player training addiction**, **parent co-op**, **coach development**, and **club/registrar ops** share a tenant. Architecture is **sport-configurable** via `sports_configs/{sportId}`; **soccer is the first configured sport** and the QA tenant path, not the product ceiling.

The codebase delivers a full **Player · Parent · Coach · Director** workspace on **SvelteKit 5 + Firebase**, with table-stakes club ops (RSVP, registration, tryouts, eligibility) **shipped in code** and a differentiated **Train → XP → coach intent** loop (sport-agnostic mechanics, per-sport attribute trees) that competitors do not replicate.

**Acquisition thesis:** Buy a **launch-ready functional OS** with architectural moat (cell routing, household graph, multi-sport config layer, RL homework path) rather than rebuild from TeamSnap/SportsEngine APIs. Overnight P2 parity + `check=0` merged to dev. Remaining work is **owner live deploy confirm**, **FUNCTIONAL_MVP QA**, and **go-to-market** — not greenfield product invention. Do **not** claim multiple sports are fully content-complete at launch; claim **platform readiness** + soccer QA path.

**Win message:** *The youth sports OS that closes the loop from coach intent → player training → XP/progress → parent visibility — sport-configurable, COPPA-native, with club operations included.*

Authority: [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md)

---

## 2. Market position

### Strategic acquirer adjacency (multi-sport)

| Buyer type | Examples | Why SSTracker fits |
|------------|----------|-------------------|
| **Parent/club ops incumbents** | TeamSnap, NBC Sports Next (SportsEngine), LeagueApps | Add daily development engagement + COPPA depth to existing schedule/reg base |
| **Video + stats adjacency** | Hudl, GameChanger (Dick's), Stack Sports | Same households; missing Train/XP/intent loop and household-gated comms |
| **Vertical soccer** | GotSport, US Club Soccer tech partners | Tryout OS + household graph; federation export on roadmap (not day-one GTM requirement) |

### Competitors (2025–2026)

| Platform | They win on | SSTracker wins on |
|----------|-------------|-------------------|
| **TeamSnap ONE** | Parent mobile, RSVP, reg, streaming | Development loop, compliance depth |
| **SportsEngine HQ** | Eligibility matrix, NGB, enterprise reg | Player OS, SafeSport comms model |
| **GotSport** | State roster / governing body sync | Gamified development, RL, intent engine |
| **GameChanger / Stack** | Live stats, scheduling, parent mobile | Train → XP → coach intent; VPC + household comms model |

### Launch parity matrix

See full matrix in [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md). Summary:

- **At parity (functional):** RSVP, registration-lite, roster invite, tryouts OS, eligibility matrix, parent calendar/push, PWA, payment installments, roster assign panel
- **Partial (accept v1):** Capacitor native shell, NGB CSV export, live stream embed, tournament brackets, Checkr embed
- **Behind:** App Store / Play Store binaries (intentional — acquirer)
- **Leads:** Player development, COPPA/VPC, SafeSport DM policy, coach spatial drills, RL homework

---

## 3. Product surfaces

Persona map: [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md)

| Persona | Primary route | Status |
|---------|---------------|--------|
| Player | `/player/dashboard` | Shipped — HQ, Train, Armory, Stats |
| Parent | `/parent/household` | Shipped — VPC, co-op, bounties, messages |
| Coach | `/coach` | Shipped — Forge, drills, match-day, logistics |
| Director | `/director` | Shipped — compliance, field ops, registrars |
| Admin | `/admin` | Shipped — orgs, RL policy, system |

Functional acceptance checklist: [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md)

---

## 4. Technical architecture

**Canonical doc:** [`ARCHITECTURE.md`](../ARCHITECTURE.md)

### Four-tier stack

1. **Client** — Svelte 5 (Runes) + SvelteKit PWA (`adapter-static`)
2. **Edge** — Firebase Hosting + `/v1/**` → `apiGateway`
3. **Compute** — Cloud Functions v2 (HTTPS, Callable, triggers, schedulers) across **7 codebases**
4. **Data** — Isolated **Firestore cells** per tenant shard + registry DB

### Non-negotiable invariants

- Zero-liability PII — no cross-cell leakage without admin-minted context
- Strict tenant isolation — `tenantId` / `clubId` + `cellId`
- Lazy read-repair migrations — no destructive schema migrations
- Vanguard Trinity — Shell / Brain / Glass / HUD per interactive screen
- Hybrid data model — UI renders synthetic nodes; backend persists drill-as-node graph

### Cloud Functions codebases

| Codebase | Role |
|----------|------|
| `functions-core` | Training, RSVP, tryouts, eligibility |
| `functions-rl` | Adaptive workout policy + transition recording |
| `functions-compliance` | VPC, COPPA, WebAuthn, clearance, retention |
| `functions-platform` | API gateway, cell routing, director ops |
| `functions-commerce` | Stripe, registration, ticketing |
| `functions-integrations` | Media, weather, roster ingest |
| `default` (monolith) | Legacy slim index — migrating to splits |

Deploy playbook: [`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md)

---

## 5. Compliance & trust

Detailed in [SECURITY.md](./SECURITY.md). Highlights:

- **VPC ceremony** — parent-granted consent auto-finalizes; `consent_records` + `security_audit` written server-side
- **SafeSport** — `sendCoachPlayerMessage` blocks coach→minor unsupervised DM; household threads for parent visibility
- **Minor retention** — purge queue + scheduled burn (`functions-compliance`)
- **WebAuthn / passkeys** — parent magic-link → passkey enrollment path
- **Coach clearance** — Checkr embed + director panopticon shipped; NCSI vendor parity = acquirer ([NOTABLE_GAPS.md](./NOTABLE_GAPS.md))

Golden path QA: [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) § Permanent VPC golden path

---

## 6. Differentiated features (moat)

**Sport-agnostic loop:** Train, XP, coach intent, cadence, and RL homework mechanics are **the same HUD engine** across team sports; `sports_configs/{sportId}` supplies attribute trees, drill taxonomy, and copy. **Soccer** is the first configured sport and the documented QA path — not a soccer-only product.

### Coach Intent Engine + Train lock

Coach assigns intent with optional prescription (`sets`, `repsPerSet`, `bilateral`, duration, RPE). Player accepts on HQ → Train shows **locked by coach** — read-only prescription, editable session notes only. Prescription semantics are sport-neutral; drill libraries resolve team → club → platform per tenant `sportId`.

### Tryout lifecycle OS

Full cycle: public registration → session RSVP → check-in → eval plan → pipeline status → offer response → roster promote → automated comms. Callables in `deploy:core` batch.

### RL adaptive homework (Epic 8)

- `AdaptiveHomework.svelte` mounted on player HQ
- `getAdaptiveWorkoutPolicy` callable — heuristic fallback when policy cold
- Transition pipeline: `rl_inference_log` → workout log → `rl_transitions` → physio patch
- Launch default: `abPercent: 0` (heuristic only until ops ramp)

Authority: [`RL_ADAPTIVE_WORKOUTS.md`](../RL_ADAPTIVE_WORKOUTS.md) · [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) § RL

### Spatial drill designer

Team + club drill libraries with coach spatial designer persisting to `teams/{teamId}/drills`.

### 6.1 Curriculum intelligence (roadmap)

**Shipped today (honest state for diligence):**

- **Drill libraries** — team (`teams/{teamId}/drills`), club-scoped picks in Forge, platform basics catalog, and `global_drills` heuristic seed
- **Coach Intent Engine (Forge)** — `team_assignments` + optional `prescription` (sets/reps, cues/video, bundles, cadence)
- **Train lock** — explicit **Start session** / **Continue** arms coach-directed transmit; Accept alone does not auto-arm (`TRAIN-MISSION-ARM-EXPLICIT`)
- **B2 per-assignment cadence** — one credited session per **UTC day** per intent (`drill_completions` + server gate in `logTrainingSession`); HQ shows `X/N this week` on mission rail (`BOUNTY-DAILY-ACK`)
- **RL adaptive homework** — `AdaptiveHomework` on HQ; `getAdaptiveWorkoutPolicy` callable with **heuristic default** at launch (`abPercent: 0`); policy path when ops ramps A/B

**Post-close (not shipped — do not demo as live):**

- Licensed **curriculum / PD ingest** (internet search, unified coach+player curriculum browser)
- **Club-scoped RL drill candidates** on server (today: client `resolveAdaptiveDrill` prefers team → club → platform → `global_drills`; RL policy CF still seeds from `global_drills`)
- Unified search across assignments + club drill corpus

**COPPA:** child media and parent proof boundaries unchanged — proof remains advisory; parent-gated Storage; no new child-facing PD web crawl at launch.

### 6.2 Multi-day coach assignments (shipped)

- Coaches set **Sessions/week** in Forge (`prescription.cadence`); **FORGE-CADENCE-DEFAULT** + **BOUNTY-CADENCE-SERVER** auto-default **5×/week** when `requiredXp ≥ 300` and coach leaves cadence off (client + server)
- **Fulfillment** — XP earned since deploy baseline (`xpBaselineByUid`) **and** distinct session days in rolling window when cadence present
- **Player HQ** — mission rail shows cadence progress (`1/5 this week`), XP progress line, today's session acknowledgment; second log same UTC day blocked on Train / server

Authority: [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) § GP-ACQ-04c · Track B (`ROADMAP.md`)

---

## 7. Build & quality status

**Canonical product state:** [`PRODUCT_STATE.md`](./PRODUCT_STATE.md) — shipped, partial, planned, commercial reality, and QA open risks.

| Signal | Status |
|--------|--------|
| Functional audit A–F | **Done** ([`FUNCTIONAL_AUDIT_BACKLOG.md`](../FUNCTIONAL_AUDIT_BACKLOG.md)) |
| LAUNCH Wave 0–2 | **Done** (household, RSVP, reg, tryouts, parent parity) |
| Wave 3B + Wave 4 competitive parity | **Done** — live deploy + smoke on dev |
| Player OS Phase 7 G1–G10 | **Done** — instrument cohesion signed off |
| Deploy scripts + verify gates | **Done** (`npm run deploy:dev:verify`) |
| Multi-sport platform | **Architecture ready** — `sports_configs`; soccer = QA config only |
| Owner Phase 4b + Phase 5 exec cut | **Pending** — acquisition P0 ([`OWNER_QA_CHECKLIST.md`](../vision/OWNER_QA_CHECKLIST.md)) |
| TypeScript (`npm run check`) | **0 errors** — CI gate |

Regression: `personaFunctionalMvp.test.ts` includes functional audit A–F guards.

---

## 8. What acquirer gets

### Assets

- Full monorepo — SvelteKit app, 7 function codebases, Firestore rules, storage rules
- Vision + sprint docs under `docs/vision/`
- Test suite — Vitest unit/guard tests, Firestore rules emulators, Playwright e2e scaffold
- QA provisioning scripts — `scripts/dev-tenant-reset.mjs`
- Marketing landing content — `CompetitivePositionPanel` on public site

### Firebase projects

- **Dev / live-fire QA:** `sports-skill-tracker-dev` → https://sstracker.app
- **Production alias:** `soccer-skills-tracker` → https://soccer-skills-tracker.web.app

Handoff: [TRANSFER.md](./TRANSFER.md)

---

## 9. Remaining launch work (post-acquisition)

Not blockers for **code acquisition**; blockers for **commercial launch**:

1. **Owner live deploy confirm** — run `npm run deploy:dev` if overnight callables not yet live on dev
2. **Owner QA** — phased walkthrough [`QA_DEV_PERSONA_VERIFICATION.md`](../QA_DEV_PERSONA_VERIFICATION.md)
3. **Payment webhook follow-up** — full-season unlock when all installments paid (see [`GAP_CLOSURE_PLAN.md`](./GAP_CLOSURE_PLAN.md))
4. **Deferred** — avatar PNG art (owner approval), platform visual redesign, federation API Phases 2–4 (owner GTM decision)
5. **Acquirer** — App Store / Play Store binaries, NCSI vendor parity, club website CMS (rejected)

Full backlog: [`GAP_CLOSURE_PLAN.md`](./GAP_CLOSURE_PLAN.md)

---

## 10. Risk factors

See [LIMITATIONS.md](./LIMITATIONS.md) and [NOTABLE_GAPS.md](./NOTABLE_GAPS.md). Summary:

- Pre-revenue / pre-scale user base
- Firebase vendor concentration
- Split codebase deploy complexity
- Federation API Phases 2–4 gap vs GotSport for state-governing-body GTM (CSV v1 shipped)
- No club website builder (intentional)
- App Store / Play Store distribution (intentional — acquirer)

---

## 11. Document index

→ [INDEX.md](./INDEX.md)
