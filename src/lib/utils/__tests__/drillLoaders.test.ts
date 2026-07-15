import { describe, it, expect, vi } from 'vitest';
import { loadTeamDrills } from '../drillLoaders.js';
import { submitDrillAssignment } from '../drillAssignment.js';

vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	getDocs: vi.fn(() => ({
		docs: [
			{
				id: 'd1',
				data: () => ({ name: 'Test Drill' })
			}
		]
	}))
}));

vi.mock('firebase/functions', () => ({
	httpsCallable: vi.fn(() => vi.fn(() => ({ data: { assignedCount: 2 } })))
}));

vi.mock('$lib/firebase.js', () => ({
	db: {},
	functions: {}
}));

describe('drillLoaders', () => {
	it('loads team drills', async () => {
		const drills = await loadTeamDrills('team1');
		expect(drills.length).toBe(1);
		expect(drills[0].id).toBe('d1');
		expect(drills[0].title).toBe('Test Drill');
	});
});

describe('drillAssignment', () => {
	it('submits assignment', async () => {
		const res = await submitDrillAssignment('team1', 'd1', '2026-07-15T00:00:00Z', ['test@example.com']);
		expect(res).toBe(2); // Mocked response
	});
});
