import { describe, expect, it } from 'vitest';
import {
	attributeIdToWorkoutFocus,
	buildCoachIntentHandoff,
	buildPolicyHintsFromResult,
	formatSuggestedDrillLine,
	MISSION_HANDOFF_KEY,
	parseBundleDrills,
	parseCadence,
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

	it('buildCoachIntentHandoff falls back drillId to missionId when drill is unknown', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-fallback-1',
			targetAttributeId: 'dribbling',
		});
		expect(handoff.drillId).toBe('intent-fallback-1');
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

	it('builds handoff with videoUrl + cues from prescription and round-trips via sessionStorage', () => {
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
			missionId: 'intent-cues-1',
			targetAttributeId: 'ball_mastery',
			prescription: {
				sets: 2,
				bilateral: false,
				videoUrl: 'https://example.com/demo.mp4',
				cues: 'Keep your head up and use the inside of your foot.',
			},
		});
		expect(handoff.videoUrl).toBe('https://example.com/demo.mp4');
		expect(handoff.cues).toBe('Keep your head up and use the inside of your foot.');
		expect(handoff.prescription?.videoUrl).toBe('https://example.com/demo.mp4');
		expect(handoff.prescription?.cues).toBe('Keep your head up and use the inside of your foot.');

		stashMissionHandoff(handoff);
		const read = readMissionHandoff();
		expect(read?.videoUrl).toBe('https://example.com/demo.mp4');
		expect(read?.cues).toBe('Keep your head up and use the inside of your foot.');
	});

	it('handoff videoUrl and cues are undefined when prescription has none', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-nocues-1',
			targetAttributeId: 'pace',
			prescription: { sets: 3, bilateral: true },
		});
		expect(handoff.videoUrl).toBeUndefined();
		expect(handoff.cues).toBeUndefined();
	});

	it('B2 — handoff carries cadence from prescription', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-cadence-1',
			targetAttributeId: 'ball_mastery',
			prescription: {
				sets: 2,
				bilateral: false,
				cadence: { sessionsPerWindow: 3, windowDays: 7 },
			},
		});
		expect(handoff.cadence).toEqual({ sessionsPerWindow: 3, windowDays: 7 });
		expect(handoff.prescription?.cadence).toEqual({ sessionsPerWindow: 3, windowDays: 7 });
	});

	it('B2 — cadence is undefined when prescription omits it', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-nocadence-1',
			targetAttributeId: 'pace',
			prescription: { sets: 3, bilateral: true },
		});
		expect(handoff.cadence).toBeUndefined();
	});

	it('B2 — cadence round-trips via sessionStorage', () => {
		const store = new Map<string, string>();
		const sessionStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => { store.set(k, v); },
			removeItem: (k: string) => { store.delete(k); },
		};
		// @ts-expect-error test shim
		globalThis.sessionStorage = sessionStorage;

		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-cadence-rt-1',
			targetAttributeId: 'stamina',
			prescription: {
				sets: 4,
				bilateral: false,
				cadence: { sessionsPerWindow: 5, windowDays: 14 },
			},
		});
		stashMissionHandoff(handoff);
		const read = readMissionHandoff();
		expect(read?.cadence).toEqual({ sessionsPerWindow: 5, windowDays: 14 });
	});

	it('B2 — parseCadence validates ranges and drops invalid objects', () => {
		expect(parseCadence({ sessionsPerWindow: 3, windowDays: 7 })).toEqual({ sessionsPerWindow: 3, windowDays: 7 });
		expect(parseCadence({ sessionsPerWindow: 0, windowDays: 7 })).toBeUndefined();
		expect(parseCadence({ sessionsPerWindow: 22, windowDays: 7 })).toBeUndefined();
		expect(parseCadence({ sessionsPerWindow: 3, windowDays: 0 })).toBeUndefined();
		expect(parseCadence({ sessionsPerWindow: 3, windowDays: 31 })).toBeUndefined();
		expect(parseCadence(null)).toBeUndefined();
		expect(parseCadence('weekly')).toBeUndefined();
		expect(parseCadence([3, 7])).toBeUndefined();
	});

	it('B3 — drills[] present and ordered in handoff when prescription has bundle', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-bundle-1',
			targetAttributeId: 'ball_mastery',
			prescription: {
				sets: 1,
				bilateral: false,
				drills: [
					{ sets: 3, repsPerSet: 10, drillTitle: 'Toe taps' },
					{ sets: 2, repsPerSet: 12, drillTitle: 'Wall passing' },
					{ sets: 4, drillTitle: 'Sprint shuttles' },
				],
			},
		});
		expect(handoff.drills).toHaveLength(3);
		expect(handoff.drills?.[0]?.drillTitle).toBe('Toe taps');
		expect(handoff.drills?.[1]?.drillTitle).toBe('Wall passing');
		expect(handoff.drills?.[2]?.drillTitle).toBe('Sprint shuttles');
		expect(handoff.drills?.[0]?.sets).toBe(3);
		expect(handoff.drills?.[0]?.repsPerSet).toBe(10);
	});

	it('B3 — drills is undefined when prescription has no drills array', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-single-1',
			targetAttributeId: 'pace',
			prescription: { sets: 3, bilateral: true },
		});
		expect(handoff.drills).toBeUndefined();
	});

	it('B3 — drills[] round-trips via sessionStorage (ordered, multiple entries)', () => {
		const store = new Map<string, string>();
		const sessionStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => { store.set(k, v); },
			removeItem: (k: string) => { store.delete(k); },
		};
		// @ts-expect-error test shim
		globalThis.sessionStorage = sessionStorage;

		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-bundle-rt-1',
			targetAttributeId: 'dribbling',
			prescription: {
				sets: 1,
				bilateral: false,
				drills: [
					{ sets: 5, repsPerSet: 8, drillTitle: 'Cone weave', videoUrl: 'https://example.com/cw.mp4' },
					{ sets: 3, repsPerSet: 15, drillTitle: 'Step-overs', cues: 'Tight hips, stay on toes.' },
					{ sets: 4, drillTitle: 'Burst and stop' },
				],
			},
		});
		stashMissionHandoff(handoff);
		const read = readMissionHandoff();
		expect(read?.drills).toHaveLength(3);
		expect(read?.drills?.[0]?.drillTitle).toBe('Cone weave');
		expect(read?.drills?.[0]?.sets).toBe(5);
		expect(read?.drills?.[0]?.repsPerSet).toBe(8);
		expect(read?.drills?.[0]?.videoUrl).toBe('https://example.com/cw.mp4');
		expect(read?.drills?.[1]?.drillTitle).toBe('Step-overs');
		expect(read?.drills?.[1]?.cues).toBe('Tight hips, stay on toes.');
		expect(read?.drills?.[2]?.drillTitle).toBe('Burst and stop');
	});

	it('B3 — parseBundleDrills returns undefined for non-array / empty array', () => {
		expect(parseBundleDrills(null)).toBeUndefined();
		expect(parseBundleDrills(undefined)).toBeUndefined();
		expect(parseBundleDrills([])).toBeUndefined();
		expect(parseBundleDrills('not-array')).toBeUndefined();
	});

	it('B3 — parseBundleDrills silently drops invalid entries', () => {
		const result = parseBundleDrills([
			null,
			{ sets: 3, drillTitle: 'Good drill' },
			'bad',
			{ sets: 2, drillTitle: 'Also good' },
		]);
		expect(result).toHaveLength(2);
		expect(result?.[0]?.drillTitle).toBe('Good drill');
		expect(result?.[1]?.drillTitle).toBe('Also good');
	});

	it('B3 — parseBundleDrills caps at 8 entries', () => {
		const raw = Array.from({ length: 10 }, (_, i) => ({ sets: 1, drillTitle: `D${i}` }));
		const result = parseBundleDrills(raw);
		expect(result).toHaveLength(8);
	});

	it('B4a — requiresParentVerification is undefined when prescription omits it', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-noproof-1',
			targetAttributeId: 'ball_mastery',
			prescription: { sets: 3, bilateral: false },
		});
		expect(handoff.requiresParentVerification).toBeUndefined();
	});

	it('B4a — handoff carries requiresParentVerification when prescription sets it to true', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-proof-1',
			targetAttributeId: 'pace',
			prescription: { sets: 2, bilateral: true, requiresParentVerification: true },
		});
		expect(handoff.requiresParentVerification).toBe(true);
	});

	it('B4a — requiresParentVerification is NOT carried when set to false in prescription', () => {
		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-proof-false-1',
			targetAttributeId: 'stamina',
			prescription: { sets: 1, bilateral: false, requiresParentVerification: false },
		});
		expect(handoff.requiresParentVerification).toBeUndefined();
	});

	it('B4a — requiresParentVerification round-trips via sessionStorage', () => {
		const store = new Map<string, string>();
		const sessionStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => { store.set(k, v); },
			removeItem: (k: string) => { store.delete(k); },
		};
		// @ts-expect-error test shim
		globalThis.sessionStorage = sessionStorage;

		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-proof-rt-1',
			targetAttributeId: 'dribbling',
			prescription: { sets: 3, bilateral: false, requiresParentVerification: true },
		});
		stashMissionHandoff(handoff);
		const read = readMissionHandoff();
		expect(read?.requiresParentVerification).toBe(true);
	});

	it('B4a — requiresParentVerification absent in sessionStorage reads back as undefined', () => {
		const store = new Map<string, string>();
		const sessionStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => { store.set(k, v); },
			removeItem: (k: string) => { store.delete(k); },
		};
		// @ts-expect-error test shim
		globalThis.sessionStorage = sessionStorage;

		const handoff = buildCoachIntentHandoff({
			missionId: 'intent-proof-absent-1',
			targetAttributeId: 'technical',
			prescription: { sets: 1, bilateral: false },
		});
		stashMissionHandoff(handoff);
		const read = readMissionHandoff();
		expect(read?.requiresParentVerification).toBeUndefined();
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
