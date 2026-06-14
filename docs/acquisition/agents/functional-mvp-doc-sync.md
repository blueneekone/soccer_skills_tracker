# Agent — functional-mvp-doc-sync

**Branch:** `closure/functional-mvp-doc-sync`

**Owns:** `docs/vision/FUNCTIONAL_MVP.md` (§ Gaps table only), `docs/vision/COMPETITIVE_LAUNCH_ASSESSMENT.md` (exec summary + matrix stale rows), `docs/vision/PLAYER_OS_RUBRIC_GAP_MATRIX.md` (tracker nav cross-route note)

## Task

Register **F-05**, **F-06**, **A-05** — doc sync to code truth:

1. FUNCTIONAL_MVP gaps: mark tracker nav **Resolved** (PlayerShell + workspaceNav); update check=0 note; remove stale severity rows already Done in ROADMAP.
2. COMPETITIVE_LAUNCH_ASSESSMENT: launch gate points to `PLATFORM_GAP_REGISTER.md` + Wave 3; tracker nav row if present.
3. PLAYER_OS_RUBRIC: fix “Tracker absent from shell rail” — now in `PlayerShell` NAV_LINKS.
4. **Do NOT** edit FUNCTIONAL_MVP human QA checkboxes.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build rejects R-01–R-03. Each commit: `npm test -- src/lib/gamification/__tests__/personaFunctionalMvp.test.ts`, npm run check, npm run build. Do not ask questions.
