/**
 * commsPhase3c.test.ts — Epic 4.15c compliance typed channel stream guards
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
const COMPLIANCE_CH = join(ROOT, 'lib/components/comms/CommsComplianceChannel.svelte');
const REPORT = join(ROOT, 'lib/components/comms/ReportMessageIncident.svelte');
const COMMS_JS = join(ROOT, '..', 'functions/comms.js');
const CHANNEL_OPS = join(ROOT, '..', 'functions/src/domains/commsChannelOps.js');
const RULES = join(ROOT, '..', 'firestore.rules');

describe('commsPhase3c — channelTypes compliance', () => {
	it('registers compliance with director/registrar post and parent read', () => {
		expect(COMMS_CHANNEL_TYPE_REGISTRY.compliance).toBeDefined();
		expect(canPersonaPostChannel('compliance', 'director')).toBe(true);
		expect(canPersonaPostChannel('compliance', 'registrar')).toBe(true);
		expect(canPersonaPostChannel('compliance', 'coach')).toBe(false);
		expect(canPersonaReadChannel('compliance', 'parent')).toBe(true);
	});
});

describe('commsPhase3c — server compliance channel path', () => {
	it('postChannelSystemMessage supports compliance-{clubId}', () => {
		const src = readFileSync(CHANNEL_OPS, 'utf8');
		expect(src).toMatch(/compliance:\s*new Set/);
		expect(src).toMatch(/compliance-\$\{normClubId\}/);
		expect(src).toMatch(/channelType === 'compliance'/);
	});

	it('reportMessageIncident hooks compliance system message without PII', () => {
		const src = readFileSync(COMMS_JS, 'utf8');
		const hookStart = src.indexOf('await postChannelSystemMessage({');
		const hookBlock = src.slice(hookStart, hookStart + 900);
		expect(src).toMatch(/postChannelSystemMessage/);
		expect(hookBlock).toMatch(/channelType:\s*'compliance'/);
		expect(hookBlock).toMatch(/status:\s*'received'/);
		expect(hookBlock).not.toMatch(/reason:/);
		expect(hookBlock).not.toMatch(/bodyPreview/);
	});
});

describe('commsPhase3c — client compliance hub', () => {
	it('CommsComplianceChannel exists with director console link', () => {
		expect(existsSync(COMPLIANCE_CH)).toBe(true);
		const src = readFileSync(COMPLIANCE_CH, 'utf8');
		expect(src).toMatch(/compliance-\$\{/);
		expect(src).toMatch(/director\?tab=comms/);
		expect(src).not.toMatch(/export.*json|downloadExport/i);
	});

	it('CommsHubShell mounts compliance rail', () => {
		const src = readFileSync(HUB_SHELL, 'utf8');
		expect(src).toMatch(/CommsComplianceChannel/);
		expect(src).toMatch(/'compliance'/);
	});

	it('ReportMessageIncident links to compliance channel on success', () => {
		const src = readFileSync(REPORT, 'utf8');
		expect(src).toMatch(/channel=compliance/);
		expect(src).toMatch(/View compliance channel/);
	});

	it('firestore.rules scopes compliance parent reads by household/parentEmail', () => {
		const rules = readFileSync(RULES, 'utf8');
		expect(rules).toMatch(/channelType == 'compliance'/);
		expect(rules).toMatch(/parentEmail == emailKey\(\)/);
		expect(rules).toMatch(/householdId == userDoc\(\)\.householdId/);
	});
});
