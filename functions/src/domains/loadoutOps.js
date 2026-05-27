'use strict';

const fs = require('fs');
const path = require('path');
const {onCall} = require('firebase-functions/v2/https');
const {HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const {normEmail} = require('../utils/formatters');
const {
  assertCoachMessageSender,
  assertActorCanAccessTeam,
  assertPlayer,
} = require('../middleware/authBouncers');
const {
  getSeasonOneCardsForSet,
} = require('../../../src/lib/gamification/seasonOneData.js');

const REGION = 'us-east1';

/** Album folder completion → banner cosmetic + HQ chip (Sprint 3.4). */
const ALBUM_SET_BONUS_REWARDS = Object.freeze({
  street_kings: {
    bannerCosmeticId: 'album_banner_vanguard',
    chipLabel: 'STREET KINGS SET',
  },
  snipers: {
    bannerCosmeticId: 'album_banner_snipers',
    chipLabel: 'SNIPERS SET',
  },
  dark_arts: {
    bannerCosmeticId: 'album_banner_dark_arts',
    chipLabel: 'DARK ARTS SET',
  },
});

/** Lazy Firestore accessor — defers init until first call. */
const db = () => admin.firestore();

/** Quartermaster digital SKUs eligible for TC redeem + ownedCosmetics grant. */
const QM_DIGITAL_LOADOUT = Object.freeze({
  digi_border_neon: {cost: 500, title: 'Neon Operative Border', type: 'digital'},
});

/**
 * Load committed cosmetic id allowlist from static catalog config.
 * @return {Set<string>}
 */
function loadCosmeticAllowlist() {
  const configPath = path.join(
      __dirname,
      '../../../static/cosmetics/catalog.config.json',
  );
  const rows = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return new Set(rows.map((row) => String(row.id)));
}

/**
 * @param {string} cosmeticId
 * @param {Set<string>} allowlist
 */
function assertCosmeticAllowed(cosmeticId, allowlist) {
  if (!allowlist.has(cosmeticId)) {
    throw new HttpsError('invalid-argument', 'Unknown cosmetic id.');
  }
}

/**
 * Coach / director team scope for granting to a rostered player.
 * @param {Object} actor assertCoachMessageSender result
 * @param {string} playerEmail normalized email
 * @return {Promise<{ teamId: string, clubId: string|null }>}
 */
async function assertStaffCanGrantToPlayer(actor, playerEmail) {
  const uSnap = await db().collection('users').doc(playerEmail).get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'Player profile not found.');
  }
  const u = uSnap.data() || {};
  if (u.role && u.role !== 'player') {
    throw new HttpsError(
        'failed-precondition',
        'Target account is not a player profile.',
    );
  }
  const teamId = typeof u.teamId === 'string' ? u.teamId.trim() : '';
  if (!teamId) {
    throw new HttpsError(
        'failed-precondition',
        'Player is not assigned to a team.',
    );
  }
  const tSnap = await db().collection('teams').doc(teamId).get();
  assertActorCanAccessTeam(actor, teamId, tSnap);
  const clubId =
      typeof u.clubId === 'string' && u.clubId.trim() ?
        u.clubId.trim() :
        (tSnap.exists && typeof tSnap.data().clubId === 'string' ?
          tSnap.data().clubId.trim() :
          null);
  return {teamId, clubId};
}

/**
 * Idempotent grant: arrayUnion ownedCosmetics + cosmetic_unlocks audit row.
 * @param {string} playerEmail
 * @param {string} cosmeticId
 * @param {string} source
 * @param {string} grantedBy
 * @param {string|null} sourceRef
 * @return {Promise<{ alreadyOwned: boolean, cosmeticId: string }>}
 */
