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
| **At parity (after LAUNCH-household-graph)** | Guardian↔athlete visibility on staff rosters, director household repair |
| **Behind on table stakes** | Pre-event RSVP/availability, self-serve registration builder, native parent mobile UX, org-configurable eligibility matrix, NGB/state roster export |
| **Launch blocker until fixed** | Deploy household-graph CF to dev · RSVP Wave 1 · registration-lite for QA club |

**Positioning:** SSTracker is **not** “another TeamSnap.” It is the **development + compliance OS** clubs adopt when they outgrow chat-and-schedule tools — but parents still expect RSVP, schedules, and payments on day one.

---

## Competitor profiles (2025–2026)

### TeamSnap ONE
- **Strength:** Parent mobile adoption (#1 team app narrative), registration + payments, org-wide comms, RSVPs on Premium+, live streaming, practice plans.
- **Weakness vs us:** No athlete XP/skill progression OS, no household-gated minor comms, shallow development analytics.
- **Sources:** teamsnap.com/one, TeamSnap ONE launch (Nov 2025), CheckThat.ai pricing/feature tiers.

### SportsEngine HQ (NBC Sports Next)
- **Strength:** Enterprise registration builder, **memberships + eligibility matrix** (waivers, BG checks, certs), financial reporting, auto-scheduling, NGB integrations (e.g. USA Hockey), 4.8★ mobile app.
- **Weakness vs us:** Heavy/complex for small clubs; development tooling is admin/scheduling-centric, not player-facing progression.
- **Sources:** sportsengine.com/hq, eligibility feature page, package comparison help center.

### GotSport
- **Strength:** Soccer club + **state association** workflows, drag-drop roster builder, program registration flags, governing-body compliance sync, official roster/ID cards.
- **Weakness vs us:** Soccer-vertical; no gamified player OS or RL adaptive training.
- **Sources:** gotsport.com club management, support docs (association verify, roster lock).

---

## Feature matrix (SSTracker today)

Legend: ✅ Shipped · 🟡 Partial · ❌ Gap · 🏆 SSTracker leads

| Category | TeamSnap | SportsEngine | GotSport | SSTracker | Launch priority |
|----------|----------|--------------|----------|-----------|-----------------|
| **Online registration + cart** | ✅ | ✅ | ✅ | 🟡 Scripts + partial payments | **P0** LAUNCH-registration-lite |
| **Integrated payments / installments** | ✅ | ✅ | ✅ | 🟡 Parent payments route | P0 |
| **Drag-drop roster from registration** | ✅ | ✅ | ✅ | 🟡 Admin roster + player_lookup | P1 |
| **Guardian on roster row** | ✅ | ✅ | ✅ | ✅ LAUNCH-household-graph | Deploy CF |
| **Pre-event RSVP / availability** | ✅ Premium | ✅ | ✅ | 🟡 LAUNCH-rsvp | Maintain |
| **Tryout lifecycle OS** (reg → session → check-in → eval → callback → roster) | 🟡 Forms + schedule | 🟡 Eval tools | 🟡 | ❌ | **P1** **LAUNCH-tryouts-os** |
| **Schedule + calendar sync** | ✅ | ✅ | ✅ | 🟡 team_workouts + deployment calendar + parent `.ics` export | — |
| **Team / org messaging** | ✅ | ✅ | ✅ | ✅ SafeSport + Parent Lounge + 4.11 | Maintain |
| **Native parent mobile app** | ✅ | ✅ | ✅ Team app | ❌ Web | P1 PWA + push polish |
| **Push notifications** | ✅ | ✅ | ✅ | 🟡 FCM bus; limited opt-out UI | P1 |
| **Eligibility matrix (configurable)** | 🟡 | ✅ | ✅ | 🟡 VPC + clearance; no director-config rules | **P1** LAUNCH-eligibility-matrix |
| **Background check integration** | Partner | NCSI | ✅ | 🟡 Coach clearance track | P1 vendor hook |
| **Practice / drill content** | ✅ Pro plans | 🟡 | 🟡 | 🏆 Intent Engine + spatial designer + global/team/club library | Market |
| **Player development / stats** | 🟡 Team stats | 🟡 | 🟡 | 🏆 XP, skill tree, telemetry, RL homework | Market |
| **COPPA / minor consent** | Checkbox | Membership rules | Docs | 🏆 Household + VPC ceremony + retention burn | Market |
| **SafeSport minor DM policy** | 🟡 | 🟡 | 🟡 | 🏆 Enforced in rules + callables | Market |
| **Facility / field scheduling** | 🟡 | ✅ | 🟡 | 🟡 Facility booking + weather lock scaffold | P2 |
| **Tournaments / brackets** | ✅ | ✅ | ✅ | 🟡 tournament_events + ticketing | P2 |
| **Club website builder** | ✅ | ✅ | ✅ | ❌ | P3 post-launch |
| **NGB / state roster export** | Some | ✅ | 🏆 38 bodies | ❌ | P2 if soccer GTM |
| **Live streaming** | ✅ Free | ✅ | 🟡 | ❌ | P3 |
| **Volunteer / fundraising** | ✅ | ✅ | 🟡 | ❌ | P3 |

---

## SSTracker inventory (codebase truth — 2026-06-10)

### Shipped and differentiated
- Player OS: Train, XP, streaks, Armory, AdaptiveHomework (RL), coach bounties, mission lock
- Coach OS: Intent Engine, drill library (team/club/platform), match-day, scouting assessments, logistics hub (comms/schedule/roster/attendance)
- Parent OS: Household, VPC, co-op log, bounties, car ride, proof review (B4), messages + Parent Lounge
- Comms Epic 4: SafeSport broadcast, coach→minor block, household threads, push on announcements
- Compliance: COPPA waiver, consent_records, minor retention, coach clearance SIEM, passport vault
- Director: Field ops deployment calendar, weather lock scaffold, tournament events, household linker UI
- Admin: Organizations, global users (household column on parents/players), RL policy

### Partial (feels broken to users)
- **Attendance** (`teams/{teamId}/attendance_sessions`) = coach marks present/absent **after** event — not parent **RSVP before**
- **Registration** = admin scripts + manual provision — not self-serve club registration builder
- **Household graph** = backend complete; **requires `npm run deploy:compliance`** for denorm + linker callables on dev
- **Hosting** = sstracker.app on `sports-skill-tracker-dev` — deploy target must match QA docs

### Not started (competitor table stakes)
- Event RSVP with going/not/maybe + coach headcount — **shipped LAUNCH-rsvp** (deploy pending)
- Registration form builder + waitlist + fee plans — **partial LAUNCH-registration-lite**
- **Tryout lifecycle** — registration, field session scheduling, check-in, eval plans, callbacks, automated comms, roster pipeline — **LAUNCH-tryouts-os Planned**
- Org-configurable eligibility requirements dashboard
- Name-only roster → invite guardian email flow
- Native mobile / unified parent “one app” experience

---

## Launch waves (ordered)

### Wave 0 — Unblock QA (this week)
1. `npm run deploy:compliance` to dev (household denorm, linkHousehold, VPC)
2. Re-provision or director-link QA tenant guardians
3. Verify admin roster + coach grid + global users household columns

### Wave 1 — Table stakes (launch gate)
| Sprint | Scope | Proof |
|--------|-------|-------|
| **LAUNCH-rsvp** | Parent/player RSVP on `team_workouts` scheduled events; coach headcount | `scheduleRsvp.test.ts` |
| **LAUNCH-registration-lite** | Director registration link + program stub + parent checkout for QA club | personaFunctionalMvp |
| **LAUNCH-roster-invite** | Name-only row → guardian email invite → household auto-link | household graph tests |

### Wave 2 — Parent adoption parity
- PWA install + push preference UI
- Parent dashboard “This week” schedule strip with RSVP
- iCal feed or calendar deep links for family calendar apps

### Wave 3 — Enterprise / soccer governance
- Eligibility matrix (director-configured requirements per role)
- NCSI / SafeSport vendor scaffold (iframe or webhook like SE)
- GotSport-style roster export packet (if soccer is primary GTM)

### Wave 3b — Club operations moat (owner priority)
| Sprint | Scope | Proof |
|--------|-------|-------|
| **LAUNCH-tryouts-os** | Full tryout cycle — see [`ROADMAP.md`](../../ROADMAP.md) § Sprint LAUNCH-tryouts-os | `tryoutsLaunch.test.ts` (TBD) |

Phases: **A** program + public registration · **B** field sessions + check-in · **C** tryout plan + evals · **D** callbacks + roster pipeline · **E** automated parent/player notifications.

### Wave 4 — Moat expansion (do not defer)
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

> **TeamSnap runs your season. SportsEngine runs your league. GotSport runs your state paperwork. SSTracker runs your athletes’ development — with the compliance architecture youth sports actually needs in 2026.**

---

## Review cadence

- Update this doc when a **LAUNCH-*** sprint closes or a competitor ships a major feature (TeamSnap ONE, SE eligibility, GotSport flags).
- ROADMAP sprint rows must reference wave + priority from this matrix.
