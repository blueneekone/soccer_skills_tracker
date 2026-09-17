# Jules Sprint: Beta Security & Bug Fixes

## Goal
Resolve all hardcoded logging vulnerabilities, phantom UI bugs, and remaining logic flaws flagged by the system.

## Requirements
1. **Security - Hardcoded Service Account Key**: Search the codebase for `Hardcoded Service Account Key Not Found Logging` and remove or obscure any hardcoded keys or insecure logging vectors. Ensure service account credentials are loaded securely via environment variables or Secret Manager.
2. **UI Bug - DASHBOARD_PAGE**: Fix the `Fix DASHBOARD reactPlatform` and `Fix DASHBOARD_PAGE` and `Fix DASHBOARD_1C` bugs in the Svelte layouts by ensuring reactive data flow via Svelte 5 runes (`$state`, `$derived`).
3. **UI Bug - Ghost States**: Fix the `pushNotificationAlert ghost state`. Ensure the alert only triggers on verified state changes.
4. **Leak Fix - Player Hub**: Fix the `playerHubSync403 leakrs` by verifying that Firestore listeners (`onSnapshot`) are properly detached (`unsubscribe()`) on component unmount (`$effect` cleanup).
5. **Missing Test**: Write the missing test for `checkInvalidProgression`.

## Testing Mandate
- Execute full `test:regression:auth` to ensure no security boundaries are compromised.
- Zero Svelte compiler warnings allowed after `$effect` cleanups.
