import { describe, expect, it } from 'vitest';
import {
	attributeIdToWorkoutFocus,
	buildCoachIntentHandoff,
	formatSuggestedDrillLine,
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
		expect(handoff.durationMinutes).toBe(30);
		expect(handoff.targetRpe).toBe(5);
	});
});
