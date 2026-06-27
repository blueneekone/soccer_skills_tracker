# Comms & Team Operations Hub — Vision

> **Implementation authority for channel types:** [`COMMS_CHANNEL_CANON.md`](./COMMS_CHANNEL_CANON.md) — typed channel registry, delivery contract, unified hub shell (Epic 4.13+). **Agent drift prevention:** [`COMMS_PLATFORM_STANDARDS.md`](./COMMS_PLATFORM_STANDARDS.md).

**ROADMAP Epic 4** · **Product delivery spans Epics B, C, D, E**

---

## North star

SSTracker becomes the **primary team communications and notifications platform** for summer and fall seasons: practice/game reminders, payment and registration nudges, staff announcements, and parent logistics — all **SafeSport-aligned** with a **household-only** policy for adult↔minor interactive messaging.

Staff reach families through **parent-targeted** channels (announcements, Parent Lounge). Minors receive schedule and team context through **HQ/calendar UI**, not coach DMs.

---

## Primary users

| Persona | Role in comms hub | Key surfaces |
|---------|-------------------|--------------|
| **Coach** | Team announcements, adult-player mail (18+), parent↔coach DM *(planned)*; **monitor** Parent Circle (no posts) | `/messages`, `/coach/logistics` → hub deep link |
| **Team Manager** *(future)* | Logistics broadcasts, schedule-driven reminders — Epic 4.7 | `/coach/logistics`, `/messages` logistics category |
| **Director** | Club-wide broadcasts, compliance console, optional read-only on parent↔coach DMs when `includeAdOnParentDms` | `/director?tab=comms` → hub, compliance export |
| **Parent** | Parent Circle (post), announcement inbox, household threads, parent↔coach DM *(planned)*, voice sessions *(planned)* | `/messages`, `/parent/dashboard` strip |
| **Player (minor)** | **No staff inbox** — HQ/calendar mirror + household thread only | HQ notifications, `/messages` household panel |
| **Adult player (18+)** | Direct coach mail, announcement inbox, push notifications | `/messages` (limited), push |

---

## Household-only rule (4.0 charter)

**Canonical policy:** No adult↔minor **direct or interactive** messaging except **same-household parent↔child** threads gated by `householdId`.

| Path | Allowed? | Notes |
|------|----------|-------|
| Coach → minor (1:1 DM) | **Blocked** *(target state)* | Legacy `sendCoachPlayerMessage` CC-on-minor model is **superseded** — see Sprint 4.2 |
| Coach → parent (announcement / Parent Lounge) | **Allowed** | Primary staff→family surface |
| Coach → adult player (18+) | **Allowed** | Age-verified recipient only |
| Parent ↔ parent (group context) | **Allowed** | **Parent Circle** (`parent_lounge`) — parents post; staff monitor via export |
| Parent ↔ coach (1:1) | **Allowed** *(planned)* | **`parent_coach_dm`** — bilateral default; AD read-only when club flag set |
| Parent ↔ coach (group context) | **Deprecated for staff post** | Staff use announcements + parent↔coach DM — not Parent Circle posts |
| Parent ↔ linked operative (minor) | **Allowed** | Household thread — `householdId` gate only |
| Staff → minor inbox (interactive) | **Blocked** | Minors get schedule via HQ/calendar, not staff DMs |
| Director → club broadcast | **Allowed** | Parent + adult-player targeting — Epic 4.8 |
| TM → parent logistics | **Allowed** *(future)* | Parent-targeted; no minor inbox — Epic 4.7 |

Compliance mapping: [`docs/SAFESPORT_COMMS_MATRIX.md`](../SAFESPORT_COMMS_MATRIX.md)

---

## Channel types

### Announcements

Staff → parents (+ adult players). One-way or reply-via-Parent-Lounge. Minors see equivalent schedule/event context on **Player HQ / calendar UI**, not in a coach DM thread.

- Callable surface: `safeSportBroadcast` (today) → unified announcement bus (Epic 4.3+)
- Push category: `push_announcements`

### Parent Circle (`parent_lounge`)

**Parents post only** in a monitored group context. Staff **do not post** — they monitor via compliance export and reach families through **announcements** + **parent↔coach DM** *(planned)*.

