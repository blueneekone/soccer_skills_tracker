1. **Clearance Gate Logic (`src/routes/(app)/+layout.svelte`)**
   - Use `sed` to modify `src/routes/(app)/+layout.svelte`.
   - Update the existing redirect logic for clearance (around line 283-290) to redirect to `/clearance` instead of `/compliance` when `!authStore.isCleared`.

2. **Verify Layout Changes**
   - Use `read_file` to verify the routing logic in `src/routes/(app)/+layout.svelte` was updated correctly.

3. **Create Clearance Route (`src/routes/(app)/clearance/+page.svelte`)**
   - Use `write_file` (or a Python script) to write the complete contents of `src/routes/(app)/clearance/+page.svelte` in one step.
   - The file will implement B815 Defensive Hydration: `if (!db || !authStore.isAuthenticated) return;` inside a `$effect`.
   - The UI will use the 12-column asymmetric Bento Grid (`tw-grid tw-grid-cols-12`) and the "Nuclear Americana Tech Noir" system (dark theme).
   - The layout will enforce exactly ONE Action Gold (`bg-[#fbbf24]`) CTA button.
   - The panels will enforce 24px border radii (`tw-rounded-[24px]`) to establish trust, stripping chamfers.
   - If user has no team/role (`!authStore.role`) and no role selected, display a role selector (Commissioner, Director, Coach, Guardian).
   - If `selectedRole === 'Guardian'`, show an input for their child's name (`bind:value={childName}`).
   - On submission, cross-reference the entered name by querying the `player_lookup` collection: `query(collection(db, "player_lookup"), where("playerName", "==", childName))`.
   - If the player stub is found, call the `generateVpcChallenge` Firebase Cloud Function (`httpsCallable(functions, 'generateVpcChallenge')`) to trigger the COPPA 2.0 Verifiable Parental Consent (VPC) gate.
   - Handle UI state for loading, error, and success messages.

4. **Verify Clearance Route Creation**
   - Use `read_file` to confirm the contents of `src/routes/(app)/clearance/+page.svelte` were written correctly.

5. **Visual Verification**
   - Call the `frontend_verification_instructions` tool to run the Playwright E2E visual regression suite and capture screenshots to verify the UI.

6. **Test Suite Verification**
   - Run the full test suite (`pnpm run test` and/or Playwright E2E visual regression tests) to verify routing blocks unverified users and ensure no regressions were introduced.

7. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

8. **Update ROADMAP and Submit**
    - Update `ROADMAP.md` and use the `submit` tool to open the PR.
