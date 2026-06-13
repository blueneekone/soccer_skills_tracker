# Notable gaps — intentional

**Purpose:** Transparent non-parity vs TeamSnap, SportsEngine, and GotSport for acquirer diligence.  
**Authority:** [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) · [`.cursor/rules/competitive-launch-north-star.mdc`](../../.cursor/rules/competitive-launch-north-star.mdc)  
**Last updated:** 2026-06-13

---

## Summary matrix

| Gap | Status | SSTracker alternative | Launch priority |
|-----|--------|----------------------|-----------------|
| Club website builder (TeamSnap/SportsEngine drag-and-drop CMS) | **DEFINITE GAP — not building** | `/club/{slug}`, `/register/{clubId}`, `/tryouts/{programId}` | P3 reject |
| Native iOS/Android App Store binaries | **In progress (agent 17)** | PWA + Capacitor shell MVP; store submission = acquirer | Post-launch |
| GotSport-grade federation API (38 bodies) | **Partial overnight track** | CSV export v1 + `FEDERATION_ROADMAP.md` (agent 14) | P3 unless soccer GTM |
| Live streaming CDN (TeamSnap-class) | **MVP embed only (agent 15)** | YouTube/Vimeo/Mux URL on events | P3 |
| Avatar PNG / character bust art | **Deferred post-launch** | `defaultPortraitV2` SVG + profile initials | Tabled |
| Platform visual redesign (Gemini research) | **Read-only** | Functional chrome + Player OS Phase 7 cohesion | Tabled |
| NGB / state roster export packet | **Not shipped** | Manual CSV + future federation roadmap | Owner GTM decision |
| Background check vendor parity (NCSI) | **Partial** | Checkr embed + webhooks; director panopticon | P2 |
| Tournament brackets polish | **Partial** | `tournament_events` + ticketing callables | P2 |
| Registration → drag-drop roster UX | **Partial** | Admin roster + `player_lookup`; not GotSport drag UI | P2 |

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
| Stripe registration | `createRegistrationIntent`, webhooks | Parent payments UX polish (P2) |
| Eligibility matrix | `upsertClubEligibilityMatrix` | Director UX edge cases |
| Push notifications | FCM + parent prefs | Requires user opt-in; no store push without native shell |
| RL adaptive homework | HQ mount + callables | Launch default heuristic only (`abPercent: 0`) |
| Field weather lock | Open-Meteo + NWS + scheduled eval | Not commercial weather SLA |

---

## Competitive reference

Full feature matrix: [`COMPETITIVE_LAUNCH_ASSESSMENT.md`](../vision/COMPETITIVE_LAUNCH_ASSESSMENT.md) § Feature matrix

| Competitor | They still win on | We still win on |
|------------|-------------------|-----------------|
| TeamSnap ONE | Parent mobile adoption, streaming | Development loop, compliance |
| SportsEngine HQ | Enterprise reg, NGB integrations | Player OS, SafeSport comms |
| GotSport | State roster / governing body sync | Gamified development, tryout OS depth |

---

## Overnight agents addressing gaps

| Agent | Branch | Gap focus |
|-------|--------|-----------|
| 14 | `overnight/fed-ngb` | Federation CSV / roadmap |
| 15 | `overnight/live-stream` | Event stream embed |
| 17 | `overnight/native-shell` | Capacitor store shell |
| 04 | `overnight/p2-payments` | Payments polish |
| 05 | `overnight/p2-tournament` | Tournament UX |
| 06 | `overnight/p2-checkr` | Checkr vendor hook |

Progress: [`SLICE_LOG.md`](./SLICE_LOG.md) · [`PARALLEL_STATUS.md`](./PARALLEL_STATUS.md)

---

## Related documents

- [LIMITATIONS.md](./LIMITATIONS.md) — operational limits
- [PROSPECTUS.md](./PROSPECTUS.md) § Risk factors
- [FAQ.md](./FAQ.md) — "What is intentionally NOT built?"
- [`FUNCTIONAL_MVP.md`](../vision/FUNCTIONAL_MVP.md) § Gaps — resolved vs deferred
