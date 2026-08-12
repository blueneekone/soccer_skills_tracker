import { describe, it, expect } from 'vitest';
import { isPlatformAdmin } from '../roles';

describe('isPlatformAdmin', () => {
	it('returns true for global_admin', () => {
		expect(isPlatformAdmin('global_admin')).toBe(true);
	});

	it('returns true for super_admin', () => {
		expect(isPlatformAdmin('super_admin')).toBe(true);
	});

	it('returns false for other roles', () => {
		expect(isPlatformAdmin('director')).toBe(false);
		expect(isPlatformAdmin('coach')).toBe(false);
		expect(isPlatformAdmin('parent')).toBe(false);
		expect(isPlatformAdmin('player')).toBe(false);
		expect(isPlatformAdmin('registrar')).toBe(false);
		expect(isPlatformAdmin('recruiter')).toBe(false);
		expect(isPlatformAdmin('some_other_role')).toBe(false);
	});

	it('returns false for null, undefined, and empty string', () => {
		expect(isPlatformAdmin(null)).toBe(false);
		expect(isPlatformAdmin(undefined)).toBe(false);
		expect(isPlatformAdmin('')).toBe(false);
	});
});
