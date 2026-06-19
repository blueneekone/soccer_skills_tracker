# Platform Navigation Canon

**Navigation layout law** — app-native mobile-first chrome for all personas, persona-locked skins, single primary nav surface per viewport.  
**Project:** `sports-skill-tracker-dev` · **Slice:** NAV-CANON  
**Nav link source of truth:** [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) §2 → [`workspaceNav.js`](../../src/lib/shell/workspaceNav.js) (enterprise) + `playerPrimaryNav.ts` (player, NAV-IMPL)

---

## §0 Authority stack

| Order | Doc | Role |
|-------|-----|------|
| 1 | [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) | Routes, tiers, `nav_visible`, nav href tables |
| 2 | [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) | Gold path steps + UX states |
| 3 | **This file** | Shell chrome grammar, breakpoints, Option A field mode, skin separation |
| 4 | [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) | Shared primitives, layout catalog |
| 5 | Persona foundations | Player / Coach / Parent material vocabulary |
| 6 | [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) | Accept / reject mandates |
| 7 | [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) | Pass/fail quality bar |

**Hard rule:** Registry §2 defines *which* links exist; this canon defines *how* they mount in chrome — never duplicate nav arrays in shell components.

---

## §1 Golden rule

Exactly **one persistent primary navigation surface** per viewport.

- **Field mode (<1024px):** full-width fixed bottom tab bar (Option A) — max **5** Tier 1 primary links.
- **Overflow:** hamburger drawer / More sheet lists Tier 2+ (`nav_visible=true`) and system actions only — **no duplicate hrefs** from the bottom bar.
- **Desk mode (≥1024px):** left sidebar (enterprise) or left rail (player) — bottom bar hidden.

Reject: sidebar drawer + bottom tabs both listing the same primary hrefs on field viewports.

---

## §2 Breakpoint tokens

| Token | Value | Meaning |
|-------|-------|---------|
| `--shell-field-max` | `1023.98px` | Last pixel of field / mobile chrome |
| `--shell-desktop-min` | `1024px` | Desk sidebar / rail; hide bottom tab bar |

All shells flip at **1024px**. Deprecate Player **768px** rail flip — target `--shell-desktop-min` for rail vs bottom bar (NAV-IMPL).

Implementation hooks: `MobileTabBar.svelte` `@media (min-width: 1024px) { display: none }`, `EnterpriseConsoleShell` `matchMedia('(min-width: 1024px)')`.

---

## §3 Two-axis contract

Navigation separates **chrome grammar** (interaction) from **skin grammar** (visual).

### §3a Chrome grammar (universal field mode)

- App-native, mobile-first, **Option A**
- Full-width fixed bottom tab bar with safe-area inset
- **44px** minimum touch targets on tab items
- Hamburger / More overflow for Tier 2+ — never duplicate primary tab hrefs
- Native document scroll; content inset reserves space for fixed chrome (see §6)

### §3b Skin grammar (persona-locked)

| Persona bucket | Skin | Forbidden on chrome |
|----------------|------|---------------------|
| Staff admin (see §3c) | Admin SIEM / enterprise console | Player dock blur, gold accent, gamification labels |
| Player | Dossier (`player-shell.css`, `--pd-*`) | Enterprise flat admin bar styling |
| Parent | Trust lounge (`parent-lounge-shell.css` on content) | Admin SIEM table density on tab labels; Player gold dock |

**Never** apply Player dock styling to `MobileTabBar` on staff routes. **Never** apply admin SIEM styling to Player or Parent trust surfaces.

---

## §3c Shell matrix

| Persona / roles | Shell | Field chrome (<1024) | Field skin | Desk (≥1024) |
|-----------------|-------|----------------------|------------|--------------|
| Coach | `EnterpriseConsoleShell` | Tabs: Daily Intel · Forge · Messages; overflow drawer | Admin SIEM | Left sidebar |
| Director, Admin, Registrar, **Recruiter** | `EnterpriseConsoleShell` | Primary tabs (≤5 from registry); overflow drawer | Admin console | Left sidebar |
| Player | `PlayerShell` | HQ · Train · Stats · More | Dossier | Left rail |
| Parent | `EnterpriseConsoleShell` | Household · VPC · Command · Messages; overflow drawer | Trust lounge | Left sidebar |

