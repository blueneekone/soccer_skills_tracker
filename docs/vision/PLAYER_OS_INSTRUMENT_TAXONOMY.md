# Player OS — Instrument Taxonomy

**Canonical classification for every Player OS surface** · Material vocabulary: [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) · Sprint workflow: [`AGENT_PLAYER_UX_SPRINT_TEMPLATE.md`](./AGENT_PLAYER_UX_SPRINT_TEMPLATE.md) · Delivery: [`ROADMAP.md`](../../ROADMAP.md)

---

## 1. Cohesion vs differentiation

Player OS reads as **one operative command deck**, not a collage of route-specific skins.

| Axis | Scope | Rule |
|------|-------|------|
| **Cohesion** | **Shared frame** | Every instrument band uses the same outer grammar: eyebrow header → `pd-os-deck` (or strap variant) → optional `pd-os-deck__well` → inner content slot. Same Z2 gradient, top highlight, cast shadow, gap rhythm. **Never invent a new panel skin per HQ section.** |
| **Differentiation** | **Inner primitive only** | What changes per instrument type is the **inner content** — holo identity card, mission hero row, nav tile grid, pathway track, radar well, terminal brackets. Accent, interaction, and Z-layer follow the instrument type table below. |

**Agent lock:** Differentiation = inner only. Cohesion = shared frame. If a sprint proposes a new matte wrapper, third header pattern, or section-only accent system → reject per [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) §2.

---

## 2. Instrument types

Six types cover every Player OS band. Classify **before** pixel work.

### Identity

| Field | Spec |
|-------|------|
| **Job** | Answer “who am I?” — operative portrait, callsign, rank, streak, XP conduit. |
| **Player mental model** | My operative dossier card on the ops floor. |
| **Z-layer** | **Z3** raised hero — edge-glow, hologram tilt, one focal per viewport region. |
| **Interaction** | Profile setup CTA when incomplete; hover lift on holo shell; no tile-grid chrome. |
| **Accent** | Gold rank bar fill, streak-at-risk pulse; teal meta labels only. |
| **Anti-patterns** | Grey inset well boxing the holo shell; second gold focal; mini progress rings on stat cells. |

**Registry:** `IdentityBentoModule`, `HologramCardShell`, `HudAvatarRing`, `OperativeLoadoutPreview` (HQ embed)

---

### Directive

| Field | Spec |
|-------|------|
| **Job** | Answer “what do I do now?” — one hero mission with primary CTA. |
| **Player mental model** | Mission select screen — pick the next bounty. |
| **Z-layer** | **Z3** hero card inside shared deck frame; compact rows **Z2**. |
| **Interaction** | Tap hero CTA → route or modal; compact list rows secondary. |
| **Accent** | **Gold** chamfer CTA on hero only — the viewport’s single gold focal on HQ. |
| **Anti-patterns** | Multiple gold CTAs in command viewport; full-width 12-col mission slab on desktop. |

**Registry:** `ActiveBounties` (embedded mission rail), hero via `selectPrimaryBounty` / `resolveHeroQuest`

**Gold focal rule (HQ):** Exactly **one** gold primary CTA visible in the command viewport — `.quest-hero__cta` or equivalent hero row. Rank bar, streak cells, and nav tiles stay teal or neutral. See [`PLAYER_OS.md`](./PLAYER_OS.md) § Presence & hierarchy.

---

### Navigation

| Field | Spec |
|-------|------|
| **Job** | Answer “where do I go?” — route jumps, shell rail, Quick Ops tiles, page straps. |
| **Player mental model** | Command deck transit — airlock doors, not content panels. |
| **Z-layer** | **Z4** floating chrome (strap, rail) or **Z3** lift tiles on **Z2** deck. |
| **Interaction** | Instant `:active` press feedback; `min-height: 44px`; navigate on tap. |
| **Accent** | Teal active rail / tile border; gold **only** when tile represents an action-tier route (rare). |
| **Anti-patterns** | Brackets + scanline on nav tiles; pathway reward wells on Quick Ops; telemetry radar inside nav band. |

