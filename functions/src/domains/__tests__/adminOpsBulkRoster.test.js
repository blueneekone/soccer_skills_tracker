'use strict';

/**
 * adminOpsBulkRoster.test.js — secureBulkAddPlayers guards
 * Run: node --test functions/src/domains/__tests__/adminOpsBulkRoster.test.js
 */

const assert = require('node:assert/strict');
const Module = require('module');

const FIELD_VALUE = {
  increment: (n) => ({__increment: n}),
  serverTimestamp: () => ({__serverTimestamp: true}),
};

const origLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'firebase-functions/v2/https') {
    const real = origLoad.call(this, request, parent, isMain);
    return {
      ...real,
      onCall: (_opts, fn) => fn,
      onDocumentWritten: () => () => null,
    };
  }
  if (request === 'firebase-functions/params') {
    return {defineString: () => ({value: () => 'admin@test.com'})};
  }
  if (request === 'firebase-functions/logger') {
    return {info: () => {}, warn: () => {}, error: () => {}};
  }
  return origLoad.call(this, request, parent, isMain);
};

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({projectId: 'bulk-roster-test'});
}
if (!admin.firestore.FieldValue) {
  admin.firestore.FieldValue = FIELD_VALUE;
}

/** @type {Map<string, Map<string, Record<string, unknown>>>} */
const STORES = new Map([
  ['teams', new Map()],
  ['rosters', new Map()],
  ['license_entitlements', new Map()],
  ['team_entitlements', new Map()],
  ['player_lookup', new Map()],
]);

function resetStores() {
  for (const store of STORES.values()) store.clear();
}

function setDoc(collection, id, data) {
  STORES.get(collection).set(id, structuredClone(data));
}

function getDoc(collection, id) {
  return STORES.get(collection).get(id);
}

function applyFieldValue(target, key, value) {
  if (value && typeof value === 'object' && value.__increment !== undefined) {
    const cur = typeof target[key] === 'number' ? target[key] : 0;
    target[key] = cur + value.__increment;
    return;
  }
  if (value && typeof value === 'object' && value.__serverTimestamp) {
    target[key] = new Date();
    return;
  }
  target[key] = value;
}

function mergePayload(prev, payload, merge) {
  if (!merge) return structuredClone(payload);
  const next = structuredClone(prev);
  for (const [key, value] of Object.entries(payload)) {
    applyFieldValue(next, key, value);
  }
  return next;
}

function makeDocRef(collection, id) {
  return {
    id,
    path: `${collection}/${id}`,
    get: async () => {
      const data = getDoc(collection, id);
      return {
        exists: data !== undefined,
        data: () => structuredClone(data),
        id,
        ref: makeDocRef(collection, id),
      };
    },
    set: async (payload, opts) => {
      const prev = getDoc(collection, id) || {};
      setDoc(collection, id, mergePayload(prev, payload, opts && opts.merge));
    },
    update: async (payload) => {
      const prev = getDoc(collection, id) || {};
      setDoc(collection, id, mergePayload(prev, payload, true));
    },
  };
}

function buildFirestore() {
  const tx = {
    async get(ref) {
      const parts = ref.path.split('/');
      const collection = parts[0];
      const id = parts[1];
      const data = getDoc(collection, id);
      return {
        exists: data !== undefined,
        data: () => structuredClone(data),
        id,
        ref,
      };
    },
    set(ref, payload, opts) {
      const parts = ref.path.split('/');
      const collection = parts[0];
      const id = parts[1];
      const prev = getDoc(collection, id) || {};
      setDoc(collection, id, mergePayload(prev, payload, opts && opts.merge));
    },
    update(ref, payload) {
      const parts = ref.path.split('/');
      const collection = parts[0];
      const id = parts[1];
      const prev = getDoc(collection, id) || {};
      setDoc(collection, id, mergePayload(prev, payload, true));
    },
  };

  return {
    collection: (name) => ({
      doc: (id) => makeDocRef(name, id),
      where: () => ({
        where: () => ({
          limit: () => ({
            get: async () => ({empty: true, docs: [], forEach: () => {}}),
          }),
        }),
        limit: () => ({
          get: async () => ({empty: true, docs: [], forEach: () => {}}),
        }),
      }),
    }),
    runTransaction: async (fn) => fn(tx),
  };
}

const TEAM_ID = 'team-alpha';
const CLUB_ID = 'club-1';