- Route: `/messages` — Epic 4.4 **Done**
- Push category: `push_messages`
- Policy: [`COMMS_PLATFORM_STANDARDS.md`](./COMMS_PLATFORM_STANDARDS.md) §4.1

### Household threads

Parent ↔ linked operative(s) only. Enforced by shared `householdId` on both user documents. No cross-household or staff participation in the thread body.

| Path | Gate | Staff visibility |
|------|------|------------------|
| Parent → linked minor | `householdId` match | None in thread body |
| Parent → linked adult player (18+) | `householdId` match | None in thread body |
| Cross-household | **Blocked** | — |
| Coach in household thread | **Blocked** | Use announcements or `parent_coach_dm` *(planned)* |

- Sprint: **4.11 Done**
- Push category: `push_messages` (household-scoped)
- Route: `/messages` household panel

### Adult athlete mail

Coach → player **only when recipient is 18+** (server-side age check). Replaces coach→minor DM for development feedback that must reach the athlete directly.

- Sprint: **4.2** (block minor path) + **4.1** (compose surfaces)
- Push category: `push_messages`

---

## Notification categories

| Category | Trigger examples | Sprint |
|----------|------------------|--------|
| `push_announcements` | Team/club announcements, schedule changes | 4.3, 4.5 |
| `push_gameReminders` | Match day, call time, field change | 4.6 |
| `push_messages` | Parent Lounge, household thread, adult mail | 4.3, 4.4, 4.11 |
| Payment / registration reminders | Stripe, registrar deadlines, fee due | 4.6 |

**Target state:** Single FCM token store and unified notification bus (Epic 4.3). Today: event-driven multicast in `functions/index.js` — see [`docs/FCM_AND_MESSAGING_MATRIX.md`](../FCM_AND_MESSAGING_MATRIX.md).

---

## Handoffs to product epics

| Epic | Persona doc | Comms responsibility |
|------|-------------|----------------------|
| **B** | [`PARENT_OS.md`](./PARENT_OS.md) | Parent Lounge, announcement inbox, household threads, VPC `consentComms` |
| **C** | [`COACH_OS.md`](./COACH_OS.md) | `/coach/logistics` compose, MessagesTab mount, parent-targeted send |
| **D** | [`TEAM_MANAGER_OS.md`](./TEAM_MANAGER_OS.md) | TM logistics mode — Epic 4.7 |
| **E** | [`DIRECTOR_OS.md`](./DIRECTOR_OS.md) | Club broadcast composer, compliance console — Epic 4.8–4.9 |

Epic 4 **absorbs** fragmented comms work previously tracked under Epic 2 Sprint 2.3 (SafeSport parent CC on minor DMs) and Epic 5.5 messaging product delivery.

---

## Out of scope for this document

This vision doc defines **policy and UX intent only**. Implementation is tracked in ROADMAP sprints:

| Sprint | Scope |
|--------|-------|
| **4.0** | This doc + `SAFESPORT_COMMS_MATRIX.md` *(docs only)* |
| **4.1–4.12** | Wire surfaces, compliance enforcement, notification bus, tests |

Do **not** implement messaging UI, callables, or Firestore rule changes under Sprint 4.0.

---

## ROADMAP link

Delivery tracker: [`ROADMAP.md`](../../ROADMAP.md) — **Sprint status — Epic 4: Comms & Team Operations Hub**.

**Naming note:** ROADMAP **Epic 4 = Comms Hub**. Unrelated legacy comments (e.g. Firestore "Epic 4.3 LeagueManager") use a different numbering scheme — do not renumber.

**Parallel tracks:** Epic 4 runs **parallel to Epic 3** after Sprint 3.2 ships. **Epic 4.1+ unblocked after Player OS premium track 2.19 Done** — Epic 4.0 docs may proceed in parallel.

**Season MVP:**

- **Summer:** 4.1–4.4 + 4.11 (send surfaces, compliance block, notification bus, Parent comms hub, household threads)
- **Fall:** 4.5–4.10 + 4.12 (schedule→push, reminders, TM mode, director broadcast, compliance console, report flow, rules tests)
