# Gemini Vanguard Architect — copy/paste prompts

Paste **one block** into the widget → **GENERATE BLUEPRINT** → save TERMINAL OUTPUT to `blueprints/` or paste in Cursor.

**Already done (skip unless revising):** VS-1a–VS-3d, VS-4a → see `blueprints/` folder.

---

## VS-0a — Token alias manifest

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

TOKEN_ALIAS_MANIFEST (not a UI screen). CSS custom property sheet for SvelteKit. Map every --pd-color-* token to role, allowed personas, forbidden misuse, and alias to repo vars (--pd-bg, --pd-accent-action, --pd-accent-data, --vanguard-bg). Include --pd-chamfer-depth (6px / 12px / 16px) and --pd-scrim-void (0.7 vs 0.8). Markdown table plus :root alias block for .player-dossier-root.
```

---

## VS-0b — Coach token skin

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

COACH_OS_TOKEN_SKIN_MANIFEST. SIEM flat analytics. Map Coach UI to --pd-color-void-0 canvas, --pd-color-navy-0 Z2 panels, --pd-color-grey-0 borders, --pd-color-cyan-0 active states. REJECT gold, glassmorphism, rounded pills, neon glow. Show which --vanguard-* vars alias to --pd-color-*.
```

---

## VS-1a — Mission Hero Modal *(saved — optional re-run)*

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

HQ_MISSION_HERO_MODAL. Player OS, Directive instrument. User taps mission in ActiveBounties before workout handoff. Z4 scrim 70% void no blur. Z3 hero chassis chamfer gold corner brackets. Z1 well Mission ID in cyan mono. Primary ENGAGE MISSION solid gold void text. Dismiss TERMINATE_LINK amber text no X icon. Hard 4px void shadow no soft glow. Wire MissionHeroModal.svelte from ActiveBounties. Do not redesign OperativeHub inline hero.
```

---

## VS-1b — Skill Tier Unlock Modal *(saved — optional re-run)*

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

SKILL_TIER_UNLOCK_MODAL. Player OS Directive milestone. Trigger: armory tier advance on skill-tree. Z4 scrim 0.8 void. Z3 hero 16px chamfer 2px gold border panel fill. Z1 well skill attributes cyan mono. Header SYNAPTIC_EVOLUTION_CONFIRMED gold. Tier TIER_XX amber. Primary COMMIT_UPGRADE gold fill. Secondary DEFER_INTEGRATION ghost grey. No success-green no border-radius no soft glow. Wire SkillTierUnlockModal.svelte on tier change.
```

---

## VS-1c — Player modal scrim utility

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

PLAYER_MODAL_SCRIM_UTIL. Shared contract for all Player Z4 overlays. Scrim alpha pointer-events z-index vs PlayerShell rail. Unify PlayerDiegeticOverlay MissionHeroModal SkillTierUnlockModal. Pick one shadow grammar: hard void offset OR emissive glow for Directive modals only. CSS class names and tokens. Reduced-motion and data-dopamine=off behavior.
```

**Saved:** `blueprints/player-modal-scrim-util.md` · **Implemented:** `player-modal-scrim.css`, `PlayerModalScrim.svelte`

---

## VS-2a — Train Execute theater

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

TRAIN_EXECUTE_THEATER. Player OS Execute instrument. Route /player/workout. Existing pw-theater pd-os-deck--hero exec commit threat quests. Exactly ONE gold focal on commit. Amber atompunk trim on terminals. Teal telemetry wells only. Shared pd-os-deck frame inner differentiation only. Audit violations: double gold gradients. Skin only no route change.
```

**Saved:** `blueprints/train-execute-theater.md` · **Implemented:** `player-train-theater.css`

---

## VS-2b — Armory + Stats

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

ARMORY_STATS_TELEMETRY_PASS. Player OS. Telemetry: Stats radar VanguardProtocolPanel Z1 wells cyan only no nav tile chrome. Armory quartermaster cards teal deploy buttons no gold unless single directive. Preserve bento-grid--12col bento-grid--liquid. Routes /player/armory and /stats player role.
```

**Saved:** `blueprints/armory-stats-telemetry-pass.md` · **Implemented:** `player-armory-stats-telemetry.css`

---

## VS-3a — Coach shell + dashboard

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

COACH_SHELL_DASHBOARD_V1. Coach OS SIEM sideline analytics. High-density bento not Player 40% void. Z2 flat panels 90 degree corners or 8px chamfer. Primary active --pd-color-cyan-0. Geist Mono metrics uppercase labels. REJECT all gold gamification glass pills. Wire coach workspace shell and /coach dashboard.
```

**Saved:** `blueprints/coach-shell-dashboard-v1.md` · **Implemented:** `coach-shell-dashboard.css`

---

## VS-3b — Tactical War Room *(implemented)*

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

