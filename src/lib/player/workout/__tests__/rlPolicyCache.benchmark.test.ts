import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureRlPolicyCached } from '../rlPolicyCache.js';

describe('RL Policy Cache Benchmark', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		if (typeof sessionStorage !== 'undefined') {
			sessionStorage.clear();
		}
	});

	it('benchmarks ensureRlPolicyCached without caching vs with caching', async () => {
		const mockFetchPolicy = vi.fn().mockResolvedValue({
			mode: 'policy',
			recommendedDrillId: 'drill-123',
			recommendedDurationMinutes: 30,
			recommendedTargetRpe: 7,
			policyVersion: 1,
			explorationFlag: false,
			explanationCode: 'BUILDING',
			explanationText: 'Building fitness',
		});

		// Baseline: Simulate calling fetchPolicy directly multiple times
		const startDirect = performance.now();
		for (let i = 0; i < 1000; i++) {
			await mockFetchPolicy('soccer');
		}
		const durationDirect = performance.now() - startDirect;

		mockFetchPolicy.mockClear();

		// Caching: Simulate calling ensureRlPolicyCached multiple times
		const startCached = performance.now();
		for (let i = 0; i < 1000; i++) {
			await ensureRlPolicyCached({
				sportId: 'soccer',
				fetchPolicy: mockFetchPolicy,
			});
		}
		const durationCached = performance.now() - startCached;

		console.log(`Direct Fetch x1000: ${durationDirect.toFixed(2)}ms`);
		console.log(`Cached Fetch x1000: ${durationCached.toFixed(2)}ms`);

		// Make sure it actually fetched exactly once
		expect(mockFetchPolicy).toHaveBeenCalledTimes(1);
	});
});
