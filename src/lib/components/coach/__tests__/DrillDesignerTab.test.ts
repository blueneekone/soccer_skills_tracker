// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import DrillDesignerTab from '../DrillDesignerTab.svelte';

// Mock Firebase dependencies
vi.mock('$lib/firebase.js', () => ({
	db: {}
}));
vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: { user: { uid: 'test-coach-id' } }
}));
vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	addDoc: vi.fn(),
	getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
	serverTimestamp: vi.fn()
}));

// Mock Fabric.js to prevent canvas errors in jsdom
vi.mock('fabric', () => {
	class MockCanvas {
		setWidth() {}
		setHeight() {}
		renderAll() {}
		getObjects() { return []; }
		clear() {}
		toJSON() { return { objects: [] }; }
		add() {}
		setActiveObject() {}
	}
	class MockText {
		constructor() {}
	}
	return {
		Canvas: MockCanvas,
		Text: MockText
	};
});

describe('DrillDesignerTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the designer interface and spatial layout', () => {
		const { getByText, getByPlaceholderText } = render(DrillDesignerTab, { teamId: 'team-123' });
		
		expect(getByText('Drill designer')).toBeTruthy();
		expect(getByPlaceholderText('Drill name (required)')).toBeTruthy();
		expect(getByText('Spatial Layout')).toBeTruthy();
	});

	it('renders drag items correctly', () => {
		const { getByLabelText } = render(DrillDesignerTab, { teamId: 'team-123' });
		expect(getByLabelText('Cone')).toBeTruthy();
		expect(getByLabelText('Soccer ball')).toBeTruthy();
		expect(getByLabelText('Defender (X)')).toBeTruthy();
	});
});