**Registry:** `PlayerShell` rail, `pd-strap`, `PlayerOsPageStrap`, `OperativeQuickOps`, `HUDContainer` chrome

---

### Progression

| Field | Spec |
|-------|------|
| **Job** | Answer “what unlocks next?” — season pathway, rank track, skill-tree projection preview. |
| **Player mental model** | Timeline rail — nodes ahead in the Grid. |
| **Z-layer** | **Z2** deck + **Z1** `pd-os-deck__well` track; node highlights **Z3**. |
| **Interaction** | Horizontal scroll OK with visible affordance; tap node → detail or route. |
| **Accent** | Teal track + node rings; current level may use gold ring — **not** hero CTA gold. |
| **Anti-patterns** | Pathway-only accent system that breaks shared frame; nav tile chrome on timeline nodes. |

**Registry:** `OperativePathwayPreview`, `OperativePathway` (full route), skill-tree projection embeds

---

### Telemetry

| Field | Spec |
|-------|------|
| **Job** | Answer “how am I performing?” — radar, vectors, charts, capsules, stat investigation. |
| **Player mental model** | Holographic data in void — calm, readable, emissive geometry. |
| **Z-layer** | **Z1** recessed well (`pd-os-deck--recessed`) + intrinsic SVG bloom; inspector inset. |
| **Interaction** | Axis select, period toggles (diegetic kit); read-heavy, low chrome motion. |
| **Accent** | Teal data polygon, inspector bar; **no** gold except rank context lines. |
| **Anti-patterns** | Navigation tile lift on radar band; extra `::before`/`::after` frames around `pdDataBloom`; Chart.js default chrome. |

**Registry:** `VanguardProtocolPanel`, `AttributeRadar`, `HudMetricsPanel` (embedded vectors), memory capsules strip, Stats investigation bands

---

### Execute

| Field | Spec |
|-------|------|
| **Job** | Answer “log it now” — workout terminal, slider conduits, commit ceremony. |
| **Player mental model** | Stratagem upload terminal — brackets, scanline, state copy. |
| **Z-layer** | **Z2** hero deck (`pd-os-deck--hero`) with **Execute-only** bracket + scanline grammar. |
| **Interaction** | Diegetic inputs; verified-commit overlay after Firestore batch — never SweetAlert2. |
| **Accent** | `--drill-accent` cascade; teal interactive borders; gold on commit success state only. |
| **Anti-patterns** | Browser-default `<select>` / checkbox; plain range inputs; admin form rows. |

**Registry:** `pw-theater` (Train route), `ProvingGrounds.svelte` (reference primitive), `PlayerDiegeticOverlay`

---

## 3. Shared frame contract

Every instrument band (except fixed Z4 chrome) follows:

```
header (pd-eyebrow + title + optional status)
  └─ .pd-os-deck [.pd-os-deck--hero | .pd-os-deck--recessed]
       └─ .pd-os-deck__well (optional — Progression track, Telemetry inset, ghost states)
            └─ inner primitive (type-specific — Identity holo, Directive hero, Nav tile, …)
```

| Frame element | Rule |
|---------------|------|
| **Header** | HQ: `pd-strap`. All other player routes: `PlayerOsPageStrap`. No third pattern (`qa-strap` rejected). |
| **`pd-os-deck`** | Z2 raised plate — `--pd-depth-panel-gradient`, top highlight, cast shadow. Shared across HQ bands and secondary routes. |
| **`pd-os-deck--hero`** | Z3 lift for command + execute hero decks only. |
| **`pd-os-deck--recessed`** | Z1 inset for telemetry void bands. |
| **`pd-os-deck__well`** | Recessed track or ghost whisper — Progression timeline, capsule ghost, form sections. |
| **Decorative layers** | Max **two** per surface (Foundation §2). Brackets + scanline **Execute only**. |

Stylesheet home: `src/lib/styles/player-dossier.css` (`pd-os-deck` kit).

---

## 4. Component registry (canonical names)

Do **not** rename or alias these in sprint docs.

