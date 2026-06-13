# Competitive Launch Assessment — SSTracker vs. Market

**Authority:** Product owner launch north star · [`ROADMAP.md`](../../ROADMAP.md) · [`FUNCTIONAL_MVP.md`](FUNCTIONAL_MVP.md)  
**Last updated:** 2026-06-13  
**Benchmarks:** [TeamSnap ONE](https://www.teamsnap.com/one) · [SportsEngine HQ](https://www.sportsengine.com/hq/) · [GotSport](https://home.gotsport.com/software/)  
**Cursor rule:** [`.cursor/rules/competitive-launch-north-star.mdc`](../../.cursor/rules/competitive-launch-north-star.mdc)

This document is the **canonical competitive gap matrix** for launch. Agents and humans use it to prioritize work that closes table-stakes gaps without diluting SSTracker’s development-OS moat.

---

## Executive summary

| Dimension | Verdict |
|-----------|---------|
| **Beat competitors on** | Athlete development loop, SafeSport-native comms, COPPA/VPC depth, coach intent + prescriptions, RL homework, tactical drill designer, **tryout lifecycle OS (reg → eval → callback → roster)** |
| **At parity (launch functional track)** | Guardian roster visibility, RSVP, registration-lite, roster invite, eligibility matrix, parent calendar export, push prefs, PWA install path |
| **Behind on table stakes** | Native app store binaries (web+PWA only), NGB/state roster export |
| **Launch functional gate** | **Closed** — Wave 0–2 + tryouts + eligibility shipped; owner QA on `sports-skill-tracker-dev` |

**Positioning:** SSTracker is **not** “another TeamSnap.” It is the **development + compliance OS** clubs adopt when they outgrow chat-and-schedule tools — but parents still expect RSVP, schedules, and payments on day one.

---

## Competitor profiles (2025–2026)

### TeamSnap ONE
- **Strength:** Parent mobile adoption (#1 team app narrative), registration + payments, org-wide comms, RSVPs on Premium+, live streaming, practice plans.
- **Weakness vs us:** No athlete XP/skill progression OS, no household-gated minor comms, shallow development analytics.

### SportsEngine HQ (NBC Sports Next)
- **Strength:** Enterprise registration builder, **memberships + eligibility matrix** (waivers, BG checks, certs), financial reporting, auto-scheduling, NGB integrations (e.g. USA Hockey), 4.8★ mobile app.
- **Weakness vs us:** Heavy/complex for small clubs; development tooling is admin/scheduling-centric, not player-facing progression.

### GotSport
- **Strength:** Soccer club + **state association** workflows, drag-drop roster builder, program registration flags, governing-body compliance sync, official roster/ID cards.
- **Weakness vs us:** Soccer-vertical; no gamified player OS or RL adaptive training.

---

## Feature matrix (SSTracker today)

Legend: ✅ Shipped · 🟡 Partial · ❌ Gap · 🏆 SSTracker leads

| Category | TeamSnap | SportsEngine | GotSport | SSTracker | Launch priority |
|----------|----------|--------------|----------|-----------|-----------------|
| **Online registration + cart** | ✅ | ✅ | ✅ | ✅ LAUNCH-registration-lite | — |
| **Integrated payments / installments** | ✅ | ✅ | ✅ | 🟡 Parent payments route | P2 polish |
| **Drag-drop roster from registration** | ✅ | ✅ | ✅ | 🟡 Admin roster + player_lookup | P2 |
| **Guardian on roster row** | ✅ | ✅ | ✅ | ✅ LAUNCH-household-graph | — |
| **Pre-event RSVP / availability** | ✅ Premium | ✅ | ✅ | ✅ LAUNCH-rsvp | — |
| **Tryout lifecycle OS** | 🟡 | 🟡 | 🟡 | ✅ LAUNCH-tryouts-os | — |
| **Schedule + calendar sync** | ✅ | ✅ | ✅ | ✅ team_workouts + `.ics` export | — |
| **Team / org messaging** | ✅ | ✅ | ✅ | ✅ SafeSport + Parent Lounge + Epic 4 | Maintain |
| **Native parent mobile app** | ✅ | ✅ | ✅ | 🟡 PWA + web (no store binary) | Post-launch |
| **Push notifications** | ✅ | ✅ | ✅ | ✅ FCM + parent dashboard prefs | — |
| **Eligibility matrix (configurable)** | 🟡 | ✅ | ✅ | ✅ LAUNCH-eligibility-matrix | — |
| **Background check integration** | Partner | NCSI | ✅ | 🟡 Coach clearance track | P2 vendor hook |
| **Practice / drill content** | ✅ Pro plans | 🟡 | 🟡 | 🏆 Intent Engine + spatial designer + drill library | Market |
| **Player development / stats** | 🟡 | 🟡 | 🟡 | 🏆 XP, skill tree, telemetry, RL homework | Market |
| **COPPA / minor consent** | Checkbox | Membership rules | Docs | 🏆 Household + VPC ceremony + retention burn | Market |
| **SafeSport minor DM policy** | 🟡 | 🟡 | 🟡 | 🏆 Enforced in rules + callables | Market |
| **Facility / field scheduling** | 🟡 | ✅ | 🟡 | ✅ Field ops + weather lock | — |
| **Tournaments / brackets** | ✅ | ✅ | ✅ | 🟡 tournament_events + ticketing | P2 |
| **Club website builder** | ✅ | ✅ | ✅ | ❌ | P3 post-launch |
| **NGB / state roster export** | Some | ✅ | 🏆 38 bodies | ❌ | P3 unless soccer GTM |
| **Live streaming** | ✅ Free | ✅ | 🟡 | ❌ | P3 |

---

## Launch waves (ordered)

### Wave 0 — Unblock QA — **Done**
Household graph CF deployed; guardian columns on staff rosters.

### Wave 1 — Table stakes — **Done**
LAUNCH-rsvp · LAUNCH-registration-lite · LAUNCH-roster-invite · LAUNCH-tryouts-os · LAUNCH-eligibility-matrix

### Wave 2 — Parent adoption parity — **Done**
- PWA install (`InstallPrompt`) + SSTracker branding
- Parent dashboard push preference matrix (`LAUNCH-parent-push`)
- “This week” schedule strip with RSVP (`LAUNCH-parent-week`)
- Household `.ics` export (`LAUNCH-parent-ical`)
- Parent nav → Settings + Messages

### Wave 3 — Enterprise / soccer governance — **Deferred post-launch**
- NCSI / SafeSport vendor iframe polish
- GotSport-style roster export packet (owner GTM decision)

### Wave 4 — Moat expansion
- Coach intent → player Train loop polish
- RL rollout playbook on dev
- Recruiting + public profile pipeline

---

## What we refuse to copy (protect differentiation)

- Generic team chat without SafeSport gates
- Shallow waiver checkbox as “COPPA compliance”
- Arcade gamification on Coach/Director/Admin surfaces
- Gemini bust / avatar art tracks before launch functional gate

---

## Win message (external)

> **The development OS for clubs that have outgrown schedule-and-chat — with SafeSport-native comms and COPPA depth competitors cannot match.**

See [`CompetitivePositionPanel`](../../src/lib/components/marketing/landing/landingContent.ts) on the marketing landing page.
