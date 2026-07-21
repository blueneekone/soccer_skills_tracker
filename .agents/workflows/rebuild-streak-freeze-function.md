---
description: P1 — Create the atomic Cloud Function that consumes streak freeze tokens, making the streak freeze system functionally real.
---

# Workflow: Rebuild Streak Freeze Cloud Function

**Priority:** P1 🔴 HIGH  
**Rule Enforced:** Enterprise Rules §4 — "All session updates must be dispatched server-side via atomic Firestore `writeBatch` transactions, mathematically capped at a hard limit of 500 operations per batch." §7 — "Loss Avoidance (Core Drive 8): Deploy rigorous daily habit streaks; streak freezes protect against burnout."

---

## Context
`PlayerActivityStreak.svelte`, `ArmoryEngine.svelte.ts`, and type definitions all reference streak freezes, but no Cloud Function exists to atomically consume a freeze token. The freeze counter is likely only updated client-side (if at all), which means a malicious client could grant themselves unlimited freezes by calling `setDoc` directly.

---

## Step 1: Audit the Current Freeze State

Before writing code, read:
- `src/lib/components/shell/PlayerActivityStreak.svelte` — identify where freeze consumption is currently triggered
- `src/lib/states/ArmoryEngine.svelte.ts` — check how freeze tokens are granted
- `src/lib/types/tenant.ts` — confirm `streakFreezes` field schema

Document findings before proceeding.

---

## Step 2: Create `consumeStreakFreeze` Callable

**File:** `functions/src/domains/streakOps.js`  
**Action:** [NEW]  
**Trinity Role:** Brain (server-side only)

```javascript
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAdminDb } = require('../utils/adminDb.js');
const { FieldValue } = require('firebase-admin/firestore');

/**
 * consumeStreakFreeze — atomically decrements streakFreezes by 1
 * and marks today as an active day to preserve the streak.
 * Zero-trust: UID is taken from auth context, never from payload.
 */
exports.consumeStreakFreeze = onCall({ enforceAppCheck: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Auth required.');

  const db = getAdminDb();
  const statsRef = db.collection('player_stats').doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(statsRef);
    if (!snap.exists) throw new HttpsError('not-found', 'No player stats found.');

    const data = snap.data();
    const freezes = typeof data.streakFreezes === 'number' ? data.streakFreezes : 0;

    if (freezes <= 0) {
      throw new HttpsError('failed-precondition', 'No streak freezes available.');
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    tx.update(statsRef, {
      streakFreezes: FieldValue.increment(-1),
      lastActiveDate: today,
      lastFreezeUsed: today,
    });

    return {
      success: true,
      freezesRemaining: freezes - 1,
      streakPreserved: true,
    };
  });
});
```

**Constraint:** Function body is under 80 lines. Transaction is atomic — no partial writes possible.

---

## Step 3: Register in `functions/index.js`

**File:** `functions/index.js`  
**Action:** MODIFY

```javascript
const { consumeStreakFreeze } = require('./src/domains/streakOps.js');
exports.consumeStreakFreeze = consumeStreakFreeze;
```

---

## Step 4: Update `PlayerActivityStreak.svelte` to Call the Server

**File:** `src/lib/components/shell/PlayerActivityStreak.svelte`  
**Action:** MODIFY  
**Trinity Role:** Glass (UI only — delegate freeze logic to server)

Replace any client-side freeze consumption with:

```svelte
<script lang="ts">
  import { getFunctions, httpsCallable } from 'firebase/functions';
  import { dopamineOnCallable } from '$lib/services/dopamine.svelte.js';

  let freezeLoading = $state(false);
  let freezeError = $state('');

  async function activateFreeze() {
    if (freezeLoading) return;
    freezeLoading = true;
    freezeError = '';
    try {
      const functions = getFunctions();
      const consumeFreeze = httpsCallable(functions, 'consumeStreakFreeze');
      await dopamineOnCallable(consumeFreeze(), { kind: 'adminRelief' });
      // Snapshot listener will update UI automatically via Firestore onSnapshot
    } catch (e: any) {
      freezeError = e?.message ?? 'Could not activate freeze.';
    } finally {
      freezeLoading = false;
    }
  }
</script>
```

**Note:** `dopamineOnCallable` wires the confetti explosion to a successful server ack — this is the correct pattern per `dopamine.svelte.ts`.

---

## Step 5: Enforce Zero-Trust Payload Stripping

Verify that `streakFreezes` is **never** writable directly from the client via `setDoc` or `updateDoc`. Add a Firestore Security Rule:

```
// In firestore.rules
match /player_stats/{uid} {
  allow write: if request.auth.uid == uid
    && !('streakFreezes' in request.resource.data.diff(resource.data).affectedKeys());
}
```

Freeze token grants are only done via Cloud Functions using admin SDK, bypassing security rules.

---

## Step 6: Write Tests

**File:** `src/lib/services/__tests__/streakFreezeCallable.test.ts`  
**Action:** [NEW]

Tests must verify:
1. `PlayerActivityStreak` references the `consumeStreakFreeze` callable (not a direct `updateDoc`)
2. `dopamineOnCallable` is used to tie the confetti to server success
3. `freezeLoading` state is set and cleared correctly
4. Error state is populated when callable throws

---

## Step 7: Deploy & Verify

```
firebase deploy --only functions:consumeStreakFreeze
npm run check
npx vitest run src/lib/services/__tests__/streakFreezeCallable.test.ts
git add .
git commit -m "feat(epic4): atomic streak freeze consumption via Cloud Function (Core Drive 8)"
git push origin dev
```