function seedTeamFixtures({rosterPlayers = [], teamActive = 0, teamLimit = 10, clubActive = 0, clubLimit = 100} = {}) {
  setDoc('teams', TEAM_ID, {clubId: CLUB_ID, name: 'Alpha'});
  setDoc('rosters', TEAM_ID, {players: rosterPlayers, jerseys: {}});
  setDoc('license_entitlements', CLUB_ID, {
    seats_limit: clubLimit,
    active_seats: clubActive,
    reserved_seats: 0,
  });
  setDoc('team_entitlements', TEAM_ID, {
    clubId: CLUB_ID,
    teamId: TEAM_ID,
    seats_limit: teamLimit,
    active_seats: teamActive,
  });
}

function coachRequest(players) {
  return {
    auth: {
      uid: 'coach-uid',
      token: {
        email: 'coach@example.com',
        role: 'coach',
        clubId: CLUB_ID,
        teamId: TEAM_ID,
      },
    },
    data: {teamId: TEAM_ID, players},
  };
}

function playerRequest(players) {
  return {
    auth: {
      uid: 'player-uid',
      token: {
        email: 'player@example.com',
        role: 'player',
        clubId: CLUB_ID,
        teamId: TEAM_ID,
      },
    },
    data: {teamId: TEAM_ID, players},
  };
}

let secureBulkAddPlayers;
let firestoreRestore;

beforeEach(() => {
  resetStores();
  seedTeamFixtures();
  const firestore = buildFirestore();
  firestoreRestore = Object.getOwnPropertyDescriptor(admin, 'firestore');
  Object.defineProperty(admin, 'firestore', {
    configurable: true,
    value: Object.assign(() => firestore, {FieldValue: FIELD_VALUE}),
  });
  delete require.cache[require.resolve('../adminOps')];
  ({secureBulkAddPlayers} = require('../adminOps'));
});

afterAll(() => {
  if (firestoreRestore) {
    Object.defineProperty(admin, 'firestore', firestoreRestore);
  }
  Module._load = origLoad;
});

describe('secureBulkAddPlayers', () => {
  it('allows coach on assigned team to bulk-add roster rows', async () => {
    const result = await secureBulkAddPlayers(coachRequest([
      {playerName: 'Alex Morgan', jersey: '13'},
      {playerName: 'Sam Kerr', playerEmail: 'sam@example.com'},
    ]));

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.added, 2);
    assert.strictEqual(result.duplicates, 0);
    assert.strictEqual(result.skipped, 0);
    assert.strictEqual(result.seatCapHit, false);
    assert.deepStrictEqual(result.errors, []);

    const roster = getDoc('rosters', TEAM_ID);
    assert.deepStrictEqual(roster.players, ['Alex Morgan', 'Sam Kerr']);
    assert.strictEqual(roster.jerseys['Alex Morgan'], '13');
    assert.strictEqual(getDoc('player_lookup', 'sam@example.com').playerName, 'Sam Kerr');
  });

  it('denies player role', async () => {
    await expect(
        secureBulkAddPlayers(playerRequest([{playerName: 'Blocked Player'}])),
    ).rejects.toMatchObject({code: 'permission-denied'});
  });

  it('is idempotent on duplicate playerName already on roster', async () => {
    seedTeamFixtures({rosterPlayers: ['Existing Player'], teamActive: 1});

    const result = await secureBulkAddPlayers(coachRequest([
      {playerName: 'Existing Player'},
      {playerName: 'New Player'},
    ]));

    assert.strictEqual(result.added, 1);
    assert.strictEqual(result.duplicates, 1);
    assert.strictEqual(result.skipped, 0);
    assert.strictEqual(result.seatCapHit, false);
    assert.deepStrictEqual(getDoc('rosters', TEAM_ID).players, [
      'Existing Player',
      'New Player',
    ]);
  });

  it('stops at team seat cap and reports seatCapHit', async () => {
    seedTeamFixtures({
      rosterPlayers: ['P1', 'P2'],
      teamActive: 2,
      teamLimit: 2,
    });

    const result = await secureBulkAddPlayers(coachRequest([
      {playerName: 'P3'},
      {playerName: 'P4'},
    ]));

    assert.strictEqual(result.added, 0);
    assert.strictEqual(result.seatCapHit, true);
    assert.strictEqual(result.skipped, 2);
    assert.strictEqual(result.errors[0].reason, 'team_full');
    assert.deepStrictEqual(getDoc('rosters', TEAM_ID).players, ['P1', 'P2']);
  });
});
