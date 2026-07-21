---
description: P0 — Wire the Skill Decay algorithm to Firestore via an atomic Cloud Function, making Core Drive 8 (Loss Avoidance) functionally real.
---

# Workflow: Rebuild Skill Decay Persistence

**Priority:** P0 🔴 CRITICAL  
**Rule Enforced:** GEMINI.md §4 — "All session updates must be dispatched server-side via atomic Firestore `writeBatch` transactions." Enterprise Rules §7 — "Loss Avoidance (Core Drive 8): Deploy rigorous daily habit streaks; program automated Skill Decay algorithms that drain fractions of inactive XP after 5 consecutive missed days."

---

## Context
`DopamineEngine.svelte.ts` calculates XP decay client-side and explicitly marks it as *"mocked as static for now, would sync to DB."* The decay number is **never written to Firestore**, so it resets on every page load. This makes the entire Loss Avoidance behavioral mechanic non-functional.

---

## Step 1: Create the Server-Side Decay Callable

**File:** `functions/src/domains/skillDecayOps.js`  
**Action:** [NEW]  
**Trinity Role:** Brain (server-side only)

```javascript
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAdminDb } = require('../utils/adminDb.js');

/**
 * applySkillDecay — callable triggered on player login/session start.
 * Reads lastActiveDate, calculates decay, atomically writes
 * decayed XP back to the player's stats document.
 * Max batch ops: 2 (read + write). Well within 500-op limit.
 */
exports.applySkillDecay = onCall({ enforceAppCheck: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Auth required.');

  const db = getAdminDb();
  const statsRef = db.collection('player_stats').doc(uid);
  const snap = await statsRef.get();

  if (!snap.exists) return { applied: false, reason: 'no_stats' };

  const data = snap.data();
  const lastActive = data.lastActiveDate?.toDate?.() ?? null;

  if (!lastActive) return { applied: false, reason: 'no_last_active' };

  const today = new Date();
  const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

  if (diffDays < 5) return { applied: false, daysInactive: diffDays };

  const currentXp = typeof data.totalXp === 'number' ? data.totalXp : 0;
  const freezeCount = typeof data.streakFreezes === 'number' ? data.streakFreezes : 0;

  if (freezeCount > 0) {
    await statsRef.update({ streakFreezes: freezeCount - 1 });
    return { applied: false, reason: 'freeze_consumed', freezesLeft: freezeCount - 1 };
  }

  const DECAY_RATE = 0.02; // 2% per day after day 5
  const decayMultiplier = Math.min(diffDays - 4, 30); // cap at 30 days
  const xpLost = Math.floor(currentXp * DECAY_RATE * decayMultiplier);
  const newXp = Math.max(0, currentXp - xpLost);

  await statsRef.update({
    totalXp: newXp,
    lastDecayApplied: today,
    lastDecayLost: xpLost,
    currentStreak: 0,
  });

  return { applied: true, xpLost, newXp, daysInactive: diffDays };
});
```

**Constraint:** This function is under 80 lines. If decay logic grows, extract `calculateDecay(data, today)` to `functions/src/utils/decayCalc.js`.

---

## Step 2: Register the Callable in `functions/index.js`

**File:** `functions/index.js`  
**Action:** MODIFY  

Add:
```javascript
const { applySkillDecay } = require('./src/domains/skillDecayOps.js');
exports.applySkillDecay = applySkillDecay;
```

---

## Step 3: Update `DopamineEngine.svelte.ts` to Call the Server

**File:** `src/lib/components/player/DopamineEngine.svelte.ts`  
**Action:** MODIFY  
**Trinity Role:** Brain (client facade only — delegates to server)

Replace the `evaluateSkillDecay()` private method body with a server callout:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

// Replace the private evaluateSkillDecay() method:
private async syncDecayFromServer(): Promise<void> {
  try {
    const functions = getFunctions();
    const applyDecay = httpsCallable<void, DecayResult>(functions, 'applySkillDecay');
    const result = await applyDecay();
    const data = result.data;
    if (data.applied) {
      this.decayPenaltyApplied = true;
      this.xpLost = data.xpLost ?? 0;
      this.queueFeedback('DECAY_WARNING', { days: data.daysInactive, lost: data.xpLost });
    }
  } catch (e) {
    // Graceful degradation — decay display skipped, no hard error shown
    console.warn('[DopamineEngine] decay sync skipped:', e);
  }
}
```

Update `hydrate()` to call `void this.syncDecayFromServer()` instead of `this.evaluateSkillDecay()`.

Define `DecayResult` interface at top of file:
```typescript
interface DecayResult {
  applied: boolean;
  xpLost?: number;
  newXp?: number;
  daysInactive?: number;
  reason?: string;
}
```

---

## Step 4: Wire Decay Display to Player Dashboard HUD

**File:** `src/routes/(app)/player/dashboard/+page.svelte`  
**Action:** MODIFY  

After the `dopamineEngine.hydrate(statsRaw)` call, add a reactive check:

```svelte
{#if dopamineEngine.decayPenaltyApplied}
  <DecayWarningBanner xpLost={dopamineEngine.xpLost} />
{/if}
```

Create `DecayWarningBanner.svelte` in `src/lib/components/player/` — a slim Nuclear Americana styled alert in Atompunk Amber, showing XP lost and a motivational CTA to resume training.

---

## Step 5: Write Tests

**File:** `src/lib/components/player/__tests__/skillDecayPersistence.test.ts`  
**Action:** [NEW]

Tests must verify:
1. `applySkillDecay` callable is referenced in the DopamineEngine
2. `hydrate()` calls `syncDecayFromServer()` and not the old `evaluateSkillDecay()`
3. `decayPenaltyApplied` flips to true when server returns `applied: true`
4. Graceful degradation: engine does not throw when callable fails

---

## Step 6: Deploy Functions

```
firebase deploy --only functions:applySkillDecay
```

---

## Step 7: Verify & Commit

Run: `npm run check` — 0 errors.  
Run: `npx vitest run src/lib/components/player/__tests__/skillDecayPersistence.test.ts`

```
git add .
git commit -m "feat(epic4): wire skill decay to Firestore via atomic Cloud Function (Core Drive 8)"
git push origin dev
```
