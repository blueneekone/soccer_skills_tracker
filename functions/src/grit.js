"use strict";
/**
 * grit.ts — Epic 1.3 transactional security for Grit XP awards.
 *
 * Authoritative server path for commitGritAward(). Uses a Firestore transaction to
 * read daily_grit_count, enforce the cap, and atomically write the award + XP.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerGritAwardUpdate = exports.GRIT_DAILY_CAP = exports.GRIT_XP = exports.REGION = void 0;
exports.utcTodayKey = utcTodayKey;
exports.resolveDailyGritCount = resolveDailyGritCount;
exports.parseComplexityRank = parseComplexityRank;
exports.runGritAwardTransaction = runGritAwardTransaction;
exports.hashUidSeed = hashUidSeed;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const authBouncers_1 = require("./middleware/authBouncers");
exports.REGION = 'us-east1';
exports.GRIT_XP = 50;
exports.GRIT_DAILY_CAP = 3;
const db = () => admin.firestore();
/** UTC calendar day key (YYYY-MM-DD). */
function utcTodayKey(now = new Date()) {
    return now.toISOString().slice(0, 10);
}
/** Resolve today's grit count from user profile counter fields. */
function resolveDailyGritCount(userData, todayKey) {
    const storedDate = userData && typeof userData.daily_grit_date === 'string' ? userData.daily_grit_date : '';
    const storedCount = Number(userData?.daily_grit_count);
    if (storedDate !== todayKey)
        return 0;
    if (!Number.isFinite(storedCount) || storedCount < 0)
        return 0;
    return Math.floor(storedCount);
}
function parseComplexityRank(raw) {
    const n = Number(raw);
    if (n === 1 || n === 2 || n === 3)
        return n;
    return null;
}
/** Core transaction body — exported for unit tests without onCall wrapper. */
async function runGritAwardTransaction(input) {
    const todayKey = input.todayKey ?? utcTodayKey();
    const userRef = db().collection('users').doc(input.userKey);
    const gritRef = db().collection('grit_awards').doc();
    const historyRef = userRef.collection('xpHistory').doc();
    return db().runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'User profile not found.');
        }
        const userData = snap.data();
        const currentCount = resolveDailyGritCount(userData, todayKey);
        if (currentCount >= exports.GRIT_DAILY_CAP) {
            throw new https_1.HttpsError('resource-exhausted', 'GRIT_DAILY_CAP');
        }
        const nextCount = currentCount + 1;
        tx.set(userRef, {
            daily_grit_date: todayKey,
            daily_grit_count: nextCount,
            armory: {
                totalXP: admin.firestore.FieldValue.increment(exports.GRIT_XP),
            },
        }, { merge: true });
        tx.set(gritRef, {
            batchId: input.batchId,
            playerUid: input.playerUid,
            userKey: input.userKey,
            clubId: input.clubId,
            drillId: input.drillId,
            complexityRank: input.complexityRank,
            xpAwarded: exports.GRIT_XP,
            type: 'failed_attempt_grit',
            loggedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(historyRef, {
            batchId: input.batchId,
            date: new Date().toISOString(),
            amount: exports.GRIT_XP,
            reason: 'Grit — failed attempt rewarded',
            source: 'grit_award',
            drillId: input.drillId,
            complexityRank: input.complexityRank,
            loggedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { batchId: input.batchId, dailyGritCount: nextCount };
    });
}
exports.triggerGritAwardUpdate = (0, https_1.onCall)({ region: exports.REGION }, async (request) => {
    const emailKey = (0, authBouncers_1.assertPlayer)(request);
    const authUid = request.auth.uid;
    const data = request.data ?? {};
    const playerUid = typeof data.playerUid === 'string' ? data.playerUid.trim() : '';
    const userKey = typeof data.userKey === 'string' ? data.userKey.trim().toLowerCase() : '';
    const clubId = typeof data.clubId === 'string' ? data.clubId.trim().slice(0, 200) : '';
    const drillId = typeof data.drillId === 'string' ? data.drillId.trim().slice(0, 200) : '';
    const complexityRank = parseComplexityRank(data.complexityRank);
    const batchId = typeof data.batchId === 'string' && data.batchId.trim().length > 0
        ? data.batchId.trim().slice(0, 128)
        : (0, crypto_1.randomUUID)();
    if (!playerUid || playerUid !== authUid) {
        throw new https_1.HttpsError('permission-denied', 'playerUid must match the authenticated user.');
    }
    if (!userKey || userKey !== emailKey) {
        throw new https_1.HttpsError('permission-denied', 'userKey must match the authenticated email.');
    }
    if (!clubId || !drillId) {
        throw new https_1.HttpsError('invalid-argument', 'clubId and drillId are required.');
    }
    if (complexityRank === null) {
        throw new https_1.HttpsError('invalid-argument', 'complexityRank must be 1, 2, or 3.');
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
    };
});
/** Deterministic hash helper for HUD ring seeds (shared test surface). */
function hashUidSeed(uid) {
    const hex = (0, crypto_1.createHash)('sha256').update(uid).digest('hex').slice(0, 8);
    return parseInt(hex, 16) >>> 0;
}
