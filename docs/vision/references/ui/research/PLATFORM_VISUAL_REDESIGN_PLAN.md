# Platform Visual Redesign Plan — iterative delivery

**Status:** Active (owner reopened · `ROADMAP.md` current sprint)  
**Prerequisite track:** **LAUNCH-functional-os Done** · audit backlog **A–F Done** · dev deploy **2026-06-11**  
**Authority:** Research PDF · [`TOKEN_GAP_ANALYSIS.md`](./TOKEN_GAP_ANALYSIS.md) · CDO blueprints · [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](../../PLAYER_OS_INSTRUMENT_TAXONOMY.md)

---

## 1. Are we ready for redesign?

### Yes — for platform **visual system** iteration

| Layer | Status | Evidence |
|-------|--------|----------|
| **Core loops wired** | ✅ | Audit A–F closed · `personaFunctionalMvp.test.ts` guards |
| **Persona routes live** | ✅ | Player / Parent / Coach / Director workspaces mount real components |
| **Backend callables** | ✅ (dev) | Systematic deploy on `sports-skill-tracker-dev`; owner checklist for prod |
| **Player OS frame** | ✅ | Phase 7 G1–G10 · `pd-os-deck` grammar · rubric Waves A–F |
| **Visual research ingested** | ✅ | PDF + gap analysis + CDO blueprint examples |
| **Avatar / Flow PNG art** | ⏸ Post-launch | `LAUNCH-defer-avatar` · research §C PNG session deferred |

### Not “100% done forever” — explicit non-blockers

These do **not** block starting redesign sprints; they run in parallel or after:

| Item | Type | Notes |
|------|------|-------|
| **Production deploy** | Ops | Dev deployed; prod = owner `deploy:*` + rules pass |
| **Human QA checklists** | QA | `FUNCTIONAL_MVP.md` VPC, RL rollout smoke — verify on tenant, not code |
| **Project-wide TS debt** | Hygiene | `npm run check` warnings outside sprint scope — fix when touched |
| **Coach tactical visual dialect** | Redesign scope | Functional War Room exists; CDO blueprint = major skin pass |
| **Stale ROADMAP rows** | Docs | Some 2.22 “in progress” rows superseded by Phase 7 Done — ignore for new work |

**Conclusion:** You are on the **redesign phase** for **layout, tokens, persona skins, and net-new modal surfaces**. You are **not** starting a greenfield app — you are **evolving** shipped shells, with Player OS furthest along and Coach/Parent/Director needing the most visual alignment.

---

## 2. North star (unchanged)

> Cinematic, youth-safe enterprise ecosystem — sideline clarity (Coach), co-op trust (Parent), operative command deck (Player) — **earned mastery**, not casino loops.

**Hard rejects (all phases):** neon casino · flat SaaS purple admin · exploitative dark patterns · mascot pedagogy · avatar PNG wiring · hard-coded hex in components after token pass.

---

## 3. Pre-flight (one session — owner + agent)

| Step | Deliverable | Blocks |
|------|-------------|--------|
| **3.1** | Complete [`OWNER_DECISION_CHECKLIST.md`](./OWNER_DECISION_CHECKLIST.md) §H (8 picks) | Chamfer, grain, Coach accent, confetti |
| **3.2** | Add `--pd-color-*` aliases in `player-dossier.css` + Coach vanguard map doc | All component sprints |
| **3.3** | Choose **shadow grammar** for Directive modals: CDO hard-offset **vs** existing emissive glow | Player modal sprints |
| **3.4** | Save CDO blueprints → `blueprints/*.md` | Component sprint citations |
| **3.5** | Optional: export infographic PNG → `research/SSTracker-OS-Infographic.png` | Agent reference only |

**Verify:** `npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts` (no regressions)

---

## 4. Delivery model (same as whole build)

Each sprint = **one slice · ≤5 files · explicit proof path**.

```
Design (Ask / CDO blueprint) → ROADMAP row → Agent build → npm test + check → dev deploy spot-check → next slice
```

