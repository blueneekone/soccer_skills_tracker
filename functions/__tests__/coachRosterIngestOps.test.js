'use strict';

/**
 * coachRosterIngestOps.test.js — COACH-ROSTER-PDF-IMPORT auth guards
 */

const { describe, it, beforeEach, after: afterAll } = require('node:test');
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

  it('verifies index.js exports coachRosterIngest', () => {
    const indexSrc = require('fs').readFileSync(require.resolve('../index.js'), 'utf8');
    assert.match(indexSrc, /exports\.coachRosterIngest\s*=/);
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

  it('correctly extracts all 11 players from official Affinity / UYSA roster format without including admins', () => {
    const {extractPlayersFromPdfTextFallback} = require('../src/domains/rosterIngestParse');
    const uysaRosterText = `
Team Roster Page 1 of 1
League Name and #: Aggies FC League Code : 66
Club Name and #: Aggies FC Club Code : 01
Team ID : 0766-01XLG11-7388
Number of Players : 11
Gender : Girls
Age Group : Under 11
Team Home Color :
Team Away Color :
Team Name : Aggies FC 16G Grey
Active
Head Coach : Waechtler, Evan
Status : Team Manager(s) : Sorensen,Bryce
Number of Admins : 4
Play Level : X-League

Admins
Admin ID Last Name First Name DOB Address City Zip Phone Cert Level License # Risk Status Role
44267-083874 Waechtler Evan 02/11/1991 1379 E 25 S Hyrum 84319-2025 (385) 831-8735 1P Approved Head Coach
79913-506254 Cothran Aaron 12/29/1976 5888 Sam Fellow Rd Smithfield 84335-9687 (801) 885-4431 1P Approved Assistant Coach
94915-257263 Davis Blake 11/02/1991 451 S 1170 E Hyrum 84319-4704 (435) 754-4917 Approved Assistant Coach
13073-180060 Sorensen Bryce 10/01/1986 726 E 100 S Hyde Park 84318-6705 (435) 757-8967 Approved Team Manager

Players
Player ID Last Name First Name DOB Address City Zip Phone Rank Transfer Reg Date
28990-249512 Anderson Millee 10/08/2015 575 N 200 E Logan 84321-4026 (435) 770-1553 05/27/2026
43003-195363 Curry Lily 10/22/2015 221 Sunstone Cir Logan 84321-5051 (801) 471-4428 05/23/2026
25485-440205 Davis Alayna 05/31/2017 451 S 1170 E Hyrum 84319-4704 (435) 754-4917 06/15/2026
65461-665208 Hernandez Lia 07/17/2016 365 E 250 N Richmond 84333-1770 (435) 881-5896 05/24/2026
50834-633329 Hoehne Nora 11/02/2015 585 E Bluff Street Hyde Park 84318 (435) 994-7094 06/04/2026
54442-401206 Minert Sage 08/04/2016 686 N 275 E Providence 84332-3503 (435) 669-4563 05/26/2026
57113-187165 Rogel Emma 09/01/2015 3055 south 1000 west Nibley 84321 (435) 764-0526 05/26/2026
72374-924279 Sorensen Ava 11/20/2015 726 E 100 S Hyde Park 84318-6705 (435) 757-8967 05/25/2026
10787-256757 Staley Myla 07/18/2016 37 W 400 N Smithfield 84335-1834 (801) 608-7969 05/25/2026
81065-261739 Waechtler Braelynn 08/14/2015 1379 E 25 S Hyrum 84319-2025 (385) 831-8735 05/23/2026
19067-545419 Watterson Abigail 05/13/2016 91 E Spring Creek Pkwy Providence 84332-9828 (801) 706-5840 05/25/2026

Printed On : 8/26/2026 9:17:53AM
Signatures: Head Coach : Team Manager : Registrar :
`;
    const players = extractPlayersFromPdfTextFallback(uysaRosterText);
    assert.equal(players.length, 11);
    assert.deepEqual(players.map((p) => p.displayName), [
      'Millee Anderson',
      'Lily Curry',
      'Alayna Davis',
      'Lia Hernandez',
      'Nora Hoehne',
      'Sage Minert',
      'Emma Rogel',
      'Ava Sorensen',
      'Myla Staley',
      'Braelynn Waechtler',
      'Abigail Watterson',
    ]);
    // Ensure no admin coach is in the extracted list
    assert.ok(!players.some((p) => p.displayName.includes('Evan')));
    assert.ok(!players.some((p) => p.displayName.includes('Aaron')));
  });
});
