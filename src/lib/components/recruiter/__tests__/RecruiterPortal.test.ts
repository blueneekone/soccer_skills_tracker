// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import RecruiterPortal from '../RecruiterPortal.svelte';

vi.mock('$app/environment', () => ({
	browser: true
}));
vi.mock('$lib/firebase.js', () => ({
	db: {},
	functions: {},
	auth: {}
}));
vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: { role: 'super_admin' }
}));
vi.mock('firebase/firestore', () => ({
	doc: vi.fn(),
	getDoc: vi.fn(),
	getDocs: vi.fn(),
	query: vi.fn(),
	collection: vi.fn()
}));
vi.mock('firebase/functions', () => ({
	httpsCallable: vi.fn(() => vi.fn())
}));

describe('RecruiterPortal', () => {
	it('should render the recruiter portal shell', () => {
		const { container } = render(RecruiterPortal);
		expect(container).toBeTruthy();
	});
});
