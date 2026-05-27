# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Firebase-powered PWA called **Sports Skill Tracker (SSTRACKER)**. The `dev` branch is the active development branch.

**Dev branch stack (v5.0.0):**
- **Frontend**: SvelteKit + Vite + Tailwind CSS
- **Backend**: Firebase Cloud Functions (Node.js 22) in `/functions/`
- **Database/Auth**: Firebase (Firestore + Auth), project `sports-skill-tracker-dev`
- **Tests**: Vitest (unit/integration) + Playwright (e2e)

### Running the development server

```bash
npm run dev
```

Starts the Vite dev server on `http://localhost:5173`.

### Lint

```bash
npm run lint:functions
```

Note: On the `dev` branch, the functions `package.json` does not currently have a `lint` script, so `lint:functions` will fail. Lint checks are only available on the `main` branch functions.

### Tests

**Unit/integration tests (Vitest):**
```bash
npm run test          # single run
npm run test:watch    # watch mode
```

**E2E tests (Playwright):**
```bash
npm run test:e2e      # headless
npm run test:e2e:ui   # with UI
```

Playwright is configured to auto-start the Vite dev server on port 5173.

**Firestore rules tests:**
```bash
npm run test:firestore-rules
```

### Build

```bash
npm run build
```

Runs `vite build` with a prebuild check (`check-no-phosphor.mjs` and `check-file-budget.mjs`).

### Dependency installation notes

- Root `npm install` requires `--legacy-peer-deps` due to a peer conflict between `firebase@^12` and `@firebase/rules-unit-testing` (expects `firebase@^11`).
- Playwright browsers: `npx playwright install --with-deps chromium`
- SvelteKit type generation: run `npx svelte-kit sync` before `svelte-check`

### Firebase project configuration

- Dev project: `sports-skill-tracker-dev`
- Prod project: `soccer-skills-tracker`
- `.firebaserc` default points to prod; the frontend config uses the dev project for local development

### Authentication for testing

The player workspace requires OTP on every login. To run e2e tests or take dashboard screenshots, you need test credentials (provided via secrets: `TEST_LOGIN_USERNAME`, `TEST_LOGIN_PASSWORD`, `TEST_LOGIN_OTP_SEED`).

### Java requirement

Firebase emulators require Java (OpenJDK 21 is pre-installed in the Cloud Agent environment).
