import { describe, expect, it } from 'vitest';
import { buildComplianceMap } from '$lib/admin/organizationsCompliance.js';

describe('organizationsCompliance', () => {
	it('buildComplianceMap assigns clean when all requests approved', () => {
		const map = buildComplianceMap([
			{ clubId: 'c1', status: 'approved' },
			{ clubId: 'c1', status: 'approved' },
		]);
		expect(map.get('c1')).toEqual({ status: 'clean', total: 2, verified: 2 });
	});

	it('buildComplianceMap assigns watch at 50% verified', () => {
		const map = buildComplianceMap([
			{ clubId: 'c2', status: 'pending' },
			{ clubId: 'c2', status: 'approved' },
		]);
		expect(map.get('c2')?.status).toBe('watch');
	});

	it('buildComplianceMap assigns risk when verified share is below 50%', () => {
		const map = buildComplianceMap([
			{ clubId: 'c3', status: 'pending' },
			{ clubId: 'c3', status: 'pending' },
			{ clubId: 'c3', status: 'approved' },
		]);
		expect(map.get('c3')?.status).toBe('risk');
	});
});
