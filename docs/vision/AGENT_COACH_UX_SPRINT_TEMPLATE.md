# Agent — Coach UX Sprint Template

**Copy-paste workflow for Coach OS layout / pixel sprints** · Foundation: [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) · Platform: [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) · Delivery: [`ROADMAP.md`](../../ROADMAP.md)

---

## 1. Mandatory read order (before any Coach UX build)

| Order | Document | Why |
|------:|----------|-----|
| 1 | [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) | Tier, nav, `workflow_id`, `layout_pattern` |
| 2 | [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) | UX states for touched `workflow_id` |
| 3 | [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) | SIEM material + Forge workbench canon |
| 4 | [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) | Accept / reject — **no Trinity HUD on Tier 1** |
| 5 | [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) | Pass/fail — Coach row |
| 6 | [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) | Layout pattern + persona fork |
| 7 | [`ROADMAP.md`](../../ROADMAP.md) | Current sprint only |

Optional: [`COACH_OS_VISUAL_ACCEPTANCE.md`](./COACH_OS_VISUAL_ACCEPTANCE.md), relevant blueprint under `references/ui/research/blueprints/`.

---

## 2. Required sprint fields

| Field | Description | Example |
|-------|-------------|---------|
| **registry row** | `PS-C02` from §1 master table | `PS-C02` `/coach/forge` |
| **workflow step ids** | From [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) §2 | `GP-ACQ-03`, `GP-COACH-02` |
| **layout_pattern** | From [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) §4 | `coach-forge-workbench` / catalog `full-page-workbench` |
| **foundation section cite** | Section in [`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) | §8 Forge workbench layout |
| **VA row** | Checkbox row in [`COACH_OS_VISUAL_ACCEPTANCE.md`](./COACH_OS_VISUAL_ACCEPTANCE.md) | Forge 390px reference matrix |
| **workflow_id** | From registry / workflow canon | `WF-COACH-FORGE` |
| **Instrument subset** | Coach uses Telemetry, Execute, Directive only | `Directive + Execute` |
| **Persona** | `Coach` | `Coach` |
| **Viewport priority** | Coach Tier 1 = **390px first** | `390px then 1280px` |
| **Files** | ≤5 unless ROADMAP expands | `CoachIntentEngineView.svelte`, … |
| **Proof tests** | Extend-only | `intentModule.test.ts`, `productSurfaceRegistry.test.ts` |
| **Done definition** | Observable + VA row if pixel | "No fixed HUD on forge; deploy block reason visible" |

---

## 3. Hard rules

1. **No gamification chrome** — XP, streak, loot, Player chamfer on Coach routes.
2. **No gold accent** on Coach surfaces — cyan primary only.
3. **Tier 1 Forge = full-page workbench** — reject `IntentHUD` fixed overlay ([`COACH_OS_FOUNDATION.md`](./COACH_OS_FOUNDATION.md) §9).
4. **390px first** on `/coach` and `/coach/forge` sign-off.
5. **Native document scroll** — no inner traps; no mobile overlay blocking >30% viewport.
6. **Deploy UX** — boolean priority toggle; inline `deployBlockReason`; 44px CTA.
7. **≤5 files** per session unless ROADMAP lists more.
8. **Extend** sprint tests — never delete prior guards.

---

## 4. Build prompt skeleton (copy-paste)

```markdown
## Sprint: [ROADMAP id — e.g. VS-3-Forge]

### Read first
PRODUCT_SURFACE_REGISTRY → PLATFORM_WORKFLOW_CANON → COACH_OS_FOUNDATION →
PLATFORM_BUILD_MANDATES → PLATFORM_EXPERIENCE_RUBRIC → PLATFORM_DESIGN_SYSTEM

### Classification
- **layout_pattern:** coach-forge-workbench
- **workflow_id:** WF-COACH-FORGE
- **Instrument subset:** Directive + Execute
- **Persona:** Coach
- **Viewport:** 390px first

### Scope
- **Goal:** [one sentence]
- **Files (explicit):**
  1. ...
- **Out of scope:** Player pixels, roster callable fixes unless in sprint

### Done when
- [ ] No Trinity HUD overlay on Tier 1 route
- [ ] No gold on Coach route (grep guard)
- [ ] Workflow states: loading, empty, error, deploy block, success
- [ ] Proof: `npm test -- intentModule.test.ts productSurfaceRegistry.test.ts`
- [ ] VA: COACH_OS_VISUAL_ACCEPTANCE Forge 390px row

### Anti-patterns to reject
- Fixed bottom glass HUD
- Gold CTA
- Player pd-os-deck frame
- Silent disabled deploy
```

---

## 5. Verify before done

```bash
npm test -- <paths from ROADMAP sprint>
npm run build
```

Visual sprints: capture 390px first per [`COACH_OS_VISUAL_ACCEPTANCE.md`](./COACH_OS_VISUAL_ACCEPTANCE.md).

---

## 6. Cross-links

| Doc | Role |
|-----|------|
| [`COACH_OS.md`](./COACH_OS.md) | Product north star |
| [`coach-forge-workbench-v1.md`](./references/ui/research/blueprints/coach-forge-workbench-v1.md) | VS-3-Forge blueprint |
| [`.cursor/rules/sst-agent-workflow.mdc`](../../.cursor/rules/sst-agent-workflow.mdc) | Agent workflow |
