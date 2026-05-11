/* eslint-disable quotes */
'use strict';

const admin = require('firebase-admin');
const {onCall, HttpsError} = require('firebase-functions/v2/https');

/**
 * Base sport attribute configurations seeded into `sports_configs`.
 * Lazy-Migration safe: uses { merge: true } — never drops legacy keys.
 */
const BASE_SPORTS_CONFIGS = [
  {
    sportId: 'soccer',
    displayName: 'Vanguard Soccer',
    schemaVersion: 1,
    attributes: [
      {id: 'ball_mastery', name: 'Ball Mastery',         hexColor: '#00f0ff'},
      {id: 'striking',     name: 'Striking & Finishing', hexColor: '#ff0055'},
      {id: 'pace',         name: 'Pace & Agility',       hexColor: '#00ff66'},
      {id: 'scanning',     name: 'Vision & Scanning',    hexColor: '#ffcc00'},
      {id: 'grit',         name: 'Crucible Grit',        hexColor: '#9d00ff'},
    ],
  },
  {
    sportId: 'basketball',
    displayName: 'Vanguard Basketball',
    schemaVersion: 1,
    attributes: [
      {id: 'ball_handling', name: 'Ball Handling',   hexColor: '#00f0ff'},
      {id: 'shooting',      name: 'Shooting Range',  hexColor: '#ff0055'},
      {id: 'athleticism',   name: 'Athleticism',     hexColor: '#00ff66'},
      {id: 'court_vision',  name: 'Court Vision',    hexColor: '#ffcc00'},
      {id: 'grit',          name: 'Crucible Grit',   hexColor: '#9d00ff'},
    ],
  },
  {
    sportId: 'lacrosse',
    displayName: 'Vanguard Lacrosse',
    schemaVersion: 1,
    attributes: [
      {id: 'stick_skills',  name: 'Stick Skills',    hexColor: '#00f0ff'},
      {id: 'shooting',      name: 'Shooting Power',  hexColor: '#ff0055'},
      {id: 'speed',         name: 'Speed & Agility', hexColor: '#00ff66'},
      {id: 'field_vision',  name: 'Field Vision',    hexColor: '#ffcc00'},
      {id: 'grit',          name: 'Crucible Grit',   hexColor: '#9d00ff'},
    ],
  },
];

/**
 * Admin callable: `seedBaseSportsConfigs`
 * Writes / merges sport config documents into `sports_configs/{sportId}`.
 * Role-gated: caller must hold the `admin` custom claim.
 */
exports.seedBaseSportsConfigs = onCall(async (request) => {
  const role = request.auth?.token?.role;
  if (role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin role required.');
  }

  const db = admin.firestore();
  const batch = db.batch();

  for (const config of BASE_SPORTS_CONFIGS) {
    const ref = db.collection('sports_configs').doc(config.sportId);
    // Read-Repair: merge preserves any undocumented legacy keys
    batch.set(ref, {
      ...config,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
  }

  await batch.commit();
  return {seeded: BASE_SPORTS_CONFIGS.map((c) => c.sportId)};
});
