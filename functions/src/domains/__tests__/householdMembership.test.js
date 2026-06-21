'use strict';

/**
 * householdMembership.test.js
 * Run: node functions/src/domains/__tests__/householdMembership.test.js
 */

const assert = require('assert');
const {HttpsError} = require('firebase-functions/v2/https');

const STORES = {
  users: new Map(),
  households: new Map(),
  player_lookup: new Map(),
  security_audit: new Map(),
};

const authUsers = new Map();

function resetStores() {
  STORES.users.clear();
  STORES.households.clear();
  STORES.player_lookup.clear();
  STORES.security_audit.clear();
  authUsers.clear();
}

function setUser(email, data) {
  STORES.users.set(email, {...data});
}

function setHousehold(id, data) {
  STORES.households.set(id, {...data});
}

function setLookup(email, data) {
  STORES.player_lookup.set(email, {...data});
}

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({projectId: 'test-project'});
}

const firestore = admin.firestore();
const originalCollection = firestore.collection.bind(firestore);

function makeDocRef(collectionName, id) {
  return {
    id,
    _collection: collectionName,
    get: async () => {
      const data = STORES[collectionName].get(id);
      return {exists: Boolean(data), data: () => data, id};
    },
    set: async (payload, opts) => {
      const prev = STORES[collectionName].get(id) || {};
      STORES[collectionName].set(
          id,
          opts && opts.merge ? {...prev, ...payload} : {...payload},
      );
    },
  };
}

firestore.collection = (name) => {
  if (!Object.prototype.hasOwnProperty.call(STORES, name)) {
    return originalCollection(name);
  }
  return {
    doc: (id) => makeDocRef(name, id),
    add: async (payload) => {
      const id = `audit-${STORES.security_audit.size + 1}`;
      STORES.security_audit.set(id, payload);
      return {id};
    },
  };
};

firestore.batch = () => {
  /** @type {Array<{ ref: { _collection: string, id: string }, payload: Record<string, unknown>, merge?: boolean }>} */
  const ops = [];
  return {
    set: (ref, payload, opts) => {
      ops.push({ref, payload, merge: opts && opts.merge});
    },
    commit: async () => {
      for (const op of ops) {
        const prev = STORES[op.ref._collection].get(op.ref.id) || {};
        STORES[op.ref._collection].set(
            op.ref.id,
            op.merge ? {...prev, ...op.payload} : {...op.payload},
        );
      }
    },
  };
};

Object.defineProperty(admin, 'auth', {
  configurable: true,
  value: () => ({
    getUser: async (uid) => {
      const row = authUsers.get(uid);
      if (!row) {
        const err = new Error('not found');
        err.code = 'auth/user-not-found';
        throw err;
      }
      return row;
    },
  }),
});

delete require.cache[require.resolve('../householdMembership')];
const membership = require('../householdMembership');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    resetStores();
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`       ${err.message}`);
    failed++;
  }
}

console.log('\nhouseholdMembership — graph reconciliation\n');

(async () => {
  await test('repairs when users + lookup agree but households.playerEmails is stale', async () => {
    const parent = 'parent@example.com';
    const child = 'slug@operative.local';
    const hid = 'hh-1';

    setUser(parent, {role: 'parent', householdId: hid});
    setUser(child, {role: 'player', householdId: hid, playerName: 'Slug'});
    setHousehold(hid, {
      clubId: 'club-1',
      parentEmails: [parent],
      playerEmails: [],
      playerNames: [],
    });
    setLookup(child, {householdId: hid, parentEmails: [parent]});
    authUsers.set('child-uid', {uid: 'child-uid', email: child});

    await membership.assertChildInParentHousehold(
        {email: parent, householdId: hid},
        'child-uid',
        child,
    );

    const healed = STORES.households.get(hid);
    assert.ok(healed.playerEmails.includes(child));
    assert.ok(healed.parentEmails.includes(parent));
  });

  await test('rejects when neither household nor lookup links parent to child', async () => {
    const parent = 'parent@example.com';
    const child = 'slug@operative.local';
    const hid = 'hh-1';

    setUser(parent, {role: 'parent', householdId: hid});
    setUser(child, {role: 'player', householdId: 'other-hh'});
    setHousehold(hid, {
      parentEmails: [parent],
      playerEmails: [],
    });
    setLookup(child, {householdId: 'other-hh', parentEmails: ['other@example.com']});
    authUsers.set('child-uid', {uid: 'child-uid', email: child});

    let err;
    try {
      await membership.assertChildInParentHousehold(
          {email: parent, householdId: hid},
          'child-uid',
          child,
      );
    } catch (e) {
      err = e;
    }
    assert.ok(err instanceof HttpsError);
    assert.strictEqual(err.code, 'permission-denied');
    assert.match(err.message, /not linked to your household/i);
  });

  await test('passes when household graph is already canonical', async () => {
    const parent = 'parent@example.com';
    const child = 'slug@operative.local';
    const hid = 'hh-1';

    setUser(parent, {role: 'parent', householdId: hid});
    setUser(child, {role: 'player', householdId: hid});
    setHousehold(hid, {
      parentEmails: [parent],
      playerEmails: [child],
    });
    authUsers.set('child-uid', {uid: 'child-uid', email: child});

    await membership.assertChildInParentHousehold(
        {email: parent, householdId: hid},
        'child-uid',
        child,
    );
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
