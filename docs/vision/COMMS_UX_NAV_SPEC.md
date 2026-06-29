# Comms UX & Navigation Spec — PS-X01 Nav 2.0

**Authority:** Hub shell layout for `/messages` (PS-X01) · **Standards:** [`COMMS_PLATFORM_STANDARDS.md`](./COMMS_PLATFORM_STANDARDS.md) · **Registry:** [`COMMS_CHANNEL_CANON.md`](./COMMS_CHANNEL_CANON.md) §3 · **Surface:** [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) PS-X01

> **Status:** Nav 2.0 is **planned** — Epic 4.13–4.16d shipped category-by-type rail v1. This spec is the target for the next hub navigation slice without changing delivery semantics.

---

## 1. Space picker

The left rail begins with a **space picker** — the user's current context in the club hierarchy.

| Level | Picker label | Scope |
|-------|--------------|-------|
| **Club** | Club name | Director/registrar — club-wide channels (`club_wide`, `emergency`, `compliance`, `sponsor_partner`) |
| **Team** | Team name + age group | Coach, parent (per child's team), TM (future) |
| **Household** | Household display name | Parent/player — household thread only |

**Rules:**

- Parents with multiple children see **one combined unread stack** — team spaces collapse under child team headers, not separate hub routes
- Players see **no space picker** — deep-link to household thread or notification target only
- Staff clearance badge visible when compose is clearance-gated
- Space switch preserves scroll position per space in session storage (implementation detail)

---

## 2. Categories (hub rail grouping)

Channels group under **five categories** — not one flat type list:

| Category | Icon character | Channel types (`type_id`) | Primary personas |
|----------|----------------|---------------------------|------------------|
| **Families** | Trust-forward, flat | `announcements`, `parent_lounge` (Parent Circle), `household`, `parent_coach_dm` *(planned)* | Parent, coach |
| **Game day** | Urgent, time-boxed | `match_day`, game-day logistics sub-channels | Coach, parent, TM |
| **Logistics** | Ops density | `team_logistics`, `registration`, `tryouts_events` | Coach, TM, registrar, parent (read) |
| **Staff** | SIEM-like internal | `staff_internal`, `development` *(partial)* | Coach, director, registrar |
| **Club ops** | Oversight | `club_wide`, `emergency`, `compliance`, `sponsor_partner` | Director, admin, parent (read/opt-in) |

**Placement rules:**

- Each channel instance appears under **exactly one** category
- `outbox` (staff) lives as a **tab** in the main pane, not a category
- Partner offers (`sponsor_partner`) appear under **Club ops** as read-only digest stream — **not** under Families chat rail ([`COMMS_PLATFORM_STANDARDS.md`](./COMMS_PLATFORM_STANDARDS.md) §4.4)
- `parent_voice_session` *(planned)* surfaces under **Families** as scheduled session cards, not a persistent chat row

---

## 3. Channel placement within category

Within each category, channels sort:

1. **Unread badge** descending
2. **Pinned** channels (director/coach pin per team — future)
3. **Alphabetical** by display name

**Parent rail (simplified):**

```
Families
  ├── Announcements (team A)
  ├── Parent Circle (team A)
  ├── Announcements (team B)
  ├── Parent Circle (team B)
  └── Household
Game day
  └── Match day (team A) — only when event window active
Logistics
  └── Registration — when open season
Club ops
  └── Compliance notices
```

**Staff rail (dense):**

Full five-category tree under selected team/club space + **Outbox** tab.

---

## 4. Collapse & mobile rules

| Breakpoint | Behavior |
|------------|----------|
| **≥1024px (desk)** | Persistent left rail — space picker + categories expanded |
| **768–1023px** | Rail collapses to **icon strip**; category labels on hover/tooltip; tap opens drawer |
| **≤767px (field / parent 390px-first)** | **Single column** — space picker as sheet header; channel list full width; back chevron to list from stream |

**Parent mobile (390px-first per [`PARENT_OS_FOUNDATION.md`](./PARENT_OS_FOUNDATION.md)):**

- Unread stack is **flat** — no category accordion on first paint
- Optional "Group by team" toggle in sheet menu (v2 polish)
- Compose bar hidden on read-only types (`announcements`, `registration`, etc.)
- Delivery receipt expands inline below composer — not modal

**Coach mobile:**

- Match-day category **pins to top** when game window ±3h (future heuristic)
- Staff internal hidden from parent/player JWT regardless of breakpoint

---

## 5. Deep links

| Query | Target |
|-------|--------|
| `?space=team:{teamId}` | Select team space |
| `?channel=announcements` | Open announcements for current space |
| `?channel=parent_lounge` | Open Parent Circle |
| `?channel=parent_coach_dm` | Open parent↔coach DM |
| `?channel=household` | Open household thread |
| `?compose=1` | Focus composer when type allows post |

**Team Ops embed (`/coach/logistics?tab=comms`):** Coach team comms mount a native **`CommsWorkspaceShell`** (coach-team variant) inside `CoachTeamCommsPanel` — left category rail + main pane. Default channel is **`parent_coach_dm`** (inbox-first). No pill tabs; active channel uses cyan left-border rail affordance per [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md). Coach `/messages` **redirects** to Team Ops with query params preserved (`channel`, `section`, `sub`, `teamId`).

Director comms tab links to hub deep links for club-wide surfaces — team-scoped coach workflows stay on Team Ops.

---

## 6. Persona skins (unchanged from canon §7)

| Persona | Nav character |
|---------|-----------------|
| Player | No rail — notification deep-links only |
| Parent | Trust-forward flat stack; 390px-first |
| Coach / TM | SIEM density; clearance visible |
| Director | Club tree + compliance cross-links |

---

## 7. Related documents

| Document | Role |
|----------|------|
| [`COMMS_PLATFORM_STANDARDS.md`](./COMMS_PLATFORM_STANDARDS.md) | Locked policies + drift checklist |
| [`COMMS_CHANNEL_CANON.md`](./COMMS_CHANNEL_CANON.md) | Type registry + permissions |
| [`PLATFORM_NAVIGATION_CANON.md`](./PLATFORM_NAVIGATION_CANON.md) | Pin bar / AppMenuSheet Messages entry |
| [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) | PS-X01 tier + nav 2.0 note |
