# Asset Ingestion — Gemini bust PNG pipeline

**Epic 3.5 · Sprint 3.5m-docs-gemini** · Composer agents only

> **Never illustrate.** Ingest owner-approved PNGs from `static/portrait/approved/` per [`COMPOSER_PLAYBOOK.md`](./COMPOSER_PLAYBOOK.md).

**Authority:** [`GEMINI_ART_BRIEF.md`](./GEMINI_ART_BRIEF.md) · [`references/PORTRAIT_REFERENCE_BOARD.md`](./references/PORTRAIT_REFERENCE_BOARD.md) · [`.cursor/rules/portrait-gemini-ingest.mdc`](../../.cursor/rules/portrait-gemini-ingest.mdc)

---

## Prerequisites (owner)

1. PNG created per [`GEMINI_ART_BRIEF.md`](./GEMINI_ART_BRIEF.md) master prompt + variation line
2. Owner checklist complete (one person, hair reads as hair, recessed well OK, upgrade-worthy)
3. File saved as `static/portrait/approved/bust_teen_{hair}_{tone}_{kit}.png`
4. Row added to [`references/ASSET_LICENSES.md`](./references/ASSET_LICENSES.md) with **Owner ☑**

---

## Ingest steps (Composer)

| Step | Action |
|------|--------|
| 1 | `git pull origin dev` |
| 2 | Confirm PNG exists in `static/portrait/approved/` and `ASSET_LICENSES.md` row present |
| 3 | Run sprint **3.5m-gemini-ingest** — wire precomposed bust to catalog (one file per sprint) |
| 4 | `npm run generate:portraits` |
| 5 | `npm test -- src/lib/gamification/__tests__/playerLoadoutSprint35*.test.ts` |
| 6 | `npm run check` |
| 7 | `npm run build` |
| 8 | `firebase use sports-skill-tracker-dev` |
| 9 | `firebase deploy --only hosting` |
| 10 | Notify owner — hard-refresh `/player/dashboard` holo |

**Done for this bust:** Owner holo screenshot **approve ☑** or reject with notes for re-generation in Gemini.

**Epic sprint Done:** ROADMAP marks **3.5m-gemini-ingest** Done only after owner **holo approved ☑** — not when tests pass alone.

---

## Owner approve / reject loop

After deploy:

1. Owner opens `/player/dashboard` (HQ holo) — hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. Optional: Armory Studio holo at 128px for second read
3. **Approve ☑** — one cohesive person, recessed in art well, parent-safe teen read
4. **Reject** — note hair, kit, crop, or cohesion issue; owner re-runs Gemini with revised variation line; do **not** patch PNG in repo manually

Repeat ingest sprint for next bust variant.

---

## Next sprint stub — 3.5m-gemini-ingest (copy-paste)

Use **one bust per sprint session**. Replace `{filename}` and catalog id placeholders.

```markdown
## Sprint 3.5m-gemini-ingest — Precomposed bust wire-up

**Branch:** dev · **Firebase:** sports-skill-tracker-dev
**Authority:** GEMINI_ART_BRIEF.md · PORTRAIT_REFERENCE_BOARD.md · portrait-gemini-ingest.mdc

**Input:** `static/portrait/approved/{filename}.png` (owner-approved; ASSET_LICENSES row ☑)

**Scope (≤5 files):**
- Wire precomposed bust to portrait catalog / default teen loadout path
- Update catalog.config.json or precomposed manifest row as needed
- Run `npm run generate:portraits`
- Extend `playerLoadoutSprint35mGeminiIngest.test.ts` (create on first ingest)
- ROADMAP: mark Pending → Done only after owner holo approve ☑

**Verify:**
npm run generate:portraits
npm test -- src/lib/gamification/__tests__/playerLoadoutSprint35mGeminiIngest.test.ts
npm run check
npm run build
firebase use sports-skill-tracker-dev
firebase deploy --only hosting

**Out of scope:** SVG redraw, renderLayeredPortrait refactors, Epic 4, drawing new art

**Done when:** Owner hard-refreshes /player/dashboard and marks holo approved ☑
```

---

## Cross-links

- Owner art brief: [`GEMINI_ART_BRIEF.md`](./GEMINI_ART_BRIEF.md)
- Role split: [`COMPOSER_PLAYBOOK.md`](./COMPOSER_PLAYBOOK.md)
- License table: [`references/ASSET_LICENSES.md`](./references/ASSET_LICENSES.md)
- Approved folder: [`static/portrait/approved/README.md`](../../static/portrait/approved/README.md)
- Delivery tracker: [`ROADMAP.md`](../../ROADMAP.md)
