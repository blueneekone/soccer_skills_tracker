---
name: coach-expanded-staff-controls
description: Complete Test-Driven Development (TDD) backend and frontend implementation of team-isolated granular staff permissions (event manager, team manager, assistant coach, schedule manager) for the Coach OS.
---

# 🛡️ SYSTEM WORKFLOW: COACH EXPANDED STAFF CONTROLS (v1.0)

This workflow binds the **Google Jules (Cloud Backend)** and **Google Antigravity (Local Frontend)** agents to design, secure, implement, and verify a granular, team-isolated staff permission management system for the Coach OS. 

All modifications must adhere strictly to the **Global Executive Protocol (@GEMINI.md)**, the **Pessimistic Definition of Done (@sstracker-enterprise.md)**, and the **Master Roadmap (@ROADMAP.md)**.

---

### 🏛️ THE PERMISSION & DATA ARCHITECTURE (ZERO-TRUST MODEL)
To prevent lateral escalation and unauthorized data access across teams, the platform utilizes a **Team-Scoped Staff Role Matrix** inside Firestore:
*   **Path:** `/clubs/{clubId}/teams/{teamId}/staff/{userId}`
*   **Document Fields:**
    *   `role`: `'assistant_coach' | 'team_manager' | 'event_manager' | 'schedule_manager'`
    *   `permissions`: `string[]` (e.g., `['write_schedule', 'write_roster', 'write_events']`)
    *   `assignedBy`: `string` (UID of the Coach/Director who authorized this access)
    *   `assignedAt`: `Timestamp`

#### Operational Matrix:
1.  **Assistant Coach:** Full technical read/write (e.g., `['read_roster', 'write_roster', 'read_schedule', 'write_schedule', 'read_events', 'write_events']`).
2.  **Team Manager:** Logistics and roster admin (e.g., `['read_roster', 'write_roster', 'read_schedule', 'read_events']`).
3.  **Schedule Manager:** Exclusively controls calendars and match timings (e.g., `['read_schedule', 'write_schedule', 'read_events']`).
4.  **Event Manager:** Coordinates team outings, carpools, and fundraisers (e.g., `['read_events', 'write_events', 'read_schedule']`).

---

## 🛠️ THE RUNTIME TRAJECTORY (STEP-BY-STEP)

### STEP 1: TEST-DRIVEN ARCHITECTURE (TDD GATE)
Before writing any application code, Jules **MUST** write or extend the backend Vitest integration suite under `functions/src/domains/__tests__/staffPermissions.test.ts`.
The test suite must physically spin up the Firestore Emulator and assert:
1.  **RBAC Gatekeeping:** Unauthenticated requests or requests from users without the platform `role === 'admin'` or club `role === 'director' | 'coach'` attempting to mutate the team staff sub-collection are immediately rejected with a `403 Forbidden` error.
2.  **Lateral Isolation:** A `schedule_manager` assigned to `teamA` who attempts to write a schedule document to `/clubs/{clubId}/teams/teamB/schedule/{docId}` is rejected with a permissions exception.
3.  **Operation Cap:** Multi-user updates are executed server-side via atomic `writeBatch` transactions, capped at a hard limit of 500 operations per batch.

### STEP 2: HARDEN FIRESTORE SECURITY RULES (CSO PROTOCOL)
Modify your `firestore.rules` file to mathematically enforce this isolation at the database layer. Client-side validation is never trusted.

```javascript
// Enforce granular team-scoped staff permissions
match /clubs/{clubId}/teams/{teamId}/staff/{userId} {
  allow read: if isAuthenticated() && (isClubAdmin(clubId) || request.auth.uid == userId);
  allow write: if isAuthenticated() && isClubAdmin(clubId);
}

match /clubs/{clubId}/teams/{teamId}/schedule/{docId} {
  allow read: if isAuthenticated() && isTeamMemberOrStaff(clubId, teamId);
  allow write: if isAuthenticated() && (
    isClubAdmin(clubId) || 
    hasTeamPermission(clubId, teamId, 'write_schedule')
  );
}

match /clubs/{clubId}/teams/{teamId}/events/{docId} {
  allow read: if isAuthenticated() && isTeamMemberOrStaff(clubId, teamId);
  allow write: if isAuthenticated() && (
    isClubAdmin(clubId) || 
    hasTeamPermission(clubId, teamId, 'write_events')
  );
}

// Helper functions (Must be under 20 lines)
function isClubAdmin(clubId) {
  return request.auth.token.role == 'admin' || 
         request.auth.token.role == 'director' || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'coach';
}

function hasTeamPermission(clubId, teamId, permission) {
  let staffDoc = /databases/$(database)/documents/clubs/$(clubId)/teams/$(teamId)/staff/$(request.auth.uid);
  return exists(staffDoc) && permission in get(staffDoc).data.permissions;
}
```

### STEP 3: SERVER-SIDE MUTATIONS (callableUpdateStaffRole)
1.  Create a secure Firebase Cloud Function `callableUpdateStaffRole` in `functions/src/domains/staffPermissionsOps.ts`.
2.  All staff assignments, modifications, or revocations **MUST** route through this callable. Direct client-side mutation of the `staff` collection via `setDoc` or `updateDoc` is strictly prohibited.
3.  **Rule Enforced:** The function body must not exceed **80 lines of code**. Extract authorization checks into `src/lib/utils/rbacSanitizer.ts`.

### STEP 4: FRONTEND ENCAPSULATION (VANGUARD TRINITY PATTERN)
Do not build a monolithic permission settings page. Extract the interface inside `src/routes/(app)/coach/logistics/permissions/` into the Vanguard Trinity components:
1.  **The Brain (`StaffPermissionsEngine.svelte.ts`):** Handles Svelte 5 `$state` proxies tracking selected staff, current permissions, and active mutation loads.
    *   **CRITICAL B815 Hydration Guard:** You must wrap all database read queries in the strict hydration check:
        `if (!db || !authStore.isAuthenticated) return;`
2.  **The Glass (`StaffPermissionsArena.svelte`):** Renders the 12-column asymmetric Bento Grid matching the "Nuclear Americana Tech Noir" design system. The grid layout must clamp to prevent text squishing. Apply strict 90-degree corners with a solid background (`#0B0F19`) on all layout panels.
3.  **The HUD (`StaffPermissionsHUD.svelte`):** Displays quick indicators for active staff slots, role summaries, and saving status indicators.
4.  **The Shell (`+page.svelte`):** Acts as a clean, unstyled wrapper coordinating the Engine, HUD, and Arena.

### STEP 5: AUTOMATED COMPLIANCE VERIFICATION (CRO AUDIT)
1.  Run `npm run check` and `npx eslint` in your local environment. Establish that there are exactly **0 Svelte compilation errors and 0 TypeScript `any` violations**.
2.  Execute the Playwright integration suite `audit-computed-styles-v6.js` against the Coach routes:
    ```bash
    pnpm playwright test audit-computed-styles-v6.js --project=desktop-chrome
    ```
3.  Verify that all desktop, tablet, and mobile screenshot captures of the new permission controls are safely generated and saved to `audit-artifacts/coach/` without any layout overlapping.

---

## 🔒 POST-VERIFICATION PROCEDURES
Once the test-suite returns a clean `100% SUCCESS` pass:
1.  Commit the files to your active branch:
    ```bash
    git add .
    git commit -m "feat: implement team-isolated granular staff permissions and security rules"
    ```
2.  Open `ROADMAP.md` and mark the match-complete states under Epic 3 (Coach OS Expanded Staff Controls) as complete.
