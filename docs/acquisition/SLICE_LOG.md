# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

## 08-check-routes — 2026-06-13

- **Branch:** `overnight/check-routes`
- **Scope:** `src/routes/**` (24 files, 200 → 0 check errors)
- **Repo total:** 391 → 191 check errors
- **Fixes:** typed `AdminClubCtx` context; removed invalid `aria-hidden` on `Icon`; TS interfaces for Firestore/CF payloads; `WorkoutFocus`/`OverlayVariant` state types; `$props()` rune fixes; `rsvpStatus` state; plain path hrefs (avoid `resolve()` arity)
- **Verify:** `npm test -- src/routes/(app)/admin/organizations/__tests__ src/routes/(app)/parent/household/__tests__ src/routes/(app)/admin/overview/__tests__` (14 passed); `npm run check` (routes 0); `npm run build` (ok)

