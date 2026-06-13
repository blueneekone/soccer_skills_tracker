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
| **At parity (launch functional track)** | Guardian roster visibility, RSVP, registration-lite, roster invite, eligibility matrix, parent calendar export, push prefs, PWA install path, **payments installments**, **reg→roster assign**, **tournament brackets**, **live stream MVP**, **NGB CSV export v1** |
| **Behind on table stakes** | Native App Store / Play Store binaries (Capacitor shell shipped; submission deferred) |
| **Launch functional gate** | **Partial** — Wave 0–2 + overnight P2 parity shipped on `overnight/base`; **agent 12 + check=0 + Phase 2 deploy** remain before owner QA |

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
| **Integrated payments / installments** | ✅ | ✅ | ✅ | ✅ ACQ-p2-payments | — |
| **Drag-drop roster from registration** | ✅ | ✅ | ✅ | ✅ ACQ-p2-reg-roster | — |
| **Guardian on roster row** | ✅ | ✅ | ✅ | ✅ LAUNCH-household-graph | — |
| **Pre-event RSVP / availability** | ✅ Premium | ✅ | ✅ | ✅ LAUNCH-rsvp | — |
| **Tryout lifecycle OS** | 🟡 | 🟡 | 🟡 | ✅ LAUNCH-tryouts-os | — |
| **Schedule + calendar sync** | ✅ | ✅ | ✅ | ✅ team_workouts + `.ics` export | — |
| **Team / org messaging** | ✅ | ✅ | ✅ | ✅ SafeSport + Parent Lounge + Epic 4 | Maintain |
| **Native parent mobile app** | ✅ | ✅ | ✅ | 🟡 Capacitor 6 shell + PWA (no store binary) | Post-launch submit |
| **Push notifications** | ✅ | ✅ | ✅ | ✅ FCM + parent dashboard prefs | — |
| **Eligibility matrix (configurable)** | 🟡 | ✅ | ✅ | ✅ LAUNCH-eligibility-matrix | — |
| **Background check integration** | Partner | NCSI | ✅ | ✅ P2-CHECKR embed polish | — |
| **Practice / drill content** | ✅ Pro plans | 🟡 | 🟡 | 🏆 Intent Engine + spatial designer + drill library | Market |
| **Player development / stats** | 🟡 | 🟡 | 🟡 | 🏆 XP, skill tree, telemetry, RL homework | Market |
| **COPPA / minor consent** | Checkbox | Membership rules | Docs | 🏆 Household + VPC ceremony + retention burn | Market |
| **SafeSport minor DM policy** | 🟡 | 🟡 | 🟡 | 🏆 Enforced in rules + callables | Market |
| **Facility / field scheduling** | 🟡 | ✅ | 🟡 | ✅ Field ops + weather lock | — |
| **Tournaments / brackets** | ✅ | ✅ | ✅ | ✅ ACQ-p2-tournament | — |
| **Club website builder** | ✅ | ✅ | ✅ | ❌ | P3 post-launch |
| **NGB / state roster export** | Some | ✅ | 🏆 38 bodies | ✅ LAUNCH-fed-ngb CSV v1 | — |
| **Live streaming** | ✅ Free | ✅ | 🟡 | ✅ LAUNCH-live-stream MVP embed | — |

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
