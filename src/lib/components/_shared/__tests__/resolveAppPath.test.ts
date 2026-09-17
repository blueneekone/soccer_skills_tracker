import { describe, it, expect } from 'vitest';
import { resolveAppPath } from '../resolveAppPath.js';

describe('resolveAppPath', () => {
	it('resolves absolute paths directly', () => {
		expect(resolveAppPath('/player/workout')).toBe('/player/workout');
		expect(resolveAppPath('/admin/dashboard')).toBe('/admin/dashboard');
		expect(resolveAppPath('/')).toBe('/');
	});

	it('returns the path unmodified if it does not match known tenant structures', () => {
		expect(resolveAppPath('unknown-route')).toBe('unknown-route');
		expect(resolveAppPath('')).toBe('');
	});

	it('handles query parameters correctly', () => {
		expect(resolveAppPath('/player/armory?tab=studio')).toBe('/player/armory?tab=studio');
	});
});
