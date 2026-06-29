'use strict';

/**
 * coachRosterIngestOps.test.js — COACH-ROSTER-PDF-IMPORT auth guards
 */

const assert = require('node:assert/strict');
const Module = require('module');

const origLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'firebase-functions/v2/https') {
    const real = origLoad.call(this, request, parent, isMain);
    return {
      ...real,
      onCall: (_opts, fn) => fn,
    };
  }
  if (request === 'firebase-functions/params') {
    return {
      defineSecret: () => ({value: () => 'test-gemini-key'}),
    };
  }
  if (request === 'firebase-functions/logger') {
    return {info: () => {}, warn: () => {}, error: () => {}};
  }
  if (request === 'pdf-parse') {
    return async () => ({text: 'Player List\nAlex Morgan alex@test.com #13'});
  }
  if (request === '@google/genai') {
    return {
      GoogleGenAI: class {
        constructor() {
          this.models = {
            generateContent: async () => ({
              candidates: [{
                content: {
                  parts: [{
                    text: '[{"displayName":"Alex Morgan","email":"alex@test.com","jerseyNumber":"13"}]',
                  }],
                },
              }],
            }),
          };
        }
      },
    };
  }
  return origLoad.call(this, request, parent, isMain);
};

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({projectId: 'coach-roster-ingest-test'});
}

const STORES = new Map([['teams', new Map()]]);

function setDoc(collection, id, data) {
  STORES.get(collection).set(id, structuredClone(data));
}

function buildFirestore() {
  return {
    collection: (name) => ({
      doc: (id) => ({
        id,
        path: `${name}/${id}`,
        get: async () => {
          const data = STORES.get(name).get(id);
          return {exists: data !== undefined, data: () => structuredClone(data), id};
        },
      }),
    }),
  };
}

const TEAM_ID = 'team-alpha';
const CLUB_ID = 'club-1';

function coachRequest(payload) {
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
    data: payload,
  };
}

function playerRequest(payload) {
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
    data: payload,
  };
}

let coachRosterIngest;
let firestoreRestore;

function setup() {
  setDoc('teams', TEAM_ID, {clubId: CLUB_ID, name: 'Alpha'});
  const firestore = buildFirestore();
  firestoreRestore = Object.getOwnPropertyDescriptor(admin, 'firestore');
  Object.defineProperty(admin, 'firestore', {
    configurable: true,
    value: () => firestore,
  });
  delete require.cache[require.resolve('../src/domains/coachRosterIngestOps')];
  ({coachRosterIngest} = require('../src/domains/coachRosterIngestOps'));
}

function teardown() {
  if (firestoreRestore) {
    Object.defineProperty(admin, 'firestore', firestoreRestore);
  }
  Module._load = origLoad;
}

const csvBase64 = Buffer.from('name,email,jersey\nSam Kerr,sam@example.com,10', 'utf8').toString('base64');
const pdfBase64 = Buffer.from('%PDF-1.4 fake', 'utf8').toString('base64');

describe('coachRosterIngest', () => {
  beforeEach(() => setup());
  afterAll(() => teardown());

  it('allows coach on assigned team to parse CSV rows', async () => {
    const result = await coachRosterIngest(coachRequest({
      teamId: TEAM_ID,
      format: 'csv',
      contentBase64: csvBase64,
    }));
    assert.equal(result.ok, true);
    assert.equal(result.players.length, 1);
    assert.equal(result.players[0].playerName, 'Sam Kerr');
    assert.equal(result.players[0].playerEmail, 'sam@example.com');
  });

  it('allows coach to parse PDF via Gemini extract', async () => {
    const result = await coachRosterIngest(coachRequest({
      teamId: TEAM_ID,
      format: 'pdf',
      contentBase64: pdfBase64,
    }));
    assert.equal(result.ok, true);
    assert.equal(result.players.length, 1);
    assert.equal(result.players[0].playerName, 'Alex Morgan');
  });

  it('denies player role', async () => {
    await assert.rejects(
        () => coachRosterIngest(playerRequest({
          teamId: TEAM_ID,
          format: 'csv',
          contentBase64: csvBase64,
        })),
        (err) => {
          assert.equal(err.code, 'permission-denied');
          return true;
        },
    );
  });
});
