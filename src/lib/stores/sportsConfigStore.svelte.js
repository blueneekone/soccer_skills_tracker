/**
 * sportsConfigStore.svelte.js
 * ───────────────────────────
 * Phase 3, Epic 4 — Sports_Configs Dynamic Trees.
 *
 * Svelte 5 runes store for `sports_configs/{sportId}`.  Single source of
 * truth on the client — all consumers (adapters, charts, radars, CRUD UI)
 * read through this store rather than the legacy hardcoded modules.
 *
 * Architecture:
 *   • Lazy onSnapshot listener — started on first read, cleaned up on auth
 *     sign-out (via `stopListener()`).
 *   • Read-repair fallback — when a doc is missing from Firestore the bundled
 *     LEGACY_SPORT_CONFIGS is returned immediately and an async
 *     `setDoc(..., { merge: true })` is queued (fire-and-forget).
 *   • `resolveActiveConfig(sportRaw)` normalises raw strings via `aliases[]`
 *     before `sportId` match; ultimate fallback is `getConfig('generic')`.
 *   • `currentSportConfig` is a $derived that stays in sync with
 *     `workspaceContextStore.activeSportId`.
 *
 * Invariant: no read ever throws. Every public getter returns a valid
 * SportsConfigDoc (falling back to LEGACY_SPORT_CONFIGS) or null only when
 * the store is completely uninitialised before browser hydration.
 */

import { browser } from '$app/environment';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '$lib/firebase';
import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
import { authStore } from '$lib/stores/auth.svelte.js';

// ── Bundled fallback (snapshot of S2 seed) ────────────────────────────────────
// Inlined so the store degrades gracefully offline or on a cold Firestore.
// Keys mirror BASE_SPORTS_CONFIGS in functions/src/seeders/sportsSeeder.js.

