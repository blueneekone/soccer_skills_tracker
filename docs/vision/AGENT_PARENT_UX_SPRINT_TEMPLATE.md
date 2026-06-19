# Agent — Parent UX Sprint Template

**Copy-paste workflow for Parent OS layout / pixel sprints** · Foundation: [`PARENT_OS_FOUNDATION.md`](./PARENT_OS_FOUNDATION.md) · Platform: [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) · Delivery: [`ROADMAP.md`](../../ROADMAP.md)

---

## 1. Mandatory read order (before any Parent UX build)

| Order | Document | Why |
|------:|----------|-----|
| 1 | [`PRODUCT_SURFACE_REGISTRY.md`](./PRODUCT_SURFACE_REGISTRY.md) | Tier, nav, `workflow_id`, `layout_pattern` |
| 2 | [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) | UX states — especially VPC + household |
| 3 | [`PARENT_OS_FOUNDATION.md`](./PARENT_OS_FOUNDATION.md) | Lounge shell + trust contract |
| 4 | [`PLATFORM_BUILD_MANDATES.md`](./PLATFORM_BUILD_MANDATES.md) | Accept / reject mandates |
| 5 | [`PLATFORM_EXPERIENCE_RUBRIC.md`](./PLATFORM_EXPERIENCE_RUBRIC.md) | Pass/fail — Parent row |
| 6 | [`PLATFORM_DESIGN_SYSTEM.md`](./PLATFORM_DESIGN_SYSTEM.md) | Layout pattern catalog |
| 7 | [`docs/COPPA_SIGNUP_MATRIX.md`](../COPPA_SIGNUP_MATRIX.md) | VPC / minor gate copy |
| 8 | [`ROADMAP.md`](../../ROADMAP.md) | Current sprint only |

Optional: [`PARENT_OS_VISUAL_ACCEPTANCE.md`](./PARENT_OS_VISUAL_ACCEPTANCE.md), `parent-lounge-shell.md` / `parent-vpc-trust-band.md` blueprints.

---

## 2. Required sprint fields

| Field | Description | Example |
|-------|-------------|---------|
| **registry row** | e.g. `PS-P02` from §1 master table | `PS-P02` `/parent/vpc` |
| **workflow step ids** | From [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) §2 | `GP-ACQ-02`, `GP-PARENT-02` |
| **layout_pattern** | From design system §4 | `parent-trust-form` |
| **foundation section cite** | Section in [`PARENT_OS_FOUNDATION.md`](./PARENT_OS_FOUNDATION.md) | §3 Trust contract |
| **VA row** | Checkbox in [`PARENT_OS_VISUAL_ACCEPTANCE.md`](./PARENT_OS_VISUAL_ACCEPTANCE.md) | VPC 390px reference matrix |
| **workflow_id** | From registry | `WF-PARENT-VPC` |
| **Instrument subset** | Directive + Telemetry only | `Directive` |
| **Persona** | `Parent` | `Parent` |
| **Viewport priority** | Tier 1 = **390px first** | `390px then 1280px` |
| **Files** | ≤5 unless ROADMAP expands | `parent/vpc/+page.svelte`, … |
| **Proof tests** | Extend-only | `personaFunctionalMvp.test.ts`, `launchP0Fixes.test.ts` |
| **Done definition** | Trust + VA | "VPC grant CTA ≥44px; no player chrome" |

---

## 3. Hard rules

1. **Co-op partner tone** — calm, trustworthy; not a game UI.
2. **No Player chrome** — no `pd-os-deck`, chamfer operative frame, streak rings, gold accent.
3. **VPC copy** plain-language — state benefit of consent; no shouty marketing.
4. **390px first** on household, VPC, dashboard.
5. **Native document scroll** on all parent routes.
6. **Trust states** — loading, blocked (waiver), success per workflow canon.
7. **≤5 files** per session unless ROADMAP lists more.
8. **Extend** sprint tests — never delete prior guards.

---

## 4. Build prompt skeleton (copy-paste)

```markdown
## Sprint: [ROADMAP id — e.g. VS-4b]

### Read first
PRODUCT_SURFACE_REGISTRY → PLATFORM_WORKFLOW_CANON → PARENT_OS_FOUNDATION →
PLATFORM_BUILD_MANDATES → PLATFORM_EXPERIENCE_RUBRIC → COPPA_SIGNUP_MATRIX

### Classification
- **layout_pattern:** parent-trust-form
- **workflow_id:** WF-PARENT-VPC
- **Instrument subset:** Directive
- **Persona:** Parent
- **Viewport:** 390px first

### Scope
- **Goal:** [one sentence]
- **Files (explicit):**
  1. ...
- **Out of scope:** Player/Coach pixels

### Done when
- [ ] No player gamification chrome
- [ ] No gold accent
- [ ] VPC workflow states implemented
- [ ] Proof: `npm test -- personaFunctionalMvp.test.ts`
- [ ] VA: PARENT_OS_VISUAL_ACCEPTANCE VPC 390px row

### Anti-patterns to reject
- Player pd-os-deck frame
- 24px soft pill cards (use 8px chamfer)
- Operative jargon in headlines
- Glassmorphism on VPC trust band
```

---

## 5. Verify before done

```bash
npm test -- <paths from ROADMAP sprint>
npm run build
```

Visual sprints: capture 390px first per [`PARENT_OS_VISUAL_ACCEPTANCE.md`](./PARENT_OS_VISUAL_ACCEPTANCE.md).

---

## 6. Cross-links

| Doc | Role |
|-----|------|
| [`PARENT_OS.md`](./PARENT_OS.md) | Product north star |
| [`parent-lounge-shell.md`](./references/ui/research/blueprints/parent-lounge-shell.md) | VS-4a blueprint |
| [`.cursor/rules/sst-agent-workflow.mdc`](../../.cursor/rules/sst-agent-workflow.mdc) | Agent workflow |
