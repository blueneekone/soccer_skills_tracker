/* eslint-disable quotes */
'use strict';

const admin = require('firebase-admin');
const {onCall, HttpsError} = require('firebase-functions/v2/https');

/**
 * Canonical 6-attribute sport configs for all 8 known sports.
 *
 * Shape per entry (mirrors SportsConfigDoc in src/lib/types/sportsConfig.ts):
 *   sportId         — stable snake_case document ID
 *   displayName     — human-readable platform name
 *   schemaVersion   — starts at 1; auto-bumped by upsertSportsConfig on structural change
 *   status          — 'active' | 'archived' | 'draft'
 *   attributes[6]   — id, name, shortLabel, hexColor, playerStatKey
 *   palette         — fg, glow, ring (mirrors SPORT_ACCENT in sport-icon.js)
 *   iconClass       — Phosphor icon suffix (mirrors SPORT_ICON_SUFFIX in sport-icon.js)
 *   aliases         — legacy normalisation strings (mirrors normalizeClubSport branches)
 *   rpgProjection   — priority-ordered playerStatKey lists for the 5-vertex RPG radar
 *
 * Lazy-migration safe: seedBaseSportsConfigs uses { merge: true } — never drops
 * legacy keys added by the admin CRUD UI.
 */
const BASE_SPORTS_CONFIGS = [
  // ── Soccer ──────────────────────────────────────────────────────────────────
  {
    sportId: 'soccer',
    displayName: 'Vanguard Soccer',
    schemaVersion: 1,
    status: 'active',
    attributes: [
      {
        id: 'pace',
        name: 'Pace & Agility',
        shortLabel: 'PAC',
        hexColor: '#00ff66',
        playerStatKey: 'pace',
      },
      {
        id: 'shooting',
        name: 'Shooting',
        shortLabel: 'SHO',
        hexColor: '#ff0055',
        playerStatKey: 'shooting',
      },
      {
        id: 'passing',
        name: 'Passing',
        shortLabel: 'PAS',
        hexColor: '#ffcc00',
        playerStatKey: 'passing',
      },
      {
        id: 'dribbling',
        name: 'Dribbling',
        shortLabel: 'DRI',
        hexColor: '#00f0ff',
        playerStatKey: 'dribbling',
      },
      {
        id: 'defending',
        name: 'Defending',
        shortLabel: 'DEF',
        hexColor: '#9d00ff',
        playerStatKey: 'defending',
      },
      {
        id: 'physical',
        name: 'Physical',
        shortLabel: 'PHY',
        hexColor: '#ff6600',
        playerStatKey: 'physical',
      },
    ],
    palette: {
      fg: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.22)',
      ring: 'rgba(34, 197, 94, 0.45)',
    },
    iconClass: 'ph-soccer-ball',
    aliases: ['soccer', 'futbol', 'vanguard soccer', 'association football'],
    rpgProjection: {
      ball_mastery: ['dribbling', 'ball_mastery', 'passing'],
      striking: ['shooting', 'striking'],
      pace: ['pace', 'speed', 'athletics'],
      scanning: ['passing', 'scanning', 'vision'],
      grit: ['physical', 'grit', 'defending'],
    },
  },

  // ── Basketball ───────────────────────────────────────────────────────────────
  {
    sportId: 'basketball',
    displayName: 'Vanguard Basketball',
    schemaVersion: 1,
    status: 'active',
    attributes: [
      {
        id: 'shooting',
        name: 'Shooting Range',
        shortLabel: 'SHO',
        hexColor: '#ff0055',
        playerStatKey: 'shooting',
      },
      {
        id: 'playmaking',
        name: 'Playmaking',
        shortLabel: 'PLY',
        hexColor: '#ffcc00',
        playerStatKey: 'playmaking',
      },
      {
        id: 'rebounding',
        name: 'Rebounding',
        shortLabel: 'REB',
        hexColor: '#9d00ff',
        playerStatKey: 'rebounding',
      },
      {
        id: 'defense',
        name: 'Defense',
        shortLabel: 'DEF',
        hexColor: '#00f0ff',
        playerStatKey: 'defense',
      },
      {
        id: 'athletics',
        name: 'Athleticism',
        shortLabel: 'ATH',
        hexColor: '#00ff66',
        playerStatKey: 'athletics',
      },
      {
        id: 'finishing',
        name: 'Finishing',
        shortLabel: 'FIN',
        hexColor: '#ff6600',
        playerStatKey: 'finishing',
      },
    ],
    palette: {
      fg: '#fb923c',
      glow: 'rgba(251, 146, 60, 0.22)',
      ring: 'rgba(251, 146, 60, 0.45)',
    },
    iconClass: 'ph-basketball',
    aliases: ['basketball', 'hoops', 'ball', 'vanguard basketball'],
    rpgProjection: {
      ball_mastery: ['playmaking', 'ball_handling', 'dribbling'],
      striking: ['shooting', 'finishing'],
      pace: ['athletics', 'speed', 'pace'],
      scanning: ['playmaking', 'vision', 'court_vision'],
      grit: ['defense', 'rebounding', 'grit'],
    },
  },

  // ── Baseball ─────────────────────────────────────────────────────────────────
  {
    sportId: 'baseball',
    displayName: 'Vanguard Baseball',
    schemaVersion: 1,
    status: 'active',
    attributes: [
      {
        id: 'hitting',
        name: 'Hitting',
        shortLabel: 'HIT',
        hexColor: '#ff0055',
        playerStatKey: 'hitting',
      },
      {
        id: 'power',
        name: 'Power',
        shortLabel: 'PWR',
        hexColor: '#9d00ff',
        playerStatKey: 'power',
      },
      {
        id: 'fielding',
        name: 'Fielding',
        shortLabel: 'FLD',
        hexColor: '#00f0ff',
        playerStatKey: 'fielding',
      },
      {
        id: 'arm',
        name: 'Arm Strength',
        shortLabel: 'ARM',
        hexColor: '#ff6600',
        playerStatKey: 'arm',
      },
      {
        id: 'speed',
        name: 'Speed',
        shortLabel: 'SPD',
        hexColor: '#00ff66',
        playerStatKey: 'speed',
      },
      {
        id: 'vision',
        name: 'Plate Vision',
        shortLabel: 'VIS',
        hexColor: '#ffcc00',
        playerStatKey: 'vision',
      },
    ],
    palette: {
      fg: '#60a5fa',
      glow: 'rgba(96, 165, 250, 0.22)',
      ring: 'rgba(96, 165, 250, 0.45)',
    },
    iconClass: 'ph-baseball',
    aliases: ['baseball', 'softball', 'vanguard baseball'],
    rpgProjection: {
      ball_mastery: ['hitting', 'fielding'],
      striking: ['power', 'arm'],
      pace: ['speed', 'pace', 'athletics'],
      scanning: ['vision', 'scanning', 'awareness'],
      grit: ['fielding', 'defense', 'grit'],
    },
  },

  // ── Football ─────────────────────────────────────────────────────────────────
  {
    sportId: 'football',
    displayName: 'Vanguard Football',
    schemaVersion: 1,
    status: 'active',
    attributes: [
      {
        id: 'speed',
        name: 'Speed',
        shortLabel: 'SPD',
        hexColor: '#00ff66',
        playerStatKey: 'speed',
      },
      {
        id: 'strength',
        name: 'Strength',
        shortLabel: 'STR',
        hexColor: '#ff6600',
        playerStatKey: 'strength',
      },
      {
        id: 'agility',
        name: 'Agility',
        shortLabel: 'AGI',
        hexColor: '#00f0ff',
        playerStatKey: 'agility',
      },
      {
        id: 'awareness',
        name: 'Awareness',
        shortLabel: 'AWR',
        hexColor: '#ffcc00',
        playerStatKey: 'awareness',
      },
      {
        id: 'tackling',
        name: 'Tackling',
        shortLabel: 'TAC',
        hexColor: '#9d00ff',
        playerStatKey: 'tackling',
      },
      {
        id: 'catching',
        name: 'Catching',
        shortLabel: 'CAT',
        hexColor: '#ff0055',
        playerStatKey: 'catching',
      },
    ],
    palette: {
      fg: '#a78bfa',
      glow: 'rgba(167, 139, 250, 0.22)',
      ring: 'rgba(167, 139, 250, 0.45)',
    },
    iconClass: 'ph-football',
    aliases: ['football', 'american football', 'gridiron', 'vanguard football'],
    rpgProjection: {
      ball_mastery: ['catching', 'ball_handling', 'dribbling'],
      striking: ['strength', 'power'],
      pace: ['speed', 'agility', 'pace'],
      scanning: ['awareness', 'vision', 'scanning'],
      grit: ['tackling', 'defense', 'grit'],
    },
  },

  // ── Volleyball ───────────────────────────────────────────────────────────────
  {
    sportId: 'volleyball',
    displayName: 'Vanguard Volleyball',
    schemaVersion: 1,
    status: 'active',
    attributes: [
      {
        id: 'serving',
        name: 'Serving',
        shortLabel: 'SRV',
        hexColor: '#ffcc00',
        playerStatKey: 'serving',
      },
      {
        id: 'spiking',
        name: 'Spiking',
        shortLabel: 'SPK',
        hexColor: '#ff0055',
        playerStatKey: 'spiking',
      },
      {
        id: 'blocking',
        name: 'Blocking',
        shortLabel: 'BLK',
        hexColor: '#9d00ff',
        playerStatKey: 'blocking',
      },
      {
        id: 'setting',
        name: 'Setting',
        shortLabel: 'SET',
        hexColor: '#00f0ff',
        playerStatKey: 'setting',
      },
      {
        id: 'passing',
        name: 'Passing',
        shortLabel: 'PAS',
        hexColor: '#00ff66',
        playerStatKey: 'passing',
      },
      {
        id: 'agility',
        name: 'Agility',
        shortLabel: 'AGI',
        hexColor: '#ff6600',
        playerStatKey: 'agility',
      },
    ],
    palette: {
      fg: '#f472b6',
      glow: 'rgba(244, 114, 182, 0.22)',
      ring: 'rgba(244, 114, 182, 0.45)',
    },
    iconClass: 'ph-volleyball',
    aliases: ['volleyball', 'volley', 'beach volleyball', 'vanguard volleyball'],
    rpgProjection: {
      ball_mastery: ['setting', 'passing', 'playmaking'],
      striking: ['spiking', 'power'],
      pace: ['agility', 'speed', 'pace'],
      scanning: ['serving', 'vision', 'scanning'],
      grit: ['blocking', 'defense', 'grit'],
    },
  },

  // ── Hockey ───────────────────────────────────────────────────────────────────
  {
    sportId: 'hockey',
    displayName: 'Vanguard Hockey',
    schemaVersion: 1,
    status: 'active',
    attributes: [
      {
        id: 'skating',
        name: 'Skating',
        shortLabel: 'SKT',
        hexColor: '#00ff66',
        playerStatKey: 'skating',
      },
      {
        id: 'shooting',
        name: 'Shooting',
        shortLabel: 'SHO',
        hexColor: '#ff0055',
        playerStatKey: 'shooting',
      },
      {
        id: 'stickhandling',
        name: 'Stickhandling',
        shortLabel: 'STK',
        hexColor: '#00f0ff',
        playerStatKey: 'stickhandling',
      },
      {
        id: 'passing',
        name: 'Passing',
        shortLabel: 'PAS',
        hexColor: '#ffcc00',
        playerStatKey: 'passing',
      },
      {
        id: 'defense',
        name: 'Defense',
        shortLabel: 'DEF',
        hexColor: '#9d00ff',
        playerStatKey: 'defense',
      },
      {
        id: 'physicality',
        name: 'Physicality',
        shortLabel: 'PHY',
        hexColor: '#ff6600',
        playerStatKey: 'physicality',
      },
    ],
    palette: {
      fg: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.22)',
      ring: 'rgba(56, 189, 248, 0.45)',
    },
    iconClass: 'ph-ice-skate',
    aliases: ['hockey', 'ice hockey', 'field hockey', 'vanguard hockey'],
    rpgProjection: {
      ball_mastery: ['stickhandling', 'ball_mastery', 'dribbling'],
      striking: ['shooting', 'striking', 'power'],
      pace: ['skating', 'speed', 'pace'],
      scanning: ['passing', 'vision', 'scanning'],
      grit: ['physicality', 'defense', 'grit'],
    },
  },

  // ── Lacrosse ─────────────────────────────────────────────────────────────────
  {
    sportId: 'lacrosse',
    displayName: 'Vanguard Lacrosse',
    schemaVersion: 1,
    status: 'active',
    attributes: [
      {
        id: 'stick_skills',
        name: 'Stick Skills',
        shortLabel: 'STK',
        hexColor: '#00f0ff',
        playerStatKey: 'stick_skills',
      },
      {
        id: 'shooting',
        name: 'Shooting Power',
        shortLabel: 'SHO',
        hexColor: '#ff0055',
        playerStatKey: 'shooting',
      },
      {
        id: 'speed',
        name: 'Speed & Agility',
        shortLabel: 'SPD',
        hexColor: '#00ff66',
        playerStatKey: 'speed',
      },
      {
        id: 'field_vision',
        name: 'Field Vision',
        shortLabel: 'VIS',
        hexColor: '#ffcc00',
        playerStatKey: 'field_vision',
      },
      {
        id: 'defense',
        name: 'Defense',
        shortLabel: 'DEF',
        hexColor: '#9d00ff',
        playerStatKey: 'defense',
      },
      {
        id: 'athleticism',
        name: 'Athleticism',
        shortLabel: 'ATH',
        hexColor: '#ff6600',
        playerStatKey: 'athleticism',
      },
    ],
    palette: {
      fg: '#facc15',
      glow: 'rgba(250, 204, 21, 0.22)',
      ring: 'rgba(250, 204, 21, 0.45)',
    },
    iconClass: 'ph-tennis-ball',
    aliases: ['lacrosse', 'lax', 'vanguard lacrosse'],
    rpgProjection: {
      ball_mastery: ['stick_skills', 'dribbling', 'ball_mastery'],
      striking: ['shooting', 'striking'],
      pace: ['speed', 'athleticism', 'pace'],
      scanning: ['field_vision', 'vision', 'scanning'],
      grit: ['defense', 'grit', 'physicality'],
    },
  },

  // ── Generic ──────────────────────────────────────────────────────────────────
  {
    sportId: 'generic',
    displayName: 'Vanguard Athletics',
    schemaVersion: 1,
    status: 'active',
    attributes: [
      {
        id: 'speed',
        name: 'Speed',
        shortLabel: 'SPD',
        hexColor: '#00ff66',
        playerStatKey: 'speed',
      },
      {
        id: 'power',
        name: 'Power',
        shortLabel: 'PWR',
        hexColor: '#ff6600',
        playerStatKey: 'power',
      },
      {
        id: 'technique',
        name: 'Technique',
        shortLabel: 'TEC',
        hexColor: '#00f0ff',
        playerStatKey: 'technique',
      },
      {
        id: 'iq',
        name: 'Sport IQ',
        shortLabel: 'IQ',
        hexColor: '#ffcc00',
        playerStatKey: 'iq',
      },
      {
        id: 'defense',
        name: 'Defense',
        shortLabel: 'DEF',
        hexColor: '#9d00ff',
        playerStatKey: 'defense',
      },
      {
        id: 'physical',
        name: 'Physical',
        shortLabel: 'PHY',
        hexColor: '#ff0055',
        playerStatKey: 'physical',
      },
    ],
    palette: {
      fg: '#a1a1aa',
      glow: 'rgba(161, 161, 170, 0.18)',
      ring: 'rgba(161, 161, 170, 0.4)',
    },
    iconClass: 'ph-shield-check',
    aliases: ['generic', 'other', 'custom', 'vanguard athletics'],
    rpgProjection: {
      ball_mastery: ['technique', 'dribbling', 'ball_mastery'],
      striking: ['power', 'shooting', 'striking'],
      pace: ['speed', 'pace', 'athletics'],
      scanning: ['iq', 'vision', 'scanning', 'passing'],
      grit: ['physical', 'defense', 'grit'],
    },
  },
];

exports.BASE_SPORTS_CONFIGS = BASE_SPORTS_CONFIGS;

/**
 * Super-admin callable: `seedBaseSportsConfigs`
 *
 * Writes / merges all 8 canonical sport config documents into
 * `sports_configs/{sportId}`.  Safe to re-run: uses { merge: true } so
 * any admin-CRUD-UI customisations are preserved.
 *
 * Role-gated: caller must hold `super_admin` or `global_admin` custom claim.
 */
exports.seedBaseSportsConfigs = onCall(async (request) => {
  const role = request.auth?.token?.role;
  if (role !== 'super_admin' && role !== 'global_admin') {
    throw new HttpsError('permission-denied', 'super_admin or global_admin role required.');
  }

  const db = admin.firestore();
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const config of BASE_SPORTS_CONFIGS) {
    const ref = db.collection('sports_configs').doc(config.sportId);
    batch.set(ref, {
      ...config,
      updatedAt: now,
      createdAt: now,
    }, {merge: true});
  }

  await batch.commit();
  return {seeded: BASE_SPORTS_CONFIGS.map((c) => c.sportId)};
});
