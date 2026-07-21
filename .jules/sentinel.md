## 2026-07-21 - [Hardcoded API Keys in Config]
**Vulnerability:** Firebase DEV and PROD API keys were hardcoded as strings in `src/lib/firebase.js` and `src/lib/firebase/config.ts` fallback logic.
**Learning:** SvelteKit/Vite env lookups with `||` or `??` and a string fallback directly expose those strings to the repository. The repo explicitly mentions "VITE_USE_PROD" to switch environments but left fallbacks hardcoded to default dev/prod keys.
**Prevention:** Always default to `''` or throw an error for missing API keys in configuration files to enforce the use of environment variables or secrets managers.
