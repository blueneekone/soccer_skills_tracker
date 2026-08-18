1. **Force Custom Claim Token Refreshes (Data Visibility Fix):**
   - Completed.

2. **Enforce "B815 Defensive Hydration" Guards:**
   - Completed.

3. **Wrap Navigation and Mutations inside `untrack()` Closures:**
   - Completed.

4. **Svelte 5 Deep Proxy Boundaries (`$state.snapshot`):**
   - Completed.

5. **Enforce "The Car Ride Home Protocol" Gate:**
   - Completed.

6. **Execute SafeSport Shadow CC Verification (CRO):**
   - Identify the client-side `fetchParentEmailsForPlayer` logic in frontend files and remove it. The messaging component should only pass `memberIds` when creating a channel.
   - Check the backend function `onChannelCreated.ts` (or equivalent `functions/src/onChannelCreated.js`) to ensure it autonomously resolves guardian emails and injects them into the `ccParentEmails` array.
   - Verify that chat channels are initialized with `channelStatus: 'BLOCKED_VPC_PENDING'` and that message dispatch blocks execution unless the status is `'ACTIVE'`.
   - Rewrite the Sprint 4.2 test in `src/lib/services/__tests__/commsSprint42.test.ts` to assert the server-side behavior and frontend payload restriction, removing `.skip()`.

7. **Complete pre-commit steps:**
   - Ensure proper testing, verification, review, and reflection are done.

8. **Final Verification and Submission:**
   - Run Vitest component test suites (`pnpm run test`).
   - Run `pnpm run check` to ensure there are 0 Svelte compiler reactivity warnings or hydration errors.
   - Call the `submit` tool to finalize the pull request.
