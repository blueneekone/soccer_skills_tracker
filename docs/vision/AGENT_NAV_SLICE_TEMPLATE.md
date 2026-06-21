# Agent nav slice template

**Use for:** NAV-OPTION-D, parent field chrome, `MobilePinBar`, `AppMenuSheet`, `navPinCatalog`, parent Tier-1 routes.

Authority: [`PLATFORM_NAVIGATION_CANON.md`](./PLATFORM_NAVIGATION_CANON.md) · [`PLATFORM_WORKFLOW_CANON.md`](./PLATFORM_WORKFLOW_CANON.md) §6 · [`OWNER_QA_CHECKLIST.md`](./OWNER_QA_CHECKLIST.md) Phase 4b.

---

## Before merge

1. Run acquisition regression bundle (behavioral + guards — fail closed):

```bash
npm run test:regression:acquisition && npm run build
```

Optional full local audit (includes `npm run check`):

```bash
npm run audit:pre-deploy
```

Nav-only slices may additionally run:

```bash
npm test -- src/lib/platform/__tests__/platformNavigationCanon.test.ts
```

2. Deploy hosting to `sports-skill-tracker-dev` if shell/nav/parent routes changed.

3. **After deploy:** `npm run smoke:dev` (network probes — complements vitest bundle).

4. **Do not** mark slice done or check Phase 4b boxes if regression bundle regressed. **Do not** mark GP-ACQ-01 **Pass** — owner retest only.

---

## Owner retest matrix @390px (parent account)

| Check | Route / action | Pass? |
|-------|----------------|-------|
| QA-NAV-03 | Parent pins + AppMenuSheet catalog | owner |
| QA-NAV-06 | Swipe-up from bottom edge = Menu sheet | owner |
| Menu tap | `/parent/household` — sheet opens and **stays open** | owner |
| Menu tap | `/parent/dashboard` — same | owner |
| Menu tap | `/parent/vpc` — regression | owner |
| QA-121 | Clearance exits `SCANNING…` within ~15s → PENDING, SIGNED, or error | owner |

---

## Anti-patterns (fail closed)

| Reject | Why |
|--------|-----|
| String-only nav tests with no behavior | Green CI, broken Menu |
| `openedAt` only in `$effect` after open | Instant ghost dismiss |
| Stale async `finally { loadBusy = false }` | Permanent SCANNING |
| Mark GP-ACQ-01 Pass while owner bugs open | False workflow sign-off |

---

## PR summary snippet

```
### Owner retest required (@390px, parent account)
- QA-NAV-03, QA-NAV-06, QA-121, Menu on /parent/household + /parent/dashboard
- Agents do not mark Phase 4b complete
```
