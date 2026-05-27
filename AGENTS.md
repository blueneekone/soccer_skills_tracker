# AGENTS.md

## Cursor Cloud specific instructions

### Architecture Overview

This is the **dev branch** of SSTracker (Nexus Command) — a SvelteKit 5 + Firebase multi-tenant SaaS platform for youth sports clubs. See `docs/ARCHITECTURE.md` for full details and `.cursorrules` for project invariants.

- **Frontend:** SvelteKit 5 (strict runes) with adapter-static, Vite, Tailwind CSS
- **Backend:** Firebase Cloud Functions v2 (Node.js 22), Firestore (cell-based multi-tenant)
- **Auth:** Firebase Auth (email/password, magic link, WebAuthn passkeys)

### Running the Dev Environment

| Service | Command | Port |
|---------|---------|------|
| Frontend (Vite) | `npm run dev` | 5173 |
| Firebase Emulators | `firebase emulators:start --only firestore,auth,functions --project sports-skill-tracker-dev` | Firestore: 8080, Functions: 5001 |

**Gotchas:**
- The Firebase Functions emulator will prompt for `ADMIN_EMAIL` on first run if no `.env.local` exists in `functions/`. Provide any email value (e.g. `admin@test.com`). It creates `functions/.env.local` to cache the answer.
- `npm install` at root requires `--legacy-peer-deps` due to a peer conflict between `firebase@^12` and `@firebase/rules-unit-testing@^4`.
- The app connects to the **live** Firebase dev project (`sports-skill-tracker-dev`) by default — NOT the local emulators. The emulators are primarily for Cloud Functions development and Firestore Rules testing (`npm run test:firestore-rules`).
- `npm run build` will fail on the `prebuild` file-budget check (pre-existing). Use `npx vite build` directly if you need a production build.
- `svelte-check` reports ~379 type errors — pre-existing in the codebase; does not block dev or build.
- Node.js 22 is required (matches `functions/package.json` engines field).

### Testing

- **Unit tests:** `npm run test` (Vitest, ~1700 passing tests)
- **E2E tests:** `npm run test:e2e` (Playwright — requires browsers installed via `npx playwright install`)
- **Firestore rules tests:** `npm run test:firestore-rules`
- **Functions lint:** The `lint:functions` script references a missing `lint` script in `functions/package.json` — this is a known gap on the dev branch.

### Lint & Type Checking

- `npm run check` — runs `svelte-check` (has pre-existing type errors)
- `npm run lint:functions` — currently broken (no lint script in functions/)

### Key Files & Docs

- `.cursorrules` — project invariants and UI token reference
- `docs/ARCHITECTURE.md` — canonical architecture document
- `docs/PERSONA_ECOSYSTEM.md` — role-based persona definitions
- `.cursor/rules/` — Cursor-specific rule files for player instruments, agent workflow, dashboard
