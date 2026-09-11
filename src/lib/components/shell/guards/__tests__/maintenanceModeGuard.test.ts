import { describe, it, expect } from 'vitest';

describe('Maintenance Mode Guard Logic (Sprint 1.1)', () => {
	function isMaintenanceLockout(loaded: boolean, maintenanceMode: boolean, role?: string | null): boolean {
		return loaded && maintenanceMode && role !== 'super_admin' && role !== 'global_admin';
	}

	it('does not lock out users when feature flags are not yet loaded', () => {
		expect(isMaintenanceLockout(false, true, 'coach')).toBe(false);
	});

	it('locks out regular users when maintenance mode is active', () => {
		expect(isMaintenanceLockout(true, true, 'coach')).toBe(true);
		expect(isMaintenanceLockout(true, true, 'player')).toBe(true);
		expect(isMaintenanceLockout(true, true, 'parent')).toBe(true);
		expect(isMaintenanceLockout(true, true, 'director')).toBe(true);
	});

	it('exempts global_admin and super_admin from maintenance lockout', () => {
		expect(isMaintenanceLockout(true, true, 'global_admin')).toBe(false);
		expect(isMaintenanceLockout(true, true, 'super_admin')).toBe(false);
	});

	it('does not lock out any user when maintenance mode is inactive', () => {
		expect(isMaintenanceLockout(true, false, 'coach')).toBe(false);
		expect(isMaintenanceLockout(true, false, 'player')).toBe(false);
	});
});