### Staff admin bucket (explicit)

Roles: `coach`, `director`, `admin`, `global_admin`, `super_admin`, `registrar`, **`recruiter`**.

All use `EnterpriseConsoleShell` with **admin interface skin** on mobile **and** desktop. Recruiter routes follow the same field chrome pattern as other staff roles.

---

## §4 Staff admin mobile field spec

- CSS: `enterprise-console.css` tokens on nav chrome only — **not** `player-shell.css`
- Full-width fixed bottom bar: flat admin background, 1px top border — **no floating pill**, no player blur/glow dock
- Active tab: cyan (coach) or neutral/grey (director / admin / registrar / recruiter) — **zero gold**
- Mobile header + workspace switcher retained
- Overflow drawer: Tier 2+ `nav_visible=true` + system actions — **not** primary tab duplicates
- Nav arrays: [`workspaceNav.js`](../../src/lib/shell/workspaceNav.js) only — no inline duplicate arrays in shells

---

## §4b Player mobile field spec

- Full-width bottom bar with dossier tokens (`player-shell.css`)
- Primary tabs (max 4 + More): HQ · Train · Stats from registry §2; More sheet for Tier 2 + messages
- Sign-out in More sheet (not primary tab row)
- Source: `playerPrimaryNav.ts` (NAV-IMPL) — retire inline `NAV_LINKS` array in `PlayerShell.svelte`

---

## §4c Parent mobile field spec

- Same Option A chrome grammar as enterprise field mode
- Content skin: `parent-lounge-shell.css` — trust tone, co-op partner calm
- Nav chrome uses enterprise field pattern; tab labels **not** SIEM table density
- Primary tabs: Household · VPC · Command · Messages (registry §2); overflow for Tier 2 parent links

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
| `EnterpriseConsoleShell` | `padding-bottom` for tab bar + safe-area | Sidebar width only |
| `PlayerShell` | `--pp-bottomnav-height` for dossier dock | `--pp-rail-width` left rail |
| Parent (enterprise chrome) | Same as enterprise field | Same as enterprise desk |

**Forbid** route-level `tw-fixed tw-bottom-*` nav — chrome lives in shells only.

---

## §7 Anti-patterns

| Anti-pattern | Why rejected |
|--------------|--------------|
| Sidebar + bottom bar with same hrefs on field viewports | Violates §1 golden rule |
| Player 7-icon floating dock | Exceeds Option A max-5 primary; mixes Tier 2 into tab row |
| Player styling on `MobileTabBar` for staff routes | Breaks §3b skin separation |
| Gold / gamification on staff nav | Coach SIEM boundary — gold is Player focal only |
| Player labels on coach tabs ("HQ", "Train") | Persona vocabulary leak |
| Nav arrays outside canonical modules | Drift from registry §2 |
| 768px Player rail breakpoint | Deprecate — target 1024px per §2 |
| Recruiter excluded from staff field chrome | Staff admin bucket includes recruiter |

---

## §8 Agent verification checklist

Before sign-off on shell / nav / layout work:

| Viewport | Persona | Checks |
|----------|---------|--------|
| **390px** | Coach | QA-141 — field tabs + drawer; no duplicate hrefs; deploy path not blocked |
| **390px** | Player | QA-101 — glance band + missions rail above fold |
| **390px** | Parent | QA-121–125 — trust lounge content; enterprise field chrome |
| **390px** | Staff admin | Recruiter field chrome if applicable |
| **1280px** | All | Sidebar/rail visible; bottom bar hidden |

**Automated guards:** `src/lib/platform/__tests__/platformNavigationCanon.test.ts`

```bash
npm test -- src/lib/platform/__tests__/platformNavigationCanon.test.ts src/lib/platform/__tests__/productSurfaceRegistry.test.ts
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
