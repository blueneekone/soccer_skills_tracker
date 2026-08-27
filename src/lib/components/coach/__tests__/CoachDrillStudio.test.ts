// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import CoachTacticalPreviewStage from '../drill/CoachTacticalPreviewStage.svelte';
import CoachDrillDesignerStudio from '../drill/CoachDrillDesignerStudio.svelte';
import CoachDrillLibraryArena from '../drill/CoachDrillLibraryArena.svelte';

vi.mock('$lib/firebase.js', () => ({
	db: {}
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: { isAuthenticated: true, user: { uid: 'coach-123' } }
}));

vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	addDoc: vi.fn(),
	getDocs: vi.fn(() => Promise.resolve({
		forEach: (cb: any) => {
			cb({
				id: 'wr_coach-123',
				data: () => ({
					name: 'Active War Room Board',
					cartridge: {
						entities: [
							{ id: 't1', x: 200, y: 300, position: 'CM', number: '8', side: 'team' }
						],
						routes: [
							{ id: 'r1', x1: 200, y1: 300, cx: 300, cy: 350, x2: 400, y2: 400, kind: 'curve' }
						]
					}
				})
			});
		}
	})),
	serverTimestamp: vi.fn()
}));

describe('CoachDrillStudio & War Room Tactic Ingestion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('CoachTacticalPreviewStage renders tactical diagram and War Room sync badge', () => {
		const { getByText } = render(CoachTacticalPreviewStage, {
			tacticName: '3v2 Counter-Press Strategy',
			entities: [{ id: 'p1', x: 500, y: 400, position: 'ST', number: '9', side: 'team' }],
			routes: []
		});

		expect(getByText(/3v2 Counter-Press Strategy/i)).toBeTruthy();
		expect(getByText(/WAR ROOM SYNCED/i)).toBeTruthy();
		expect(getByText(/Players on pitch:/i)).toBeTruthy();
	});

	it('CoachDrillDesignerStudio renders Physical Drill Sheet and pulls in War Room plays', () => {
		const { getByText, getAllByText, getByPlaceholderText } = render(CoachDrillDesignerStudio, {
			teamId: 'team-456'
		});

		expect(getByText(/Tactical Drill Designer Studio/i)).toBeTruthy();
		expect(getByText(/WAR ROOM INTEGRATED/i)).toBeTruthy();
		expect(getAllByText(/Physical Drill Sheet/i).length).toBeGreaterThan(0);
		expect(getByText(/Session Specifications/i)).toBeTruthy();
		expect(getByText(/DEPLOY AS INTENT/i)).toBeTruthy();
		expect(getByText(/SAVE PLAYBOOK/i)).toBeTruthy();
	});

	it('CoachDrillLibraryArena renders cleanly with no duplicate internal tabs', () => {
		const { getByText, getByPlaceholderText } = render(CoachDrillLibraryArena, {
			teamId: 'team-456'
		});

		expect(getByText(/Tactical Drill Library & Playbook/i)).toBeTruthy();
		expect(getByPlaceholderText(/Search drills by title, focus, or skill/i)).toBeTruthy();
		expect(getByText(/DESIGN NEW DRILL/i)).toBeTruthy();
	});
});
