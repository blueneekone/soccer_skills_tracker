const { performance } = require('perf_hooks');

async function benchmark() {
  const numTeams = 1000;
  console.log(`Benchmarking with ${numTeams} teams...`);

  // Mock db function
  const db = () => ({
    getAll: async (...refs) => {
        // Simulate some latency
        await new Promise(resolve => setTimeout(resolve, 5));
        return refs.map(ref => ({
            exists: true,
            data: () => ({ jerseys: { 'Player A': 10 } }),
            id: ref.id
        }));
    },
    collection: (colName) => ({
      doc: (docId) => ({
        id: docId,
        get: async () => {
          // Simulate some latency
          await new Promise(resolve => setTimeout(resolve, 1));
          return {
            exists: true,
            data: () => ({ jerseys: { 'Player A': 10 } }),
            id: docId
          };
        }
      })
    })
  });

  const teams = Array.from({ length: numTeams }, (_, i) => ({ id: `team_${i}` }));

  // N+1 Method (Current)
  const startNPlus1 = performance.now();
  const jerseyByTeamNPlus1 = new Map();
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
    jerseyByTeamNPlus1.set(team.id, map);
  }));
  const endNPlus1 = performance.now();
  console.log(`N+1 Query took: ${endNPlus1 - startNPlus1} ms`);

  // getAll Method (Proposed)
  const startGetAll = performance.now();
  const jerseyByTeamGetAll = new Map();

  if (teams.length > 0) {
      // Chunk teams into batches of 100 to stay within Firestore getAll limits
      const chunkSize = 100;
      for (let i = 0; i < teams.length; i += chunkSize) {
          const chunk = teams.slice(i, i + chunkSize);
          const refs = chunk.map(t => db().collection('rosters').doc(t.id));
          const snaps = await db().getAll(...refs);

          snaps.forEach((rosterSnap, index) => {
              const teamId = chunk[index].id;
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
              jerseyByTeamGetAll.set(teamId, map);
          });
      }
  }
  const endGetAll = performance.now();
  console.log(`getAll Query took: ${endGetAll - startGetAll} ms`);
}

benchmark().catch(console.error);