**Player UX sprints:** classify instrument + Frame | Inner | Both per [`AGENT_PLAYER_UX_SPRINT_TEMPLATE.md`](../../AGENT_PLAYER_UX_SPRINT_TEMPLATE.md).

**Regression:** extend existing `playerHudSprint*.test.ts` / `personaFunctionalMvp.test.ts` — never delete prior guards.

---

## 5. Phase map

### Phase 0 — Token canon (1–2 sprints)

**Goal:** One vocabulary; blueprints paste-clean.

| Sprint | Scope | Files (typical) | Proof |
|--------|-------|-----------------|-------|
| **VS-0a** | `--pd-color-*` aliases + `--pd-chamfer-depth` token | `player-dossier.css`, `app.css` comment map | New `visualTokenCanon.test.ts` |
| **VS-0b** | Coach `--co-*` or vanguard→pd alias table; scrub gold from coach routes grep | `app.css`, 1 coach shell CSS | `coachModule.test.ts` no gold on tactical |

**Exit:** [`TOKEN_GAP_ANALYSIS.md`](./TOKEN_GAP_ANALYSIS.md) items marked ✅ for aliases.

---

### Phase 1 — Player OS net-new surfaces (3–4 sprints)

**Goal:** CDO blueprints → shippable components without breaking HQ frame.

Player **inline** hero (`OperativeHub`) stays; modals are **additive**.

| Sprint | Component | Blueprint | Wire to | Proof |
|--------|-----------|-----------|---------|-------|
| **VS-1a** | `MissionHeroModal.svelte` | HQ Mission Hero Modal | `ActiveBounties` row → engage handoff | `playerHudSprint*.test.ts` + functional MVP |
| **VS-1b** | `SkillTierUnlockModal.svelte` | Skill tier unlock | Skill-tree tier advance event | skill-tree test extend |
| **VS-1c** | `PlayerDiegeticOverlay` variant merge or shared scrim util | Both modals | DRY scrim: 70% void, no blur per CDO | overlay test |
| **VS-1d** | Shadow/chamfer grammar pass on modals only | §H decisions | — | VA screenshots HQ + modal |

**Do not:** reskin entire HQ in one sprint · wrap Tier A primitives in matte panels · add inner `overflow:auto`.

---

### Phase 2 — Player OS cohesion audit (2 sprints)

**Goal:** Align remaining Player routes with chosen CDO grammar where Phase 7 left emissive glow.

| Sprint | Scope | Proof |
|--------|-------|-------|
| **VS-2a** | Train Execute band — confirm gold single-CTA, amber trim density | `playerOsCohesion.test.ts` |
| **VS-2b** | Armory + Stats — telemetry vs directive accent split (cyan-1 vs gold) | `playerHudSprint243.test.ts` extend |

---

### Phase 3 — Coach OS visual dialect (4–6 sprints)

**Goal:** SIEM flat analytics per persona matrix — **no gamification chrome**.

Functional War Room **keeps** behavior; skin changes incrementally.

| Sprint | Scope | Notes |
|--------|-------|-------|
| **VS-3a** | Coach token skin: void base, grey trim borders, cyan primary (no gold) | Dashboard + shell |
| **VS-3b** | `/coach/tactical` pitch board — remove rounded-xl, glow, gradient (CDO sanitization) | Highest conflict with today |
| **VS-3c** | Drill library cards — chamfer 8px, navy panel, mono labels | `CoachDrillsView` |
| **VS-3d** | Z4 HUD chrome — Commit Session / Export strip | `TacticalHUD` |
| **VS-3e** | Motion cap 100ms on tactical interactions (CDO) vs `--motion-fast` 150ms — **pick one** | Document in checklist |
| **VS-3f** | Coach VA pass — bento 12-col preserved | Screenshot gate |

**Exit:** CDO `COACH_TACTICS_STRATAGEM_V1` ≥80% on `/coach/tactical` route only.

---

### Phase 4 — Parent OS trust skin (2–3 sprints)

