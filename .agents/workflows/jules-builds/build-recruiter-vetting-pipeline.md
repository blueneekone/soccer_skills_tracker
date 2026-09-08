---
description: P1 — Build the external recruiter vetting pipeline using Checkr API, enforcing National Criminal Database clearance before scouts gain platform access to prospect data.
---

# Workflow: Build Recruiter Vetting Pipeline

**Priority:** P1 🔴 HIGH  
**Rule Enforced:** ROADMAP.md Epic 5 — "Vetted Recruiter Engine: Checkr API integration to mandate National Criminal Database vetting before scouts gain platform access." GEMINI.md §2 — Zero-Trust Security. COPPA 2.0 — External adults must be vetted before accessing minor athlete data.

---

## Context
Checkr is already integrated for **coach** clearance (`checkrCoachClearance.ts`, `CheckrEmbed.svelte`). The recruiter flow needs the same pipeline adapted for external scouts — with one critical difference: recruiters are **not** club staff, so they access via a separate public-facing onboarding funnel, not the admin panel.

---

## Step 1: Audit Existing Checkr Infrastructure

Before writing any code, read:
- `src/lib/compliance/checkrCoachClearance.ts` — understand the existing Checkr invitation flow
- `src/lib/compliance/checkrClubConfig.ts` — understand club-level Checkr config
- `src/routes/(app)/admin/recruiters/RecruitersEngine.svelte.ts` — see what admin-side recruiter management already exists
- `src/lib/types/backgroundCheck.ts` — understand the existing type schema

Document: Which parts can be reused vs. which need a recruiter-specific variant.

---

## Step 2: Extend Type System

**File:** `src/lib/types/backgroundCheck.ts`  
**Action:** MODIFY

Add a `RecruiterCheckrStatus` type:
```typescript
export type RecruiterCheckStatus = 'pending' | 'invited' | 'clear' | 'consider' | 'suspended';

export interface RecruiterProfile {
  uid: string;
  email: string;
  organizationName: string;
  checkrCandidateId?: string;
  checkrReportId?: string;
  checkrStatus: RecruiterCheckStatus;
  accessGrantedAt?: string | null;
  createdAt: string;
}
```

---

## Step 3: Create `checkrRecruiterClearance.ts`

**File:** `src/lib/compliance/checkrRecruiterClearance.ts`  
**Action:** [NEW]

Model this on `checkrCoachClearance.ts` but adapted for external recruiters:
- Invitation endpoint targets the `recruiters` Firestore collection (not `users`)
- No `clubId` scoping — recruiters are platform-level, not club-level
- Status polling function: `pollRecruiterCheckrStatus(uid: string)`
- Access gate function: `isRecruiterCleared(uid: string): boolean`

Keep each exported function under 80 lines.

---

## Step 4: Create the Cloud Function — `inviteRecruiterCheckr`

**File:** `functions/src/domains/recruiterOps.js`  
**Action:** [NEW]  
**Trinity Role:** Brain (server-side only)

```javascript
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAdminDb } = require('../utils/adminDb.js');

/**
 * inviteRecruiterCheckr — sends a Checkr background check invitation to a
 * pending recruiter. Called by the admin who approves the recruiter application.
 * Zero-trust: strips role/access fields from recruiter payload before write.
 */
exports.inviteRecruiterCheckr = onCall({ enforceAppCheck: true }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'Auth required.');

  const db = getAdminDb();
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerRole = callerSnap.data()?.role;

  if (callerRole !== 'superAdmin' && callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Admins only.');
  }

  const { recruiterUid } = request.data;
  if (!recruiterUid) throw new HttpsError('invalid-argument', 'recruiterUid required.');

  const recruiterRef = db.collection('recruiters').doc(recruiterUid);
  const recruiterSnap = await recruiterRef.get();
  if (!recruiterSnap.exists) throw new HttpsError('not-found', 'Recruiter not found.');

  // Call Checkr API to create invitation (implementation uses existing checkrClubConfig pattern)
  // TODO: inject Checkr API key from Secret Manager, create candidate + invitation
  const mockCheckrInvitationId = `chkr_inv_${recruiterUid}_${Date.now()}`;

  await recruiterRef.update({
    checkrStatus: 'invited',
    checkrInvitationId: mockCheckrInvitationId,
    invitedAt: new Date().toISOString(),
  });

  return { success: true, invitationId: mockCheckrInvitationId };
});
```

---

## Step 5: Build the Recruiter Onboarding Route

**File:** `src/routes/(app)/recruiter/onboarding/+page.svelte`  
**Action:** [NEW]  
**Trinity Role:** Shell

Structure:
1. **Shell** (`+page.svelte`) — layout, reads `recruiter` profile from Firestore
2. **Engine** (`RecruiterOnboardingEngine.svelte.ts`) — orchestrates Checkr status polling, access gating
3. **Arena** (`RecruiterOnboardingArena.svelte`) — multi-step UI: application form → pending state → Checkr embed → cleared state
4. **HUD** (`RecruiterOnboardingHUD.svelte`) — status badge showing clearance progress

---

## Step 6: Gate `RecruiterSearchEngine.svelte` Behind Clearance

**File:** `src/lib/components/recruiter/RecruiterSearchEngine.svelte`  
**Action:** MODIFY

Add at the top of the search trigger function:
```javascript
import { isRecruiterCleared } from '$lib/compliance/checkrRecruiterClearance.js';

if (!isRecruiterCleared(authStore.uid)) {
  throw new Error('Background check required before accessing prospect data.');
}
```

Also add cursor pagination (Firestore `startAfter` + `limit(20)`) to keep payloads sub-200KB.

---

## Step 7: Write Tests

**File:** `src/lib/compliance/__tests__/checkrRecruiterClearance.test.ts`  
**Action:** [NEW]

Tests must verify:
1. `isRecruiterCleared()` returns `false` for `pending`, `invited`, `consider`, `suspended` statuses
2. `isRecruiterCleared()` returns `true` only for `clear` status
3. `RecruiterSearchEngine` references the clearance gate before `getDocs()`
4. Search results are paginated (references `startAfter` or `limit`)

---

## Step 8: Deploy & Commit

```
firebase deploy --only functions:inviteRecruiterCheckr
npm run check
npx vitest run src/lib/compliance/__tests__/checkrRecruiterClearance.test.ts
git add .
git commit -m "feat(epic5): recruiter Checkr vetting pipeline — gate prospect access behind criminal clearance"
git push origin dev
```
