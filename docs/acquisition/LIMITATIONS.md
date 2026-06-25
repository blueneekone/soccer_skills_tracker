# SSTracker — Known Limitations

**Purpose:** Honest scope boundaries for acquirer diligence. Not a bug list — see [`FUNCTIONAL_AUDIT_BACKLOG.md`](../FUNCTIONAL_AUDIT_BACKLOG.md) for closed wiring gaps.

**Last updated:** 2026-05-22 · ACQ-QA-DOC-SYNC

---

## Commercial & traction

| Limitation | Detail |
|------------|--------|
| Pre-revenue | No production paying clubs documented in repo; QA tenant only |
| Single-owner QA | Phase 5 owner-signed 2026-05-22; full [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) + depth Phases 6–12 ongoing |
| GTM undefined | Outreach templates in [OUTREACH.md](./OUTREACH.md); no sales pipeline data in repo |

---

## Platform & deployment

| Limitation | Detail |
|------------|--------|
| Live deploy confirm | `npm run deploy:dev:verify` green; owner must run `npm run deploy:dev` with Firebase credentials for overnight callables |
| Split codebase deploy | All `deploy:*` codebases must be run on target Firebase project — callable resolution fails if a split codebase is missing ([`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md)) |
| Monolith migration | `functions/` default codebase is slimming; some legacy exports may still route through monolith index |
| Two hosting URLs | Dev QA: `sstracker.app` · CI/prod alias: `soccer-skills-tracker.web.app` — WebAuthn RP origin must match active deploy |

---

## Product scope (intentional)

| Limitation | Detail | Alternative |
|------------|--------|-------------|
| No club website CMS | Drag-and-drop site builder rejected indefinitely | Public routes: `/club/{slug}`, `/register/{clubId}`, `/tryouts/{programId}` |
| Live streaming CDN | TeamSnap-class native streaming not built | URL embed MVP shipped (YouTube/Vimeo/Mux) |
| Avatar / bust art | One JPEG wired; full PNG layer ingest paused | `defaultPortraitV2` SVG + profile initials |
| Platform visual redesign | Gemini research exports read-only | Functional chrome + Player OS Phase 7 cohesion |
| NGB / state roster export | GotSport-grade 38-body API not shipped | CSV v1 + [`FEDERATION_ROADMAP.md`](./FEDERATION_ROADMAP.md) Phases 2–4 |

Full gap table: [NOTABLE_GAPS.md](./NOTABLE_GAPS.md) · pre-QA backlog: [GAP_CLOSURE_PLAN.md](./GAP_CLOSURE_PLAN.md)

---

## Mobile & distribution

| Limitation | Detail |
|------------|--------|
| No App Store / Play Store binaries | Capacitor 6 shell shipped ([`NATIVE_SHELL.md`](../NATIVE_SHELL.md)); store submission = acquirer |
| Push requires FCM token | Parent must grant notification permission; device token registration via callable |
| Offline | PWA shell; Train logging requires connectivity for callable `logTrainingSession` |

---

## Integrations (partial)

| Limitation | Detail |
|------------|--------|
| Stripe Connect | Registration + installment UX shipped; webhook full-season unlock on partial payment = follow-up |
| Checkr / background checks | Embed + panopticon shipped; not full NCSI/SafeSport vendor parity |
| Weather | Open-Meteo + NWS for field lock; not commercial SLA weather vendor |
| RL policy | Launch default `abPercent: 0` — all players on heuristic until ops ramp |

---

## Scale & ops

| Limitation | Detail |
|------------|--------|
| Cell provisioning | Architecture supports multi-cell; default dev tenant uses single cell |
| Multi-region | Functions pinned to `us-east1` for several callables — cross-region not documented |
| Observability | Cell SLO metrics in architecture; no bundled Datadog/New Relic export in repo |

---

## Roles not shipped

| Role | Status |
|------|--------|
| Team Manager | Planned — JWT/route not implemented |
| Recruiter / Tutor | Future vision docs only |
| Federation admin | No standalone persona |

See [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md)

---

## Legal disclaimer

This document reflects **repository state** as of the data room date. Acquirer should run independent security, privacy, and IP review. Third-party licenses: see root `package.json` and `ASSET_LICENSES.md` where present.
