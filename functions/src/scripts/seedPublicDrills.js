const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const DRILLS = [
  // Soccer
  {
    drillId: 'soc-pass-y',
    title: 'Passing Y-Drill',
    sport: 'soccer',
    category: 'Passing',
    description: '1. Player A passes to B.\n2. B plays to C or D.\n3. Follow pass.',
    durationMinutes: 15,
    isPublic: true,
    diagramData: {
      players: [{ x: 50, y: 80, role: 'attacker' }, { x: 50, y: 50, role: 'attacker' }, { x: 20, y: 20, role: 'attacker' }, { x: 80, y: 20, role: 'attacker' }],
      cones: [{ x: 50, y: 80 }, { x: 50, y: 50 }, { x: 20, y: 20 }, { x: 80, y: 20 }]
    }
  },
  {
    drillId: 'soc-3v2-counter',
    title: '3v2 Counter-Attack Transition',
    sport: 'soccer',
    category: 'Tactics',
    description: '1. 3 attackers start at half.\n2. 2 defenders try to stop them.\n3. Finish within 10s.',
    durationMinutes: 20,
    isPublic: true,
    diagramData: {
      players: [{ x: 50, y: 50, role: 'attacker' }, { x: 30, y: 50, role: 'attacker' }, { x: 70, y: 50, role: 'attacker' }, { x: 40, y: 20, role: 'defender' }, { x: 60, y: 20, role: 'defender' }],
      cones: []
    }
  },
  {
    drillId: 'soc-rondo',
    title: 'Possession Grid Rondo',
    sport: 'soccer',
    category: 'Passing',
    description: '1. 4 attackers on outside.\n2. 1 defender inside.\n3. Keep possession.',
    durationMinutes: 10,
    isPublic: true,
    diagramData: {
      players: [{ x: 50, y: 10, role: 'attacker' }, { x: 50, y: 90, role: 'attacker' }, { x: 10, y: 50, role: 'attacker' }, { x: 90, y: 50, role: 'attacker' }, { x: 50, y: 50, role: 'defender' }],
      cones: [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 10, y: 90 }, { x: 90, y: 90 }]
    }
  },
  // Basketball
  {
    drillId: 'bball-3man-weave',
    title: 'Three-Man Weave',
    sport: 'basketball',
    category: 'Ball Handling',
    description: '1. 3 players start baseline.\n2. Pass and follow behind.\n3. Finish with layup.',
    durationMinutes: 10,
    isPublic: true,
    diagramData: {
      players: [{ x: 50, y: 90, role: 'attacker' }, { x: 20, y: 90, role: 'attacker' }, { x: 80, y: 90, role: 'attacker' }],
      cones: []
    }
  },
  {
    drillId: 'bball-pick-roll',
    title: 'Pick & Roll Defensive Rotation',
    sport: 'basketball',
    category: 'Agility',
    description: '1. PnR setup at top of key.\n2. Defense practices hedging or switching.\n3. Rotate to help.',
    durationMinutes: 15,
    isPublic: true,
    diagramData: {
      players: [{ x: 50, y: 20, role: 'attacker' }, { x: 60, y: 30, role: 'attacker' }, { x: 50, y: 25, role: 'defender' }, { x: 60, y: 35, role: 'defender' }],
      cones: []
    }
  },
  {
    drillId: 'bball-shell',
    title: 'Shell Drill',
    sport: 'basketball',
    category: 'Agility',
    description: '1. 4v4 half-court.\n2. Offense passes around perimeter.\n3. Defense shifts on ball movement.',
    durationMinutes: 20,
    isPublic: true,
    diagramData: {
      players: [{ x: 20, y: 10, role: 'attacker' }, { x: 80, y: 10, role: 'attacker' }, { x: 20, y: 40, role: 'attacker' }, { x: 80, y: 40, role: 'attacker' }, { x: 30, y: 20, role: 'defender' }, { x: 70, y: 20, role: 'defender' }, { x: 30, y: 30, role: 'defender' }, { x: 70, y: 30, role: 'defender' }],
      cones: []
    }
  },
  // American Football
  {
    drillId: 'fb-zone-block',
    title: 'Zone Blocking Progression',
    sport: 'football',
    category: 'Offense',
    description: '1. OL lines up.\n2. Steps in unison for inside zone.\n3. Double team to LB.',
    durationMinutes: 15,
    isPublic: true,
    diagramData: {
      players: [{ x: 50, y: 45, role: 'attacker' }, { x: 40, y: 45, role: 'attacker' }, { x: 60, y: 45, role: 'attacker' }, { x: 50, y: 55, role: 'defender' }, { x: 40, y: 55, role: 'defender' }],
      cones: []
    }
  },
  {
    drillId: 'fb-mesh',
    title: 'Mesh Concept Route Depth',
    sport: 'football',
    category: 'Offense',
    description: '1. Two receivers run shallow crossers.\n2. Ensure proper depth (under/over).\n3. QB reads rub.',
    durationMinutes: 20,
    isPublic: true,
    diagramData: {
      players: [{ x: 50, y: 80, role: 'attacker' }, { x: 20, y: 80, role: 'attacker' }, { x: 80, y: 80, role: 'attacker' }, { x: 20, y: 70, role: 'defender' }, { x: 80, y: 70, role: 'defender' }],
      cones: []
    }
  },
  {
    drillId: 'fb-cover3',
    title: 'Cover 3 Zone Drops',
    sport: 'football',
    category: 'Defense',
    description: '1. DBs backpedal to thirds.\n2. LBs drop to hook/curl and flats.\n3. Break on thrown ball.',
    durationMinutes: 15,
    isPublic: true,
    diagramData: {
      players: [{ x: 50, y: 20, role: 'defender' }, { x: 20, y: 30, role: 'defender' }, { x: 80, y: 30, role: 'defender' }, { x: 40, y: 40, role: 'defender' }, { x: 60, y: 40, role: 'defender' }],
      cones: []
    }
  }
];

async function seedPublicDrills() {
  const batches = [];
  let currentBatch = db.batch();
  let count = 0;

  for (const drill of DRILLS) {
    if (count === 500) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      count = 0;
    }
    const docRef = db.collection('public_drills').doc(drill.drillId);
    currentBatch.set(docRef, drill);
    count++;
  }

  if (count > 0) {
    batches.push(currentBatch);
  }

  for (const batch of batches) {
    await batch.commit();
  }
  console.log(`Seeded ${DRILLS.length} public drills.`);
}

if (require.main === module) {
  seedPublicDrills().catch(console.error);
}

module.exports = { seedPublicDrills, DRILLS };
