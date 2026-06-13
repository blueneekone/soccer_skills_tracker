# Merge order — overnight branches

Merge **overnight/\*** feature branches → **overnight/base** → **dev**.

## Phase 1 (parallel work)

Merge in any order except where noted:

1. `overnight/docs-dataroom`
2. `overnight/launch-p0`
3. `overnight/p2-reg-roster`
4. `overnight/p2-payments`
5. `overnight/p2-tournament`
6. `overnight/p2-checkr`
7. `overnight/p2-tracker-nav`
8. `overnight/check-routes`
9. `overnight/check-components`
10. `overnight/check-stores`
11. `overnight/check-coach-dir`
12. `overnight/check-player`
13. `overnight/fed-ngb`
14. `overnight/live-stream`
15. `overnight/marketing-acq`
16. `overnight/native-shell`
17. `overnight/gemini-ingest-1`
18. `overnight/gemini-ingest-2`
19. `overnight/gemini-ingest-3`

## Dependencies

- **`overnight/check-parent-admin` (12)** — start **after** `overnight/p2-payments` (04) merges.
- **`overnight/check-final` (22)** — merge **after** check branches **08–13** are on `overnight/base`.
- **`overnight/vitest-ci` (23)** — after 22 or in parallel once check=0.
- **`overnight/deploy-verify` (24)** — last; after 22 + backend slices stable.

## Orchestrator

- **`overnight/orch` (21)** — poll `SLICE_LOG.md`, update `PARALLEL_STATUS.md`, write `PARALLEL_SUMMARY.md` when Phase 1 quiesces.

## Final

```bash
git checkout overnight/base
# merge all overnight/* branches
git checkout dev
git merge overnight/base
```
