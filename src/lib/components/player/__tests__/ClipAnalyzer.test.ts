// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import ClipAnalyzer from '../ClipAnalyzer.svelte';

vi.mock('$lib/firebase.js', () => ({
	db: {},
	storage: {}
}));
vi.mock('$lib/stores/armory.svelte.js', () => ({
	armory: { awardXP: vi.fn() }
}));

describe('ClipAnalyzer', () => {
	it('should render the dropzone area', () => {
		const { getByText } = render(ClipAnalyzer, { drillId: 'test-drill' });
		expect(getByText('SUBMIT TRAINING CLIP')).toBeTruthy();
	});
});
