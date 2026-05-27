# Agent — Player UX Sprint Template

**Copy-paste workflow for Player OS layout / pixel sprints** · Instrument taxonomy: [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](./PLAYER_OS_INSTRUMENT_TAXONOMY.md) · Delivery tracker: [`ROADMAP.md`](../../ROADMAP.md)

---

## 1. Mandatory read order (before any Player UX build)

| Order | Document | Why |
|------:|----------|-----|
| 1 | [`ROADMAP.md`](../../ROADMAP.md) | Current sprint only — scope, files, proof tests |
| 2 | [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](./PLAYER_OS_INSTRUMENT_TAXONOMY.md) | Classify instrument(s); cohesion vs differentiation |
| 3 | [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) | Accept / reject mandates |
| 4 | [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) | Pass/fail quality bar |
| 5 | [`PLAYER_OS_FOUNDATION.md`](./PLAYER_OS_FOUNDATION.md) | Z-depth, void contract, Tier A primitives |
| 6 | Persona doc from [`PERSONA_ECOSYSTEM.md`](../PERSONA_ECOSYSTEM.md) | Route ownership — Player only for this template |

Optional for sign-off sprints: [`PLAYER_OS_VISUAL_ACCEPTANCE.md`](../PLAYER_OS_VISUAL_ACCEPTANCE.md), [`PLAYER_OS_RUBRIC_GAP_MATRIX.md`](./PLAYER_OS_RUBRIC_GAP_MATRIX.md).

---

## 2. Required sprint fields

Every Player layout sprint in ROADMAP **must** include these fields. Missing instrument classification → sprint is invalid.

| Field | Description | Example |
|-------|-------------|---------|
| **Instrument(s)** | One or more types from taxonomy §2: Identity, Directive, Navigation, Progression, Telemetry, Execute | `Navigation`, `Progression` |
| **Cohesion scope** | What changes this sprint | `Frame` · `Inner` · `Both` |
| **Persona** | Must be `Player` for Player OS sprints | `Player` |
| **Files** | Explicit list (≤5 unless ROADMAP expands) | `OperativeQuickOps.svelte`, `player-dossier.css`, … |
| **Proof tests** | Extend-only sprint test file | `playerHudSprint247.test.ts` |
| **Done definition** | Observable pass criteria + VA states if pixel sprint | “Quick Ops tiles use shared frame; no pathway well chrome on nav tiles” |

### Cohesion scope definitions

| Value | Agent may change | Agent must not change |
|-------|------------------|------------------------|
| **Frame** | `pd-os-deck`, header grammar, gap/shadow shared across bands | Inner primitive layout inside `__well` |
| **Inner** | Type-specific content, accent, interaction inside existing frame | Outer deck skin, new section wrappers |
| **Both** | Frame + inner when ROADMAP explicitly scopes full band refactor | New skins per section; third header pattern |

---

## 3. Hard rules

1. **No Player layout sprint without instrument classification** — add Instrument(s) to ROADMAP row before build.
2. **Differentiation = inner only** — nav tiles, pathway nodes, radar wells, terminal brackets differ inside the slot; outer frame stays shared.
3. **Cohesion = shared frame** — never new skins per HQ section or route-specific accent systems (e.g. pathway-only gold frames site-wide).
4. **One gold focal on HQ** — Directive hero CTA only in command viewport ([`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](./PLAYER_OS_INSTRUMENT_TAXONOMY.md) § Directive).
5. **Execute brackets/scanline** — corner brackets + scanline reserved for Execute surfaces only (`pw-theater`, `ProvingGrounds` grammar).
6. **≤5 files per session** unless ROADMAP lists more.
7. **Extend** `playerHudSprint*.test.ts` — never delete prior sprint guards.

Workflow rules: [`.cursor/rules/sst-agent-workflow.mdc`](../../.cursor/rules/sst-agent-workflow.mdc)

---

## 4. Build prompt skeleton (copy-paste)

```markdown
## Sprint: [ROADMAP id — e.g. Phase 7 · G1 Frame parity]

### Read first
ROADMAP current sprint → PLAYER_OS_INSTRUMENT_TAXONOMY → PLATFORM_BUILD_MANDATES →
PLATFORM_EXPERIENCE_RUBRIC → PLAYER_OS_FOUNDATION

### Instrument classification
- **Instrument(s):** [Identity | Directive | Navigation | Progression | Telemetry | Execute]
- **Cohesion scope:** [Frame | Inner | Both]
- **Persona:** Player

### Cohesion vs differentiation (mandatory)
- **Cohesion (shared frame):** [Which bands get pd-os-deck / strap / __well parity]
- **Differentiation (inner only):** [What unique primitive stays inside the well — holo card, hero row, nav tile, pathway track, radar, terminal]

### Scope
- **Goal:** [one sentence]
- **Files (explicit):**
  1. ...
  2. ...
- **Out of scope:** [routes, refactors, persona bleed]

### Done when
- [ ] Instrument type matches taxonomy anti-patterns avoided
- [ ] Shared frame contract: header → pd-os-deck → __well → inner
- [ ] Proof: `npm test -- [playerHudSprintXXX.test.ts]`
- [ ] `npm run check` && `npm run build`
- [ ] VA states (if pixel): [profile incomplete · no telemetry · full telemetry · 390px]

### Anti-patterns to reject this sprint
- New skin per HQ section
- Navigation tile chrome on Telemetry surfaces
- Route-only UX without instrument type
- Gold focal outside Directive hero on HQ
```

---

## 5. Verify before done

```bash
npm test -- <paths from ROADMAP sprint>
npm run check
npm run build
```

Visual sprints: capture states listed in sprint doc under `docs/visual-acceptance/`.

---

## 6. Phase 7 quick reference (G1 — agent cold start)

**Goal:** HQ bands share one frame; inner primitives differ by instrument type.

| Band | Instrument | Frame check |
|------|------------|-------------|
| `pd-strap` | Navigation | Z4 strap — not a deck |
| `OperativeHub` | Frame + Identity + Directive | `pd-os-deck--hero` |
| `OperativeQuickOps` | Navigation | `pd-os-deck` + Z3 tiles inside |
| `OperativePathwayPreview` | Progression | `pd-os-deck` + `__well` |
| Analytics void | Telemetry | `pd-os-deck--recessed` |

**Proof (planned):** `playerHudSprint247.test.ts`  
**Full scope:** [`ROADMAP.md`](../../ROADMAP.md) Phase 7 · G1

An agent with no chat context should execute G1 using only repo docs above.

---

## 7. Cross-links

| Doc | Role |
|-----|------|
| [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](./PLAYER_OS_INSTRUMENT_TAXONOMY.md) | Type definitions + registry |
| [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) | §3 Phase 7 waves |
| [`PLAYER_OS_RUBRIC_GAP_MATRIX.md`](./PLAYER_OS_RUBRIC_GAP_MATRIX.md) | Audit gaps by instrument |
| [`.cursor/rules/sst-player-instruments.mdc`](../../.cursor/rules/sst-player-instruments.mdc) | Always-on frame vs inner reminder |
