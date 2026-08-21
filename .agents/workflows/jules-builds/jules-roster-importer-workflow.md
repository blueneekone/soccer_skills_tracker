# =============================================================================
# SSTRACKER VAMPIRE CSV ROSTER IMPORTER AUDIT & REPAIR WORKFLOW
# =============================================================================
# This master-level workflow file directs Google Jules to audit, repair,
# and verify the high-velocity "Vampire CSV Roster Importer" inside the
# Director OS. It enforces strict Svelte 5 states and Firestore batch writes.
# =============================================================================

# 🏛️ 1. DIAGNOSTICS & THE BATCH WRITE BOUNDARY
The roster importer must handle high-volume CSV rosters without crashing SvelteKit's thread, throwing database exceptions, or locking active transactions:

## A. The Firestore Batch Write Limit (The 500 Threshold)
*   **The Defect:** Firestore throws a strict limit of **500 operations per writeBatch** (including creates, updates, and deletes). If a large roster CSV contains over 500 players, a naive transaction loop will violate this limit, causing Firestore to abort the entire commit.
*   **The Fix Required:** Implement a defensive, chunked parsing dispatcher inside the importer service (`src/lib/services/director/RosterImporter.svelte.ts` or similar). It must programmatically slice the parsed records array into safe chunks of exactly **500 operations per atomic batch**, executing them sequentially:
    ```typescript
    const BATCH_LIMIT = 500;
    for (let i = 0; i < players.length; i += BATCH_LIMIT) {
      const chunk = players.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      // Process chunk and commit...
      await batch.commit();
    }
    ```

## B. CSV Header Normalization (Mapping Loose Inputs)
*   **The Defect:** CSV files exported from external platforms (such as Hudl, Spond, or TeamSnap) utilize loose headers with diverse casing and spaces (e.g., `"First Name"`, `"Last Name"`, `"DOB"`, `"E-mail"`). If the parser does not normalize these columns, the database rejects the mutations due to missing required schema fields (like `firstName` or `dateOfBirth`).
*   **The Fix Required:** Implement an inline mapper that strips spaces, converts headers to lowercase, and translates legacy fields into Svelte-compatible CamelCase parameters before database staging [cite: 256]:
    *   `"First Name"`, `"Player Name"`, `"First"` ➔ `firstName`
    *   `"Last Name"`, `"Surname"`, `"Last"` ➔ `lastName`
    *   `"E-mail"`, `"Email Address"`, `"Mail"` ➔ `email`
    *   `"DOB"`, `"Birth Date"`, `"Date of Birth"` ➔ `dateOfBirth`

## C. Zero-Freeze Svelte 5 Progress Telemetry
*   **The Defect:** During bulk writes, the main layout thread freezes due to reactive UI cascades, causing the screen to lock and the user to think the app has crashed.
*   **The Fix Required:**
    1.  Bind a reactive state `importProgress = $state(0)` inside the Svelte 5 component.
    2.  Update this progress ratio incrementally as each batch commits (e.g., `importProgress = Math.round(((i + chunk.length) / players.length) * 100)`).
    3.  Execute updates inside an `untrack` block to prevent reactive render cascades from choking browser performance.

---

# 🤖 2. THE JULES STEP-BY-STEP EXECUTION ROADMAP
@jules, please perform the following deployment steps inside your remote cloud environment:

## Step 1: Locate Target Files
Audit and analyze the following roster-handling components:
*   `src/routes/director/roster/+page.svelte` (or equivalent roster import screen)
*   `src/lib/services/director/RosterImporter.svelte.ts` (or core parsing logic)

## Step 2: Implement Chunked Writes and Header Normalization
*   Rewrite the parsing engine to map loose headers defensively.
*   Ensure the chunking dispatcher limits active commits to exactly 500 documents per writeBatch.
*   Attach a progress state to the UI to update the user in real time.
*   **Limit:** Keep all modified functions strictly **under 80 lines of code**!

## Step 3: Local Verification Sweep (Vitest & Playwright)
Run compilation audits, type checks, and trigger the custom test suite:
```bash
pnpm run check
pnpm playwright test tests/roster-importer.spec.ts --project=chromium
```

---

# 🛡️ 3. PESSIMISTIC DEFINITION OF DONE & CIRCUIT BREAKERS
*   **Circuit Breaker:** Limit to **3 test-and-repair runs**. If compilation or tests fail on the 3rd attempt, revert files to stable, log the errors, and abort.
*   **Delivery Standard:** Your final codebase must compile with exactly **0 errors and 0 warnings** before you open a Pull Request straight to `dev`.
