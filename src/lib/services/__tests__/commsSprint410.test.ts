/**
 * commsSprint410.test.ts — Epic 4.10 report message incident guards
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FUNCTIONS = join(__dirname, '..', '..', '..', '..', 'functions');
const COMMS = join(FUNCTIONS, 'comms.js');
const INDEX = join(FUNCTIONS, 'index.js');
const RULES = join(__dirname, '..', '..', '..', '..', 'firestore.rules');
const INDEXES = join(__dirname, '..', '..', '..', '..', 'firestore.indexes.json');
const ROOT = join(__dirname, '..', '..');

const comms = readFileSync(COMMS, 'utf8');
const indexJs = readFileSync(INDEX, 'utf8');
const rules = readFileSync(RULES, 'utf8');
const indexes = readFileSync(INDEXES, 'utf8');
const reportPanel = readFileSync(join(ROOT, 'components', 'comms', 'ReportMessageIncident.svelte'), 'utf8');
const messagesPage = readFileSync(join(ROOT, '..', 'routes', '(app)', 'messages', '+page.svelte'), 'utf8');
const compliance = readFileSync(
	join(ROOT, 'components', 'director', 'DirectorCommsCompliancePanel.svelte'),
	'utf8',
);

describe('Epic 4.10 — reportMessageIncident callable', () => {
	it('exports reportMessageIncident from comms.js and index.js', () => {
		expect(comms).toMatch(/exports\.reportMessageIncident\s*=\s*onCall/);
		expect(indexJs).toMatch(/exports\.reportMessageIncident\s*=\s*commsHandlers\.reportMessageIncident/);
	});

	it('writes message_incidents with reporter + club scope', () => {
		const block = comms.slice(comms.indexOf('reportMessageIncident'));
		expect(block).toMatch(/message_incidents/);
		expect(block).toMatch(/reporterEmail:\s*callerEmail/);
		expect(block).toMatch(/status:\s*['"]open['"]/);
	});

	it('firestore rules gate message_incidents read to director club + reporter', () => {
		expect(rules).toMatch(/match \/message_incidents\/\{incidentId\}/);
		expect(rules).toMatch(/resource\.data\.clubId == tokenClub\(\)/);
		expect(rules).toMatch(/resource\.data\.reporterEmail == emailKey\(\)/);
	});

	it('has clubId + createdAt index on message_incidents', () => {
		expect(indexes).toMatch(/message_incidents/);
	});
});

describe('Epic 4.10 — client report surface', () => {
	it('ReportMessageIncident calls reportMessageIncident callable', () => {
		expect(reportPanel).toMatch(/reportMessageIncident/);
	});

	it('mounted on /messages for non-admin users with club context', () => {
		expect(messagesPage).toMatch(/ReportMessageIncident/);
	});

	it('director compliance console lists open incidents', () => {
		expect(compliance).toMatch(/message_incidents/);
		expect(compliance).toMatch(/Open incidents/);
	});
});