/** @type {Record<string, import('$lib/types/sportsConfig').SportsConfigDoc>} */
const LEGACY_SPORT_CONFIGS = Object.freeze({
  soccer: {
    sportId: 'soccer', displayName: 'Vanguard Soccer', schemaVersion: 1, status: 'active',
    attributes: [
      { id: 'pace',      name: 'Pace & Agility',       shortLabel: 'PAC', hexColor: '#00ff66', playerStatKey: 'pace'      },
      { id: 'shooting',  name: 'Shooting',              shortLabel: 'SHO', hexColor: '#ff0055', playerStatKey: 'shooting'  },
      { id: 'passing',   name: 'Passing',               shortLabel: 'PAS', hexColor: '#ffcc00', playerStatKey: 'passing'   },
      { id: 'dribbling', name: 'Dribbling',             shortLabel: 'DRI', hexColor: '#14b8a6', playerStatKey: 'dribbling' },
      { id: 'defending', name: 'Defending',             shortLabel: 'DEF', hexColor: '#9d00ff', playerStatKey: 'defending' },
      { id: 'physical',  name: 'Physical',              shortLabel: 'PHY', hexColor: '#ff6600', playerStatKey: 'physical'  },
    ],
    palette: { fg: '#22c55e', glow: 'rgba(34, 197, 94, 0.22)',    ring: 'rgba(34, 197, 94, 0.45)'    },
    iconClass: 'ph-soccer-ball',
    aliases: ['soccer', 'futbol', 'vanguard soccer', 'association football'],
    rpgProjection: { ball_mastery: ['dribbling','ball_mastery','passing'], striking: ['shooting','striking'], pace: ['pace','speed','athletics'], scanning: ['passing','scanning','vision'], grit: ['physical','grit','defending'] },
  },
  basketball: {
    sportId: 'basketball', displayName: 'Vanguard Basketball', schemaVersion: 1, status: 'active',
    attributes: [
      { id: 'shooting',   name: 'Shooting Range', shortLabel: 'SHO', hexColor: '#ff0055', playerStatKey: 'shooting'   },
      { id: 'playmaking', name: 'Playmaking',      shortLabel: 'PLY', hexColor: '#ffcc00', playerStatKey: 'playmaking' },
      { id: 'rebounding', name: 'Rebounding',      shortLabel: 'REB', hexColor: '#9d00ff', playerStatKey: 'rebounding' },
      { id: 'defense',    name: 'Defense',         shortLabel: 'DEF', hexColor: '#14b8a6', playerStatKey: 'defense'    },
      { id: 'athletics',  name: 'Athleticism',     shortLabel: 'ATH', hexColor: '#00ff66', playerStatKey: 'athletics'  },
      { id: 'finishing',  name: 'Finishing',       shortLabel: 'FIN', hexColor: '#ff6600', playerStatKey: 'finishing'  },
    ],
    palette: { fg: '#fb923c', glow: 'rgba(251, 146, 60, 0.22)',  ring: 'rgba(251, 146, 60, 0.45)'  },
    iconClass: 'ph-basketball',
    aliases: ['basketball', 'hoops', 'ball', 'vanguard basketball'],
    rpgProjection: { ball_mastery: ['playmaking','ball_handling','dribbling'], striking: ['shooting','finishing'], pace: ['athletics','speed','pace'], scanning: ['playmaking','vision','court_vision'], grit: ['defense','rebounding','grit'] },
  },
  baseball: {
    sportId: 'baseball', displayName: 'Vanguard Baseball', schemaVersion: 1, status: 'active',
    attributes: [
      { id: 'hitting',  name: 'Hitting',      shortLabel: 'HIT', hexColor: '#ff0055', playerStatKey: 'hitting'  },
      { id: 'power',    name: 'Power',         shortLabel: 'PWR', hexColor: '#9d00ff', playerStatKey: 'power'    },
      { id: 'fielding', name: 'Fielding',      shortLabel: 'FLD', hexColor: '#14b8a6', playerStatKey: 'fielding' },
      { id: 'arm',      name: 'Arm Strength',  shortLabel: 'ARM', hexColor: '#ff6600', playerStatKey: 'arm'      },
      { id: 'speed',    name: 'Speed',         shortLabel: 'SPD', hexColor: '#00ff66', playerStatKey: 'speed'    },
      { id: 'vision',   name: 'Plate Vision',  shortLabel: 'VIS', hexColor: '#ffcc00', playerStatKey: 'vision'   },
    ],
    palette: { fg: '#60a5fa', glow: 'rgba(96, 165, 250, 0.22)',  ring: 'rgba(96, 165, 250, 0.45)'  },
    iconClass: 'ph-baseball',
    aliases: ['baseball', 'softball', 'vanguard baseball'],
    rpgProjection: { ball_mastery: ['hitting','fielding'], striking: ['power','arm'], pace: ['speed','pace','athletics'], scanning: ['vision','scanning','awareness'], grit: ['fielding','defense','grit'] },
  },
  football: {
    sportId: 'football', displayName: 'Vanguard Football', schemaVersion: 1, status: 'active',
    attributes: [
      { id: 'speed',     name: 'Speed',     shortLabel: 'SPD', hexColor: '#00ff66', playerStatKey: 'speed'    },
      { id: 'strength',  name: 'Strength',  shortLabel: 'STR', hexColor: '#ff6600', playerStatKey: 'strength' },
      { id: 'agility',   name: 'Agility',   shortLabel: 'AGI', hexColor: '#14b8a6', playerStatKey: 'agility'  },
      { id: 'awareness', name: 'Awareness', shortLabel: 'AWR', hexColor: '#ffcc00', playerStatKey: 'awareness'},
      { id: 'tackling',  name: 'Tackling',  shortLabel: 'TAC', hexColor: '#9d00ff', playerStatKey: 'tackling' },
      { id: 'catching',  name: 'Catching',  shortLabel: 'CAT', hexColor: '#ff0055', playerStatKey: 'catching' },
    ],
    palette: { fg: '#a78bfa', glow: 'rgba(167, 139, 250, 0.22)', ring: 'rgba(167, 139, 250, 0.45)' },
    iconClass: 'ph-football',
    aliases: ['football', 'american football', 'gridiron', 'vanguard football'],
    rpgProjection: { ball_mastery: ['catching','ball_handling','dribbling'], striking: ['strength','power'], pace: ['speed','agility','pace'], scanning: ['awareness','vision','scanning'], grit: ['tackling','defense','grit'] },
  },
  volleyball: {
    sportId: 'volleyball', displayName: 'Vanguard Volleyball', schemaVersion: 1, status: 'active',
    attributes: [
      { id: 'serving',  name: 'Serving',  shortLabel: 'SRV', hexColor: '#ffcc00', playerStatKey: 'serving'  },
      { id: 'spiking',  name: 'Spiking',  shortLabel: 'SPK', hexColor: '#ff0055', playerStatKey: 'spiking'  },
      { id: 'blocking', name: 'Blocking', shortLabel: 'BLK', hexColor: '#9d00ff', playerStatKey: 'blocking' },
      { id: 'setting',  name: 'Setting',  shortLabel: 'SET', hexColor: '#14b8a6', playerStatKey: 'setting'  },
      { id: 'passing',  name: 'Passing',  shortLabel: 'PAS', hexColor: '#00ff66', playerStatKey: 'passing'  },
      { id: 'agility',  name: 'Agility',  shortLabel: 'AGI', hexColor: '#ff6600', playerStatKey: 'agility'  },
    ],
    palette: { fg: '#f472b6', glow: 'rgba(244, 114, 182, 0.22)', ring: 'rgba(244, 114, 182, 0.45)' },
    iconClass: 'ph-volleyball',
    aliases: ['volleyball', 'volley', 'beach volleyball', 'vanguard volleyball'],
    rpgProjection: { ball_mastery: ['setting','passing','playmaking'], striking: ['spiking','power'], pace: ['agility','speed','pace'], scanning: ['serving','vision','scanning'], grit: ['blocking','defense','grit'] },
  },
  hockey: {
    sportId: 'hockey', displayName: 'Vanguard Hockey', schemaVersion: 1, status: 'active',
    attributes: [
      { id: 'skating',        name: 'Skating',        shortLabel: 'SKT', hexColor: '#00ff66', playerStatKey: 'skating'        },
      { id: 'shooting',       name: 'Shooting',        shortLabel: 'SHO', hexColor: '#ff0055', playerStatKey: 'shooting'       },
      { id: 'stickhandling',  name: 'Stickhandling',  shortLabel: 'STK', hexColor: '#14b8a6', playerStatKey: 'stickhandling'  },
      { id: 'passing',        name: 'Passing',         shortLabel: 'PAS', hexColor: '#ffcc00', playerStatKey: 'passing'        },
      { id: 'defense',        name: 'Defense',         shortLabel: 'DEF', hexColor: '#9d00ff', playerStatKey: 'defense'        },
      { id: 'physicality',    name: 'Physicality',    shortLabel: 'PHY', hexColor: '#ff6600', playerStatKey: 'physicality'    },
    ],
    palette: { fg: '#38bdf8', glow: 'rgba(56, 189, 248, 0.22)',  ring: 'rgba(56, 189, 248, 0.45)'  },
    iconClass: 'ph-ice-skate',
    aliases: ['hockey', 'ice hockey', 'field hockey', 'vanguard hockey'],
    rpgProjection: { ball_mastery: ['stickhandling','ball_mastery','dribbling'], striking: ['shooting','striking','power'], pace: ['skating','speed','pace'], scanning: ['passing','vision','scanning'], grit: ['physicality','defense','grit'] },
  },
  lacrosse: {
    sportId: 'lacrosse', displayName: 'Vanguard Lacrosse', schemaVersion: 1, status: 'active',
    attributes: [
      { id: 'stick_skills',  name: 'Stick Skills',    shortLabel: 'STK', hexColor: '#14b8a6', playerStatKey: 'stick_skills'  },
      { id: 'shooting',      name: 'Shooting Power',  shortLabel: 'SHO', hexColor: '#ff0055', playerStatKey: 'shooting'      },
      { id: 'speed',         name: 'Speed & Agility', shortLabel: 'SPD', hexColor: '#00ff66', playerStatKey: 'speed'         },
      { id: 'field_vision',  name: 'Field Vision',    shortLabel: 'VIS', hexColor: '#ffcc00', playerStatKey: 'field_vision'  },
      { id: 'defense',       name: 'Defense',         shortLabel: 'DEF', hexColor: '#9d00ff', playerStatKey: 'defense'       },
      { id: 'athleticism',   name: 'Athleticism',     shortLabel: 'ATH', hexColor: '#ff6600', playerStatKey: 'athleticism'   },
    ],
    palette: { fg: '#facc15', glow: 'rgba(250, 204, 21, 0.22)',  ring: 'rgba(250, 204, 21, 0.45)'  },
    iconClass: 'ph-tennis-ball',
    aliases: ['lacrosse', 'lax', 'vanguard lacrosse'],
    rpgProjection: { ball_mastery: ['stick_skills','dribbling','ball_mastery'], striking: ['shooting','striking'], pace: ['speed','athleticism','pace'], scanning: ['field_vision','vision','scanning'], grit: ['defense','grit','physicality'] },
  },
  generic: {
    sportId: 'generic', displayName: 'Vanguard Athletics', schemaVersion: 1, status: 'active',
    attributes: [
      { id: 'speed',     name: 'Speed',     shortLabel: 'SPD', hexColor: '#00ff66', playerStatKey: 'speed'     },
      { id: 'power',     name: 'Power',     shortLabel: 'PWR', hexColor: '#ff6600', playerStatKey: 'power'     },
      { id: 'technique', name: 'Technique', shortLabel: 'TEC', hexColor: '#14b8a6', playerStatKey: 'technique' },
      { id: 'iq',        name: 'Sport IQ',  shortLabel: 'IQ',  hexColor: '#ffcc00', playerStatKey: 'iq'        },
      { id: 'defense',   name: 'Defense',   shortLabel: 'DEF', hexColor: '#9d00ff', playerStatKey: 'defense'   },
      { id: 'physical',  name: 'Physical',  shortLabel: 'PHY', hexColor: '#ff0055', playerStatKey: 'physical'  },
    ],
    palette: { fg: '#a1a1aa', glow: 'rgba(161, 161, 170, 0.18)', ring: 'rgba(161, 161, 170, 0.4)'  },
    iconClass: 'ph-shield-check',
    aliases: ['generic', 'other', 'custom', 'vanguard athletics'],
    rpgProjection: { ball_mastery: ['technique','dribbling','ball_mastery'], striking: ['power','shooting','striking'], pace: ['speed','pace','athletics'], scanning: ['iq','vision','scanning','passing'], grit: ['physical','defense','grit'] },
  },
});

