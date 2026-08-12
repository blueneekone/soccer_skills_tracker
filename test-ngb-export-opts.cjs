const assert = require('assert');

// Mock data structures
const teams = [
    { id: 'team1' },
    { id: 'team2' },
    { id: 'team3' }
];

const mockData = {
    'team1': { jerseys: { 'player1': 10, 'player2': 11 } },
    'team2': { jerseys: { 'player3': 9 } },
    'team3': { jerseys: null }
};

const db = () => ({
    collection: (colName) => ({
        doc: (docId) => ({
            id: docId,
            get: async () => ({
                exists: true,
                data: () => mockData[docId],
                id: docId
            })
        })
    }),
    getAll: async (...refs) => {
        return refs.map(ref => ({
            exists: true,
            data: () => mockData[ref.id],
            id: ref.id
        }));
    }
});

async function runNPlus1() {
  const jerseyByTeam = new Map();
  await Promise.all(teams.map(async (team) => {
    const rosterSnap = await db().collection('rosters').doc(team.id).get();
    const jerseys = rosterSnap.exists && rosterSnap.data().jerseys &&
      typeof rosterSnap.data().jerseys === 'object' ?
      rosterSnap.data().jerseys :
      {};
    const map = {};
    for (const [name, num] of Object.entries(jerseys)) {
      if (typeof name === 'string' && name.trim() && num != null) {
        map[name.trim()] = String(num);
      }
    }
    jerseyByTeam.set(team.id, map);
  }));
  return jerseyByTeam;
}

async function runGetAll() {
  const jerseyByTeam = new Map();
  if (teams.length > 0) {
    const refs = teams.map(t => db().collection('rosters').doc(t.id));
    const snaps = await db().getAll(...refs);

    for (let i = 0; i < teams.length; i++) {
        const teamId = teams[i].id;
        const rosterSnap = snaps[i];

        const jerseys = rosterSnap.exists && rosterSnap.data().jerseys &&
          typeof rosterSnap.data().jerseys === 'object' ?
          rosterSnap.data().jerseys :
          {};

        const map = {};
        for (const [name, num] of Object.entries(jerseys)) {
          if (typeof name === 'string' && name.trim() && num != null) {
            map[name.trim()] = String(num);
          }
        }
        jerseyByTeam.set(teamId, map);
    }
  }
  return jerseyByTeam;
}

async function main() {
    const nPlus1 = await runNPlus1();
    const getAll = await runGetAll();

    assert.deepStrictEqual(Array.from(nPlus1.entries()), Array.from(getAll.entries()));
    console.log("Tests passed!");
}

main().catch(console.error);
