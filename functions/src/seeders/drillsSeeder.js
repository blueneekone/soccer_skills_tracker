/* eslint-disable quotes */
'use strict';

const admin = require('firebase-admin');
const {onCall, HttpsError} = require('firebase-functions/v2/https');

/**
 * @typedef {{
 *   id: string,
 *   sportId: string,
 *   attributeId: string,
 *   title: string,
 *   tier: 'beginner'|'intermediate'|'advanced',
 *   mediaType: 'youtube_short'|'tactical_svg',
 *   mediaPayload: string,
 *   gamification: { baseXp: number, gritBonus: number },
 *   eqTriggers: { maxFrustration: 'low'|'medium'|'high' }
 * }} DrillDoc
 */

/** @type {DrillDoc[]} */
const BASE_DRILLS = [
  {
    id: 'soccer_bm_sole_taps_beginner',
    sportId: 'soccer',
    attributeId: 'ball_mastery',
    title: 'Sole Taps: Foundation Touch',
    tier: 'beginner',
    mediaType: 'tactical_svg',
    mediaPayload: 'svg_sole_taps',
    gamification: {baseXp: 25, gritBonus: 10},
    eqTriggers: {maxFrustration: 'high'},
  },
  {
    id: 'soccer_bm_inside_outside_beginner',
    sportId: 'soccer',
    attributeId: 'ball_mastery',
    title: 'Inside/Outside Cut: Lateral Control',
    tier: 'beginner',
    mediaType: 'tactical_svg',
    mediaPayload: 'svg_inside_outside_cut',
    gamification: {baseXp: 30, gritBonus: 10},
    eqTriggers: {maxFrustration: 'high'},
  },
  {
    id: 'soccer_striking_volleys_beginner',
    sportId: 'soccer',
    attributeId: 'striking',
    title: 'Standing Volleys: Contact Basics',
    tier: 'beginner',
    mediaType: 'youtube_short',
    mediaPayload: 'dQw4w9WgXcQ',
    gamification: {baseXp: 35, gritBonus: 15},
    eqTriggers: {maxFrustration: 'medium'},
  },
  {
    id: 'soccer_pace_ladder_beginner',
    sportId: 'soccer',
    attributeId: 'pace',
    title: 'Speed Ladder: 2-In 2-Out',
    tier: 'beginner',
    mediaType: 'tactical_svg',
    mediaPayload: 'svg_speed_ladder',
    gamification: {baseXp: 30, gritBonus: 10},
    eqTriggers: {maxFrustration: 'high'},
  },
  {
    id: 'soccer_scanning_shoulder_check_beginner',
    sportId: 'soccer',
    attributeId: 'scanning',
    title: 'Shoulder Check Protocol: Pre-Touch Scan',
    tier: 'beginner',
    mediaType: 'tactical_svg',
    mediaPayload: 'svg_shoulder_check',
    gamification: {baseXp: 20, gritBonus: 10},
    eqTriggers: {maxFrustration: 'high'},
  },
];

/**
 * Admin callable: `seedGlobalDrills`
 * Writes drill metadata to `global_drills/{drill.id}`.
 * Zero video storage — references YouTube Short IDs or SVG payload keys only.
 * Lazy-Migration: { merge: true } — never drops existing coach annotations.
 */
exports.seedGlobalDrills = onCall(async (request) => {
  const role = request.auth?.token?.role;
  if (role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin role required.');
  }

  const db = admin.firestore();
  const batch = db.batch();

  for (const drill of BASE_DRILLS) {
    const ref = db.collection('global_drills').doc(drill.id);
    batch.set(ref, {
      ...drill,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
  }

  await batch.commit();
  return {seeded: BASE_DRILLS.map((d) => d.id)};
});