export { LEGACY_SPORT_CONFIGS };

// ── Reactive state ────────────────────────────────────────────────────────────

/** @type {Map<string, import('$lib/types/sportsConfig').SportsConfigDoc>} */
let _configs = $state(new Map());

/** True once the onSnapshot listener has received its first batch. */
let _ready = $state(false);

/** The active Firestore unsubscribe handle. Null when listener is off. */
let _unsubscribe = $state(/** @type {(() => void) | null} */ (null));

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Build a reverse-alias index: raw string → sportId.
 * Used by resolveActiveConfig for fast O(1) lookups.
 */
function buildAliasIndex() {
  /** @type {Map<string, string>} */
  const index = new Map();
  for (const [sportId, cfg] of _configs) {
    index.set(sportId, sportId);
    for (const alias of (cfg.aliases || [])) {
      index.set(alias.toLowerCase().trim(), sportId);
    }
  }
  return index;
}

/**
 * Queue a read-repair write for a missing sportId.
 * Fire-and-forget; errors are swallowed (the store already returned a fallback).
 *
 * @param {string} sportId
 * @param {import('$lib/types/sportsConfig').SportsConfigDoc} fallbackData
 */
function queueReadRepair(sportId, fallbackData) {
  if (!browser) return;
  const ref = doc(db, 'sports_configs', sportId);
  setDoc(ref, { ...fallbackData, updatedAt: null }, { merge: true }).catch(() => {
    // read-repair is best-effort; offline is fine
  });
}