async function grantCosmeticToPlayer(
    playerEmail,
    cosmeticId,
    source,
    grantedBy,
    sourceRef,
) {
  const userRef = db().collection('users').doc(playerEmail);
  const unlockRef = userRef.collection('cosmetic_unlocks').doc(cosmeticId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  return db().runTransaction(async (t) => {
    const uSnap = await t.get(userRef);
    if (!uSnap.exists) {
      throw new HttpsError('not-found', 'Player profile not found.');
    }
    const owned = Array.isArray(uSnap.data().ownedCosmetics) ?
      uSnap.data().ownedCosmetics.map(String) :
      [];
    if (owned.includes(cosmeticId)) {
      return {alreadyOwned: true, cosmeticId};
    }
    t.update(userRef, {
      ownedCosmetics: admin.firestore.FieldValue.arrayUnion(cosmeticId),
    });
    t.set(unlockRef, {
      cosmeticId,
      source,
      sourceRef: sourceRef || null,
      grantedBy,
      grantedAt: now,
    }, {merge: true});
    return {alreadyOwned: false, cosmeticId};
  });
}

/**
 * Server-verified cosmetic grant — coach / director team-scoped.
 * Input: { playerEmail, cosmeticId, source, sourceRef? }
 */
exports.grantLoadoutCosmetic = onCall({region: REGION}, async (request) => {
  const actor = assertCoachMessageSender(request);
  if (actor.role === 'player' || request.auth.token.role === 'player') {
    throw new HttpsError(
        'permission-denied',
        'Players cannot grant cosmetics to themselves.',
    );
  }

  const data = request.data || {};
  const playerEmail = normEmail(
      typeof data.playerEmail === 'string' ? data.playerEmail : '',
  );
  const cosmeticId =
      typeof data.cosmeticId === 'string' ? data.cosmeticId.trim() : '';
  const source = typeof data.source === 'string' ? data.source.trim() : '';
  const sourceRef =
      typeof data.sourceRef === 'string' && data.sourceRef.trim() ?
        data.sourceRef.trim() :
        null;

  if (!playerEmail || !cosmeticId || !source) {
    throw new HttpsError(
        'invalid-argument',
        'playerEmail, cosmeticId, and source are required.',
    );
  }

  const allowlist = loadCosmeticAllowlist();
  assertCosmeticAllowed(cosmeticId, allowlist);
  await assertStaffCanGrantToPlayer(actor, playerEmail);

  const actorEmail = normEmail(actor.email) || '';
  if (actorEmail === playerEmail) {
    throw new HttpsError(
        'permission-denied',
        'Self-grant is not permitted.',
    );
  }

  const result = await grantCosmeticToPlayer(
      playerEmail,
      cosmeticId,
      source,
      actorEmail,
      sourceRef,
  );
  return {ok: true, ...result};
});

/**
 * Player TC redeem for digital loadout SKUs — replaces client ownedCosmetics writes.
 * Input: { itemId, clubId }
 */
exports.redeemQuartermasterDigital = onCall({region: REGION}, async (request) => {
  const playerEmail = assertPlayer(request);
  const data = request.data || {};
  const itemId = typeof data.itemId === 'string' ? data.itemId.trim() : '';
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';

  if (!itemId || !clubId) {
    throw new HttpsError('invalid-argument', 'itemId and clubId are required.');
  }

  const qm = QM_DIGITAL_LOADOUT[itemId];
  if (!qm || qm.type !== 'digital') {
    throw new HttpsError('invalid-argument', 'Invalid Quartermaster digital SKU.');
  }

  const allowlist = loadCosmeticAllowlist();
  assertCosmeticAllowed(itemId, allowlist);

  const userRef = db().collection('users').doc(playerEmail);
  const fulfillmentRef = db()
      .collection('organizations')
      .doc(clubId)
      .collection('fulfillments')
      .doc();
  const unlockRef = userRef.collection('cosmetic_unlocks').doc(itemId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const cost = Math.max(0, Math.floor(Number(qm.cost) || 0));

  const txResult = await db().runTransaction(async (t) => {
    const uSnap = await t.get(userRef);
    if (!uSnap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }
    const u = uSnap.data() || {};
    const credits = Math.max(0, Math.floor(Number(u.tacticalCredits) || 0));
    if (credits < cost) {
      throw new HttpsError(
          'failed-precondition',
          'Insufficient Tactical Credits.',
      );
    }
    const owned = Array.isArray(u.ownedCosmetics) ?
      u.ownedCosmetics.map(String) :
      [];
    const alreadyOwned = owned.includes(itemId);

    t.update(userRef, {tacticalCredits: credits - cost});
    if (!alreadyOwned) {
      t.update(userRef, {
        ownedCosmetics: admin.firestore.FieldValue.arrayUnion(itemId),
      });
      t.set(unlockRef, {
        cosmeticId: itemId,
        source: 'quartermaster_redeem',
        sourceRef: fulfillmentRef.id,
        grantedBy: playerEmail,
        grantedAt: now,
      }, {merge: true});
    }
    t.set(fulfillmentRef, {
      playerId: request.auth.uid,
      playerName:
          typeof u.playerName === 'string' && u.playerName.trim() ?
            u.playerName.trim() :
            playerEmail.split('@')[0],
      itemId,
      itemTitle: qm.title,
      cost,
      type: 'digital',
      status: 'pending',
      requestedAt: now,
    });
    return {alreadyOwned, fulfillmentId: fulfillmentRef.id};
  });

  return {ok: true, cosmeticId: itemId, ...txResult};
});

/**
 * @param {string} setId
 * @param {string[]} ownedCardIds
 * @return {boolean}
 */
function isAlbumSetCompleteOnServer(setId, ownedCardIds) {
  const cards = getSeasonOneCardsForSet(setId);
  if (!cards.length) return false;
  const owned = new Set(ownedCardIds.map(String));
  return cards.every((c) => owned.has(c.id));
}

/**
 * Player-initiated set bonus grant after full folder ownership.
 * Input: { setId }
 */
exports.grantAlbumSetBonus = onCall({region: REGION}, async (request) => {
  const playerEmail = assertPlayer(request);
  const data = request.data || {};
  const setId = typeof data.setId === 'string' ? data.setId.trim() : '';

  if (!setId || !Object.prototype.hasOwnProperty.call(ALBUM_SET_BONUS_REWARDS, setId)) {
    throw new HttpsError('invalid-argument', 'Valid setId is required.');
  }

  const reward = ALBUM_SET_BONUS_REWARDS[setId];
  const allowlist = loadCosmeticAllowlist();
  assertCosmeticAllowed(reward.bannerCosmeticId, allowlist);

  const userRef = db().collection('users').doc(playerEmail);
  const uSnap = await userRef.get();
  if (!uSnap.exists) {
    throw new HttpsError('not-found', 'Player profile not found.');
  }

  const u = uSnap.data() || {};
  const ownedCards = Array.isArray(u.ownedSeasonOneCards) ?
    u.ownedSeasonOneCards.map(String) :
    [];

  if (!isAlbumSetCompleteOnServer(setId, ownedCards)) {
    throw new HttpsError(
        'failed-precondition',
        'Album set is not complete.',
    );
  }

  const result = await grantCosmeticToPlayer(
      playerEmail,
      reward.bannerCosmeticId,
      'album_set_complete',
      playerEmail,
      setId,
  );

  return {ok: true, setId, cosmeticId: reward.bannerCosmeticId, ...result};
});

/**
 * @param {string} role
 * @param {string} playerEmail
 * @param {string} actorEmail
 * @return {boolean}
 */
function isLoadoutSelfGrantDenied(role, playerEmail, actorEmail) {
  return role === 'player' || !playerEmail || playerEmail === actorEmail;
}

exports._test = {
  loadCosmeticAllowlist,
  assertCosmeticAllowed,
  isLoadoutSelfGrantDenied,
  QM_DIGITAL_LOADOUT,
  ALBUM_SET_BONUS_REWARDS,
  isAlbumSetCompleteOnServer,
};