| Component | Instrument type | Route / band |
|-----------|-----------------|--------------|
| `HUDContainer` | Navigation (layout chrome) | HQ grid wrapper |
| `pd-strap` | Navigation | HQ header |
| `PlayerOsPageStrap` | Navigation | Stats, Train, Tracker, Armory, Settings, Skill tree |
| `OperativeHub` | Cohesion frame | HQ command deck shell |
| `IdentityBentoModule` | Identity | HQ hub 8-col |
| `HudMetricsPanel` | Telemetry (compact) | HQ hub vectors snippet |
| `ActiveBounties` | Directive | HQ mission rail 4-col |
| `OperativeQuickOps` | Navigation | HQ below hub |
| `OperativePathwayPreview` | Progression | HQ below Quick Ops |
| `OperativePathway` | Progression | Armory / full pathway route |
| `VanguardProtocolPanel` | Telemetry | HQ analytics + Stats |
| `AttributeRadar` | Telemetry (Tier A primitive) | Inside VPP |
| Memory capsules strip | Telemetry | HQ analytics footer |
| `pw-theater` | Execute | Train `/player/workout` |
| `ProvingGrounds` | Execute (reference) | Workout primitive canon |
| `PlayerShell` | Navigation | All player routes — rail + ambient |
| `PlayerDiegeticOverlay` | Execute | Verified-commit ceremony |

---

## 5. HQ scroll order (instrument stack)

Document scroll top → bottom on `/player/dashboard`:

| Order | Band | Instrument | Canonical component |
|------:|------|------------|---------------------|
| 1 | Route header | Navigation | `pd-strap` + `HqWorldContextStrip` |
| 2 | Command deck | Cohesion frame | `OperativeHub` (`pd-os-deck--hero`) |
| 2a | Identity column | Identity | `IdentityBentoModule` |
| 2b | Metrics snippet | Telemetry (compact) | collapsed vectors / `HudMetricsPanel` path |
| 2c | Mission rail | Directive | `ActiveBounties` embedded — **gold focal here** |
| 3 | Quick transit | Navigation | `OperativeQuickOps` |
| 4 | Pathway preview | Progression | `OperativePathwayPreview` |
| 5 | Analytics void | Telemetry | `VanguardProtocolPanel` + capsules (`pd-os-deck--recessed`) |
| — | Shell rail | Navigation | `PlayerShell` fixed Z4 |

Secondary routes map one primary instrument per page strap + deck stack — see [`PLAYER_OS.md`](./PLAYER_OS.md) § Route parity.

---

## 6. Coach / Parent instrument subset

Player instruments **do not ship** on Coach or Parent routes.

| Persona | Instrument subset | Skin |
|---------|-------------------|------|
| **Player** | Full taxonomy (Identity → Execute) | Cinematic void + `pd-os-deck` frame |
| **Coach** | Telemetry + Execute (flat) — squad tables, drill assignment forms | Flat sideline analytics — no gamification chrome |
| **Parent** | Directive + Telemetry (flat) — bounties, progress snapshots, VPC | Flat co-op partner — not a game UI |

Persona boundaries: [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md). Reject mandate: one tactical/gamified skin on Coach or Parent — [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) §2.

---

## 7. Phase 7 cohesion sprints (pointer)

Instrument cohesion delivery lives in ROADMAP **Phase 7 · G1–G4**:

| Sprint | Focus |
|--------|-------|
| **G1** | Frame parity — all HQ bands obey shared frame contract |
| **G2** | Navigation vs Progression — inner differentiation, no cross-chrome |
| **G3** | Telemetry calm — no nav tile grammar on radar / Stats bands |
| **G4** | Execute alignment — Train `pw-theater` matches Execute instrument |

Proof tests and file lists: [`ROADMAP.md`](../../ROADMAP.md) Phase 7 table.

---

## 8. Cross-links

| Doc | Role |
|-----|------|
| [`AGENT_PLAYER_UX_SPRINT_TEMPLATE.md`](./AGENT_PLAYER_UX_SPRINT_TEMPLATE.md) | Mandatory sprint fields + build prompt |
| [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) | Accept / reject mandates |
| [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) | Z-depth, void %, Tier A primitives |
| [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) | Sign-off matrix with Instrument column |