// ── Listener lifecycle ────────────────────────────────────────────────────────

/** Start the onSnapshot listener (idempotent). */
function startListener() {
  if (!browser || _unsubscribe) return;

  const colRef = collection(db, 'sports_configs');
  const unsub = onSnapshot(
      colRef,
      (snap) => {
        const next = new Map(_configs);
        snap.docChanges().forEach((change) => {
          const data = /** @type {import('$lib/types/sportsConfig').SportsConfigDoc} */ (
            change.doc.data()
          );
          if (change.type === 'removed' || data.status === 'archived') {
            next.delete(change.doc.id);
          } else {
            next.set(change.doc.id, data);
          }
        });
        _configs = next;
        _ready = true;
      },
      (_err) => {
        // Permission error before auth — ignore; the store falls back to LEGACY
      },
  );
  _unsubscribe = unsub;
}

/** Stop the listener and reset state. Called on auth sign-out. */
function stopListener() {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
  _configs = new Map();
  _ready = false;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get a sport config by exact sportId.
 *
 * Returns the Firestore doc when available, the bundled LEGACY fallback when
 * the store is empty or the doc is missing, and queues a read-repair write.
 *
 * @param {string} sportId
 * @returns {import('$lib/types/sportsConfig').SportsConfigDoc}
 */
function getConfig(sportId) {
  if (_configs.has(sportId)) {
    return /** @type {import('$lib/types/sportsConfig').SportsConfigDoc} */ (_configs.get(sportId));
  }

  const fallback = LEGACY_SPORT_CONFIGS[sportId] ?? LEGACY_SPORT_CONFIGS.generic;
  if (_ready && fallback) {
    queueReadRepair(sportId, fallback);
  }
  return fallback;
}

/**
 * Resolve a raw sport string (e.g. 'Vanguard Soccer', 'hoops', 'basketball')
 * to its SportsConfigDoc via the alias index, then exact sportId match.
 * Ultimate fallback: 'generic'.
 *
 * @param {string | null | undefined} sportRaw
 * @returns {import('$lib/types/sportsConfig').SportsConfigDoc}
 */
function resolveActiveConfig(sportRaw) {
  const norm = (sportRaw || '').toLowerCase().trim();
  if (!norm) return getConfig('generic');

  // 1. Try exact sportId match first (fastest path)
  if (_configs.has(norm)) {
    return /** @type {import('$lib/types/sportsConfig').SportsConfigDoc} */ (_configs.get(norm));
  }

  // 2. Try alias index
  const aliasIndex = buildAliasIndex();
  const resolved = aliasIndex.get(norm);
  if (resolved && _configs.has(resolved)) {
    return /** @type {import('$lib/types/sportsConfig').SportsConfigDoc} */ (_configs.get(resolved));
  }

  // 3. Substring legacy matches (mirror normalizeClubSport logic)
  if (norm.includes('basket')) return getConfig('basketball');
  if (norm.includes('volley')) return getConfig('volleyball');
  if (norm.includes('baseball')) return getConfig('baseball');
  if (norm.includes('lacrosse')) return getConfig('lacrosse');
  if (norm.includes('hockey') || norm.includes('ice')) return getConfig('hockey');
  if (norm.includes('football') && !norm.includes('soccer')) return getConfig('football');
  if (norm.includes('soccer')) return getConfig('soccer');

  return getConfig('generic');
}

/**
 * Currently active sport config, derived from workspaceContextStore.activeSportId.
 * Consumers should read this for reactive sport-themed UI.
 *
 * @type {import('$lib/types/sportsConfig').SportsConfigDoc}
 */
const currentSportConfig = $derived(
  resolveActiveConfig(workspaceContextStore.activeSportId),
);

// Eagerly start the listener once on module load (browser only).
// MUST be done outside any $derived getter — calling startListener() inside
// a getter mutates _unsubscribe ($state) during derived eval, which throws
// state_unsafe_mutation. The internal `if (!browser || _unsubscribe) return`
// guard makes this safe under SSR and idempotent across HMR.
if (browser) startListener();

export const sportsConfigStore = {
  /** True once the first Firestore snapshot has arrived. */
  get ready() { return _ready; },

  /** Full map of active sport configs, keyed by sportId. */
  get configs() { return _configs; },

  /** @type {import('$lib/types/sportsConfig').SportsConfigDoc} */
  get currentSportConfig() { return currentSportConfig; },

  getConfig,
  resolveActiveConfig,
  startListener,
  stopListener,

  /** Read-only snapshot of the bundled offline fallback. */
  get legacyConfigs() { return LEGACY_SPORT_CONFIGS; },
};
