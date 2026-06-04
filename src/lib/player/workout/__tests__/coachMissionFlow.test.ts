import { describe, expect, it } from 'vitest';
import {
	attributeIdToWorkoutFocus,
	buildCoachIntentHandoff,
	buildPolicyHintsFromResult,
	formatSuggestedDrillLine,
	MISSION_HANDOFF_KEY,
	readMissionHandoff,
	resolveHandoffDurationMinutes,
	resolveHandoffTargetRpe,
	stashMissionHandoff,
} from '../coachMissionFlow.js';

describe('coachMissionFlow', () => {
	it('maps RPG attributes to workout focus bands', () => {
		expect(attributeIdToWorkoutFocus('ball_mastery')).toBe('technical');
		expect(attributeIdToWorkoutFocus('pace')).toBe('physical');
		expect(attributeIdToWorkoutFocus('scanning')).toBe('tactical');
		expect(attributeIdToWorkoutFocus('unknown_attr')).toBe('technical');
	});

	it('formats suggested drill preview line', () => {
		expect(formatSuggestedDrillLine('Wall Passing')).toMatch(/Suggested: Wall Passing · ~30 min/);
		expect(formatSuggestedDrillLine('Beep Test', { durationMinutes: 20, targetRpe: 7 })).toBe(
			'Suggested: Beep Test · 20 min · RPE 7',
		);
	});

	it('builds coach intent handoff with focus + defaults', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-1',
			targetAttributeId: 'ball_mastery',
			requiredXp: 500,
			drill: { id: 'drill-1', title: 'Cone Dribbling' },
		});
		expect(handoff.source).toBe('coach_intent');
		expect(handoff.focusArea).toBe('technical');
		expect(handoff.drillTitle).toBe('Cone Dribbling');
		expect(handoff.durationMinutes).toBeUndefined();
		expect(handoff.targetRpe).toBeUndefined();
		expect(resolveHandoffDurationMinutes(handoff)).toBe(30);
		expect(resolveHandoffTargetRpe(handoff)).toBe(5);
	});

	it('builds handoff with prescription and round-trips via sessionStorage', () => {
		const store = new Map<string, string>();
		const sessionStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => {
				store.set(k, v);
			},
			removeItem: (k: string) => {
				store.delete(k);
			},
		};
		// @ts-expect-error test shim
		globalThis.sessionStorage = sessionStorage;

		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-rx-1',
			targetAttributeId: 'pace',
			requiredXp: 200,
			prescription: {
				sets: 3,
				repsPerSet: 12,
				bilateral: true,
				targetDurationMin: 20,
				targetRpe: 7,
			},
		});
		expect(handoff.prescription?.sets).toBe(3);
		expect(handoff.prescription?.repsPerSet).toBe(12);
		expect(handoff.prescription?.bilateral).toBe(true);
		expect(handoff.durationMinutes).toBe(20);
		expect(handoff.targetRpe).toBe(7);

		stashMissionHandoff(handoff);
		expect(store.has(MISSION_HANDOFF_KEY)).toBe(true);
		const read = readMissionHandoff();
		expect(read?.missionId).toBe('intent-rx-1');
		expect(read?.prescription?.sets).toBe(3);
		expect(read?.prescription?.bilateral).toBe(true);
		expect(read?.prescription?.repsPerSet).toBe(12);
	});

	it('resolveHandoffDurationMinutes prefers prescription over policy hints', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-rx-2',
			targetAttributeId: 'pace',
			prescription: { sets: 4, repsPerSet: 10, bilateral: false, targetDurationMin: 25 },
			policyHints: buildPolicyHintsFromResult({
				mode: 'policy',
				recommendedDurationMinutes: 40,
				recommendedTargetRpe: 8,
			}),
			durationMinutes: 15,
		});
		expect(resolveHandoffDurationMinutes(handoff)).toBe(25);
	});

	it('resolveHandoffDurationMinutes uses policy hints when prescription has no target duration', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-rx-3',
			targetAttributeId: 'pace',
			prescription: { sets: 3, repsPerSet: 8, bilateral: true },
			policyHints: buildPolicyHintsFromResult({
				mode: 'policy',
				recommendedDurationMinutes: 35,
				recommendedTargetRpe: 6,
			}),
			durationMinutes: 15,
		});
		expect(resolveHandoffDurationMinutes(handoff)).toBe(35);
		expect(resolveHandoffTargetRpe(handoff)).toBe(6);
		expect(handoff.prescription?.sets).toBe(3);
		expect(handoff.prescription?.repsPerSet).toBe(8);
	});

	it('round-trips policyHints via sessionStorage', () => {
		const store = new Map<string, string>();
		const sessionStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => {
				store.set(k, v);
			},
			removeItem: (k: string) => {
				store.delete(k);
			},
		};
		// @ts-expect-error test shim
		globalThis.sessionStorage = sessionStorage;

		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-policy-1',
			targetAttributeId: 'ball_mastery',
			policyHints: buildPolicyHintsFromResult({
				mode: 'policy',
				recommendedDrillId: 'drill-ai-1',
				recommendedDurationMinutes: 28,
				recommendedTargetRpe: 7,
			}),
		});
		stashMissionHandoff(handoff);
		const read = readMissionHandoff();
		expect(read?.policyHints?.mode).toBe('policy');
		expect(read?.policyHints?.recommendedDrillId).toBe('drill-ai-1');
		expect(read?.policyHints?.recommendedDurationMinutes).toBe(28);
		expect(read?.policyHints?.recommendedTargetRpe).toBe(7);
	});
});
