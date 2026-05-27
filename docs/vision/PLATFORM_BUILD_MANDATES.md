# Platform Build Mandates

**Agent build contract** · Accepted vs rejected implementation rules for SSTracker UX  
**Supersedes:** Historical enterprise strategy PDF visuals/psychology for implementation — see [`docs/archive/ENTERPRISE_BLUEPRINT_NOTE.md`](../archive/ENTERPRISE_BLUEPRINT_NOTE.md)

---

## §0 — Authority stack (agent read order)

| Order | Doc | Role |
|-------|-----|------|
| 1 | **This file** | What to build / what to never build |
| 2 | [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](./PLAYER_OS_INSTRUMENT_TAXONOMY.md) | Instrument types; cohesion (shared frame) vs differentiation (inner primitive) |
| 3 | [`AGENT_PLAYER_UX_SPRINT_TEMPLATE.md`](./AGENT_PLAYER_UX_SPRINT_TEMPLATE.md) | Player UX sprint fields + build prompt skeleton |
| 4 | [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) | Pass/fail quality bar (Affective) |
| 5 | [`PLAYER_OS_RUBRIC_GAP_MATRIX.md`](./PLAYER_OS_RUBRIC_GAP_MATRIX.md) | Current audit gaps |
| 6 | [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) | Player material vocabulary (Z-depth, void, Tier A) |
| 7 | [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) | Sign-off checklist |
| 8 | [`ROADMAP.md`](../../ROADMAP.md) | When + proof tests |

**Note:** The historical enterprise strategy PDF is **not** binding for UX. This doc supersedes PDF visuals/psychology for implementation.

---

## §1 — Accepted mandates (BUILD THESE)

| Mandate | Agent instruction | Rubric principle | Primary waves |
|---------|-------------------|------------------|---------------|
| **“I see you” tap feedback** | Every control gets visible `:active` / `:focus-visible` / press state — border brighten, translate, or rim glow. **No opacity-only dimming** as the sole feedback. | §1.4 Interaction quality | A, B–E |
| **SDT-aligned engagement (youth-safe)** | Support **autonomy** (pathway/loadout choices), **competence** (clear XP/skill feedback), **relatedness** (coach/club missions). Avoid controlling “do X for Y” copy for minors. | §1.2 Psychology of value · §2 Player row | All |
| **Diegetic Player UX** | Terminals, brackets, custom controls on primary Player paths. No browser-default modals, `<select>`, or raw checkboxes on `/player/*` and player `/stats`. | §2 Player row · §4 Player scroll | C, D, E |
| **Verified-commit ceremony** | Canvas confetti / celebration **only after successful Firestore batch commit**. Async, non-blocking. In-app diegetic overlay — not SweetAlert2. | §1.2 · §2 Player row | D |
| **Streak / progress visibility** | Streak + rank readable at HQ; age-appropriate copy. Honor `prefers-reduced-motion` and `data-dopamine='off'`. | §1.2 · §2 Player row | B, D |
| **12-col liquid bento + clamp()** | Keep existing `bento-grid--12col bento-grid--liquid` grid. **Do not** fill HQ void to “eliminate dead space.” | §1.3 Visual discipline · FOUNDATION §3 | B |
| **44px minimum tap targets** | All primary controls ≥44px touch height on mobile athletic contexts (rail, Quick Ops, mission CTAs). | §1.4 Interaction quality | A, B |
| **Personalization on first paint** | Operative identity, loadout preview, rank/XP where data exists — no generic empty shell on return visit. | §1.7 Personalization | B |
| **Performance = premium** | Instant tap feedback; skeletons not blank stalls; **native document scroll** on Player routes (no inner scroll traps). | §1.6 Performance · §4 Scroll | A |
| **Trust UX** | Clear errors, permission copy, VPC/compliance plain-language — no mystery failures on commit paths. | §1.8 Trust | D |

---

## §2 — Explicit rejects (DO NOT BUILD)

| Reject | Why | PDF source (label only) | Audit evidence if any |
|--------|-----|-------------------------|------------------------|
| **Liquid glassmorphism as default Player panel material** | Reads admin SaaS, fights void canon; matte + edge-lit Z2 is the Player deck grammar. | Enterprise SIEM glass panels | Gap matrix HQ/Stats Partial |
| **Neon cyan `#00f0ff` / `#00d4ff` as Player route accent** | Breaks dual-accent canon. Use gold `--pd-accent-action` + teal `--pd-accent-data` only. | Cyber HUD accent spec | Armory `#00d4ff` Fail |
| **“Eradicate dead space” on Player HQ** | Void ≥40% is measurable contract per FOUNDATION §3 — dead space is intentional atmosphere. | Full-bleed dashboard fill | HQ void Partial |
| **SweetAlert2 on any Player route** (`/player/*`, `/stats` player path) | Snaps user out of diegetic terminal fantasy at commit time. Use diegetic overlay (Wave D). | Modal success/error pattern | Train Swal Fail |
| **Hook/FOMO anxiety/scarcity loops for minors** as Player UI drivers | Exploitative engagement; conflicts with Car Ride Home intent and rewards philosophy. | Variable-reward anxiety hooks | PLAYER_OS.md § Rewards |
| **One tactical/gamified skin on Coach or Parent routes** | Persona boundary — Coach = flat sideline analytics; Parent = co-op partner. | Unified gamified shell | PERSONA_ECOSYSTEM |
| **`preventDefault` right-click radial menus** | Unless a future sprint explicitly scopes context menus — default off. | Radial command deck | — |
| **Tier A primitive wrapped in Tier B matte frame** | Double-border stacks kill bloom and void; FOUNDATION §9 anti-pattern. | Nested panel frames | FOUNDATION §9 |
| **Inner `overflow: auto` scroll regions on Player OS routes** | Breaks scroll physics contract; use document scroll + allowed exceptions only. | Scrollable widget panels | PlayerShell Pass guard |
| **Unique skin per HQ section** | Breaks instrument cohesion — one shared `pd-os-deck` frame; differentiation is inner primitive only. See [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](./PLAYER_OS_INSTRUMENT_TAXONOMY.md). | Per-section panel skins | HQ matte-heavy Partial |
| **Pathway-only accent systems** | Progression gold/teal frames must not become the site-wide deck grammar; nav tiles and telemetry bands share the frame contract. | Pathway track chrome on Quick Ops / VPP | Gap matrix Nav vs Telemetry |

