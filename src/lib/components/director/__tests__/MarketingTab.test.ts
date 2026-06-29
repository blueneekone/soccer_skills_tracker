// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import MarketingTab from '../MarketingTab.svelte';

vi.mock('$app/environment', () => ({
	browser: true
}));
vi.mock('$lib/firebase.js', () => ({
	db: {},
	functions: {}
}));
vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: { role: 'super_admin' }
}));
vi.mock('firebase/firestore', () => ({
	doc: vi.fn(),
	getDoc: vi.fn(),
	getDocs: vi.fn(),
	query: vi.fn(),
	collection: vi.fn(),
	where: vi.fn(),
	limit: vi.fn(),
	orderBy: vi.fn()
}));
vi.mock('firebase/functions', () => ({
	httpsCallable: vi.fn(() => vi.fn())
}));

describe('MarketingTab', () => {
	it('should render the marketing tab headers', () => {
		const { getByText } = render(MarketingTab, { clubId: 'test-club' });
		expect(getByText('Public storefront')).toBeTruthy();
		expect(getByText('Conversion tracking (pixels)')).toBeTruthy();
	});
});
