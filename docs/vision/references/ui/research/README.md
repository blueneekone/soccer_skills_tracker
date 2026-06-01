# Gemini Deep Research — UI visual system (owner archive)

**Status:** **TABLED — post-launch visual system**

Product owner stores **Gemini Deep Research** exports here (PDF, markdown, or linked notes). These reports inform a future **Platform Visual System** track — custom chrome, Flow artwork direction, and cross-persona visual cohesion beyond the current Player OS foundation.

## What belongs here

- Gemini Deep Research exports (`.pdf`, `.md`)
- Owner annotations on visual system direction
- Flow asset generation briefs (reference only)

## Rules (agents + contributors)

- **Read-only** until the owner reopens the **Platform Visual System** track in `ROADMAP.md`.
- **Do not wire** research content into Svelte components, tokens, or static assets in functional sprints.
- **Do not** implement custom chrome PNGs, Gemini-generated UI art, or avatar layers from this folder.
- Functional launch work uses existing Player/Parent/Coach shells and `defaultPortraitV2` portrait bar — see [`FUNCTIONAL_MVP.md`](../../FUNCTIONAL_MVP.md) and [`.cursor/rules/launch-focus.mdc`](../../../../.cursor/rules/launch-focus.mdc).

## Active UI references (OK for layout tokens)

Layout and deck grammar refs remain under [`../`](../README.md) (`references/ui/coach|player|parent|…`) — holo **frame** and spacing only, not bust art.

## When owner reopens

1. Update `ROADMAP.md` — move Platform visual system from **TABLED** to **Planned**.
2. Add sprint row with explicit file list and VA proof.
3. Lift read-only gate in `launch-focus.mdc`.

## Cross-links

- Launch focus rule: [`.cursor/rules/launch-focus.mdc`](../../../../.cursor/rules/launch-focus.mdc)
- Functional MVP: [`FUNCTIONAL_MVP.md`](../../FUNCTIONAL_MVP.md)
- Avatar builder (separate defer): [`../character/README.md`](../../character/README.md)
