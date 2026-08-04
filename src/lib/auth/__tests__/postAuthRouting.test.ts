import { describe, it, expect, vi, beforeEach } from 'vitest';
import { navigateAfterLogin, PASSKEY_ENROLL_ROUTE } from '../postAuthRouting.js';
import * as navigation from '$app/navigation';
import * as environment from '$app/environment';
import { authStore } from '$lib/stores/auth.svelte.js';
import { requiresPasskeyEnrollmentBeforeApp } from '../passkeyGate.js';
import { applyLoginWaterfall } from '../loginRouting.js';

// Mock dependencies
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

vi.mock('svelte', () => ({
	untrack: vi.fn((cb) => cb())
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: {
		refresh: vi.fn(),
		isProfileComplete: true,
		role: 'player',
		userProfile: {}
	}
}));

vi.mock('$lib/firebase.js', () => ({
	auth: {
		currentUser: { uid: '123' }
	}
}));

vi.mock('../passkeyGate.js', () => ({
	requiresPasskeyEnrollmentBeforeApp: vi.fn(),
	PASSKEY_ENROLL_ROUTE: '/auth/enroll-passkey'
}));

vi.mock('../loginRouting.js', () => ({
	applyLoginWaterfall: vi.fn()
}));

describe('navigateAfterLogin', () => {
	beforeEach(() => {
		vi.clearAllMocks();
        // Ensure browser is mocked to true for subsequent tests.
        vi.mocked(environment).browser = true;
	});

	it('does not navigate if not in browser environment', async () => {
        // Safe modification of the mock
        vi.mocked(environment).browser = false;

        await navigateAfterLogin();

        expect(authStore.refresh).not.toHaveBeenCalled();
        expect(navigation.goto).not.toHaveBeenCalled();
	});

	it('navigates to PASSKEY_ENROLL_ROUTE if requiresPasskeyEnrollmentBeforeApp returns true', async () => {
		vi.mocked(requiresPasskeyEnrollmentBeforeApp).mockResolvedValueOnce(true);

		await navigateAfterLogin();

		expect(authStore.refresh).toHaveBeenCalledWith({ silent: true });
		expect(navigation.goto).toHaveBeenCalledWith(PASSKEY_ENROLL_ROUTE, { replaceState: true });
        expect(applyLoginWaterfall).not.toHaveBeenCalled();
	});

	it('navigates to /setup if profile is incomplete', async () => {
		vi.mocked(requiresPasskeyEnrollmentBeforeApp).mockResolvedValueOnce(false);
        (authStore as any).isProfileComplete = false;

		await navigateAfterLogin();

		expect(navigation.goto).toHaveBeenCalledWith('/setup', { replaceState: true });
        expect(applyLoginWaterfall).not.toHaveBeenCalled();
	});

	it('navigates to applyLoginWaterfall destination if profile is complete and no passkey required', async () => {
		vi.mocked(requiresPasskeyEnrollmentBeforeApp).mockResolvedValueOnce(false);
        (authStore as any).isProfileComplete = true;
        vi.mocked(applyLoginWaterfall).mockReturnValueOnce('/mocked/path');

		await navigateAfterLogin();

		expect(applyLoginWaterfall).toHaveBeenCalledWith(authStore.role, authStore.userProfile);
		expect(navigation.goto).toHaveBeenCalledWith('/mocked/path', { replaceState: true });
	});

	it('catches and ignores exceptions from authStore.refresh', async () => {
        vi.mocked(requiresPasskeyEnrollmentBeforeApp).mockResolvedValueOnce(false);
        (authStore as any).isProfileComplete = true;
        vi.mocked(applyLoginWaterfall).mockReturnValueOnce('/mocked/path');
        vi.mocked(authStore.refresh).mockRejectedValueOnce(new Error('refresh failed'));

		await navigateAfterLogin();

        expect(applyLoginWaterfall).toHaveBeenCalled();
		expect(navigation.goto).toHaveBeenCalledWith('/mocked/path', { replaceState: true });
	});

    it('uses provided replaceState option', async () => {
        vi.mocked(requiresPasskeyEnrollmentBeforeApp).mockResolvedValueOnce(false);
        (authStore as any).isProfileComplete = true;
        vi.mocked(applyLoginWaterfall).mockReturnValueOnce('/mocked/path');

		await navigateAfterLogin({ replaceState: false });

		expect(navigation.goto).toHaveBeenCalledWith('/mocked/path', { replaceState: false });
    });
});