**Goal:** Calm navy, 24px radius, VPC trust marker per §H #6.

| Sprint | Scope |
|--------|-------|
| **VS-4a** | Parent lounge shell tokens — soft radius, no operative jargon |
| **VS-4b** | VPC / billing bands — trust shield prominence (owner pick) |
| **VS-4c** | Parent VA — household, vpc, payments |

---

### Phase 5 — Director OS (2 sprints)

**Goal:** Club ops SIEM — align with Coach flat grammar, no Player chrome.

| Sprint | Scope |
|--------|-------|
| **VS-5a** | Director command center + field ops token pass |
| **VS-5b** | Director VA |

---

### Phase 6 — Shared + launch polish (1–2 sprints)

| Sprint | Scope |
|--------|-------|
| **VS-6a** | `/messages` cross-persona comms hub — persona-aware skins inside shared route |
| **VS-6b** | `app.html` anti-flash inline void/navy per research §G |
| **VS-6c** | Prod deploy + VA sign-off matrix update |

---

## 6. Explicitly out of scope (until owner unpause)

| Track | Rule |
|-------|------|
| Avatar Studio / PNG layers | `avatar-builder-deferred.mdc` |
| Flow Z0–Z3 chrome PNG ingest | research §D · `static/` only when sprint says |
| Switzer font | Optional Phase 0b if licensed |
| `team_manager` etc. | ROADMAP planned roles — not in JWT |
| RL `abPercent > 0` rollout | Ops playbook — not visual |

---

## 7. CDO blueprint backlog (prioritized)

| Priority | Blueprint | Phase |
|----------|-----------|-------|
| P0 | HQ Mission Hero Modal | VS-1a |
| P0 | Skill Tier Unlock Modal | VS-1b |
| P1 | Coach Tactics Stratagem V1 | VS-3b–d (split) |
| P2 | Parent VPC trust band | VS-4b |
| P2 | Director field ops panel | VS-5a |

**Workflow:** Generate in Gemini → paste to `blueprints/` → normalize tokens → one sprint each.

---

## 8. ROADMAP insertion template

Add rows under a new section **Platform Visual System (VS-*)** in `ROADMAP.md`:

```markdown
## Sprint VS-1a — Mission Hero Modal
**Status:** Planned
**Scope:** `MissionHeroModal.svelte`, `ActiveBounties.svelte`, `player-dossier.css` (modal tokens)
**Authority:** `blueprints/hq-mission-hero-modal.md`, `PLATFORM_VISUAL_REDESIGN_PLAN.md`
**Proof:** `personaFunctionalMvp.test.ts` + `playerHudSprint*.test.ts`
**Verify:** `npm test -- …` · `npm run check`
```

---

## 9. Success criteria (redesign “done”)

- [ ] All four personas have documented skin matrix implementation (Player chamfer / Coach SIEM / Parent soft / Director ops)
- [ ] Zero `--pd-action-gold` on Coach/Parent/Director routes (test guard)
- [ ] CDO P0 blueprints shipped and wired to functional loops
- [ ] Owner §H checklist completed and reflected in tokens
- [ ] VA reference matrix updated (`docs/vision/va-screenshots/`)
- [ ] Prod deploy matches dev systematic backend
- [ ] Avatar track still deferred; launch portrait bar unchanged

---

## 10. Recommended first three sprints (start here)

1. **VS-0a** — Token aliases + owner checklist  
2. **VS-1a** — Mission Hero Modal (highest user-visible ROI)  
3. **VS-3a** — Coach shell token skin (biggest persona gap vs Player)

---

## Cross-links

- Gap analysis: [`TOKEN_GAP_ANALYSIS.md`](./TOKEN_GAP_ANALYSIS.md)
- Functional closure: [`docs/FUNCTIONAL_AUDIT_BACKLOG.md`](../../../FUNCTIONAL_AUDIT_BACKLOG.md)
- Launch bar: [`docs/vision/FUNCTIONAL_MVP.md`](../../FUNCTIONAL_MVP.md)
