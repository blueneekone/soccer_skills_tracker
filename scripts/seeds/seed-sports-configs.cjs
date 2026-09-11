/**
 * scripts/seed-sports-configs.cjs
 *
 * Seeds sports_configs collection in Cloud Firestore for all 8 sports with:
 * - 6 canonical attributes & radar projections
 * - Complete sport positions list
 * - Starter platform drills
 */

const admin = require('firebase-admin');
const { resolve } = require('node:path');

const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
const credential = admin.credential.cert(require(keyPath));

if (!admin.apps.length) {
  admin.initializeApp({
    credential,
  });
}

const db = admin.firestore();

const SPORTS_SEED_DATA = [
  {
    sportId: 'soccer',
    displayName: 'Vanguard Soccer',
    schemaVersion: 2,
    status: 'active',
    attributes: [
      { id: 'pace', name: 'Pace & Agility', shortLabel: 'PAC', hexColor: '#00ff66', playerStatKey: 'pace' },
      { id: 'shooting', name: 'Shooting & Finishing', shortLabel: 'SHO', hexColor: '#ff0055', playerStatKey: 'shooting' },
      { id: 'passing', name: 'Passing & Vision', shortLabel: 'PAS', hexColor: '#ffcc00', playerStatKey: 'passing' },
      { id: 'dribbling', name: 'Dribbling & Ball Mastery', shortLabel: 'DRI', hexColor: '#00f0ff', playerStatKey: 'dribbling' },
      { id: 'defending', name: 'Defending & Tackling', shortLabel: 'DEF', hexColor: '#9d00ff', playerStatKey: 'defending' },
      { id: 'physical', name: 'Physical & Aerobic Engine', shortLabel: 'PHY', hexColor: '#ff6600', playerStatKey: 'physical' },
    ],
    palette: { fg: '#00ff66', glow: 'rgba(0, 255, 102, 0.22)', ring: 'rgba(0, 255, 102, 0.45)' },
    iconClass: 'ph-soccer-ball',
    iconName: 'sport.soccer',
    aliases: ['soccer', 'futbol', 'football_soccer', 'vanguard soccer', 'association football'],
    rpgProjection: {
      ball_mastery: ['dribbling', 'ball_mastery', 'passing'],
      striking: ['shooting', 'striking'],
      pace: ['pace', 'speed', 'athletics'],
      scanning: ['passing', 'scanning', 'vision'],
      grit: ['physical', 'grit', 'defending'],
    },
    positions: [
      { code: 'GK', name: 'Goalkeeper', category: 'goalkeeper', description: 'Visual reflexes, shot-stopping, spatial command, distribution' },
      { code: 'CB', name: 'Center Back', category: 'defense', description: 'Spatial defense anchor, aerial dominance, progressive passing' },
      { code: 'LCB', name: 'Left Center Back', category: 'defense', description: 'Left-sided central coverage and channel defense' },
      { code: 'RCB', name: 'Right Center Back', category: 'defense', description: 'Right-sided central coverage and channel defense' },
      { code: 'LB', name: 'Left Back', category: 'defense', description: '1v1 flank containment, left channel progression and overlap' },
      { code: 'RB', name: 'Right Back', category: 'defense', description: '1v1 flank containment, right channel progression and overlap' },
      { code: 'LWB', name: 'Left Wing Back', category: 'defense', description: 'Dual-phase flank engine, width generation and recovery' },
      { code: 'RWB', name: 'Right Wing Back', category: 'defense', description: 'Dual-phase flank engine, width generation and recovery' },
      { code: 'CDM', name: 'Defensive Midfielder', category: 'midfield', description: 'Central pivot shield, passing distribution, counter-press disruptor' },
      { code: 'LDM', name: 'Left Defensive Mid', category: 'midfield', description: 'Left defensive half-space coverage and transition link' },
      { code: 'RDM', name: 'Right Defensive Mid', category: 'midfield', description: 'Right defensive half-space coverage and transition link' },
      { code: 'CM', name: 'Central Midfielder', category: 'midfield', description: 'Box-to-box engine, tempo controller, spatial link' },
      { code: 'LCM', name: 'Left Central Mid', category: 'midfield', description: 'Left channel interior passing link and pressing' },
      { code: 'RCM', name: 'Right Central Mid', category: 'midfield', description: 'Right channel interior passing link and pressing' },
      { code: 'CAM', name: 'Attacking Midfielder', category: 'midfield', description: 'Half-space unlocker, creative playmaker, key-pass distributor' },
      { code: 'LAM', name: 'Left Attacking Mid', category: 'midfield', description: 'Left half-space creative exploit and cut-in creator' },
      { code: 'RAM', name: 'Right Attacking Mid', category: 'midfield', description: 'Right half-space creative exploit and cut-in creator' },
      { code: 'LM', name: 'Left Midfielder', category: 'midfield', description: 'Flank balance, diagonal tracking, crossing service' },
      { code: 'RM', name: 'Right Midfielder', category: 'midfield', description: 'Flank balance, diagonal tracking, crossing service' },
      { code: 'LW', name: 'Left Winger', category: 'attack', description: '1v1 isolation dribbling, cut-in shooting, aggressive flank penetration' },
      { code: 'RW', name: 'Right Winger', category: 'attack', description: '1v1 isolation dribbling, cut-in shooting, aggressive flank penetration' },
      { code: 'CF', name: 'Center Forward', category: 'attack', description: 'False-9 link play, combining midfield to attack, pocket receiver' },
      { code: 'SS', name: 'Second Striker', category: 'attack', description: 'Supporting striker, trailing runs, half-space combinations' },
      { code: 'ST', name: 'Striker', category: 'attack', description: 'Box penetration, target play, blind-side runs, clinical finishing' },
    ],
  },
  {
    sportId: 'basketball',
    displayName: 'Vanguard Basketball',
    schemaVersion: 2,
    status: 'active',
    attributes: [
      { id: 'shooting', name: 'Shooting Range', shortLabel: 'SHO', hexColor: '#ff0055', playerStatKey: 'shooting' },
      { id: 'playmaking', name: 'Playmaking & Handles', shortLabel: 'PLY', hexColor: '#ffcc00', playerStatKey: 'playmaking' },
      { id: 'rebounding', name: 'Rebounding & Glass', shortLabel: 'REB', hexColor: '#9d00ff', playerStatKey: 'rebounding' },
      { id: 'defense', name: 'Lockdown Defense', shortLabel: 'DEF', hexColor: '#00f0ff', playerStatKey: 'defense' },
      { id: 'athletics', name: 'Athleticism & Burst', shortLabel: 'ATH', hexColor: '#00ff66', playerStatKey: 'athletics' },
      { id: 'finishing', name: 'Rim Finishing', shortLabel: 'FIN', hexColor: '#ff6600', playerStatKey: 'finishing' },
    ],
    palette: { fg: '#fb923c', glow: 'rgba(251, 146, 60, 0.22)', ring: 'rgba(251, 146, 60, 0.45)' },
    iconClass: 'ph-basketball',
    iconName: 'sport.basketball',
    aliases: ['basketball', 'hoops', 'ball', 'vanguard basketball', 'bball'],
    rpgProjection: {
      ball_mastery: ['playmaking', 'ball_handling', 'dribbling'],
      striking: ['shooting', 'finishing'],
      pace: ['athletics', 'speed', 'pace'],
      scanning: ['playmaking', 'vision', 'court_vision'],
      grit: ['defense', 'rebounding', 'grit'],
    },
    positions: [
      { code: 'PG', name: 'Point Guard', category: 'guard', description: 'Floor general, tempo control, ball handling, primary distribution' },
      { code: 'SG', name: 'Shooting Guard', category: 'guard', description: 'Perimeter scoring, 3-point threat, off-ball movement, secondary defense' },
      { code: 'SF', name: 'Small Forward', category: 'forward', description: 'Versatile wing scorer, slashing, transition finishes, perimeter containment' },
      { code: 'PF', name: 'Power Forward', category: 'forward', description: 'High-low passing, mid-range shooting, rim protection, interior rebounding' },
      { code: 'C', name: 'Center', category: 'forward', description: 'Paint anchor, shot deterrence, pick-and-roll screen sets, glass dominance' },
    ],
  },
  {
    sportId: 'baseball',
    displayName: 'Vanguard Baseball',
    schemaVersion: 2,
    status: 'active',
    attributes: [
      { id: 'hitting', name: 'Contact Hitting', shortLabel: 'HIT', hexColor: '#ff0055', playerStatKey: 'hitting' },
      { id: 'power', name: 'Power Slugging', shortLabel: 'PWR', hexColor: '#9d00ff', playerStatKey: 'power' },
      { id: 'fielding', name: 'Glove & Fielding', shortLabel: 'FLD', hexColor: '#00f0ff', playerStatKey: 'fielding' },
      { id: 'arm', name: 'Arm Velocity & Accuracy', shortLabel: 'ARM', hexColor: '#ff6600', playerStatKey: 'arm' },
      { id: 'speed', name: 'Base Running Speed', shortLabel: 'SPD', hexColor: '#00ff66', playerStatKey: 'speed' },
      { id: 'vision', name: 'Plate Discipline & IQ', shortLabel: 'VIS', hexColor: '#ffcc00', playerStatKey: 'vision' },
    ],
    palette: { fg: '#60a5fa', glow: 'rgba(96, 165, 250, 0.22)', ring: 'rgba(96, 165, 250, 0.45)' },
    iconClass: 'ph-baseball',
    iconName: 'sport.baseball',
    aliases: ['baseball', 'softball', 'vanguard baseball', 'hardball'],
    rpgProjection: {
      ball_mastery: ['hitting', 'fielding'],
      striking: ['power', 'arm'],
      pace: ['speed', 'pace', 'athletics'],
      scanning: ['vision', 'scanning', 'awareness'],
      grit: ['fielding', 'defense', 'grit'],
    },
    positions: [
      { code: 'P', name: 'Pitcher', category: 'battery', description: 'Mound commander, pitch sequencing, velocity, location control' },
      { code: 'C', name: 'Catcher', category: 'battery', description: 'Field general, pitch framing, blocking, throw-downs, plate defense' },
      { code: '1B', name: 'First Base', category: 'infield', description: 'Corner glove, scoop technique, power bat anchor' },
      { code: '2B', name: 'Second Base', category: 'infield', description: 'Double play pivot, up-the-middle range, relay distribution' },
      { code: '3B', name: 'Third Base', category: 'infield', description: 'Hot corner reactions, strong throwing arm, bunt coverage' },
      { code: 'SS', name: 'Shortstop', category: 'infield', description: 'Captain of infield, deep range, dynamic arm angle throws' },
      { code: 'LF', name: 'Left Field', category: 'outfield', description: 'Corner outfield tracking, accurate cutoff throws' },
      { code: 'CF', name: 'Center Field', category: 'outfield', description: 'Outfield captain, gap-to-gap speed, elite catch radius' },
      { code: 'RF', name: 'Right Field', category: 'outfield', description: 'Deep corner coverage, cannon arm for third-base throw-outs' },
      { code: 'DH', name: 'Designated Hitter', category: 'specialist', description: 'Pure offensive run producer, high slugging' },
    ],
  },
  {
    sportId: 'football',
    displayName: 'Vanguard Football',
    schemaVersion: 2,
    status: 'active',
    attributes: [
      { id: 'speed', name: 'Top-End Speed', shortLabel: 'SPD', hexColor: '#00ff66', playerStatKey: 'speed' },
      { id: 'strength', name: 'Functional Power', shortLabel: 'STR', hexColor: '#ff6600', playerStatKey: 'strength' },
      { id: 'agility', name: 'Agility & Route Sharpness', shortLabel: 'AGI', hexColor: '#00f0ff', playerStatKey: 'agility' },
      { id: 'awareness', name: 'Football IQ & Awareness', shortLabel: 'AWR', hexColor: '#ffcc00', playerStatKey: 'awareness' },
      { id: 'tackling', name: 'Tackling & Pursuit', shortLabel: 'TAC', hexColor: '#9d00ff', playerStatKey: 'tackling' },
      { id: 'catching', name: 'Hands & Ball Security', shortLabel: 'CAT', hexColor: '#ff0055', playerStatKey: 'catching' },
    ],
    palette: { fg: '#a78bfa', glow: 'rgba(167, 139, 250, 0.22)', ring: 'rgba(167, 139, 250, 0.45)' },
    iconClass: 'ph-football',
    iconName: 'sport.football',
    aliases: ['football', 'american football', 'gridiron', 'vanguard football'],
    rpgProjection: {
      ball_mastery: ['catching', 'ball_handling', 'dribbling'],
      striking: ['strength', 'power'],
      pace: ['speed', 'agility', 'pace'],
      scanning: ['awareness', 'vision', 'scanning'],
      grit: ['tackling', 'defense', 'grit'],
    },
    positions: [
      { code: 'QB', name: 'Quarterback', category: 'offense', description: 'Offensive field commander, progression reads, ball placement' },
      { code: 'RB', name: 'Running Back', category: 'offense', description: 'Vision between tackles, burst through second level, pass protection' },
      { code: 'FB', name: 'Fullback', category: 'offense', description: 'Lead blocker, short yardage power conversions, goal-line protection' },
      { code: 'WR', name: 'Wide Receiver', category: 'offense', description: 'Route running nuance, speed releases, contested catch mastery' },
      { code: 'TE', name: 'Tight End', category: 'offense', description: 'In-line edge blocking, seam stretch receiver, mismatch creator' },
      { code: 'OT', name: 'Offensive Tackle', category: 'offense', description: 'Pass rush neutralization, edge run sealing, kick-slide mechanics' },
      { code: 'OG', name: 'Offensive Guard', category: 'offense', description: 'Interior power drive, pull blocking, pocket integrity' },
      { code: 'C', name: 'Center', category: 'offense', description: 'Front-seven defensive read calls, snap execution, interior anchor' },
      { code: 'DE', name: 'Defensive End', category: 'defense', description: 'Edge rush bend, run containment, quarterback pressure' },
      { code: 'DT', name: 'Defensive Tackle', category: 'defense', description: 'A-gap/B-gap plugger, interior penetration, double-team shedder' },
      { code: 'LB', name: 'Linebacker', category: 'defense', description: 'Second-level enforcer, run fit discipline, zone hook coverage' },
      { code: 'CB', name: 'Cornerback', category: 'defense', description: 'Boundary island coverage, press-man technique, ball disruption' },
      { code: 'FS', name: 'Free Safety', category: 'defense', description: 'Centerfield range, deep ball tracking, pass breakups' },
      { code: 'SS', name: 'Strong Safety', category: 'defense', description: 'Box run support, tight end coverage, downhill tackling' },
      { code: 'K', name: 'Kicker', category: 'special_teams', description: 'Field goal accuracy, kickoff hang-time, pressure executions' },
      { code: 'P', name: 'Punter', category: 'special_teams', description: 'Directional pinning, spiral control, field position flip' },
    ],
  },
  {
    sportId: 'volleyball',
    displayName: 'Vanguard Volleyball',
    schemaVersion: 2,
    status: 'active',
    attributes: [
      { id: 'serving', name: 'Jump / Float Serving', shortLabel: 'SRV', hexColor: '#ff0055', playerStatKey: 'serving' },
      { id: 'passing', name: 'Platform Passing', shortLabel: 'PAS', hexColor: '#ffcc00', playerStatKey: 'passing' },
      { id: 'setting', name: 'Hands & Setting Tempo', shortLabel: 'SET', hexColor: '#00f0ff', playerStatKey: 'setting' },
      { id: 'hitting', name: 'Attacking & Spiking', shortLabel: 'HIT', hexColor: '#ff6600', playerStatKey: 'hitting' },
      { id: 'blocking', name: 'Net Blocking & Press', shortLabel: 'BLK', hexColor: '#9d00ff', playerStatKey: 'blocking' },
      { id: 'defense', name: 'Floor Digging & Hustle', shortLabel: 'DIG', hexColor: '#00ff66', playerStatKey: 'defense' },
    ],
    palette: { fg: '#ec4899', glow: 'rgba(236, 72, 153, 0.22)', ring: 'rgba(236, 72, 153, 0.45)' },
    iconClass: 'ph-volleyball',
    iconName: 'sport.volleyball',
    aliases: ['volleyball', 'beach volleyball', 'vanguard volleyball', 'vball'],
    rpgProjection: {
      ball_mastery: ['setting', 'passing'],
      striking: ['hitting', 'serving'],
      pace: ['defense', 'agility', 'speed'],
      scanning: ['setting', 'vision', 'awareness'],
      grit: ['blocking', 'defense', 'grit'],
    },
    positions: [
      { code: 'OH', name: 'Outside Hitter', category: 'attacker', description: 'Primary terminal attacker, all-around passing and back-row hitting' },
      { code: 'MB', name: 'Middle Blocker', category: 'blocker', description: 'First line of net defense, quick-tempo transitions, roof blocking' },
      { code: 'OPP', name: 'Opposite Hitter', category: 'attacker', description: 'Right-side attacker, block against opposing OH, out-of-system release' },
      { code: 'S', name: 'Setter', category: 'playmaker', description: 'Offensive conductor, second-touch delivery, hittable ball location' },
      { code: 'L', name: 'Libero', category: 'defense', description: 'Defensive anchor, serve-receive captain, relentless floor pursuit' },
      { code: 'DS', name: 'Defensive Specialist', category: 'defense', description: 'Back-row substitution, serve-receive stabilization, precision passing' },
    ],
  },
  {
    sportId: 'lacrosse',
    displayName: 'Vanguard Lacrosse',
    schemaVersion: 2,
    status: 'active',
    attributes: [
      { id: 'cradling', name: 'Stick Handling & Cradling', shortLabel: 'CRD', hexColor: '#00f0ff', playerStatKey: 'cradling' },
      { id: 'shooting', name: 'Shot Velocity & Placement', shortLabel: 'SHO', hexColor: '#ff0055', playerStatKey: 'shooting' },
      { id: 'passing', name: 'Feeds & Transition Passing', shortLabel: 'PAS', hexColor: '#ffcc00', playerStatKey: 'passing' },
      { id: 'defense', name: 'On-Ball Body & Stick Checks', shortLabel: 'DEF', hexColor: '#9d00ff', playerStatKey: 'defense' },
      { id: 'speed', name: 'Transition Foot Speed', shortLabel: 'SPD', hexColor: '#00ff66', playerStatKey: 'speed' },
      { id: 'groundballs', name: 'Ground Ball Scraps', shortLabel: 'GB', hexColor: '#ff6600', playerStatKey: 'groundballs' },
    ],
    palette: { fg: '#14b8a6', glow: 'rgba(20, 184, 166, 0.22)', ring: 'rgba(20, 184, 166, 0.45)' },
    iconClass: 'ph-trophy',
    iconName: 'sport.lacrosse',
    aliases: ['lacrosse', 'lax', 'vanguard lacrosse'],
    rpgProjection: {
      ball_mastery: ['cradling', 'passing'],
      striking: ['shooting', 'strength'],
      pace: ['speed', 'agility', 'pace'],
      scanning: ['passing', 'vision', 'scanning'],
      grit: ['defense', 'groundballs', 'grit'],
    },
    positions: [
      { code: 'A', name: 'Attackman', category: 'attack', description: 'Offensive initiator around the crease and GLE, feeding and shooting' },
      { code: 'M', name: 'Midfielder', category: 'midfield', description: 'Two-way transition motor, dodging, clearing and riding' },
      { code: 'D', name: 'Close Defenseman', category: 'defense', description: '6-foot stick containment, takeaway checks, crease communication' },
      { code: 'G', name: 'Goalie', category: 'goalkeeper', description: 'Crease commander, quick stick saves, clearing quarterback' },
      { code: 'LSM', name: 'Long Stick Midfielder', category: 'specialist', description: 'Disruptive wing coverage on faceoffs, transition turnovers' },
      { code: 'FOGO', name: 'Faceoff Specialist', category: 'specialist', description: 'Clamp speed, rotational power, possession win generator' },
    ],
  },
  {
    sportId: 'hockey',
    displayName: 'Vanguard Hockey',
    schemaVersion: 2,
    status: 'active',
    attributes: [
      { id: 'skating', name: 'Edge Work & Skating Speed', shortLabel: 'SKT', hexColor: '#00ff66', playerStatKey: 'skating' },
      { id: 'shooting', name: 'Wrist / Slap Shot Accuracy', shortLabel: 'SHO', hexColor: '#ff0055', playerStatKey: 'shooting' },
      { id: 'puckhandling', name: 'Stickhandling in Traffic', shortLabel: 'PCK', hexColor: '#00f0ff', playerStatKey: 'puckhandling' },
      { id: 'passing', name: 'Tape-to-Tape Passing', shortLabel: 'PAS', hexColor: '#ffcc00', playerStatKey: 'passing' },
      { id: 'defense', name: 'Gap Control & Stick Checking', shortLabel: 'DEF', hexColor: '#9d00ff', playerStatKey: 'defense' },
      { id: 'physicality', name: 'Board Battles & Body Contact', shortLabel: 'PHY', hexColor: '#ff6600', playerStatKey: 'physicality' },
    ],
    palette: { fg: '#38bdf8', glow: 'rgba(56, 189, 248, 0.22)', ring: 'rgba(56, 189, 248, 0.45)' },
    iconClass: 'ph-shield',
    iconName: 'sport.hockey',
    aliases: ['hockey', 'ice hockey', 'field hockey', 'vanguard hockey'],
    rpgProjection: {
      ball_mastery: ['puckhandling', 'passing'],
      striking: ['shooting', 'physicality'],
      pace: ['skating', 'speed', 'agility'],
      scanning: ['passing', 'vision', 'scanning'],
      grit: ['defense', 'physicality', 'grit'],
    },
    positions: [
      { code: 'C', name: 'Center', category: 'forward', description: 'Faceoff dominance, deep defensive support, 200-foot ice leader' },
      { code: 'LW', name: 'Left Wing', category: 'forward', description: 'Forechecking pressure, wall battles, off-wing one-timer option' },
      { code: 'RW', name: 'Right Wing', category: 'forward', description: 'Net-front presence, rush penetration, cycle play anchor' },
      { code: 'LD', name: 'Left Defenseman', category: 'defense', description: 'Blue-line puck distribution, gap control, defensive zone retrieval' },
      { code: 'RD', name: 'Right Defenseman', category: 'defense', description: 'Point shot delivery, physical box-outs, breakout transition pass' },
      { code: 'G', name: 'Goaltender', category: 'goaltender', description: 'Rebound control, butterfly technique, tracking through traffic' },
    ],
  },
  {
    sportId: 'tennis',
    displayName: 'Vanguard Tennis',
    schemaVersion: 2,
    status: 'active',
    attributes: [
      { id: 'serve', name: 'First & Second Serve', shortLabel: 'SRV', hexColor: '#ff0055', playerStatKey: 'serve' },
      { id: 'forehand', name: 'Forehand Drive & Topspin', shortLabel: 'FHD', hexColor: '#ff6600', playerStatKey: 'forehand' },
      { id: 'backhand', name: 'Backhand Depth & Angle', shortLabel: 'BHD', hexColor: '#00f0ff', playerStatKey: 'backhand' },
      { id: 'movement', name: 'Footwork & Recovery Speed', shortLabel: 'FTW', hexColor: '#00ff66', playerStatKey: 'movement' },
      { id: 'netplay', name: 'Volleys & Overhead Smashes', shortLabel: 'NET', hexColor: '#ffcc00', playerStatKey: 'netplay' },
      { id: 'tactics', name: 'Court Positioning & IQ', shortLabel: 'TAC', hexColor: '#9d00ff', playerStatKey: 'tactics' },
    ],
    palette: { fg: '#a3e635', glow: 'rgba(163, 230, 53, 0.22)', ring: 'rgba(163, 230, 53, 0.45)' },
    iconClass: 'ph-tennis-ball',
    iconName: 'sport.tennis',
    aliases: ['tennis', 'pickleball', 'padel', 'racquet sports', 'vanguard tennis'],
    rpgProjection: {
      ball_mastery: ['netplay', 'forehand', 'backhand'],
      striking: ['serve', 'forehand'],
      pace: ['movement', 'speed', 'agility'],
      scanning: ['tactics', 'court_iq', 'vision'],
      grit: ['movement', 'tactics', 'grit'],
    },
    positions: [
      { code: 'S', name: 'Singles Player', category: 'singles', description: 'Full court coverage, rally tolerance, aggressive baseline play' },
      { code: 'D-N', name: 'Doubles Net Specialist', category: 'doubles', description: 'Poaching, reflex volleys, closing off the middle alley' },
      { code: 'D-B', name: 'Doubles Baseline Partner', category: 'doubles', description: 'Diagonals, lob management, setting up the net partner' },
    ],
  },
];

async function seed() {
  console.log(`[SEED] Seeding sports_configs for ${SPORTS_SEED_DATA.length} sports...`);
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const sport of SPORTS_SEED_DATA) {
    const ref = db.collection('sports_configs').doc(sport.sportId);
    batch.set(
      ref,
      {
        ...sport,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );
    console.log(`  ✓ Queued ${sport.sportId} (${sport.displayName}) with ${sport.positions.length} positions`);
  }

  await batch.commit();
  console.log('[SEED] Successfully committed all 8 sports to Firestore sports_configs collection!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[SEED] Error seeding sports configs:', err);
  process.exit(1);
});
