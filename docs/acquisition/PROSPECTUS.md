# SSTracker — Acquisition Prospectus

**Confidential — for qualified acquirer diligence**  
**Version:** 2026-06-13 · Branch `dev` · post-overnight merge

---

## 1. Executive summary

SSTracker (internal codename **Nexus Command**) is a **compliance-first youth sports development platform** targeting clubs that have outgrown schedule-and-chat tools but cannot sacrifice **SafeSport** and **COPPA** rigor. The codebase delivers a full **Player · Parent · Coach · Director** workspace on **SvelteKit 5 + Firebase**, with table-stakes club ops (RSVP, registration, tryouts, eligibility) **shipped in code** and a differentiated **Train → XP → coach intent** loop competitors do not replicate.

**Acquisition thesis:** Buy a **launch-ready functional OS** with architectural moat (cell routing, household graph, RL homework path) rather than rebuild from TeamSnap/SportsEngine APIs. Overnight P2 parity + `check=0` merged to dev. Remaining work is **owner live deploy confirm**, **FUNCTIONAL_MVP QA**, and **go-to-market** — not greenfield product invention.

**Win message:** *The development OS for clubs that have outgrown schedule-and-chat — with SafeSport-native comms and COPPA depth competitors cannot match.*

Authority: [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md)

---

## 2. Market position

### Competitors (2025–2026)

| Platform | They win on | SSTracker wins on |
|----------|-------------|-------------------|
| **TeamSnap ONE** | Parent mobile, RSVP, reg, streaming | Development loop, compliance depth |
| **SportsEngine HQ** | Eligibility matrix, NGB, enterprise reg | Player OS, SafeSport comms model |
| **GotSport** | State roster / governing body sync | Gamified development, RL, intent engine |

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

### Coach Intent Engine + Train lock

Coach assigns intent with optional prescription (`sets`, `repsPerSet`, `bilateral`, duration, RPE). Player accepts on HQ → Train shows **locked by coach** — read-only prescription, editable session notes only.

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

---

## 7. Build & quality status

| Signal | Status |
|--------|--------|
| Functional audit A–F | **Done** ([`FUNCTIONAL_AUDIT_BACKLOG.md`](../FUNCTIONAL_AUDIT_BACKLOG.md)) |
| LAUNCH Wave 0–2 | **Done** (household, RSVP, reg, tryouts, parent parity) |
| Overnight P2 + check=0 | **Done** — merged to dev 2026-06-13 |
| Player OS Phase 7 G1–G10 | **Done** — instrument cohesion signed off |
| Deploy scripts + verify gates | **Done** (`npm run deploy:dev:verify`) |
| Owner live deploy confirm | **Partial** — owner `FIREBASE_CI_TOKEN` for overnight callables |
| Owner human QA on FUNCTIONAL_MVP | **Pending** |
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
