# Token gap analysis — Gemini Visual System Research vs codebase

**Status:** Active (owner reopened Platform visual system · `ROADMAP.md` current sprint)  
**Source:** [`SSTracker-Visual-System-Research-Report.pdf`](./SSTracker-Visual-System-Research-Report.pdf) §B, §G  
**Compared against:** `src/app.css`, `src/lib/styles/player-dossier.css`, `src/lib/styles/player-shell.css`  
**Date:** 2026-06-11

---

## Executive summary

Player OS already implements ~70% of the research spec at the **behavioral** level (void canvas, Z0–Z4 depth, chamfer CTAs, gold single-CTA + teal telemetry split, bento liquid gaps, grain overlay). The main gaps are **canonical naming**, **persona token silos**, and **missing secondary palette slots** (void-1, cyan-0 nav, amber atompunk trim, structural greys).

**Phase 1 can proceed without PNG reference art** — existing CSS glass/chamfer/gradient stack matches §B intent. PNGs from §C are **Phase 2 polish** (Z0 atmosphere plates, edge-lit panel slices) after owner decisions in §H.

---

## Color tokens (§B.1)

| Research token | Hex | Role | Codebase today | Gap |
|----------------|-----|------|----------------|-----|
| `pd-color-void-0` | `#000000` | Player Z0 canvas | `--pd-bg`, `--pd-z0-canvas`, `.ps-root--dossier --pp-bg` | ✅ Aligned |
| `pd-color-void-1` | `#020617` | Z0 ambient variant | Implicit in `--pd-depth-panel-gradient`, `--pd-z1-well-bg` | ⚠️ No named token; add `--pd-color-void-1` alias |
| `pd-color-navy-0` | `#0f172a` | Coach/Parent Z2 base; Player Z1 wells | `--vanguard-bg`, `--obsidian`, `--color-dominant` | ✅ Coach; Player Z0 intentionally pure black (by design) |
| `pd-color-navy-1` | `#1e293b` | Z2 hover / raised edge | `--vanguard-surface-raised`, `--border-slate-800` | ⚠️ Not wired to `--pd-*`; Coach-only |
| `pd-color-grey-0` | `#334155` | Structural borders | `--vanguard-border` uses slate @ 12% alpha, not `#334155` | ⚠️ Player `--pd-line` is `rgba(255,255,255,0.1)` — different grammar |
| `pd-color-grey-1` | `#94a3b8` | Secondary labels | `--vanguard-text-secondary` | ✅ Coach; Player uses `--pd-text-muted` (white alpha) |
| `pd-color-grey-2` | `#cbd5e1` | Z4 inactive chrome | `--vanguard-text-3` | ⚠️ Not exposed as shared `--pd-*` |
| `pd-color-gold-0` | `#fbbf24` | **One** Player CTA | `--pd-accent-action`, `--color-accent`, `--pp-accent` | ✅ Aligned |
| `pd-color-cyan-0` | `#06b6d4` | Nav / active tabs (Z4) | Marketing only; Player nav uses `--pd-accent-data` (#14b8a6) | ❌ Missing persona nav token; report splits nav vs telemetry cyan |
| `pd-color-cyan-1` | `#14b8a6` | Telemetry / data nodes | `--pd-accent-data`, `--vanguard-accent` | ✅ Aligned (Coach + Player) |
| `pd-color-amber-0` | `#d97706` | Atompunk trim / warnings | Scattered hard-coded in admin/parent/director routes | ❌ No `--pd-color-amber-0` in Player dossier kit |
| `pd-color-amber-1` | `#f59e0b` | Micro-interaction highlights | `--pp-accent` fallback on non-dossier shell | ⚠️ Partial; not in canonical `--pd-*` table |

### Recommended minimal token additions (Phase 1)

Add to `:root` or `.player-dossier-root` in one pass — **aliases first**, no component churn:

```css
/* Canonical names from research §B — alias existing values */
--pd-color-void-0: var(--pd-bg, #000000);
--pd-color-void-1: #020617;
--pd-color-gold-0: var(--pd-accent-action, #fbbf24);
--pd-color-cyan-1: var(--pd-accent-data, #14b8a6);
--pd-color-cyan-0: #06b6d4;   /* Z4 nav — new semantic slot */
--pd-color-amber-0: #d97706;
--pd-color-amber-1: #f59e0b;
--pd-color-grey-0: #334155;
--pd-color-navy-0: #0f172a;
--pd-color-navy-1: #1e293b;
```

Coach OS: map `--vanguard-*` → same `--pd-color-*` names under `.coach-os-root` (or document explicit vanguard alias table) so §G “no hard-coded hex in components” is enforceable.

---

## Typography (§B.2)

| Role | Research | Codebase | Gap |
|------|----------|----------|-----|
| Telemetry / mono | Geist Mono | `--font-mono`, `--pd-font-mono` | ✅ |
| Display / UI | Geist Sans | `--font-sans`, `--pd-font-display` | ✅ |
| Body whisper | **Switzer** (79% x-height) | Not loaded | ❌ Optional Phase 1b — self-host or swap to Geist Sans until licensed |

---

## Z-depth (§B.3)

| Layer | Research | Codebase | Gap |
|-------|----------|----------|-----|
| Z0 Canvas | Void + grain + vignette | `.ps-ambient`, `.pd-grain`, `--pd-z0-canvas` | ✅ CSS-first; `pd-v-001` JPG optional |
| Z1 Recessed | Inset wells | `--pd-z1-*`, `.pd-z1-recessed`, `.pd-os-deck__well` | ✅ |
| Z2 Panel | Glass bento base | `.pd-z2-panel`, `.pd-os-deck`, `--shadow-liquid` | ✅ |
| Z3 Raised | Identity / hero | `.pd-z3-raised`, `.pd-os-deck--hero` | ✅ |
| Z4 Float | Shell rail / strap | `.pd-z4-float`, `.pd-route-strap` | ✅ |

---

## Instrument taxonomy (§B.4)

Aligned with [`PLAYER_OS_INSTRUMENT_TAXONOMY.md`](../../../PLAYER_OS_INSTRUMENT_TAXONOMY.md) and existing components:

| Instrument | Z-layer | Accent | Component anchor |
|------------|---------|--------|------------------|
| Identity | Z3 | Gold | `IdentityBentoModule`, holo card shell |
| Directive | Z3 | Gold | `OperativeHub`, mission CTAs |
| Navigation | Z4 | Cyan-0 | Player shell rail — **accent color gap** (#14b8a6 today) |
| Progression | Z2 | Cyan/Amber trim | Skill tree, XP conduits |
| Telemetry | Z1 | Cyan-1 | `VanguardProtocolPanel`, stats wells |
| Execute | Z2 | Amber | Workout terminal, `.pd-os-btn--primary` (gold — verify single gold rule) |

**Guardrail:** Regression tests already enforce bento grid + persona separation; extend with token name scans in a visual sprint test file when aliases land.

---

## Persona skin matrix (§B.5)

| Attribute | Player | Coach | Parent | Codebase fit |
|-----------|--------|-------|--------|--------------|
| Corners | Chamfer clip-path | 90° enterprise | 24px radius | ✅ Player + Coach; Parent routes need audit |
| Z0 void ≥40% | Required | Dense bento | Calm whitespace | ⚠️ Player: verify viewport void % in VA pass |
| Hero accent | Gold CTA | Cyan **or** silver (§H #4) | Navy/silver trust | Coach uses teal `#14b8a6` not `#06b6d4` |
| Atompunk amber | High | None | None | ⚠️ Under-tokenized on Player |
| Forbidden | Material pills, multi-gold | Gold CTAs, gamification | Arcade chrome | Enforced by launch rules + tests |

---

## Asset manifest vs repo (§C)

| Priority | Asset IDs | Purpose | Required for Phase 1 build? |
|----------|-----------|---------|----------------------------|
| P0 | `pd-v-001`–`003`, `pd-w-101`, `pd-p-201`–`202`, `pd-i-301`, `pd-r-401` | Z0 plates, wells, panels, identity bezel, rail | **No** — CSS gradients + `--shadow-liquid` substitute |
| P1 | Parent canvas, atompunk input well, diegetic controls | Polish / slice compositing | **No** — ship after owner PNG session (§D) |
| Deferred | Character portraits / avatar layers | Avatar Studio | **Separate track** — see [`character/README.md`](../../character/README.md) |

---

## Engineering handoff checklist (§G)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Ref path `docs/vision/references/ui/{persona}/` | ⚠️ Folders not yet populated | See [`../README.md`](../README.md) |
| Naming `ref-{persona}-{category}-{name}-option-{a-d}.png` | ⚠️ README uses `{feature}-{variant}` — harmonize on next ref drop |
| Map assets → `var(--pd-*)` in `app.css` | ⚠️ Partial — tokens live in `player-dossier.css` |
| Anti-flash inline in `app.html` | 🔍 Audit needed — report suggests `--pd-color-navy-0` on mount |
| Viewport meta lock | 🔍 Verify `app.html` |
| Avatar defer — UID pattern in Z3 well | Launch bar: `defaultPortraitV2` + initials ✅ |

---

## Owner decisions blocking full implementation (§H)

Answer before heavy PNG generation or chamfer/amber sweeps:

1. **Void density:** 40% (recommended) vs 20% high-density  
2. **Chamfer angle:** 15° subtle vs 45° aggressive (current clip-path ≈ 6px cut — functional middle)  
3. **Atompunk amber density:** micro-piping vs heavy gauges  
4. **Coach active accent:** `#06b6d4` vs `#cbd5e1` silver  
5. **Z0 film grain:** current `.pd-grain` opacity 0.07 — confirm vs clean OLED  
6. **VPC shield prominence** (Parent)  
7. **Geist Mono baseline:** 10px dense vs 12px readable  
8. **Confetti particle budget** on verified workout commit  

Template: [`OWNER_DECISION_CHECKLIST.md`](./OWNER_DECISION_CHECKLIST.md)

---

## Suggested sprint order

1. **Token alias pass** — add `--pd-color-*` names; document Coach ↔ vanguard map (1 file).  
2. **Owner §H decisions** — unblock nav cyan + coach accent + grain.  
3. **Route token compliance** — replace scattered `#d97706` / `#06b6d4` in persona routes with tokens.  
4. **Optional ref PNG drops** — owner Flow session per §D; place under persona folders.  
5. **Avatar character art** — inventory in `character/` only; **no** `static/avatar/layers/` until unpause.

---

## Cross-links

- Research PDF: [`SSTracker-Visual-System-Research-Report.pdf`](./SSTracker-Visual-System-Research-Report.pdf)  
- UI ref folders: [`../README.md`](../README.md)  
- Player instruments: [`../../../PLAYER_OS_INSTRUMENT_TAXONOMY.md`](../../../PLAYER_OS_INSTRUMENT_TAXONOMY.md)  
- Avatar defer: [`../../character/README.md`](../../character/README.md)
