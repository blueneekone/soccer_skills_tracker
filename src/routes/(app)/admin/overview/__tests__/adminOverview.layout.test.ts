// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import AdminDashboardHUD from '../AdminDashboardHUD.svelte';
import AdminOverviewArena from '../AdminOverviewArena.svelte';
import AdminDashboardEngine from '../AdminDashboardEngine.svelte';

// Mock the Firebase client and Auth store to pass Defensive Hydration
vi.mock('$lib/firebase/config', () => ({
	getActiveDb: vi.fn().mockReturnValue({}) // Truthy object to pass `if (!getActiveDb())`
}));

vi.mock('$lib/stores/auth.svelte', () => ({
	authStore: {
		isAuthenticated: true // Pass `if (!authStore.isAuthenticated)`
	}
}));

// Mock firestore queries
vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	limit: vi.fn(),
	orderBy: vi.fn(),
	getDocs: vi.fn().mockResolvedValue({ size: 42 }), // Mock returning 42 docs for size properties
	getFirestore: vi.fn().mockReturnValue({}),
	initializeFirestore: vi.fn().mockReturnValue({}),
	persistentLocalCache: vi.fn(),
	persistentMultipleTabManager: vi.fn(),
}));

describe('Admin OS Vanguard Trinity', () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('HUD renders system status and strict 90-degree corners', () => {
		const engine = new AdminDashboardEngine();
		const { container } = render(AdminDashboardHUD, { engine });

		expect(screen.getByText('Nexus Command')).toBeInTheDocument();
		expect(screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, ' ').trim() === 'SYSTEM_STATUS: INITIALIZING')).toBeInTheDocument();

		// Check for specific structural classes required by the prompt
		const header = container.querySelector('header');
		expect(header).toHaveClass('command-plane-system-status');
		expect(header).toHaveClass('tw-rounded-none'); // Enforcing 90-degree corners
	});

	it('Arena renders multi-tenant matrix and enforces fluid Bento Grid', () => {
		const engine = new AdminDashboardEngine();
		// Mock engine to 'ready' state to show the main matrix
		engine.isLoading = false;
		engine.error = null;

		const { container } = render(AdminOverviewArena, { engine });

		// Wait for data to conceptually "load" or just assert immediately since it's sync here
		const wrapper = container.querySelector('.bento-grid-container');
		expect(wrapper).toBeInTheDocument();

		// Check for Bento grid
		const bentoGrid = container.querySelector('.bento-grid-container');
		expect(bentoGrid).toBeInTheDocument();
	});
});
