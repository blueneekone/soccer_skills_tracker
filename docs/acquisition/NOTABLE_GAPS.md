# Notable gaps — intentional

**Purpose:** Transparent non-parity vs TeamSnap, SportsEngine, and GotSport for acquirer diligence.  
**Authority:** [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) · [`.cursor/rules/competitive-launch-north-star.mdc`](../../.cursor/rules/competitive-launch-north-star.mdc)  
**Last updated:** 2026-06-21 · post-QA dark-surface contrast doc-sync

---

## Summary matrix

| Gap | Status | SSTracker alternative | Launch priority |
|-----|--------|----------------------|-----------------|
| Club website builder (TeamSnap/SportsEngine drag-and-drop CMS) | **DEFINITE GAP — not building** | `/club/{slug}`, `/register/{clubId}`, `/tryouts/{programId}` | P3 reject |
| Native iOS/Android App Store binaries | **Partial — Capacitor shell shipped** | PWA + Capacitor MVP ([`NATIVE_SHELL.md`](../NATIVE_SHELL.md)); store submission = acquirer | Post-launch |
| GotSport-grade federation API (38 bodies) | **Partial — CSV v1 + Phase 3 sync Wave 4** | `exportStateRoster` + `FEDERATION_ROADMAP.md`; C-04 Phase 4 API remains Partial | P3 unless soccer GTM |
| Live streaming CDN (TeamSnap-class) | **Partial — embed MVP shipped** | YouTube/Vimeo/Mux URL on `team_workouts` + match sessions | P3 |
| Avatar PNG / character bust art | **Deferred post-launch** | One JPEG wired; `defaultPortraitV2` SVG + profile initials | Tabled |
| Platform visual redesign (Gemini research) | **Read-only** | Functional chrome + Player OS Phase 7 cohesion | Tabled |
| NGB / state roster export packet | **Partial — CSV v1** | Director `StateRosterExportPanel`; not 38-body API sync | Owner GTM decision |
| Background check vendor parity (NCSI) | **Partial — Checkr lifecycle complete** | Checkr webhooks + panopticon live matrix; NCSI iframe = acquirer vendor swap (D-02 Partial) | P2 Wave 4 Done |
| Tournament brackets polish | **Partial — single + double-elim shipped** | `TournamentBracketPanel` on `tournament_events` | P2 Wave 4 Done |
| Registration → drag-drop roster UX | **Done — drag-drop assign panel** | `RegistrationRosterAssignPanel` GotSport-style DnD | P2 Wave 4 Done |
| Theme light/dark toggle vs forced-dark shells | **Partial — dark-first** | `themeStore` + `style.css` token split; `.login-surface` partial fix | Post-QA U-01 |

---

## Definite rejects (protect differentiation)

These are **product owner decisions**, not backlog oversights:

1. **Club website CMS** — SSTracker is an OS, not a Squarespace for clubs. Conversion happens on register/tryout public routes.
2. **Shallow waiver checkbox as COPPA** — rejected; VPC ceremony is the moat.
3. **Coach/Director gamification chrome** — rejected; flat analytics on staff surfaces.
4. **Gemini bust / avatar art before launch functional gate** — deferred per `LAUNCH-defer-avatar`.

---

## Partial features (code exists — polish or deploy remains)

| Feature | Shipped | Gap |
|---------|---------|-----|
| Stripe registration + installments | `createRegistrationIntent`, `paymentInstallments.ts`, `/parent/payments` | Webhook follow-up closed Wave 3A (`closure/payment-webhook`) |
| Registration → roster | `assignSeasonRegistrationToRoster` CF + director assign panel | Drag-drop GotSport UX — Wave 4 `comp-roster-dragdrop` |
| Eligibility matrix | `upsertClubEligibilityMatrix` | Director UX edge cases closed Wave 3A |
| Push notifications | FCM + parent prefs | Store push certs require acquirer native distribution |
| RL adaptive homework | HQ mount + callables | Launch default heuristic only (`abPercent: 0`) |
| Field weather lock | Open-Meteo + NWS + scheduled eval | Not commercial weather SLA |
| Federation export | CSV v1 callable | API sync Phases 2–4 per roadmap |
| Live stream | URL embed MVP | CDN / production tooling |
| Native shell | Capacitor 6 parent-first WebView | App Store / Play binaries |

---

## Competitive reference

Full feature matrix: [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) § Feature matrix

| Competitor | They still win on | We still win on |
|------------|-------------------|-----------------|
| TeamSnap ONE | Parent mobile adoption, streaming CDN | Development loop, compliance |
| SportsEngine HQ | Enterprise reg, NGB integrations | Player OS, SafeSport comms |
| GotSport | State roster / governing body sync | Gamified development, tryout OS depth |

---

## Overnight agents (Phase 1 + 2 — merged to dev)

All overnight feature + check + CI agents merged 2026-06-13. Remaining work: [`GAP_CLOSURE_PLAN.md`](./GAP_CLOSURE_PLAN.md).

| Agent | Branch | Outcome |
|-------|--------|---------|
| 01–07 | P0 + P2 parity | **Done** |
| 08–13, 22 | svelte-check burn-down | **Done** (check=0) |
| 14–17 | Federation, live stream, marketing, native shell | **Done** |
| 18 | gemini-ingest-1 | **Done** (one bust JPEG) |
| 19–20 | gemini-ingest-2/3 | **Blocked** (no owner assets) |
| 23 | vitest-ci | **Done** (129 green files) |
| 24 | deploy-verify | **Partial** (scripts green; live deploy = owner) |

Progress: [`SLICE_LOG.md`](./SLICE_LOG.md) · [`DOC_SYNC_REPORT.md`](./DOC_SYNC_REPORT.md)

---

## Related documents

- [GAP_CLOSURE_PLAN.md](./GAP_CLOSURE_PLAN.md) — pre-QA backlog
- [LIMITATIONS.md](./LIMITATIONS.md) — operational limits
- [PROSPECTUS.md](./PROSPECTUS.md) § Risk factors
- [FAQ.md](./FAQ.md) — "What is intentionally NOT built?"
- [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) § Gaps — resolved vs deferred
