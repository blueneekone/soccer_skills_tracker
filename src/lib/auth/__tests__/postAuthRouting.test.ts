import { describe, it, expect, vi, beforeEach } from 'vitest';
import { navigateAfterLogin, PASSKEY_ENROLL_ROUTE } from '../postAuthRouting';
import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth.svelte.js';
import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
import { requiresPasskeyEnrollmentBeforeApp } from '$lib/auth/passkeyGate.js';

let mockBrowser = true;

vi.mock('$app/environment', () => ({
	get browser() { return mockBrowser; }
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('svelte', () => ({
	untrack: vi.fn((fn) => fn())
}));

vi.mock('$lib/firebase.js', () => ({
	auth: {
		currentUser: { uid: 'test-user-123' }
	}
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: {
		refresh: vi.fn(),
		isProfileComplete: true,
		role: 'player',
		userProfile: { name: 'Test Player' }
	}
}));

vi.mock('$lib/auth/loginRouting.js', () => ({
	applyLoginWaterfall: vi.fn(() => '/player/dashboard')
}));

vi.mock('$lib/auth/passkeyGate.js', () => ({
	requiresPasskeyEnrollmentBeforeApp: vi.fn(),
	PASSKEY_ENROLL_ROUTE: '/enroll-passkey'
}));

describe('navigateAfterLogin', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBrowser = true;
		vi.mocked(requiresPasskeyEnrollmentBeforeApp).mockResolvedValue(false);
		vi.mocked(authStore.refresh).mockResolvedValue(undefined);
		Object.defineProperty(authStore, 'isProfileComplete', { get: () => true, configurable: true });
		Object.defineProperty(authStore, 'role', { get: () => 'player', configurable: true });
		Object.defineProperty(authStore, 'userProfile', { get: () => ({ name: 'Test Player' }), configurable: true });
	});

	it('returns early if not in browser environment', async () => {
		mockBrowser = false;

		await navigateAfterLogin();

		expect(authStore.refresh).not.toHaveBeenCalled();
		expect(goto).not.toHaveBeenCalled();
	});

	it('calls authStore.refresh({ silent: true }) and catches exceptions gracefully', async () => {
		vi.mocked(authStore.refresh).mockRejectedValueOnce(new Error('Network error'));

		await navigateAfterLogin();

		expect(authStore.refresh).toHaveBeenCalledWith({ silent: true });
		expect(goto).toHaveBeenCalled();
	});

	it('routes to PASSKEY_ENROLL_ROUTE if requiresPasskeyEnrollmentBeforeApp returns true', async () => {
		vi.mocked(requiresPasskeyEnrollmentBeforeApp).mockResolvedValueOnce(true);

		await navigateAfterLogin();

		expect(requiresPasskeyEnrollmentBeforeApp).toHaveBeenCalledWith({ uid: 'test-user-123' });
		expect(goto).toHaveBeenCalledWith(PASSKEY_ENROLL_ROUTE, { replaceState: true });
		expect(applyLoginWaterfall).not.toHaveBeenCalled();
	});

	it('routes to /setup if profile is not complete', async () => {
		Object.defineProperty(authStore, 'isProfileComplete', { get: () => false, configurable: true });

		await navigateAfterLogin();

		expect(goto).toHaveBeenCalledWith('/setup', { replaceState: true });
		expect(applyLoginWaterfall).not.toHaveBeenCalled();
	});

	it('routes to waterfall destination if profile is complete', async () => {
		vi.mocked(applyLoginWaterfall).mockReturnValueOnce('/coach/dashboard');
		Object.defineProperty(authStore, 'role', { get: () => 'coach', configurable: true });

		await navigateAfterLogin();

		expect(applyLoginWaterfall).toHaveBeenCalledWith('coach', { name: 'Test Player' });
		expect(goto).toHaveBeenCalledWith('/coach/dashboard', { replaceState: true });
	});

	it('respects the replaceState option when provided', async () => {
		await navigateAfterLogin({ replaceState: false });

		expect(goto).toHaveBeenCalledWith('/player/dashboard', { replaceState: false });
	});
});

describe('Vanguard Boundary Conditions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBrowser = true;
		vi.mocked(requiresPasskeyEnrollmentBeforeApp).mockResolvedValue(false);
		vi.mocked(authStore.refresh).mockResolvedValue(undefined);
		Object.defineProperty(authStore, 'isProfileComplete', { get: () => true, configurable: true });
	});

	it('Scenario A: Unrecognized/Null Roles navigate to waterfall fallback (/onboarding) avoiding privileged data pools', async () => {
		Object.defineProperty(authStore, 'role', { get: () => null, configurable: true });
		Object.defineProperty(authStore, 'userProfile', { get: () => ({ name: 'Unknown User' }), configurable: true });
		vi.mocked(applyLoginWaterfall).mockReturnValueOnce('/onboarding');

		await navigateAfterLogin();

		expect(applyLoginWaterfall).toHaveBeenCalledWith(null, { name: 'Unknown User' });
		expect(goto).toHaveBeenCalledWith('/onboarding', { replaceState: true });
	});

	it('Scenario B: Incomplete Parent Profile forces parent onto the parent onboarding setup path', async () => {
		Object.defineProperty(authStore, 'role', { get: () => 'parent', configurable: true });
		Object.defineProperty(authStore, 'isProfileComplete', { get: () => false, configurable: true });

		await navigateAfterLogin();

		expect(goto).toHaveBeenCalledWith('/setup', { replaceState: true });
		expect(applyLoginWaterfall).not.toHaveBeenCalled();
	});

	it('Scenario C: Pending Recruiter Background Check (incomplete profile) blocks access to sensitive minor data pools', async () => {
		Object.defineProperty(authStore, 'role', { get: () => 'recruiter', configurable: true });
		Object.defineProperty(authStore, 'isProfileComplete', { get: () => false, configurable: true });

		await navigateAfterLogin();

		expect(goto).toHaveBeenCalledWith('/setup', { replaceState: true });
		expect(applyLoginWaterfall).not.toHaveBeenCalled();
	});
});
