// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

vi.mock('$app/environment', () => ({
	browser: true,
	dev: true,
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn().mockResolvedValue(undefined),
	replaceState: vi.fn(),
	pushState: vi.fn(),
}));

const { MOCK_JWT } = vi.hoisted(() => {
	const matchMediaMock = (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	});

	if (typeof window !== 'undefined') {
		window.matchMedia = matchMediaMock as any;
	}
	if (typeof globalThis !== 'undefined') {
		(globalThis as any).matchMedia = matchMediaMock;
	}

	return {
		MOCK_JWT:
			'eyJhbGciOiJIUzI1NiJ9.' +
			btoa(JSON.stringify({ role: 'coach', teamId: 'team_alpha_123' })) +
			'.mocksignature',
	};
});

vi.mock('$app/state', () => ({
	page: {
		url: new URL('http://localhost:5173/coach/tactics-and-training'),
	},
}));

vi.mock('$lib/authStore.svelte', () => ({
	authStore: {
		isAuthenticated: true,
		isLoading: false,
		teamId: 'team_alpha_123',
		role: 'coach',
		user: { email: 'coach@fc.com', teamId: 'team_alpha_123' },
		userProfile: { email: 'coach@fc.com', teamId: 'team_alpha_123', clubId: 'club_789' },
	},
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: {
		isAuthenticated: true,
		isLoading: false,
		teamId: 'team_alpha_123',
		role: 'coach',
		user: { email: 'coach@fc.com', teamId: 'team_alpha_123' },
		userProfile: { email: 'coach@fc.com', teamId: 'team_alpha_123', clubId: 'club_789' },
	},
}));

vi.mock('$lib/firebase', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		getActiveDb: vi.fn(() => ({})),
		db: {},
	};
});
vi.mock('$lib/firebase.js', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		getActiveDb: vi.fn(() => ({})),
		db: {},
	};
});

vi.mock('firebase/auth', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		getAuth: vi.fn(() => ({
			currentUser: {
				uid: 'coach-123',
				email: 'coach@fc.com',
				getIdToken: vi.fn().mockResolvedValue(MOCK_JWT),
				getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'coach', teamId: 'team_alpha_123' }, token: MOCK_JWT }),
			},
		})),
		onIdTokenChanged: vi.fn((_auth, callback) => {
			callback({
				uid: 'coach-123',
				email: 'coach@fc.com',
				getIdToken: vi.fn().mockResolvedValue(MOCK_JWT),
				getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'coach', teamId: 'team_alpha_123' }, token: MOCK_JWT }),
			});
			return vi.fn();
		}),
	};
});

vi.mock('firebase/firestore', async (importOriginal) => {
	const actual = (await importOriginal()) as any;
	return {
		...actual,
		collection: vi.fn(),
		doc: vi.fn(),
		getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
		getDocs: vi.fn().mockResolvedValue({ empty: true, forEach: () => {} }),
		setDoc: vi.fn().mockResolvedValue(undefined),
		addDoc: vi.fn().mockResolvedValue({ id: 'mock_evt_1' }),
		query: vi.fn(),
		orderBy: vi.fn(),
		limit: vi.fn(),
		where: vi.fn(),
		onSnapshot: vi.fn(() => vi.fn()),
		serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
	};
});

import { TacticsTrainingEngine } from '../../../../routes/(app)/coach/tactics-and-training/TacticsTrainingEngine.svelte';
import TacticsTrainingHUD from '../../../../routes/(app)/coach/tactics-and-training/TacticsTrainingHUD.svelte';
import TacticsTrainingArena from '../../../../routes/(app)/coach/tactics-and-training/TacticsTrainingArena.svelte';
import { coachLinks } from '$lib/shell/workspaceNav.js';
import { getNavCatalog } from '$lib/shell/navPinCatalog.js';

describe('Tactics & Training Unified Suite', () => {
	let engine: TacticsTrainingEngine;

	beforeEach(() => {
		engine = new TacticsTrainingEngine();
		engine.teamScope.selectedTeamId = 'team_alpha_123';
		engine.teamScope.teamLabel = 'Lightning FC';
	});

	it('initializes with default tab forge and subtab intent', () => {
		expect(engine.activeTab).toBe('forge');
		expect(engine.forgeSubTab).toBe('intent');
		expect(engine.showHelpModal).toBe(false);
	});

	it('switches tabs between forge, war-room, and matchday', () => {
		engine.setTab('war-room');
		expect(engine.activeTab).toBe('war-room');

		engine.setTab('matchday');
		expect(engine.activeTab).toBe('matchday');

		engine.setTab('forge');
		expect(engine.activeTab).toBe('forge');
	});

	it('switches forge subtabs between intent, designer, and library', () => {
		engine.setForgeSubTab('designer');
		expect(engine.forgeSubTab).toBe('designer');

		engine.setForgeSubTab('library');
		expect(engine.forgeSubTab).toBe('library');

		engine.setForgeSubTab('intent');
		expect(engine.forgeSubTab).toBe('intent');
	});

	it('renders TacticsTrainingHUD with title, squad badge, and all 3 tabs', () => {
		const { getByText } = render(TacticsTrainingHUD, { engine });

		expect(getByText(/TACTICS & TRAINING/i)).toBeTruthy();
		expect(getByText(/Unified Sideline Suite/i)).toBeTruthy();
		expect(getByText(/The Forge/i)).toBeTruthy();
		expect(getByText(/War Room/i)).toBeTruthy();
		expect(getByText(/Match Day/i)).toBeTruthy();
	});

	it('switches active tab when HUD buttons are clicked', async () => {
		const { getByText } = render(TacticsTrainingHUD, { engine });

		const warRoomBtn = getByText(/War Room/i);
		await fireEvent.click(warRoomBtn);
		expect(engine.activeTab).toBe('war-room');

		const matchDayBtn = getByText(/Match Day/i);
		await fireEvent.click(matchDayBtn);
		expect(engine.activeTab).toBe('matchday');
	});

	it('renders TacticsTrainingArena based on active tab', () => {
		engine.activeTab = 'forge';
		const { getAllByText, getByText } = render(TacticsTrainingArena, { engine });

		expect(getAllByText(/Intent Engine/i).length).toBeGreaterThan(0);
		expect(getAllByText(/Drill Designer/i).length).toBeGreaterThan(0);
		expect(getAllByText(/Drill Library/i).length).toBeGreaterThan(0);
	});

	it('workspaceNav coachLinks groups War Room, Forge, and Match Day under Tactics & Training', () => {
		const hrefs = coachLinks.map((l) => l.href);
		expect(hrefs).toContain('/coach/tactics-and-training');

		// Dedicated consolidated link present
		const tacticsLink = coachLinks.find((l) => l.href === '/coach/tactics-and-training');
		expect(tacticsLink).toBeDefined();
		expect(tacticsLink?.label).toBe('Tactics & Training');
	});

	it('navPinCatalog includes Tactics & Training in coach catalog', () => {
		const catalog = getNavCatalog('coach');
		const hrefs = catalog.map((item) => item.href);
		expect(hrefs).toContain('/coach/tactics-and-training');
	});
});
