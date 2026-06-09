/**
 * Coach OS module layout — routes stay thin; domain lives under $lib/coach/.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd(), 'src');
const COACH_LIB = join(ROOT, 'lib/coach');

describe('$lib/coach module tree', () => {
	it('barrel exports context, intent, drills, logistics, match-day', () => {
		const barrel = readFileSync(join(COACH_LIB, 'index.ts'), 'utf-8');
		expect(barrel).toMatch(/context\/index/);
		expect(barrel).toMatch(/intent\/index/);
		expect(barrel).toMatch(/drills\/index/);
		expect(barrel).toMatch(/logistics\/index/);
		expect(barrel).toMatch(/match-day\/index/);
	});

	it('CoachTeamScope lives in context module', () => {
		expect(existsSync(join(COACH_LIB, 'context/coachTeamScope.svelte.ts'))).toBe(true);
		const src = readFileSync(join(COACH_LIB, 'context/coachTeamScope.svelte.ts'), 'utf-8');
		expect(src).toMatch(/syncSelectedTeam/);
		expect(src).toMatch(/workspaceContextStore/);
	});
});

describe('Coach routes — thin shells', () => {
	const cases = [
		{
			route: 'forge',
			importPattern: /\$lib\/coach\/intent/,
			view: 'CoachIntentEngineView',
		},
		{
			route: 'drills',
			importPattern: /\$lib\/coach\/drills/,
			view: 'CoachDrillsView',
		},
		{
			route: 'logistics',
			importPattern: /\$lib\/coach\/logistics/,
			view: 'CoachLogisticsView',
		},
		{
			route: 'match-day',
			importPattern: /\$lib\/coach\/match-day/,
			view: 'CoachMatchDayView',
		},
	];

	for (const { route, importPattern, view } of cases) {
		it(`/coach/${route} imports ${view} from $lib/coach`, () => {
			const page = readFileSync(
				join(ROOT, 'routes/(app)/coach', route, '+page.svelte'),
				'utf-8',
			);
			expect(page).toMatch(importPattern);
			expect(page).toMatch(new RegExp(view));
			expect(page.length).toBeLessThan(400);
		});
	}

	it('domain views are not duplicated under routes/', () => {
		expect(existsSync(join(ROOT, 'routes/(app)/coach/drills/CoachDrillsView.svelte'))).toBe(
			false,
		);
		expect(existsSync(join(COACH_LIB, 'drills/CoachDrillsView.svelte'))).toBe(true);
		expect(existsSync(join(COACH_LIB, 'logistics/CoachLogisticsView.svelte'))).toBe(true);
		expect(existsSync(join(COACH_LIB, 'match-day/CoachMatchDayView.svelte'))).toBe(true);
	});
});
