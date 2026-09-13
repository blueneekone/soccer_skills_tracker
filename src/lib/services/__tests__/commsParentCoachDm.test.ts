/**
 * commsParentCoachDm.test.ts — COMMS-PARENT-COACH-DM drift guards
 * Authority: docs/vision/COMMS_PLATFORM_STANDARDS.md §4.2
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	COMMS_CHANNEL_TYPE_REGISTRY,
	canPersonaPostChannel,
	canPersonaReadChannel,
} from '$lib/comms/channelTypes.js';

const ROOT = join(__dirname, '..', '..', '..');
const OPS = join(ROOT, '..', 'functions/src/domains/parentCoachDmOps.js');
const ENGINE = join(ROOT, 'lib/services/comms.svelte.ts');
const PANEL = join(ROOT, 'lib/components/comms/ParentCoachDmPanel.svelte');
const HUB = join(ROOT, 'lib/components/comms/CommsHubShell.svelte');
const INDEX = join(ROOT, '..', 'functions/index.js');
const PKG = join(ROOT, '..', 'package.json');

const opsSrc = readFileSync(OPS, 'utf8');
const engineSrc = readFileSync(ENGINE, 'utf8');
const panelSrc = readFileSync(PANEL, 'utf8');
const hubSrc = readFileSync(HUB, 'utf8');
const indexSrc = readFileSync(INDEX, 'utf8');

describe('COMMS-PARENT-COACH-DM — channelTypes parent_coach_dm', () => {
	it('registers parent_coach_dm with bilateral parent+coach post', () => {
		expect(COMMS_CHANNEL_TYPE_REGISTRY.parent_coach_dm).toBeDefined();
		expect(COMMS_CHANNEL_TYPE_REGISTRY.parent_coach_dm.whoCanPost).toEqual([
			'parent',
			'coach',
		]);
		expect(COMMS_CHANNEL_TYPE_REGISTRY.parent_coach_dm.replyModel).toBe('bilateral');
		expect(canPersonaPostChannel('parent_coach_dm', 'parent')).toBe(true);
		expect(canPersonaPostChannel('parent_coach_dm', 'coach')).toBe(true);
		expect(canPersonaPostChannel('parent_coach_dm', 'player')).toBe(false);
		expect(canPersonaReadChannel('parent_coach_dm', 'director')).toBe(true);
	});
});

describe('COMMS-PARENT-COACH-DM — CommsEngine callables', () => {
	it('wires sendParentCoachMessage and listParentCoachDmThreads', () => {
		expect(engineSrc).toMatch(/sendParentCoachMessage/);
		expect(engineSrc).toMatch(/listParentCoachDmThreads/);
		expect(engineSrc).toMatch(/httpsCallable\(fns, 'sendParentCoachMessage'\)/);
		expect(engineSrc).toMatch(/httpsCallable\(fns, 'listParentCoachDmThreads'\)/);
		expect(engineSrc).toMatch(/lastParentCoachResult/);
	});
});

describe('COMMS-PARENT-COACH-DM — ParentCoachDmPanel UI', () => {
	it('shows Message coach and list-detail thread affordances', () => {
		expect(panelSrc).toMatch(/Message coach/i);
		expect(panelSrc).toMatch(/New message/i);
		expect(panelSrc).toMatch(/pcdm-thread-row/);
	});

	it('shows AD disclosure banner when includeAdOnParentDms', () => {
		expect(panelSrc).toMatch(/includeAdOnParentDms/);
		expect(panelSrc).toMatch(/disclosure/i);
		expect(panelSrc).toMatch(/athletic director may read/i);
	});

	it('uses DeliveryReceipt for coach staff sends', () => {
		expect(panelSrc).toMatch(/DeliveryReceipt/);
		expect(panelSrc).toMatch(/deliveryReport/);
	});
});

describe('COMMS-PARENT-COACH-DM — CommsHubShell Families rail', () => {
	it('includes parent_coach_dm channel in hub shell', () => {
		expect(hubSrc).toMatch(/parent_coach_dm/);
		expect(hubSrc).toMatch(/ParentCoachDmPanel/);
		expect(hubSrc).toMatch(/COMMS_CHANNEL_TYPE_REGISTRY\.parent_coach_dm/);
	});
});

describe('COMMS-PARENT-COACH-DM — server module exported', () => {
	it('index.js exports parent coach DM callables', () => {
		expect(indexSrc).toContain('sendParentCoachMessage');
		expect(indexSrc).toContain('listParentCoachDmThreads');
	});

	it('deploy:comms includes parent coach DM callables', () => {
		const deployComms = JSON.parse(readFileSync(PKG, 'utf8')).scripts['deploy:comms'] as string;
		expect(deployComms).toMatch(/sendParentCoachMessage/);
		expect(deployComms).toMatch(/listParentCoachDmThreads/);
	});

	it('parentCoachDmOps blocks players at server', () => {
		expect(opsSrc).toMatch(/SafeSport policy: players cannot access parent↔coach direct messages/);
	});
});
