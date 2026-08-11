import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LAYOUT_SVELTE_PATH = join(__dirname, '../+layout.svelte');

describe('SvelteKit Layout Routing Interceptor & Auth Gating (Epic 1)', () => {
	describe('Logic Simulations', () => {
		const elevatedRoles = [
			'admin',
			'global_admin',
			'super_admin',
			'commissioner',
			'director',
			'coach',
			'parent',
		];

		it('forces route to /onboarding when user session is unauthenticated', () => {
			const mockAuthStore = {
				isAuthenticated: false,
				isLoading: false,
				role: null,
			};

			let redirectedTo = '';
			const mockGoto = (url: string) => {
				redirectedTo = url;
			};

			if (!mockAuthStore.isAuthenticated || !elevatedRoles.includes(mockAuthStore.role ?? '')) {
				mockGoto('/onboarding');
			}

			expect(redirectedTo).toBe('/onboarding');
		});

		it('forces route to /onboarding when user session is authenticated but missing elevated custom claims/roles', () => {
			const mockAuthStore = {
				isAuthenticated: true,
				isLoading: false,
				role: 'player', // missing elevated roles
			};

			let redirectedTo = '';
			const mockGoto = (url: string) => {
				redirectedTo = url;
			};

			if (!mockAuthStore.isAuthenticated || !elevatedRoles.includes(mockAuthStore.role ?? '')) {
				mockGoto('/onboarding');
			}

			expect(redirectedTo).toBe('/onboarding');
		});

		it('resolves cleanly when session is authenticated and contains elevated custom claims/roles', () => {
			const mockAuthStore = {
				isAuthenticated: true,
				isLoading: false,
				role: 'coach', // elevated role
			};

			let redirectedTo = '';
			const mockGoto = (url: string) => {
				redirectedTo = url;
			};

			let routingResolved = false;
			if (!mockAuthStore.isAuthenticated || !elevatedRoles.includes(mockAuthStore.role ?? '')) {
				mockGoto('/onboarding');
			} else {
				routingResolved = true;
			}

			expect(redirectedTo).toBe('');
			expect(routingResolved).toBe(true);
		});
	});

	describe('Static Integration Rules', () => {
		let layoutSrc = '';
		try {
			layoutSrc = readFileSync(LAYOUT_SVELTE_PATH, 'utf-8');
		} catch (err) {
			console.error('Could not read +layout.svelte:', err);
		}

		it('must strictly declare the list of authorized elevated roles', () => {
			expect(layoutSrc).toContain(
				"const elevatedRoles = ['admin', 'global_admin', 'super_admin', 'commissioner', 'director', 'coach', 'parent']",
			);
		});

		it('must protect programmatic redirects inside untrack() closures to prevent infinite loops', () => {
			// Svelte 5 $effect redirects must be wrapped inside untrack
			expect(layoutSrc).toContain('untrack(()');
			expect(layoutSrc).toContain('goto(\'/onboarding\'');
		});

		it('must apply B815 defensive hydration early-return guards to subscription blocks', () => {
			// At least one block must have: if (!db || !authStore.isAuthenticated) return;
			expect(layoutSrc).toContain('if (!db || !authStore.isAuthenticated) return;');
		});
	});
});
