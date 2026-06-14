/**
 * ngbFormatAdapters.test.js — Federation Phase 2 format adapter unit tests.
 * Run: node functions/__tests__/ngbFormatAdapters.test.js
 */

'use strict';

const assert = require('assert');
const {
  formatAdapterRegistry,
  getFormatAdapter,
  listBuiltinFormatAdapters,
  mapUsSoccerRow,
  mapGotsportRow,
  buildCustomProfileAdapter,
  resolveExportAdapter,
  splitPlayerName,
} = require('../src/domains/ngbFormatAdapters');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`       ${err.message}`);
    failed++;
  }
}

function eq(a, b, msg) {
  assert.strictEqual(a, b, msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

const SAMPLE_ROW = {
  player_name: 'Mia Torres',
  player_email: 'mia@example.com',
  team_id: 'team-1',
  team_name: 'U12 Elite',
  jersey_number: '7',
  date_of_birth: '2014-03-15',
  household_id: 'hh-1',
  guardian_emails: 'parent@example.com',
  primary_guardian_email: 'parent@example.com',
  vpc_status: 'verified',
  club_id: 'club-1',
};

console.log('\n── formatAdapterRegistry ──');

test('registry includes csv_v1, us_soccer_roster, gotsport_roster', () => {
  eq(formatAdapterRegistry.csv_v1.id, 'csv_v1');
  eq(formatAdapterRegistry.us_soccer_roster.id, 'us_soccer_roster');
  eq(formatAdapterRegistry.gotsport_roster.id, 'gotsport_roster');
});

test('listBuiltinFormatAdapters returns three built-ins', () => {
  const list = listBuiltinFormatAdapters();
  eq(list.length, 3);
  assert.ok(list.some((f) => f.id === 'us_soccer_roster'));
});

console.log('\n── splitPlayerName ──');

test('splits first and last name', () => {
  const parts = splitPlayerName('Mia Torres');
  eq(parts.first, 'Mia');
  eq(parts.last, 'Torres');
});

console.log('\n── us_soccer_roster adapter ──');

test('mapUsSoccerRow maps filing fields', () => {
  const mapped = mapUsSoccerRow(SAMPLE_ROW);
  eq(mapped.first_name, 'Mia');
  eq(mapped.last_name, 'Torres');
  eq(mapped.guardian_email, 'parent@example.com');
  eq(mapped.vpc_status, 'verified');
});

test('us_soccer adapter CSV includes state association headers', () => {
  const adapter = getFormatAdapter('us_soccer_roster');
  const csv = adapter.transform([SAMPLE_ROW]);
  assert.ok(csv.includes('first_name,last_name'));
  assert.ok(csv.includes('Mia,Torres'));
  assert.ok(csv.includes('parent@example.com'));
});

console.log('\n── gotsport_roster adapter ──');

test('mapGotsportRow maps GotSport columns', () => {
  const mapped = mapGotsportRow(SAMPLE_ROW);
  eq(mapped.PlayerName, 'Mia Torres');
  eq(mapped.ParentEmail, 'parent@example.com');
  eq(mapped.ClubID, 'club-1');
});

test('gotsport adapter CSV includes GotSport headers', () => {
  const adapter = getFormatAdapter('gotsport_roster');
  const csv = adapter.transform([SAMPLE_ROW]);
  assert.ok(csv.includes('PlayerName,Email,DOB'));
  assert.ok(csv.includes('Mia Torres'));
});

console.log('\n── custom export profile ──');

test('buildCustomProfileAdapter maps export_profiles columns', () => {
  const adapter = buildCustomProfileAdapter({
    bodyId: 'state_xyz',
    label: 'State XYZ',
    columns: [
      {header: 'Athlete', field: 'player_name'},
      {header: 'Guardian', field: 'primary_guardian_email'},
    ],
  });
  assert.ok(adapter);
  const csv = adapter.transform([SAMPLE_ROW]);
  assert.ok(csv.includes('Athlete,Guardian'));
  assert.ok(csv.includes('Mia Torres,parent@example.com'));
});

test('resolveExportAdapter uses profile: prefix', () => {
  const adapter = resolveExportAdapter('profile:state_xyz', {
    bodyId: 'state_xyz',
    columns: [{header: 'Name', field: 'player_name'}],
  });
  assert.ok(adapter);
  eq(adapter.id, 'profile:state_xyz');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
