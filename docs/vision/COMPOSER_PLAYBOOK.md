# Composer Playbook — Portrait pipeline (Owner + Composer roles)

**Epic 3.5 · Sprint 3.5m-docs-gemini** · Firebase: `sports-skill-tracker-dev` · Branch: `dev`

> **Scope split:** The **product owner** creates bust PNGs in Google Gemini Pro Art mode. **Composer agents** run the ingest/build/deploy pipeline only — **never illustrate** portrait art.

**Authority chain:** [`GEMINI_ART_BRIEF.md`](./GEMINI_ART_BRIEF.md) → [`references/PORTRAIT_REFERENCE_BOARD.md`](./references/PORTRAIT_REFERENCE_BOARD.md) → [`ASSET_INGESTION.md`](./ASSET_INGESTION.md)

---

## Roles

| Role | Responsibility | Must not |
|------|----------------|----------|
| **Owner** | Generate bust PNGs in Gemini Pro Art; drop approved files in `static/portrait/approved/`; hard-refresh holo on `/player/dashboard`; mark holo screenshot **approve ☑** or reject | Run npm, Firebase CLI, or agent ingest sprints |
| **Composer (agent)** | Pull `dev`; ingest from `approved/` only; wire catalog; run pipeline commands; deploy hosting; verify build | Draw, redraw, or edit portrait SVG/PNG art |

---

## End-to-end loop

```
Owner (Gemini) → static/portrait/approved/*.png
       ↓
Composer ingest sprint (3.5m-gemini-ingest)
       ↓
npm run generate:portraits → npm test → npm run check → npm run build
       ↓
firebase deploy --only hosting
       ↓
Owner hard-refresh /player/dashboard → holo approve ☑ or reject
```

1. **Owner** creates art per [`GEMINI_ART_BRIEF.md`](./GEMINI_ART_BRIEF.md); completes owner checklist; saves PNG to `static/portrait/approved/`; logs row in [`references/ASSET_LICENSES.md`](./references/ASSET_LICENSES.md).
2. **Composer** opens ingest sprint [`ASSET_INGESTION.md`](./ASSET_INGESTION.md) — **one bust at a time**.
3. **Composer** runs agent commands (below), deploys to `sports-skill-tracker-dev`, notifies owner.
4. **Owner** hard-refreshes `/player/dashboard` (and Armory Studio if wired); approves or rejects holo read in situ.
5. Repeat until owner signs **3.5m-gate** ☑ — Epic 4.1 remains blocked until then.

---

## Commands (Composer / agents only)

Run from repo root on branch `dev` with Firebase project `sports-skill-tracker-dev`:

```bash
git pull origin dev
firebase use sports-skill-tracker-dev
npm run generate:portraits
npm test -- src/lib/gamification/__tests__/playerLoadoutSprint35*.test.ts
npm run check
npm run build
firebase deploy --only hosting
```

**Owner does not run these commands.** Owner only drops approved PNGs and refreshes the live holo for visual sign-off.

---

## Done criteria

| Gate | Who | Signal |
|------|-----|--------|
| Ingest sprint code green | Composer | Tests + check + build pass |
| Hosting live | Composer | Deploy to `sports-skill-tracker-dev` complete |
| Holo VA | Owner | Screenshot approve ☑ on HQ holo (recessed art well, one cohesive person) |
| Epic 3.5m-gate | Owner | Full portrait stability checklist — [`PORTRAIT_REFERENCE_BOARD.md`](./references/PORTRAIT_REFERENCE_BOARD.md) §4 |

**ROADMAP** marks portrait ingest sprints **Done** only after owner **holo approved ☑** — not when automated tests pass alone.

---

## Cross-links

- Art brief (owner): [`GEMINI_ART_BRIEF.md`](./GEMINI_ART_BRIEF.md)
- Ingest procedure: [`ASSET_INGESTION.md`](./ASSET_INGESTION.md)
- License log: [`references/ASSET_LICENSES.md`](./references/ASSET_LICENSES.md)
- Approved drop folder: [`static/portrait/approved/README.md`](../../static/portrait/approved/README.md)
- Agent rule: [`.cursor/rules/portrait-gemini-ingest.mdc`](../../.cursor/rules/portrait-gemini-ingest.mdc)
- Delivery tracker: [`ROADMAP.md`](../../ROADMAP.md)
