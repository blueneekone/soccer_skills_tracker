const { performance } = require('perf_hooks');

// Mock db
const db = () => ({
  collection: (col) => ({
    doc: (id) => ({
      get: async () => {
        // simulate network delay that scales with number of requests, simulating overhead
        await new Promise(resolve => setTimeout(resolve, 5));
        return { exists: true, data: () => ({ id }), id };
      }
    })
  }),
  getAll: async (...refs) => {
    // A single batch request overhead
    await new Promise(resolve => setTimeout(resolve, 10));
    return refs.map(ref => ({ exists: true, data: () => ({ id: 'mock' }), id: 'mock' }));
  }
});

async function runBaseline() {
  const playerEmails = Array.from({length: 300}, (_, i) => `user${i}@example.com`);
  const userMap = new Map();
  const start = performance.now();
  await Promise.all(playerEmails.map(async (em) => {
    const uSnap = await db().collection('users').doc(em).get();
    if (uSnap.exists) userMap.set(em, uSnap.data() || {});
  }));
  const end = performance.now();
  console.log(`Baseline (Promise.all): ${end - start} ms`);
}

async function runOptimized() {
  const playerEmails = Array.from({length: 300}, (_, i) => `user${i}@example.com`);
  const userMap = new Map();
  const start = performance.now();

  const userRefs = playerEmails.map(em => db().collection('users').doc(em));
  for (let i = 0; i < userRefs.length; i += 100) {
    const chunk = userRefs.slice(i, i + 100);
    if (chunk.length > 0) {
      const snaps = await db().getAll(...chunk);
      for (const snap of snaps) {
        if (snap.exists) userMap.set(snap.id, snap.data() || {});
      }
    }
  }

  const end = performance.now();
  console.log(`Optimized (getAll with for loop): ${end - start} ms`);
}

async function runOptimizedParallel() {
  const playerEmails = Array.from({length: 300}, (_, i) => `user${i}@example.com`);
  const userMap = new Map();
  const start = performance.now();

  const userRefs = playerEmails.map(em => db().collection('users').doc(em));
  const chunks = [];
  for (let i = 0; i < userRefs.length; i += 100) {
    chunks.push(userRefs.slice(i, i + 100));
  }

  await Promise.all(chunks.map(async (chunk) => {
    const snaps = await db().getAll(...chunk);
    for (const snap of snaps) {
      if (snap.exists) userMap.set(snap.id, snap.data() || {});
    }
  }));

  const end = performance.now();
  console.log(`Optimized (getAll with Promise.all): ${end - start} ms`);
}

async function main() {
  await runBaseline();
  await runOptimized();
  await runOptimizedParallel();
}

main();
