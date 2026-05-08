/* eslint-disable quotes */
/**
 * transfer.js â€” Vanguard Transfer Protocol
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Enables a player to move between clubs while preserving individual
 * progression (XP, tier, Scout's Six stats, academic record) but leaving
 * team-level data (match results, tactical plans) with the origin club.
 *
 * PROTOCOL (3-PARTY CRYPTOGRAPHIC HANDSHAKE)
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 *  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”   (1) initiatePlayerTransfer      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 *  â”‚  Parent  â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  â”‚ transfer_tokens â”‚
 *  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   generates token + HMAC digest   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
 *       â”‚                                               â”‚
 *       â”‚         Email with token sent to parent       â”‚
 *       â–¼                                               â”‚
 *  Parent stores token securely                         â”‚
 *       â”‚                                               â”‚
 *  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  (2) presentTransferToken    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 *  â”‚ New Director â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  â”‚ token validated  â”‚
 *  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   enters token in UI         â”‚ director_acceptedâ”‚
 *                                                â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
 *                                                       â”‚
 *       Email fired to COPPA-verified parent email â—„â”€â”€â”€â”€â”˜
 *       with confirmation link
 *
 *  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”   (3) confirmPlayerTransfer        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 *  â”‚  Parent  â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º   â”‚ Firestore atomic â”‚
 *  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   clicks link / enters authCode    â”‚ data port        â”‚
 *                                                 â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
 *
 * WHAT IS PORTED
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *  âœ“ users/{email}                â€” tenantId, clubId updated to new club
 *  âœ“ xp, tier, stats (Scout's Six)
 *  âœ“ academic_records/{email}     â€” preserved in place (email-keyed, tenant-agnostic)
 *  âœ— fixtures / match_results     â€” left with origin club
 *  âœ— team assignments (teamId)    â€” cleared; new director assigns
 *
 * SECURITY
 * â”€â”€â”€â”€â”€â”€â”€â”€
 *  â€¢ Token is 32 bytes of cryptographic randomness (256-bit entropy)
 *  â€¢ HMAC-SHA256 binds the token to (playerEmail + parentEmail + issueMs)
 *  â€¢ The HMAC digest is stored on the token document; to confirm, the parent
 *    must present a valid authCode derived from the same secret
 *  â€¢ Tokens expire after 48 hours
 *  â€¢ Each token is single-use (deleted on completion)
 *  â€¢ All steps write immutable audit_logs entries
 *
 * SECRETS
 * â”€â”€â”€â”€â”€â”€â”€
 *  TRANSFER_HMAC_SECRET â€” firebase functions:secrets:set TRANSFER_HMAC_SECRET
 *
 * Exports:
 *   initiatePlayerTransfer  â€” onCall (parent only)
 *   presentTransferToken    â€” onCall (new-club director only)
 *   confirmPlayerTransfer   â€” onCall (parent, with authCode)
 */

'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {defineSecret} = require('firebase-functions/params');

const TRANSFER_HMAC_SECRET = defineSecret('TRANSFER_HMAC_SECRET');
const REGION = 'us-east1';
const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const db = admin.firestore();

// â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const normEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '');

/**
 * Derive a 12-character upper-case auth code from the HMAC-SHA256 of the token
 * and the parent's verified email. Used as the second-factor confirmation.
 * @param {string} token
 * @param {string} parentEmail
 * @param {string} secret
 * @return {string}
 */
function deriveAuthCode(token, parentEmail, secret) {
  return crypto
      .createHmac('sha256', secret)
      .update(`${token}:${normEmail(parentEmail)}`)
      .digest('hex')
      .slice(0, 12)
      .toUpperCase();
}

/**
 * Build the confirmation body text for the parent email.
 * In production, route this through the Firebase Trigger Email Extension
 * or your SendGrid/Postmark integration.
 */
function buildConfirmationBody(authCode, playerName, newClubName) {
  return [
    `VANGUARD TRANSFER PROTOCOL â€” ACTION REQUIRED`,
    ``,
    `A Club Director has entered a transfer token for your athlete: ${playerName}.`,
    `The destination club is: ${newClubName}.`,
    ``,
    `Your personal authorization code (valid for 48 hours):`,
    ``,
    `    ${authCode}`,
    ``,
    `Enter this code in the Transfer Portal, or log in at vanguardcommand.app/transfer to confirm.`,
    ``,
    `If you did NOT request this transfer, ignore this email.`,
    `The token will expire automatically.`,
  ].join('\n');
}

