# Agent — deploy-gha-dev

**Branch:** `closure/deploy-gha-dev`

**Owns:** `.github/workflows/deploy.yml`

## Task

Complete dev-target deploy workflow (register A-04):

1. Ensure `FIREBASE_PROJECT_ID` env resolves to `sports-skill-tracker-dev` when `workflow_dispatch` input `environment=dev` (merge any uncommitted fix on dev).
2. Fix deploy job completion echo — must print dev URL `https://sstracker.app` when dev, prod URL when prod (no hardcoded “VANGUARD deployed to production” for dev runs).
3. Confirm all `--project` flags use `${{ env.FIREBASE_PROJECT_ID }}` (rules, storage, functions loop, hosting).

**Acceptance:** Dry-read workflow YAML — zero `soccer-skills-tracker` hardcodes outside prod branch of ternary.

---

Universal rules: Append SLICE_LOG.md only. Do NOT build drag-and-drop club website CMS, App Store submission, or shallow COPPA checkbox. Each commit: npm test (slice if applicable), npm run check, npm run build. Do not ask questions.
