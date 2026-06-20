# Platform Navigation Canon

**Navigation layout law** — app-native mobile-first chrome for all personas, persona-locked skins, single primary nav surface per viewport.  
**Project:** `sports-skill-tracker-dev` · **Slice:** NAV-OPTION-D  
**Nav link source of truth:** [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) §2 → [`navPinCatalog.ts`](../../src/lib/shell/navPinCatalog.ts) (field pins + AppMenuSheet) · [`workspaceNav.js`](../../src/lib/shell/workspaceNav.js) (desk sidebar)

---

## §0 Authority stack

| Order | Doc | Role |
|-------|-----|------|
| 1 | [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) | Routes, tiers, `nav_visible`, nav href tables |
| 2 | [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) | Gold path steps + UX states |
| 3 | **This file** | Shell chrome grammar, breakpoints, Option D field mode, skin separation |
| 4 | [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) | Shared primitives, layout catalog |
| 5 | Persona foundations | Player / Coach / Parent material vocabulary |
| 6 | [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) | Accept / reject mandates |
| 7 | [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) | Pass/fail quality bar |

**Hard rule:** Registry §2 defines *which* links exist; `navPinCatalog.ts` defines field pins + sheet catalogs; this canon defines *how* they mount in chrome — never duplicate nav arrays in shell components.

---

## §1 Golden rule

Exactly **one persistent primary navigation surface** per viewport.

- **Field mode (<1024px):** full-width fixed **bottom pin bar** (Option D) — **3 user-customizable pins** + fixed **Menu** slot.
- **Full nav:** **AppMenuSheet** (Menu tap + swipe-up from bottom edge) — all Tier 1 + Tier 2 catalog items + system actions.
- **Desk mode (≥1024px):** left sidebar (enterprise) or left rail (player) — bottom bar hidden.

Reject: top mobile header + bottom bar + off-canvas sidebar on field viewports (triple chrome).

---

## §2 Breakpoint tokens

| Token | Value | Meaning |
|-------|-------|---------|
| `--shell-field-max` | `1023.98px` | Last pixel of field / mobile chrome |
| `--shell-desktop-min` | `1024px` | Desk sidebar / rail; hide bottom pin bar |

All shells flip at **1024px**. Deprecate Player **768px** rail flip — target `--shell-desktop-min` for rail vs bottom bar (NAV-IMPL).

Implementation hooks: `MobilePinBar.svelte` `@media (min-width: 1024px) { display: none }`, `EnterpriseConsoleShell` `matchMedia('(min-width: 1024px)')`.

---

## §3 Two-axis contract

Navigation separates **chrome grammar** (interaction) from **skin grammar** (visual).

### §3a Chrome grammar (universal field mode)

- App-native, mobile-first, **Option D**
- Full-width fixed bottom pin bar: **3 customizable pins** + **Menu** slot with safe-area inset
- **44px** minimum touch targets on bar items
- **AppMenuSheet** for full catalog — pins are a subset of catalog only (duplicate href highlight OK)
- Long-press pin slot → sheet in **pick-pin** mode; **Reset to defaults** in sheet footer
- Persistence: `localStorage` + Firestore `users/{email}.mobileNavPins[personaKey]`
- Native document scroll; content inset reserves space for fixed chrome (see §6)

### §3b Skin grammar (persona-locked)

| Persona bucket | Skin | Forbidden on chrome |
|----------------|------|---------------------|
| Staff admin (see §3c) | Admin SIEM / enterprise console | Player dock blur, gold accent, gamification labels |
| Player | Dossier (`player-shell.css`, `--pd-*`) | Enterprise flat admin bar styling |
| Parent | Trust lounge (`parent-lounge-shell.css` on content) | Admin SIEM table density on tab labels; Player gold dock |

**Never** apply Player dock styling to staff pin bar routes. **Never** apply admin SIEM styling to Player or Parent trust surfaces.

---

## §3c Shell matrix

| Persona / roles | Shell | Field chrome (<1024) | Field skin | Desk (≥1024) |
|-----------------|-------|----------------------|------------|--------------|
| Coach | `EnterpriseConsoleShell` | Pins: Daily Intel · Forge · Messages; Menu sheet | Admin SIEM | Left sidebar |
| Director, Admin, Registrar, **Recruiter** | `EnterpriseConsoleShell` | Default pins from §4 table; Menu sheet | Admin console | Left sidebar |
| Player | `PlayerShell` | Pins: HQ · Train · Stats; Menu sheet | Dossier | Left rail |
| Parent | `EnterpriseConsoleShell` | Pins: Household · VPC · Command; Menu sheet | Trust lounge | Left sidebar |

### Staff admin bucket (explicit)

Roles: `coach`, `director`, `admin`, `global_admin`, `super_admin`, `registrar`, **`recruiter`**.

All use `EnterpriseConsoleShell` with **admin interface skin** on mobile **and** desktop. Recruiter routes follow the same field chrome pattern as other staff roles.

---

## §4 Option D — bottom pin bar + AppMenuSheet

**Source:** [`navPinCatalog.ts`](../../src/lib/shell/navPinCatalog.ts) · **Components:** `MobilePinBar.svelte`, `AppMenuSheet.svelte`

### Default pins (3 slots)