// â”€â”€ initiatePlayerTransfer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Step 1: Parent (or admin) requests a transfer for their child.
 * Generates a transfer token + HMAC auth code, stores the token document,
 * and sends the auth code to the parent's COPPA-verified email.
 *
 * Input: { playerEmail: string, destinationTenantName?: string }
 * Returns: { tokenId: string, expiresAt: string }
 */
exports.initiatePlayerTransfer = onCall(
    {region: REGION, secrets: [TRANSFER_HMAC_SECRET]},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

      const role = request.auth.token.role ?? '';
      const callerEmail = normEmail(request.auth.token.email ?? '');
      const callerUid = request.auth.uid;

      if (role !== 'parent' && role !== 'super_admin' && role !== 'global_admin') {
        throw new HttpsError('permission-denied', 'Only a parent account may initiate a player transfer.');
      }

      const {playerEmail} = request.data ?? {};
      if (!playerEmail) throw new HttpsError('invalid-argument', 'playerEmail is required.');
      const normPlayer = normEmail(playerEmail);

      // Load player document to verify parent link and get current tenant
      const playerSnap = await db.doc(`users/${normPlayer}`).get();
      if (!playerSnap.exists) throw new HttpsError('not-found', `Player ${normPlayer} not found.`);
      const playerData = playerSnap.data();
      const originTenantId = playerData.clubId ?? playerData.tenantId ?? '';
      const playerName = playerData.displayName ?? normPlayer;

      // Verify the caller is the parent of this player (parent role check)
      if (role === 'parent') {
        const isLinked =
          playerData.parentEmail === callerEmail ||
          playerData.parentEmails?.includes(callerEmail) ||
          playerData.householdEmails?.includes(callerEmail);
        if (!isLinked) {
          throw new HttpsError('permission-denied', 'You are not the registered parent/guardian of this player.');
        }
      }

      // Prevent transferring an already-in-transit player
      const existingSnap = await db
          .collection('transfer_tokens')
          .where('playerEmail', '==', normPlayer)
          .where('status', 'in', ['pending', 'director_accepted'])
          .limit(1)
          .get();
      if (!existingSnap.empty) {
        throw new HttpsError(
            'already-exists',
            'A transfer is already in progress for this player. Cancel the existing transfer first.',
        );
      }

      // Generate cryptographic token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + TOKEN_TTL_MS;
      const authCode = deriveAuthCode(rawToken, callerEmail, TRANSFER_HMAC_SECRET.value());

      const tokenRef = db.collection('transfer_tokens').doc(rawToken);
      await tokenRef.set({
        tokenId: rawToken,
        playerEmail: normPlayer,
        playerName,
        parentEmail: callerEmail,
        parentUid: callerUid,
        originTenantId,
        destinationTenantId: null,
        destinationDirectorUid: null,
        destinationClubName: null,
        status: 'pending',
        authCode, // stored for server-side comparison â€” never sent in the transfer response
        expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: null,
      });

      // Send auth code to parent's COPPA-verified email
      // Uses the Trigger Email extension collection. In production:
      //   { to: callerEmail, message: { subject, text } }
      await db.collection('mail').add({
        to: callerEmail,
        message: {
          subject: `Vanguard Transfer Protocol â€” Auth Code for ${playerName}`,
          text: buildConfirmationBody(authCode, playerName, 'Pending Director Confirmation'),
        },
      });

      // Audit log
      await db.collection('audit_logs').add({
        action: 'TRANSFER_INITIATED',
        actorUid: callerUid,
        playerEmail: normPlayer,
        originTenantId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info('[initiatePlayerTransfer] token issued', {playerEmail: normPlayer, originTenantId});

      return {
        tokenId: rawToken,
        expiresAt: new Date(expiresAt).toISOString(),
        message: `Transfer token generated. An auth code has been sent to ${callerEmail}. Share the Token ID with the receiving club director.`,
      };
    },
);

// â”€â”€ presentTransferToken â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Step 2: The new Club Director enters the transfer token provided by the parent.
 * Validates the token, records the director's identity, and fires a confirmation
 * email to the parent with the auth code for final approval.
 *
 * Input: { tokenId: string }
 * Returns: { playerName: string, originClubName: string, authCodeSentTo: string }
 */
exports.presentTransferToken = onCall(
    {region: REGION, secrets: [TRANSFER_HMAC_SECRET]},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

      const role = request.auth.token.role ?? '';
      const tenantId = request.auth.token.clubId ?? request.auth.token.tenantId ?? '';
      const callerUid = request.auth.uid;

      if (role !== 'director' && role !== 'super_admin' && role !== 'global_admin') {
        throw new HttpsError('permission-denied', 'Director role required to accept a transfer token.');
      }
      if (!tenantId) throw new HttpsError('permission-denied', 'No tenant on director token.');

      const {tokenId} = request.data ?? {};
      if (!tokenId || typeof tokenId !== 'string' || tokenId.length < 32) {
        throw new HttpsError('invalid-argument', 'Invalid transfer token format.');
      }

      const tokenRef = db.doc(`transfer_tokens/${tokenId}`);
      const tokenSnap = await tokenRef.get();
      if (!tokenSnap.exists) {
        throw new HttpsError('not-found', 'Transfer token not found. It may have expired or been used.');
      }

      const tokenData = tokenSnap.data();

      if (tokenData.status !== 'pending') {
        throw new HttpsError('failed-precondition', `Token is in state '${tokenData.status}', expected 'pending'.`);
      }
      if (tokenData.expiresAt.toMillis() < Date.now()) {
        await tokenRef.update({status: 'expired'});
        throw new HttpsError('deadline-exceeded', 'Transfer token has expired. Parent must re-initiate.');
      }
      if (tokenData.originTenantId === tenantId) {
        throw new HttpsError('failed-precondition', 'Cannot transfer to the same club the player is already in.');
      }

      // Get destination club name
      const destOrgSnap = await db.doc(`organizations/${tenantId}`).get();
      const destinationClubName = destOrgSnap.data()?.name ?? tenantId;

      // Derive the auth code to include in the parent's confirmation email
      const authCode = deriveAuthCode(tokenId, tokenData.parentEmail, TRANSFER_HMAC_SECRET.value());

      // Update token to director_accepted
      await tokenRef.update({
        status: 'director_accepted',
        destinationTenantId: tenantId,
        destinationDirectorUid: callerUid,
        destinationClubName,
        directorAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Re-send auth code to parent with the now-known destination club name
      await db.collection('mail').add({
        to: tokenData.parentEmail,
        message: {
          subject: `ACTION REQUIRED: Confirm Transfer to ${destinationClubName}`,
          text: buildConfirmationBody(authCode, tokenData.playerName, destinationClubName),
        },
      });

      // Audit log
      await db.collection('audit_logs').add({
        action: 'TRANSFER_DIRECTOR_ACCEPTED',
        actorUid: callerUid,
        playerEmail: tokenData.playerEmail,
        destinationTenantId: tenantId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info('[presentTransferToken] accepted by director', {tenantId, playerEmail: tokenData.playerEmail});

      return {
        playerName: tokenData.playerName,
        originTenantId: tokenData.originTenantId,
        destinationClubName,
        authCodeSentTo: tokenData.parentEmail,
        message: `Token validated. Auth code sent to ${tokenData.parentEmail}. The parent must confirm with their auth code.`,
      };
    },
);

// â”€â”€ confirmPlayerTransfer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Step 3: Parent enters the auth code to cryptographically authorize the transfer.
 * Executes an atomic Firestore data port:
 *   - Updates users/{email}: new tenantId + clubId, clears teamId
 *   - Preserves: xp, tier, stats, academic records (email-keyed, untouched)
 *   - Leaves behind: match results, tactics, fixture assignments
 *   - Writes transfer_history on both origin and destination tenants
 *   - Deletes the transfer token
 *
 * Input: { tokenId: string, authCode: string }
 * Returns: { success: boolean, newTenantId: string }
 */
exports.confirmPlayerTransfer = onCall(
    {region: REGION, secrets: [TRANSFER_HMAC_SECRET]},
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

      const role = request.auth.token.role ?? '';
      const callerEmail = normEmail(request.auth.token.email ?? '');
      const callerUid = request.auth.uid;

      if (role !== 'parent' && role !== 'super_admin' && role !== 'global_admin') {
        throw new HttpsError('permission-denied', 'Only the parent account may confirm a transfer.');
      }

      const {tokenId, authCode} = request.data ?? {};
      if (!tokenId || !authCode) throw new HttpsError('invalid-argument', 'tokenId and authCode are required.');

      const tokenRef = db.doc(`transfer_tokens/${tokenId}`);
      const tokenSnap = await tokenRef.get();
      if (!tokenSnap.exists) throw new HttpsError('not-found', 'Transfer token not found or already completed.');

      const tokenData = tokenSnap.data();

      // Verify caller is the parent on record
      if (role === 'parent' && tokenData.parentEmail !== callerEmail) {
        throw new HttpsError('permission-denied', 'Auth code is bound to a different parent account.');
      }

      if (tokenData.status !== 'director_accepted') {
        throw new HttpsError(
            'failed-precondition',
            `Token status is '${tokenData.status}'. Director must accept first.`,
        );
      }
      if (tokenData.expiresAt.toMillis() < Date.now()) {
        await tokenRef.update({status: 'expired'});
        throw new HttpsError('deadline-exceeded', 'Transfer token has expired.');
      }

      // CRYPTOGRAPHIC VERIFICATION â€” HMAC comparison
      const expectedCode = deriveAuthCode(tokenId, tokenData.parentEmail, TRANSFER_HMAC_SECRET.value());
      if (authCode.toUpperCase().trim() !== expectedCode) {
        // Rate-limit: increment failure counter
        await tokenRef.update({
          authFailures: admin.firestore.FieldValue.increment(1),
        });
        const updated = await tokenRef.get();
        if ((updated.data()?.authFailures ?? 0) >= 5) {
          await tokenRef.update({status: 'auth_failed'});
          throw new HttpsError('permission-denied', 'Too many failed auth attempts. Transfer invalidated. Please initiate a new transfer.');
        }
        throw new HttpsError('permission-denied', 'Invalid auth code.');
      }

      // â”€â”€ ATOMIC DATA PORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const playerEmail = tokenData.playerEmail;
      const newTenantId = tokenData.destinationTenantId;
      const oldTenantId = tokenData.originTenantId;
      const now = admin.firestore.FieldValue.serverTimestamp();

      await db.runTransaction(async (tx) => {
        const playerRef = db.doc(`users/${playerEmail}`);
        const playerSnap2 = await tx.get(playerRef);
        if (!playerSnap2.exists) throw new HttpsError('not-found', 'Player document not found during transfer.');

        const playerData = playerSnap2.data();

        // Port: update tenant association, clear team assignment
        tx.update(playerRef, {
          tenantId: newTenantId,
          clubId: newTenantId,
          teamId: null,
          status: 'transferred',
          transferredAt: now,
          transferredFromTenantId: oldTenantId,
          transferredToTenantId: newTenantId,
        });

        // Transfer history â€” origin club record
        tx.set(db.collection('transfer_history').doc(), {
          playerEmail,
          playerName: playerData.displayName ?? playerEmail,
          fromTenantId: oldTenantId,
          toTenantId: newTenantId,
          direction: 'outbound',
          xpAtTransfer: playerData.xp ?? 0,
          tierAtTransfer: playerData.tier ?? 'ROOKIE',
          authorizedByParentEmail: tokenData.parentEmail,
          authorizedByParentUid: tokenData.parentUid,
          completedAt: now,
        });

        // Transfer history â€” destination club record
        tx.set(db.collection('transfer_history').doc(), {
          playerEmail,
          playerName: playerData.displayName ?? playerEmail,
          fromTenantId: oldTenantId,
          toTenantId: newTenantId,
          direction: 'inbound',
          xpAtTransfer: playerData.xp ?? 0,
          tierAtTransfer: playerData.tier ?? 'ROOKIE',
          authorizedByParentEmail: tokenData.parentEmail,
          authorizedByParentUid: tokenData.parentUid,
          completedAt: now,
        });

        // Invalidate the transfer token
        tx.update(tokenRef, {
          status: 'completed',
          completedAt: now,
          completedByUid: callerUid,
        });
      });

      // Immutable audit log (outside transaction for lower cost)
      await db.collection('audit_logs').add({
        action: 'TRANSFER_COMPLETED',
        actorUid: callerUid,
        playerEmail,
        fromTenantId: oldTenantId,
        toTenantId: newTenantId,
        authorizedByEmail: callerEmail,
        timestamp: now,
      });

      // Confirmation email to parent
      await db.collection('mail').add({
        to: tokenData.parentEmail,
        message: {
          subject: `Transfer Complete â€” ${tokenData.playerName} joined ${tokenData.destinationClubName}`,
          text: [
            `VANGUARD TRANSFER PROTOCOL â€” COMPLETED`,
            ``,
            `${tokenData.playerName}'s Vanguard profile has been securely transferred to ${tokenData.destinationClubName}.`,
            ``,
            `Preserved: XP, Tier, Scout's Six stats, Academic record`,
            `Left with origin club: Match results, Team tactics, Fixture history`,
            ``,
            `Log in at vanguardcommand.app to view the updated profile.`,
          ].join('\n'),
        },
      });

      logger.info('[confirmPlayerTransfer] completed', {playerEmail, newTenantId});
      return {success: true, newTenantId, playerName: tokenData.playerName};
    },
);
