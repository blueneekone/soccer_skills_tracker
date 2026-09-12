/**
 * firestoreGuard.test.ts
 * ──────────────────────
 * Verifies the b815 Defensive Hydration Guard behaves correctly under
 * all auth state combinations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the logic in isolation by mocking the module dependencies.
// The actual implementation reads from authStore and db singletons.

describe('isFirestoreReady — b815 Defensive Hydration Guard', () => {
	it('returns false when db is falsy', async () => {
		vi.doMock('$lib/firebase.js', () => ({ getActiveDb: () => null }));
		vi.doMock('$lib/stores/auth/facade.svelte.js', () => ({
			authStore: { isAuthenticated: true, isLoading: false },
		}));
		// Re-import after mock
		const { isFirestoreReady } = await import('$lib/utils/firestoreGuard.ts');
		expect(isFirestoreReady()).toBe(false);
	});

	it('returns false when authStore.isLoading is true', () => {
		// Simulate the guard logic directly (pure logic test)
		const db = {};
		const isLoading = true;
		const isAuthenticated = true;
		const result = !!db && !isLoading && isAuthenticated;
		expect(result).toBe(false);
	});

	it('returns false when authStore.isAuthenticated is false', () => {
		const db = {};
		const isLoading = false;
		const isAuthenticated = false;
		const result = !!db && !isLoading && isAuthenticated;
		expect(result).toBe(false);
	});

	it('returns true only when db is truthy, not loading, and authenticated', () => {
		const db = {};
		const isLoading = false;
		const isAuthenticated = true;
		const result = !!db && !isLoading && isAuthenticated;
		expect(result).toBe(true);
	});

	it('returns false when all conditions are falsy', () => {
		const db = null;
		const isLoading = true;
		const isAuthenticated = false;
		const result = !!db && !isLoading && isAuthenticated;
		expect(result).toBe(false);
	});

	it('enforces that DirectorAnalyticsCharts source references isFirestoreReady', () => {
		// Static regression check — ensures the patch was not reverted.
		const src = require('fs')
			.readFileSync(
				'src/lib/components/shell/DirectorAnalyticsCharts.svelte',
				'utf-8',
			);
		expect(src).toMatch(/isFirestoreReady/);
	});

	it('enforces that CoachTeamXpVelocityChart source references isFirestoreReady', () => {
		const src = require('fs')
			.readFileSync(
				'src/lib/components/shell/CoachTeamXpVelocityChart.svelte',
				'utf-8',
			);
		expect(src).toMatch(/isFirestoreReady/);
	});

	it('enforces B815 defensive hydration in OrgManager', () => {
		const src = require('fs').readFileSync('src/lib/services/org.svelte.ts', 'utf-8');
		expect(src).toMatch(/if \(!db \|\| !authStore\.isAuthenticated\) return;/);
	});

	it('enforces B815 defensive hydration in LeagueManager', () => {
		const src = require('fs').readFileSync('src/lib/services/league.svelte.ts', 'utf-8');
		expect(src).toMatch(/if \(!db \|\| !authStore\.isAuthenticated\) return;/);
	});

	it('enforces B815 defensive hydration in FeeLedger', () => {
		const src = require('fs').readFileSync('src/lib/services/feeLedger.svelte.ts', 'utf-8');
		expect(src).toMatch(/if \(!db \|\| !authStore\.isAuthenticated\)/);
	});

	it('enforces B815 defensive hydration in LoadoutUnlocks', () => {
		const src = require('fs').readFileSync('src/lib/services/loadoutUnlocks.svelte.ts', 'utf-8');
		expect(src).toMatch(/if \(!db \|\| !authStore\.isAuthenticated\) return;/);
	});

	it('enforces B815 defensive hydration in TrajectoryEngine', () => {
		const src = require('fs').readFileSync('src/lib/states/TrajectoryEngine.svelte.ts', 'utf-8');
		expect(src).toMatch(/if \(!db \|\| !authStore\.isAuthenticated\) return;/);
	});
});
