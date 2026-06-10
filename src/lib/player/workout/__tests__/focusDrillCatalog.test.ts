import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	FALLBACK_DRILLS_BY_FOCUS,
	WORKOUT_FOCUS_AREAS,
} from '$lib/player/workout/focusDrillCatalog.js';
import {
	scoutsSixToAttributeId,
	scoutsSixToWorkoutFocus,
} from '$lib/data/skillTree/scoutsSixWorkoutBridge.js';
import { workoutPrefillParamsPresent } from '$lib/player/workout/workoutDrillPrefill.js';

describe('focusDrillCatalog', () => {
	it('exports four focus bands with fallback drills each', () => {
		expect(WORKOUT_FOCUS_AREAS).toHaveLength(4);
		for (const { id } of WORKOUT_FOCUS_AREAS) {
			expect(FALLBACK_DRILLS_BY_FOCUS[id].length).toBeGreaterThan(0);
		}
	});
});

describe('scoutsSixWorkoutBridge', () => {
	it('maps PAC to physical focus via pace attribute', () => {
		expect(scoutsSixToAttributeId('PAC')).toBe('pace');
		expect(scoutsSixToWorkoutFocus('PAC')).toBe('physical');
	});

	it('maps VAN to tactical focus via scanning attribute', () => {
		expect(scoutsSixToWorkoutFocus('VAN')).toBe('tactical');
	});

	it('detects skill-tree workout URL prefill params', () => {
		expect(workoutPrefillParamsPresent(new URLSearchParams('skillNode=pac.first-step'))).toBe(true);
		expect(workoutPrefillParamsPresent(new URLSearchParams(''))).toBe(false);
	});
});

describe('F4/F5 audit guards', () => {
	it('SkillTreeHUD launches training from selected node', () => {
		const src = readFileSync(
			join(process.cwd(), 'src/lib/components/player/skill-tree/SkillTreeHUD.svelte'),
			'utf-8',
		);
		expect(src).toMatch(/launchDrillForNode|Launch training/i);
		expect(src).not.toMatch(/DRILL MAPPINGS · BACKEND SPRINT/);
	});

	it('parent log-workout loads drills from focusDrillCatalog', () => {
		const src = readFileSync(
			join(process.cwd(), 'src/routes/(app)/parent/log-workout/+page.svelte'),
			'utf-8',
		);
		expect(src).toMatch(/loadDrillTitlesForFocus/);
		expect(src).not.toMatch(/drillsByFocus\s*=\s*\{/);
	});
});
