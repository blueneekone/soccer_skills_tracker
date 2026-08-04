import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeByFirestoreRole } from '../authRouter';
import { goto } from '$app/navigation';
import { getDoc } from 'firebase/firestore';

vi.mock('$app/environment', () => ({
	browser: true
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
	doc: vi.fn(),
	getDoc: vi.fn()
}));

vi.mock('$lib/firebase/config', () => ({
	db: {}
}));

describe('routeByFirestoreRole exception handling', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('routes to /onboarding if getDoc throws an exception (catch block)', async () => {
		vi.mocked(getDoc).mockRejectedValueOnce(new Error('Network Error'));

		const mockUser = { email: 'test@example.com' } as any;

		await routeByFirestoreRole(mockUser);

		expect(goto).toHaveBeenCalledWith('/onboarding', { replaceState: true });
	});
});
