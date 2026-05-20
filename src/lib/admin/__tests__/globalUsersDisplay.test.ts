import { describe, expect, it } from 'vitest';
import {
	formatLastActive,
	initials,
	normalizeEmailPrefix,
	roleFilterForTab,
	roleLabel,
} from '$lib/admin/globalUsersDisplay.js';

describe('globalUsersDisplay', () => {
	it('normalizeEmailPrefix lowercases and trims', () => {
		expect(normalizeEmailPrefix('  Ewa@Test.com  ')).toBe('ewa@test.com');
	});

	it('roleLabel maps admin roles', () => {
		expect(roleLabel('global_admin')).toBe('Global Admin');
		expect(roleLabel('coach')).toBe('Coach');
	});

	it('roleFilterForTab returns in-filter for admins', () => {
		expect(roleFilterForTab('admins')).toEqual({
			kind: 'in',
			values: ['super_admin', 'global_admin', 'admin'],
		});
	});

	it('initials uses first and last token', () => {
		expect(initials('Ace Star')).toBe('AS');
	});

	it('formatLastActive returns em dash for zero', () => {
		expect(formatLastActive(0)).toBe('—');
	});
});