COACH_TACTICS_STRATAGEM_V1. Route /coach/tactical. Z0 void Z1 timeline well bottom Z2 drill panels sides Z3 pitch center Z4 Commit Session Export HUD. Cyan tactical nodes amber overlap warnings grey trim borders navy panels. 8px chamfer zero border-radius. REJECT rounded-xl blur gradients neon drop-shadow gold. Token selected conflict opponent vs squad colors. Skin only keep Firestore save deploy play.
```

**Saved:** `blueprints/coach-tactics-stratagem-v1.md` · **Implemented:** `coach-tactics-stratagem.css`

---

## VS-3c — Drill library *(implemented)*

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

COACH_DRILL_LIBRARY_Z2. Route /coach/drills CoachDrillsView. Z2 chamfered drill cards navy fill grey 1px border mono uppercase titles. Primary assign create drill cyan-0. Warnings amber. REJECT Material pills gold glass.
```

**Saved:** `blueprints/coach-drill-library-z2.md` · **Implemented:** `coach-drill-library.css`

---

## VS-3d — Match-day scoreboard *(implemented)*

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

COACH_MATCH_DAY_SCOREBOARD. Route /coach/match-day tap scores Firestore match_sessions. Z2 score cells Z4 match strap clock period. Flat SIEM sideline legibility. Subtle cyan flash on goal OK no confetti no gold.
```

**Saved:** `blueprints/coach-match-day-scoreboard.md` · **Implemented:** `coach-match-day-scoreboard.css`

---

## VS-4a — Parent lounge shell *(implemented)*

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

PARENT_LOUNGE_SHELL. Parent OS trusted co-op admin. Z1 well Z2 chamfer panels Z4 nav header. Navy grey-trim clinical SIEM — NOT soft 24px radius cards. Routes /parent/dashboard /parent/household. REJECT gold pills glass silver.
```

**Saved:** `blueprints/parent-lounge-shell.md` · **Implemented:** `parent-lounge-shell.css`

---

## VS-4b — VPC trust band

**Saved:** `blueprints/parent-vpc-trust-band.md` · **Implemented:** `parent-vpc-trust-band.css`

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

PARENT_VPC_TRUST_BAND. Route /parent/vpc Verifiable Parental Consent. Prominent compliance shield vs minimal badge option. Navy silver trust colors never gold never cyan arcade. Consent status above billing blocks. WCAG contrast on navy panels.
```

---

## VS-4c — Parent bounty funding

**Saved:** `blueprints/parent-bounty-funding-panel.md` · **Implemented:** `parent-bounty-funding-panel.css`

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

PARENT_BOUNTY_FUNDING_PANEL. Parent dashboard bounty deploy and verified claim. Flat admin tables explicit error states no fake pay success. Primary actions blue silver not gold. Skin and hierarchy only existing wiring stays.
```

---

## VS-5a — Director command center

**Saved:** `blueprints/director-command-center.md` · **Implemented:** `director-command-center.css`

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

DIRECTOR_COMMAND_CENTER. Route /director Firestore KPIs field ops compliance tabs. SIEM club-ops like Coach wider scope. Z2 bento KPI tiles grey dividers no Player chamfer hero grammar.
```

---

## VS-5b — Director field ops

**Saved:** `blueprints/director-field-ops-map.md` · **Implemented:** `director-field-ops-map.css`

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

DIRECTOR_FIELD_OPS_MAP. Director field ops facilities weather lock legacy field sync. Flat high-density map panels mono readouts. Amber warnings for weather lock and booking conflicts.
```

---

## VS-6a — Messages hub skins *(implemented)*

```
SSTracker CDO. Tokens: void #000, gold #fbbf24 Player only, cyan data #14b8a6, cyan nav #06b6d4, amber #d97706, grey border #334155, navy panel #0f172a. Coach/Parent no gold. Z0-Z4. Output: [EVALUATING COMPONENT: NAME], layers, typography, actions, constraints, REJECTIONS, [BLUEPRINT FINALIZED]. No neon hex.

COMMS_HUB_PERSONA_SKINS. Shared route /messages. Player minimal chrome Coach SIEM inbox Parent lounge trust Director ops oversight. No gold on non-Player chrome. Header strap differences only same message logic.
```

**Saved:** `blueprints/comms-hub-persona-skins.md` · **Implemented:** `comms-hub-persona-skins.css`

---

## If output uses wrong colors — re-run with this

```
SSTracker CDO. Re-emit the same component. Use ONLY these hex: void #000 gold #fbbf24 Player only data cyan #14b8a6 nav cyan #06b6d4 amber #d97706 grey #334155 navy #0f172a. No #00f5ff no #ffbf00. Same layer architecture. Add IMPLEMENTATION HINTS with Svelte file names. [BLUEPRINT FINALIZED]
```

Then paste the component name and requirements again below that line in the same box.
