/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

const REGION = 'us-east1';
const db = () => admin.firestore();

/**
 * Ensures user is authenticated and is a director/admin of the club.
 */
async function verifyTenantAccess(uid, clubId) {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }
  const userDoc = await db().collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('permission-denied', 'User record not found.');
  }
  const userData = userDoc.data();
  if (userData.clubId !== clubId) {
    throw new HttpsError('permission-denied', 'Cross-tenant access denied.');
  }
  if (!['director', 'global_admin', 'super_admin'].includes(userData.role)) {
    throw new HttpsError('permission-denied', 'Insufficient role permissions.');
  }
}

exports.extractTenantData = onCall(
  {
    enforceAppCheck: false,
    region: REGION,
  },
  async (request) => {
    const {clubId, collectionType, format} = request.data;
    const uid = request.auth && request.auth.uid;

    if (!clubId || !collectionType || !format) {
      throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    await verifyTenantAccess(uid, clubId);

    const validCollections = ['users', 'rosters'];
    if (!validCollections.includes(collectionType)) {
      throw new HttpsError('invalid-argument', 'Invalid collection requested.');
    }

    let targetCollection = collectionType;
    if (collectionType === 'users') {
      targetCollection = 'users';
    } else if (collectionType === 'rosters') {
      targetCollection = 'users'; 
    }

    // Cursor pagination extracting data securely on server
    const batchLimit = 500;
    let lastDoc = null;
    let allRecords = [];
    let hasMore = true;

    while (hasMore) {
      let query = db()
        .collection(targetCollection)
        .where('clubId', '==', clubId)
        .limit(batchLimit);
      
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snap = await query.get();
      if (snap.empty) {
        hasMore = false;
        break;
      }

      for (const doc of snap.docs) {
        const data = doc.data();
        allRecords.push({
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          role: data.role || '',
        });
      }

      if (snap.size < batchLimit) {
        hasMore = false;
      } else {
        lastDoc = snap.docs[snap.docs.length - 1];
      }
    }

    if (format === 'json') {
      return { data: allRecords };
    } else if (format === 'csv') {
      if (allRecords.length === 0) return { data: '' };
      const headers = Object.keys(allRecords[0]);
      const csvRows = [headers.join(',')];
      for (const record of allRecords) {
        const row = headers.map(header => {
          let val = record[header] || '';
          if (typeof val === 'string' && val.includes(',')) {
            val = `"${val}"`;
          }
          return val;
        });
        csvRows.push(row.join(','));
      }
      return { data: csvRows.join('\n') };
    } else {
      throw new HttpsError('invalid-argument', 'Invalid format requested.');
    }
  }
);

exports.vampireIngestRows = onCall(
  {
    enforceAppCheck: false,
    region: REGION,
  },
  async (request) => {
    const {clubId, rows} = request.data;
    const uid = request.auth && request.auth.uid;

    if (!clubId || !Array.isArray(rows)) {
      throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    await verifyTenantAccess(uid, clubId);

    if (rows.length === 0) return { ingested: 0 };

    let totalOps = 0;
    let currentBatch = db().batch();
    let batchCount = 0;
    const BATCH_LIMIT = 500;
    
    // We strictly cap batches at 500 operations
    for (const row of rows) {
      if (!row.firstName || !row.lastName) {
        continue;
      }

      const docRef = db().collection('users').doc();
      currentBatch.set(docRef, {
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email || null,
        role: row.role || 'player',
        clubId: clubId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        vampireIngested: true
      });
      totalOps++;
      batchCount++;

      if (batchCount === BATCH_LIMIT) {
        await currentBatch.commit();
        currentBatch = db().batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await currentBatch.commit();
    }

    logger.info(`Vampire Ingest completed for club ${clubId}. Total rows: ${totalOps}`);
    return { ingested: totalOps };
  }
);
