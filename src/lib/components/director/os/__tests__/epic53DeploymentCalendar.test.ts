/**
 * epic53DeploymentCalendar.test.ts — Epic 5.3 deployment calendar functional guards
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src');
const CAL = join(ROOT, 'lib/components/director/os/DeploymentCalendar.svelte');
const FIELD_OPS = join(ROOT, 'lib/components/director/os/FieldOpsModule.svelte');
const STALE_PANEL = join(ROOT, 'lib/components/director/os/DeploymentCalendarPanel.svelte');
const RULES = join(process.cwd(), 'firestore.rules');
const INDEXES = join(process.cwd(), 'firestore.indexes.json');
const NOTIFICATION_OPS = join(process.cwd(), 'functions/src/domains/notificationOps.js');

describe('Epic 5.3 — tactical deployment calendar', () => {
	it('Field Ops embeds DeploymentCalendar (not legacy read-only panel)', () => {
		const src = readFileSync(FIELD_OPS, 'utf8');
		expect(src).toMatch(/DeploymentCalendar/);
		expect(src).not.toMatch(/DeploymentCalendarPanel/);
		expect(existsSync(STALE_PANEL)).toBe(false);
	});

	it('DeploymentCalendar creates deployment_calendar_entries with team + facility', () => {
		const src = readFileSync(CAL, 'utf8');
		expect(src).toMatch(/deployment_calendar_entries/);
		expect(src).toMatch(/addDoc/);
		expect(src).toMatch(/teamIds:\s*\[teamId\]/);
		expect(src).toMatch(/facilityId/);
		expect(src).toMatch(/New deployment/);
	});

	it('DeploymentCalendar toggles visibility for family announce vs staff-only', () => {
		const src = readFileSync(CAL, 'utf8');
		expect(src).toMatch(/announceToTeams/);
		expect(src).toMatch(/visibility:\s*announceToTeams\s*\?\s*'club'\s*:\s*'staff_only'/);
		expect(src).toMatch(/Announce to team families/);
	});

	it('firestore.rules allow director/registrar create with validation helper', () => {
		const rules = readFileSync(RULES, 'utf8');
		expect(rules).toMatch(/match \/deployment_calendar_entries\/\{entryId\}/);
		expect(rules).toMatch(/deploymentCalendarEntryWriteOk/);
		expect(rules).toMatch(/allow create: if authed\(\)/);
	});

	it('firestore.indexes.json includes clubId + startsAt composite', () => {
		const indexes = readFileSync(INDEXES, 'utf8');
		expect(indexes).toMatch(/deployment_calendar_entries/);
		expect(indexes).toMatch(/clubId/);
		expect(indexes).toMatch(/startsAt/);
	});

	it('facility map syncs to legacy fields collection for pitch booking', () => {
		const vault = readFileSync(
			join(ROOT, 'lib/components/field-ops/FacilityMapVault.svelte'),
			'utf8',
		);
		const bridge = readFileSync(
			join(ROOT, 'lib/director/fieldOps/syncFacilityToLegacyField.ts'),
			'utf8',
		);
		const fieldOps = readFileSync(FIELD_OPS, 'utf8');
		expect(bridge).toMatch(/directorUpsertField/);
		expect(vault).toMatch(/syncFacilityToLegacyField/);
		expect(vault).toMatch(/mirrorFacilityToFields/);
		expect(fieldOps).toMatch(/syncFacilityToLegacyField/);
		expect(fieldOps).toMatch(/clubs', resolvedClubId, 'facilities'/);
	});

	it('Epic 4.5 trigger broadcasts non-staff_only deployment entries', () => {
		const ops = readFileSync(NOTIFICATION_OPS, 'utf8');
		expect(ops).toMatch(/onDeploymentCalendarEntryCreated/);
		const block = ops.slice(ops.indexOf('onDeploymentCalendarEntryCreated'));
		expect(block).toMatch(/staff_only/);
		expect(block).toMatch(/team_broadcasts/);
	});
});
