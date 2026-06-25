/**
 * commsPhase3d.test.ts — Epic 4.15d staff internal channel guards
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	COMMS_CHANNEL_TYPE_REGISTRY,
	canPersonaPostChannel,
	canPersonaReadChannel,
} from '$lib/comms/channelTypes.js';

const ROOT = join(__dirname, '..', '..', '..');
const HUB_SHELL = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const STAFF_CH = join(ROOT, 'lib/components/comms/CommsStaffInternalChannel.svelte');
const CHANNEL_OPS = join(ROOT, '..', 'functions/src/domains/commsChannelOps.js');
const OPERATIVE_OPS = join(ROOT, '..', 'functions/src/domains/operativeOps.js');
const INDEX = join(ROOT, '..', 'functions/index.js');
const RULES = join(ROOT, '..', 'firestore.rules');
const CANON = join(ROOT, '..', 'docs/vision/COMMS_CHANNEL_CANON.md');

describe('commsPhase3d — channelTypes staff_internal', () => {
	it('registers staff_internal with staff post/read only', () => {
		expect(COMMS_CHANNEL_TYPE_REGISTRY.staff_internal).toBeDefined();
		expect(canPersonaPostChannel('staff_internal', 'coach')).toBe(true);
		expect(canPersonaPostChannel('staff_internal', 'director')).toBe(true);
		expect(canPersonaPostChannel('staff_internal', 'registrar')).toBe(true);
		expect(canPersonaPostChannel('staff_internal', 'parent')).toBe(false);
		expect(canPersonaReadChannel('staff_internal', 'parent')).toBe(false);
		expect(canPersonaReadChannel('staff_internal', 'player')).toBe(false);
	});
});

describe('commsPhase3d — server provisioning + send guards', () => {
	it('provisionStaffInternalChannel uses staff-internal-{teamId} path', () => {
		const src = readFileSync(CHANNEL_OPS, 'utf8');
		expect(src).toMatch(/provisionStaffInternalChannel/);
		expect(src).toMatch(/staff-internal-\$\{normTeamId\}/);
		expect(src).toMatch(/channelType:\s*'staff_internal'/);
		expect(src).toMatch(/safesportMonitored:\s*true/);
		expect(src).toMatch(/coachProvisionStaffInternal/);
	});

	it('sendChannelMessage rejects non-staff on staff_internal', () => {
		const src = readFileSync(OPERATIVE_OPS, 'utf8');
		expect(src).toMatch(/channelType === 'staff_internal'/);
		expect(src).toMatch(/Staff internal channels are restricted to club staff/);
		expect(src).toMatch(/messaging_audit/);
	});

	it('exports coachProvisionStaffInternal from index.js', () => {
		const src = readFileSync(INDEX, 'utf8');
		expect(src).toMatch(/coachProvisionStaffInternal/);
	});
});

describe('commsPhase3d — client hub', () => {
	it('CommsStaffInternalChannel provisions and uses sendChannelMessage', () => {
		expect(existsSync(STAFF_CH)).toBe(true);
		const src = readFileSync(STAFF_CH, 'utf8');
		expect(src).toMatch(/staff-internal-\$\{/);
		expect(src).toMatch(/coachProvisionStaffInternal/);
		expect(src).toMatch(/sendChannelMessage/);
		expect(src).toMatch(/STAFF COORDINATION/);
	});

	it('CommsHubShell mounts staff_internal for staff only', () => {
		const src = readFileSync(HUB_SHELL, 'utf8');
		expect(src).toMatch(/CommsStaffInternalChannel/);
		expect(src).toMatch(/showStaffInternal/);
		expect(src).toMatch(/'staff_internal'/);
	});

	it('firestore.rules scopes staff_internal to club staff roles', () => {
		const rules = readFileSync(RULES, 'utf8');
		expect(rules).toMatch(/canReadStaffInternalChannel/);
		expect(rules).toMatch(/staff_internal/);
		expect(rules).toMatch(/coachStaffCanAccessTeam/);
	});

	it('COMMS_CHANNEL_CANON marks Phase 3 staff_internal + compliance shipped', () => {
		const canon = readFileSync(CANON, 'utf8');
		expect(canon).toMatch(/staff_internal.*shipped/is);
		expect(canon).toMatch(/compliance.*shipped/is);
	});
});
