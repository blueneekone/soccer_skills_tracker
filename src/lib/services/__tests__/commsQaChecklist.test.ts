/**
 * commsQaChecklist.test.ts — COMMS-PRE-QA-WIRE owner QA doc drift guards
 * Authority: docs/vision/OWNER_QA_CHECKLIST.md Phase 7
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..', '..');
const CHECKLIST = join(REPO, 'docs/vision/OWNER_QA_CHECKLIST.md');
const RUNBOOK = join(REPO, 'docs/acquisition/DEMO_ENV_SECRETS_RUNBOOK.md');
const PKG = join(REPO, 'package.json');

const checklist = readFileSync(CHECKLIST, 'utf8');
const runbook = readFileSync(RUNBOOK, 'utf8');
const deployComms = JSON.parse(readFileSync(PKG, 'utf8')).scripts['deploy:comms'] as string;

describe('COMMS-PRE-QA-WIRE — OWNER_QA_CHECKLIST Phase 7', () => {
	it('includes QA-157 Nav 2.0 comms depth row', () => {
		expect(checklist).toMatch(/\*\*QA-157\*\*.*Nav 2\.0/);
	});

	it('documents Parent Circle and parent_coach_dm Tier 1 checks', () => {
		expect(checklist).toMatch(/\*\*QA-158\*\*.*Parent Circle/);
		expect(checklist).toMatch(/\*\*QA-159\*\*.*parent_coach_dm/);
		expect(checklist).toContain('Parent Circle');
		expect(checklist).toContain('parent_coach_dm');
	});

	it('updates GP-ACQ-06 success criteria with Nav 2.0 and DeliveryReceipt', () => {
		expect(checklist).toMatch(
			/GP-ACQ-06.*Nav 2\.0.*Parent Circle.*parent↔coach DM.*coach→minor DM blocked.*DeliveryReceipt/s,
		);
	});

	it('marks QA-146 logistics as hub announcements deep-link', () => {
		expect(checklist).toMatch(/\*\*QA-146\*\*.*deep-link to hub announcements/);
	});

	it('includes Tier 2 comms depth QA-161 through QA-164', () => {
		expect(checklist).toMatch(/\*\*QA-161\*\*/);
		expect(checklist).toMatch(/\*\*QA-162\*\*/);
		expect(checklist).toMatch(/\*\*QA-163\*\*.*voice session/);
		expect(checklist).toMatch(/\*\*QA-164\*\*/);
	});
});

describe('COMMS-PRE-QA-WIRE — deploy runbook sync', () => {
	it('DEMO_ENV_SECRETS_RUNBOOK Phase 0 notes parent DM + voice callables in deploy:comms', () => {
		expect(runbook).toMatch(/sendParentCoachMessage/);
		expect(runbook).toMatch(/listParentCoachDmThreads/);
		expect(runbook).toMatch(/createParentVoiceSession/);
		expect(runbook).toMatch(/joinParentVoiceSession/);
	});

	it('deploy:comms script includes all four parent DM + voice callables', () => {
		expect(deployComms).toMatch(/sendParentCoachMessage/);
		expect(deployComms).toMatch(/listParentCoachDmThreads/);
		expect(deployComms).toMatch(/createParentVoiceSession/);
		expect(deployComms).toMatch(/joinParentVoiceSession/);
	});
});
