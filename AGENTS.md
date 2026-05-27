# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Firebase-powered PWA called **Sports Skill Tracker (SSTRACKER)**. It consists of:
- **Frontend**: Vanilla JavaScript (ES modules) served as static files — no build step
- **Backend**: Firebase Cloud Functions (Node.js 24) in `/functions/`
- **Database/Auth**: Firebase (Firestore + Auth), connects to project `sports-skill-tracker-dev`

### Running the development server

```bash
firebase emulators:start --only functions,hosting
```

This starts:
- Hosting emulator on `http://127.0.0.1:5000` (serves the frontend)
- Functions emulator on `http://127.0.0.1:5001`
- Emulator UI on `http://127.0.0.1:4000`

The frontend connects directly to the real Firebase dev project backend (not emulators) for Auth and Firestore. The hosting emulator just serves the static files locally.

### Lint

```bash
cd functions && npm run lint
```

Runs ESLint on Cloud Functions code only. There is no lint for the frontend (vanilla JS with no tooling).

### Tests

There are no automated tests in this repository.

### Node.js version

The project requires Node.js 24 (specified in `functions/package.json` engines). The PATH must prioritize the nvm-installed Node.js 24 binary over the system default:

```bash
export PATH="/home/ubuntu/.nvm/versions/node/v24.16.0/bin:$PATH"
```

### Firebase project configuration

- Dev project: `sports-skill-tracker-dev` (used by default via `.firebaserc`)
- Prod project: `soccer-skills-tracker`
- The `firebase-config.js` master switch controls which backend the frontend connects to

### Java requirement

Firebase emulators require Java (OpenJDK 21 is pre-installed in the Cloud Agent environment).
