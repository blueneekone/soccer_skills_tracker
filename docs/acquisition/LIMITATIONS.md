# SSTracker — Known Limitations

**Purpose:** Honest scope boundaries for acquirer diligence. Not a bug list — see [`FUNCTIONAL_AUDIT_BACKLOG.md`](../FUNCTIONAL_AUDIT_BACKLOG.md) for closed wiring gaps.

**Last updated:** 2026-06-13

---

## Commercial & traction

| Limitation | Detail |
|------------|--------|
| Pre-revenue | No production paying clubs documented in repo; QA tenant only |
| Single-owner QA | Human sign-off on [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) checkboxes pending |
| GTM undefined | Outreach templates in [OUTREACH.md](./OUTREACH.md); no sales pipeline data in repo |

---

## Platform & deployment

| Limitation | Detail |
|------------|--------|
| Deploy completeness | All `deploy:*` codebases must be run on target Firebase project — callable resolution fails if a split codebase is missing ([`FUNCTIONS_DEPLOY.md`](../FUNCTIONS_DEPLOY.md)) |
| TypeScript debt | `npm run check` reports pre-existing errors outside functional MVP paths — does not block `npm run build` |
| Monolith migration | `functions/` default codebase is slimming; some legacy exports may still route through monolith index |
| Two hosting URLs | Dev QA: `sstracker.app` · CI/prod alias: `soccer-skills-tracker.web.app` — WebAuthn RP origin must match active deploy |

---

## Product scope (intentional)

| Limitation | Detail | Alternative |
|------------|--------|-------------|
| No club website CMS | Drag-and-drop site builder deferred indefinitely | Public routes: `/club/{slug}`, `/register/{clubId}`, `/tryouts/{programId}` |
| No live streaming CDN | TeamSnap-class native streaming not built | Event embed URL (YouTube/Vimeo/Mux) — agent 15 track |
| Avatar / bust art | PNG layers + Gemini ingest **paused** post-launch | `defaultPortraitV2` SVG + profile initials |
| Platform visual redesign | Gemini research exports read-only | Functional chrome + Player OS Phase 7 cohesion |
| NGB / state roster export | GotSport-grade 38-body API not shipped | CSV export v1 + federation roadmap (agent 14) |

Full gap table: [NOTABLE_GAPS.md](./NOTABLE_GAPS.md)

---

## Mobile & distribution

| Limitation | Detail |
|------------|--------|
| No App Store / Play Store binaries | PWA + web only at launch gate; Capacitor shell in progress (agent 17) |
| Push requires FCM token | Parent must grant notification permission; device token registration via callable |
| Offline | PWA shell; Train logging requires connectivity for callable `logTrainingSession` |

---

## Integrations (partial)

| Limitation | Detail |
|------------|--------|
| Stripe Connect | Registration path exists; P2 polish on parent payments UX |
| Checkr / background checks | Embed token + webhook scaffold; not full NCSI/SafeSport vendor parity |
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
