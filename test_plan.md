1. **Create the Sync Session Endpoint**
   - Create `src/routes/api/auth/sync-session/+server.ts`.
   - Implement a `POST` request handler accepting a Firebase `idToken` from the client.
   - Verify the token using `getAuth().verifyIdToken(idToken)`.
   - Create a session cookie `getAuth().createSessionCookie(idToken, { expiresIn: 60 * 60 * 24 * 5 * 1000 })`.
   - Set the `__session` cookie securely with a max age.
   - Return a `200 OK` response once set.
   - Ensure the file is under 80 lines.
2. **Verify Sync Session Endpoint**
   - Use `read_file` to confirm `src/routes/api/auth/sync-session/+server.ts` was written successfully and is under 80 lines.
3. **Modify Server-Side Guard in `src/hooks.server.ts`**
   - Modify the SvelteKit `handle` function to check the user's role claim against the requested layout scope (i.e. `/coach/*` or `/director/*`).
   - If SvelteKit detects a page-load mismatch for these routes:
     - Return a redirect to `/login` *before* hydration executes (do not use a blind 307 redirect, instead use HTTP 303 or `new Response(null, { status: 303, headers: { location: '/login' } })` to break the loop).
   - Ensure the modified code keeps `hooks.server.ts` under 80 lines.
4. **Verify Server-Side Guard Modifications**
   - Use `read_file` to read `src/hooks.server.ts` and verify the edits were correctly applied and the file remains under 80 lines.
5. **Modify `handleSignOut` in `src/lib/auth/signOutFlow.js`**
   - Before `try { fieldMenu.close(); ... }`, add:
     ```javascript
     window.localStorage.removeItem('user_session_claims');
     window.localStorage.removeItem('active_session_claims');
     ```
   - Make an API call to delete the session cookie.
6. **Verify `handleSignOut` Modifications**
   - Use `read_file` to read `src/lib/auth/signOutFlow.js` and verify it has the correct clear local storage logic.
7. **Test Code Changes**
   - Run compilation checks (`pnpm run check`) ensuring 0 errors and 0 warnings.
   - Run the E2E impersonation test (`pnpm playwright test tests/secure-impersonation-gating.spec.ts --project=chromium`).
   - Run the entire unit test suite to check for regressions (`pnpm run test`).
8. **Complete pre commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
9. **Update ROADMAP.md**
   - Open `ROADMAP.md` and explicitly update the completion state for this issue.