**Director/Admin exception:** B2B hard-lock modals may use existing patterns until a Director-specific sprint; **Player paths never Swal.**

---

## §3 — Player OS rubric redesign waves (active plan)

| Wave | Scope | Absorbs ROADMAP slice | Done when |
|------|--------|----------------------|-----------|
| **A** | Foundation + shell: void measurement, accent canon, rail feedback, diegetic overlay **stub** | — | BUILD_MANDATES §1 foundation rows pass; overlay component exists unt wired |
| **B** | HQ: OperativeHub deck, single gold focal, mission rail, Quick Ops | 6j follow-up | HQ VA matrix ☑ 1280+390; void measured |
| **C** | Telemetry: Stats investigation workspace + Tracker archive feel | **6l** | Stats + Tracker VA rows ☑ |
| **D** | Train + Settings: replace Swal, diegetic sliders, commit ceremony wired | 6h follow-up | Train/Settings VA rows ☑; no Swal on Player paths |
| **E** | Armory: kill `qa-strap`, accent canon, diegetic tabs | **6f** follow-up | Armory VA row ☑ |
| **F** | Sign-off: fill PLAYER_OS_VISUAL_ACCEPTANCE + void contract | **6i** | All reference-matrix ☐ cleared |

**Do not modify `/player/skill-tree`** except as Tier A visual benchmark.

Evidence and per-route gaps: [`PLAYER_OS_RUBRIC_GAP_MATRIX.md`](./PLAYER_OS_RUBRIC_GAP_MATRIX.md)

### Phase 7 — Instrument cohesion (G1–G4)

Runs **after or parallel to** Waves A–F where bands overlap. Classify every sprint per [`AGENT_PLAYER_UX_SPRINT_TEMPLATE.md`](./AGENT_PLAYER_UX_SPRINT_TEMPLATE.md).

| Sprint | Scope | Instrument focus | Done when |
|--------|--------|------------------|-----------|
| **G1** | Frame parity | All HQ bands — shared header → `pd-os-deck` → `__well` → inner | HQ scroll stack obeys frame contract; `playerHudSprint247.test.ts` |
| **G2** | Nav vs Progression | `OperativeQuickOps` vs `OperativePathwayPreview` — no cross-chrome | Nav tiles ≠ pathway wells; inner differentiation only; `playerHudSprint248.test.ts` |
| **G3** | Telemetry calm | VPP + Stats bands — no Navigation tile lift on radar | Telemetry anti-patterns cleared; `playerHudSprint249.test.ts` |
| **G4** | Execute alignment | Train `pw-theater` — Execute instrument, bracket/scanline scoped | Matches `ProvingGrounds` grammar; no Swal; `playerHudSprint250.test.ts` |

Full table: [`ROADMAP.md`](../../ROADMAP.md) Phase 7.

---

## §4 — Psychology (youth-safe subset)

**Build:** Self-Determination Theory — autonomy, competence, relatedness on Player surfaces. Variable reward and celebration at **earned milestones** (verified commit, rank-up, streak milestone) — not random loot-box timing.

**Do not build:** “Deceptive” Hook-model language (external triggers, manufactured scarcity, anxiety loops) as primary UI drivers for minors. FOMO copy (“last chance”, countdown pressure on optional training) is out of scope.

Aligns with [`PLAYER_OS.md`](./PLAYER_OS.md) rewards philosophy and Parent **Car Ride Home** intent — habit and mastery, not exploitation.

---

## §5 — Engineering pointer

Implementation mechanics (Svelte 5 runes, cell routing, offline sync, Firestore batch patterns) live in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md). UX waves A–F do **not** mix auth/routing refactors into pixel scope unless the wave explicitly touches those surfaces.

---

## §6 — Related links

| Doc | Role |
|-----|------|
| [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](./PLAYER_OS_INSTRUMENT_TAXONOMY.md) | Instrument types + component registry |
| [`AGENT_PLAYER_UX_SPRINT_TEMPLATE.md`](./AGENT_PLAYER_UX_SPRINT_TEMPLATE.md) | Player UX sprint procedure |
| [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) | Universal pass/fail criteria |
| [`PLAYER_OS_RUBRIC_GAP_MATRIX.md`](./PLAYER_OS_RUBRIC_GAP_MATRIX.md) | Route × principle audit |
| [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) | Material vocabulary |
| [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md) | Screenshot sign-off |
| [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) | Roles and route ownership |
| [`.cursor/rules/sst-agent-workflow.mdc`](../../.cursor/rules/sst-agent-workflow.mdc) | Agent sprint workflow |