| Persona | Slot 1 | Slot 2 | Slot 3 |
|---------|--------|--------|--------|
| player | `/player/dashboard` HQ | `/player/workout` Train | `/stats` Stats |
| coach | `/coach` Daily Intel | `/coach/forge` The Forge | `/messages` Messages |
| parent | `/parent/household` | `/parent/vpc` | `/parent/dashboard` |
| director | `/director?tab=home` | `/director?tab=teams` | `/director?tab=field` |
| admin | `/admin/overview` | `/admin/organizations` | `/admin/users` |
| registrar | `/director?tab=home` | `/director?tab=teams` | `/director?tab=licenses` |
| recruiter | `/recruiter` | `/messages` | *(optional empty)* |

### AppMenuSheet catalogs (per persona)

Sheet sections (top → bottom). Items on bottom pins also appear in sheet (dim/highlight OK).

**Player:** Primary (Tier 1) · More routes (Tracker, Comms, Armory, Settings) · System (Sign out)

**Coach:** Tier 1 / exec · Operations (Tier 2) · System (Sign out, Support, Report anomaly). **Excluded:** War Room `/coach/tactical` — deep-link only.

**Parent:** Tier 1 · Co-op (Tier 2) · System (Sign out, Support)

**Director / Registrar:** Command · Compliance & ops · Workspace switcher · Billing (when `showBilling`) · System

**Admin:** Platform · Workspace switcher · System

**Recruiter:** Search · Cross-persona (Messages) · System

### Field mode rules (all personas)

- **No** `ec-mobile-header` on field viewports
- **No** off-canvas `ec-sidebar` on field viewports
- Menu tap **or** swipe-up (44px threshold) opens `AppMenuSheet`
- Desk ≥1024: left sidebar unchanged (`workspaceNav.js`)

---

## §4b Player mobile field spec

- Bottom pin bar with dossier tokens (`player-shell.css`)
- Default pins: HQ · Train · Stats from registry §2; sheet for Tier 2 + sign-out
- Source: `navPinCatalog.ts` + `playerPrimaryNav.ts` overflow merge

---

## §4c Parent mobile field spec

- Same Option D chrome grammar as enterprise field mode
- Content skin: `parent-lounge-shell.css` — trust tone, co-op partner calm
- Default pins: Household · VPC · Co-op Command; sheet for Messages, Log Workout, Payments

---

## §5 Player HQ mobile glance stats (`WF-PLAYER-HQ`)

At **390px** without scroll, above the fold:

1. Callsign strap (identity)
2. **Glance band:** LVL · Rank · Streak · active bounty count
3. Top of missions rail

Full radar / telemetry bands below fold. Gold path: GP-ACQ-04a · QA-101, QA-106, QA-151, QA-404.

---

## §6 Content inset contract

| Shell | Field bottom inset | Desk inset |
|-------|-------------------|------------|
| `EnterpriseConsoleShell` | `padding-bottom` for pin bar + safe-area (+ director FAB when present) | Sidebar width only |
| `PlayerShell` | `--pp-bottomnav-height` for dossier pin bar | `--pp-rail-width` left rail |
| Parent (enterprise chrome) | Same as enterprise field | Same as enterprise desk |

**Forbid** route-level `tw-fixed tw-bottom-*` nav — chrome lives in shells only.

---

## §7 Anti-patterns

| Anti-pattern | Why rejected |
|--------------|--------------|
| Top header + bottom bar + mobile sidebar on field | Violates §1 golden rule (triple chrome) |
| `ec-mobile-header` on field viewports | Option D — bottom bar only |
| Mobile off-canvas `ec-sidebar` | Full nav via AppMenuSheet |
| Player 7-icon floating dock | Exceeds Option D pin model |
| Player styling on staff pin bar | Breaks §3b skin separation |
| Gold / gamification on staff nav | Coach SIEM boundary — gold is Player focal only |
| Player labels on coach tabs ("HQ", "Train") | Persona vocabulary leak |
| Nav arrays outside `navPinCatalog.ts` / `workspaceNav.js` | Drift from registry §2 |
| War Room `/coach/tactical` in coach sheet | Tier 2 deep-link only |
| 768px Player rail breakpoint | Deprecate — target 1024px per §2 |
| Recruiter excluded from staff field chrome | Staff admin bucket includes recruiter |

---

## §8 Agent verification checklist

Before sign-off on shell / nav / layout work:

| Viewport | Persona | Checks |
|----------|---------|--------|
| **390px** | Coach | QA-NAV-02 — pin bar + sheet; no mobile header/sidebar |
| **390px** | Player | QA-NAV-01 — glance band + pin customize |
| **390px** | Parent | QA-NAV-03 — trust lounge content; Option D chrome |
| **390px** | Staff admin | QA-NAV-04 pin persistence; recruiter if applicable |
| **1280px** | All | Sidebar/rail visible; bottom bar hidden |

**Automated guards:** `src/lib/platform/__tests__/platformNavigationCanon.test.ts`

```bash
npm test -- src/lib/platform/__tests__/platformNavigationCanon.test.ts src/lib/shell/__tests__/navPinCatalog.test.ts src/lib/stores/__tests__/navPins.test.ts
```

---

## Cross-links

| Doc | Role |
|-----|------|
| [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) §2 Shell contract | Layout catalog + shell hooks |
| [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) §3 | Coach density @ 390px |
| [`PARENT_OS_FOUNDATION.md`](./PARENT_OS_FOUNDATION.md) | Trust tone |
| [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) §4 | Scroll contract |
| [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) GP-ACQ-04a | Player HQ gold path step |
