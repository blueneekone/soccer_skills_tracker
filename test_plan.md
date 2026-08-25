1. **Create `src/lib/auth/__tests__/loginRouting.test.ts`**:
   - Write tests for `userDocHasPlayerRole`.
   - Write tests for `getLoginWaterfallDestination`.
     - Admin roles (`admin`, `super_admin`, `global_admin`).
     - Player linked by parent (using `userDocHasPlayerRole`).
     - Director role (with and without `clubId`).
     - Registrar role (with and without `clubId`).
     - Coach role.
     - Parent role.
     - Player role.
     - Tutor role.
     - Recruiter role.
     - Unrecognized role fallback to `/onboarding`.
   - Write tests for `getContextFromHref`.
     - Valid and matching paths.
     - Invalid URL fallback (empty string).

2. **Verify Tests**:
   - Run `npx vitest run src/lib/auth/__tests__/loginRouting.test.ts` to ensure all tests pass.
   - Run full vitest suite `npm run test` to verify no regressions.

3. **Pre-commit Instructions**:
   - Run pre-commit hook to verify all tests and rules.

4. **Submit Change**:
   - Create a commit for the testing improvement and submit it to a new branch.
