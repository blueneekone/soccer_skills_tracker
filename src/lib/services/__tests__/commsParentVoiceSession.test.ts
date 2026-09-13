/**
 * commsParentVoiceSession.test.ts — COMMS-VOICE-V1 drift guards
 * Authority: docs/vision/COMMS_PLATFORM_STANDARDS.md §4.3
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	COMMS_CHANNEL_TYPE_REGISTRY,
	canPersonaPostChannel,
	canPersonaReadChannel,
} from '$lib/comms/channelTypes.js';
import { COMMS_NAV_CATEGORIES, getChannelNavCategory } from '$lib/comms/commsNavCategories.js';

const ROOT = join(__dirname, '..', '..', '..');
const OPS = join(ROOT, '..', 'functions/src/domains/parentVoiceSessionOps.js');
const ENGINE = join(ROOT, 'lib/services/comms.svelte.ts');
const LOBBY = join(ROOT, 'lib/components/comms/ParentVoiceSessionLobby.svelte');
const HUB = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const INDEX = join(ROOT, '..', 'functions/index.js');
const CANON = join(ROOT, '..', 'docs/vision/COMMS_CHANNEL_CANON.md');
const RULES = join(ROOT, '..', 'firestore.rules');
const PKG = join(ROOT, '..', 'package.json');

const opsSrc = readFileSync(OPS, 'utf8');
const engineSrc = readFileSync(ENGINE, 'utf8');
const lobbySrc = readFileSync(LOBBY, 'utf8');
const hubSrc = readFileSync(HUB, 'utf8');
const indexSrc = readFileSync(INDEX, 'utf8');
const canonSrc = readFileSync(CANON, 'utf8');
const rulesSrc = readFileSync(RULES, 'utf8');

describe('COMMS-VOICE-V1 — channelTypes parent_voice_session', () => {
	it('registers parent_voice_session with coach/director schedule + no minor visibility', () => {
		expect(COMMS_CHANNEL_TYPE_REGISTRY.parent_voice_session).toBeDefined();
		expect(COMMS_CHANNEL_TYPE_REGISTRY.parent_voice_session.whoCanPost).toEqual([
			'coach',
			'director',
		]);
		expect(COMMS_CHANNEL_TYPE_REGISTRY.parent_voice_session.minorVisibility).toBe('none');
		expect(COMMS_CHANNEL_TYPE_REGISTRY.parent_voice_session.replyModel).toBe('none');
		expect(canPersonaPostChannel('parent_voice_session', 'player')).toBe(false);
		expect(canPersonaReadChannel('parent_voice_session', 'parent')).toBe(true);
		expect(canPersonaReadChannel('parent_voice_session', 'player')).toBe(false);
	});

	it('maps parent_voice_session under Families nav category', () => {
		expect(COMMS_NAV_CATEGORIES.families.channelTypeIds).toContain('parent_voice_session');
		expect(getChannelNavCategory('parent_voice_session')).toBe('families');
	});
});

describe('COMMS-VOICE-V1 — CommsEngine callables', () => {
	it('wires createParentVoiceSession and joinParentVoiceSession', () => {
		expect(engineSrc).toMatch(/createParentVoiceSession/);
		expect(engineSrc).toMatch(/joinParentVoiceSession/);
		expect(engineSrc).toMatch(/httpsCallable\(fns, 'createParentVoiceSession'\)/);
		expect(engineSrc).toMatch(/httpsCallable\(fns, 'joinParentVoiceSession'\)/);
		expect(engineSrc).toMatch(/lastVoiceSessionResult/);
	});
});

describe('COMMS-VOICE-V1 — ParentVoiceSessionLobby UI', () => {
	it('discloses attendance logging and no recording in v1', () => {
		expect(lobbySrc).toMatch(/Attendance \(join and leave times\) is logged/i);
		expect(lobbySrc).toMatch(/not recorded/i);
		expect(lobbySrc).toMatch(/COMMS-VOICE-RECORDING/);
		expect(lobbySrc).toMatch(/no undisclosed monitoring/i);
	});

	it('links sessions to calendar events via calendarEventId', () => {
		expect(lobbySrc).toMatch(/calendarEventId/);
		expect(lobbySrc).toMatch(/team_workouts/);
	});

	it('uses DeliveryReceipt on coach schedule sends', () => {
		expect(lobbySrc).toMatch(/DeliveryReceipt/);
		expect(lobbySrc).toMatch(/deliveryReport/);
	});
});

describe('COMMS-VOICE-V1 — CommsHubShell Families rail', () => {
	it('mounts ParentVoiceSessionLobby for parent_voice_session channel', () => {
		expect(hubSrc).toMatch(/parent_voice_session/);
		expect(hubSrc).toMatch(/ParentVoiceSessionLobby/);
		expect(hubSrc).toMatch(/calendarEventId/);
	});
});

describe('COMMS-VOICE-V1 — server module exported', () => {
	it('index.js exports voice session callables', () => {
		expect(indexSrc).toContain('createParentVoiceSession');
		expect(indexSrc).toContain('joinParentVoiceSession');
	});

	it('deploy:comms includes parent voice session callables', () => {
		const deployComms = JSON.parse(readFileSync(PKG, 'utf8')).scripts['deploy:comms'] as string;
		expect(deployComms).toMatch(/createParentVoiceSession/);
		expect(deployComms).toMatch(/joinParentVoiceSession/);
	});

	it('parentVoiceSessionOps blocks minors and logs messaging_audit', () => {
		expect(opsSrc).toMatch(/SafeSport policy: minors cannot join parent voice sessions/);
		expect(opsSrc).toMatch(/messaging_audit/);
		expect(opsSrc).toMatch(/parent_voice_session_join/);
		expect(opsSrc).toMatch(/parent_voice_session_leave/);
		expect(opsSrc).toMatch(/recordingEnabled: false/);
	});

	it('returns deliveryReport on createParentVoiceSession', () => {
		expect(opsSrc).toMatch(/buildSessionScheduleDeliveryReport/);
		expect(opsSrc).toMatch(/deliveryReport/);
	});

	it('vendor token stub is feature-flagged', () => {
		expect(opsSrc).toMatch(/feature_flags\/commsParentVoice/);
		expect(opsSrc).toMatch(/mintStubVendorToken/);
	});
});

describe('COMMS-VOICE-V1 — canon + rules sync', () => {
	it('COMMS_CHANNEL_CANON marks parent_voice_session shipped', () => {
		expect(canonSrc).toMatch(/parent_voice_session[\s\S]*?\*\*shipped\*\*/);
	});

	it('firestore rules block client writes on parent_voice_sessions', () => {
		expect(rulesSrc).toMatch(/match \/parent_voice_sessions\/\{sessionId\}/);
		expect(rulesSrc).toMatch(/canReadParentVoiceSessionDoc/);
	});
});
