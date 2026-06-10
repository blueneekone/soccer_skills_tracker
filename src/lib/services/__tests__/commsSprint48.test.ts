/**
 * commsSprint48.test.ts — Epic 4.8 director club broadcast (source-scan)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');
const FUNCTIONS = join(ROOT, '..', '..', 'functions');
const COMMS = join(FUNCTIONS, 'comms.js');
const INDEX = join(FUNCTIONS, 'index.js');
const COMPOSER = join(ROOT, 'components', 'director', 'DirectorClubBroadcastComposer.svelte');
const COMMS_SVC = join(ROOT, 'services', 'comms.svelte.ts');
const DIRECTOR_PAGE = join(ROOT, '..', 'routes', '(app)', 'director', '+page.svelte');
const NAV = join(ROOT, 'shell', 'workspaceNav.js');

const comms = readFileSync(COMMS, 'utf8');
const indexJs = readFileSync(INDEX, 'utf8');
const composer = readFileSync(COMPOSER, 'utf8');
const commsSvc = readFileSync(COMMS_SVC, 'utf8');
const directorPage = readFileSync(DIRECTOR_PAGE, 'utf8');
const nav = readFileSync(NAV, 'utf8');

describe('Epic 4.8 — clubSportBroadcast callable', () => {
	it('exports clubSportBroadcast from comms.js', () => {
		expect(comms).toMatch(/exports\.clubSportBroadcast\s*=\s*onCall/);
	});

	it('is re-exported from functions/index.js', () => {
		expect(indexJs).toMatch(/exports\.clubSportBroadcast\s*=\s*commsHandlers\.clubSportBroadcast/);
	});

	it('restricts to director and platform admin roles', () => {
		const block = comms.slice(comms.indexOf('clubSportBroadcast'));
		expect(block).toMatch(/directorRoles\s*=\s*\['director', 'global_admin', 'super_admin'\]/);
	});

	it('fans out via shared commitTeamBroadcast helper', () => {
		expect(comms).toMatch(/async function commitTeamBroadcast/);
		expect(comms).toMatch(/broadcastSource:\s*'club_broadcast'/);
		expect(comms).toMatch(/await commitTeamBroadcast\(/);
	});

	it('queries all club teams when teamIds omitted', () => {
		const block = comms.slice(comms.indexOf('clubSportBroadcast'));
		expect(block).toMatch(/where\(['"]clubId['"],\s*['"]==['"],\s*clubId\)/);
	});

	it('writes team_broadcasts docs (Epic 4.3 push bus)', () => {
		expect(comms).toMatch(/db\.collection\(['"]team_broadcasts['"]\)/);
		expect(comms).toMatch(/source:\s*broadcastSource/);
	});
});

describe('Epic 4.8 — client CommsEngine + composer', () => {
	it('CommsEngine wires clubSportBroadcast in us-east1', () => {
		expect(commsSvc).toMatch(/httpsCallable\(fns,\s*['"]clubSportBroadcast['"]\)/);
		expect(commsSvc).toMatch(/clubBroadcastMessage\(/);
	});

	it('DirectorClubBroadcastComposer calls clubBroadcastMessage', () => {
		expect(composer).toMatch(/clubBroadcastMessage/);
		expect(composer).toMatch(/All teams/);
	});

	it('mounted on /director?tab=comms', () => {
		expect(directorPage).toMatch(/DirectorClubBroadcastComposer/);
		expect(directorPage).toMatch(/activeTab === 'comms'/);
		expect(nav).toMatch(/tab:\s*['"]comms['"]/);
	});
});

describe('Epic 4.8 — safeSportBroadcast refactor safety', () => {
	it('safeSportBroadcast still delegates to commitTeamBroadcast', () => {
		const block = comms.slice(comms.indexOf('exports.safeSportBroadcast'));
		const end = block.indexOf('exports.clubSportBroadcast');
		expect(block.slice(0, end)).toMatch(/return commitTeamBroadcast\(/);
	});
});
