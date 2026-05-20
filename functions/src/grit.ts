/**
 * grit.ts — Epic 1.3 transactional security for Grit XP awards.
 *
 * Authoritative server path for commitGritAward(). Uses a Firestore transaction to
 * read daily_grit_count, enforce the cap, and atomically write the award + XP.
 */

import {onCall, HttpsError, type CallableRequest} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {createHash, randomUUID} from 'crypto';

export type GritAwardRequest = {
  playerUid?: string;
  userKey?: string;
  clubId?: string;
  drillId?: string;
  complexityRank?: unknown;
  batchId?: string;
};

export type GritAwardResult = {
  ok: true;
  committed: true;
  batchId: string;
  offlineQueued: false;
  dailyGritCount: number;
};

// CommonJS middleware — keep runtime compatible with existing functions bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {assertPlayer} = require('../src/middleware/authBouncers') as {
  assertPlayer: (request: CallableRequest<GritAwardRequest>) => string;
};

export const REGION = 'us-east1';
export const GRIT_XP = 50;
export const GRIT_DAILY_CAP = 3;

const db = () => admin.firestore();

/** UTC calendar day key (YYYY-MM-DD). */
export function utcTodayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Resolve today's grit count from user profile counter fields. */
export function resolveDailyGritCount(
    userData: Record<string, unknown> | undefined,
    todayKey: string,
): number {
  const storedDate =
    userData && typeof userData.daily_grit_date === 'string' ? userData.daily_grit_date : '';
  const storedCount = Number(userData?.daily_grit_count);
  if (storedDate !== todayKey) return 0;
  if (!Number.isFinite(storedCount) || storedCount < 0) return 0;
  return Math.floor(storedCount);
}

export function parseComplexityRank(raw: unknown): 1 | 2 | 3 | null {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

/** Core transaction body — exported for unit tests without onCall wrapper. */
export async function runGritAwardTransaction(input: {
  playerUid: string;
  userKey: string;
  clubId: string;
  drillId: string;
  complexityRank: 1 | 2 | 3;
  batchId: string;
  todayKey?: string;
}): Promise<{ batchId: string; dailyGritCount: number }> {
  const todayKey = input.todayKey ?? utcTodayKey();
  const userRef = db().collection('users').doc(input.userKey);
  const gritRef = db().collection('grit_awards').doc();
  const historyRef = userRef.collection('xpHistory').doc();

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }

    const userData = snap.data() as Record<string, unknown> | undefined;
    const currentCount = resolveDailyGritCount(userData, todayKey);
    if (currentCount >= GRIT_DAILY_CAP) {
      throw new HttpsError('resource-exhausted', 'GRIT_DAILY_CAP');
    }

    const nextCount = currentCount + 1;

    tx.set(
        userRef,
        {
          daily_grit_date: todayKey,
          daily_grit_count: nextCount,
          armory: {
            totalXP: admin.firestore.FieldValue.increment(GRIT_XP),
          },
        },
        {merge: true},
    );

    tx.set(gritRef, {
      batchId: input.batchId,
      playerUid: input.playerUid,
      userKey: input.userKey,
      clubId: input.clubId,
      drillId: input.drillId,
      complexityRank: input.complexityRank,
      xpAwarded: GRIT_XP,
      type: 'failed_attempt_grit',
      loggedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.set(historyRef, {
      batchId: input.batchId,
      date: new Date().toISOString(),
      amount: GRIT_XP,
      reason: 'Grit — failed attempt rewarded',
      source: 'grit_award',
      drillId: input.drillId,
      complexityRank: input.complexityRank,
      loggedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {batchId: input.batchId, dailyGritCount: nextCount};
  });
}

export const triggerGritAwardUpdate = onCall({region: REGION}, async (request: CallableRequest<GritAwardRequest>) => {
  const emailKey = assertPlayer(request);
  const authUid = request.auth!.uid;
  const data = request.data ?? {};

  const playerUid = typeof data.playerUid === 'string' ? data.playerUid.trim() : '';
  const userKey = typeof data.userKey === 'string' ? data.userKey.trim().toLowerCase() : '';
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim().slice(0, 200) : '';
  const drillId = typeof data.drillId === 'string' ? data.drillId.trim().slice(0, 200) : '';
  const complexityRank = parseComplexityRank(data.complexityRank);
  const batchId =
    typeof data.batchId === 'string' && data.batchId.trim().length > 0
      ? data.batchId.trim().slice(0, 128)
      : randomUUID();

  if (!playerUid || playerUid !== authUid) {
    throw new HttpsError('permission-denied', 'playerUid must match the authenticated user.');
  }
  if (!userKey || userKey !== emailKey) {
    throw new HttpsError('permission-denied', 'userKey must match the authenticated email.');
  }
  if (!clubId || !drillId) {
    throw new HttpsError('invalid-argument', 'clubId and drillId are required.');
  }
  if (complexityRank === null) {
    throw new HttpsError('invalid-argument', 'complexityRank must be 1, 2, or 3.');
  }

  const txResult = await runGritAwardTransaction({
    playerUid,
    userKey,
    clubId,
    drillId,
    complexityRank,
    batchId,
  });

  return {
    ok: true,
    committed: true,
    batchId: txResult.batchId,
    offlineQueued: false,
    dailyGritCount: txResult.dailyGritCount,
  } satisfies GritAwardResult;
});

/** Deterministic hash helper for HUD ring seeds (shared test surface). */
export function hashUidSeed(uid: string): number {
  const hex = createHash('sha256').update(uid).digest('hex').slice(0, 8);
  return parseInt(hex, 16) >>> 0;
}
