import { describe, expect, it } from 'vitest';
import {
	getDefaultPins,
	getNavCatalog,
	isHrefAllowedForPersona,
	resolveNavPersonaKey,
} from '$lib/shell/navPinCatalog.js';

describe.skip('navPinCatalog (NAV-OPTION-D)', () => {
	it('player default pins match registry Tier 1', () => {
		expect(getDefaultPins('player')).toEqual([
			'/player/dashboard',
			'/player/workout',
			'/stats',
		]);
	});

	it('coach default pins match exec cut', () => {
		expect(getDefaultPins('coach')).toEqual(['/coach', '/coach/forge', '/messages']);
	});

	it('parent default pins match GP-ACQ household triad', () => {
		expect(getDefaultPins('parent')).toEqual([
			'/parent/household',
			'/parent/vpc',
			'/parent/dashboard',
		]);
	});

	it('director and registrar default pins match canon table', () => {
		expect(getDefaultPins('director')).toEqual([
			'/director?tab=home',
			'/director?tab=teams',
			'/director?tab=field',
		]);
		expect(getDefaultPins('registrar')).toEqual([
			'/director?tab=home',
			'/director?tab=teams',
			'/director?tab=licenses',
		]);
	});

	it('admin default pins match bootstrap triad', () => {
		expect(getDefaultPins('admin')).toEqual([
			'/admin/overview',
			'/admin/organizations',
			'/admin/users',
		]);
	});

	it('recruiter default pins allow empty third slot', () => {
		expect(getDefaultPins('recruiter')).toEqual(['/recruiter', '/messages', null]);
	});

	it('coach sheet catalog includes War Room /coach/tactical', () => {
		const coachCatalog = getNavCatalog('coach');
		const hrefs = coachCatalog.map((item) => item.href);
		expect(hrefs).toContain('/coach/tactical');
		expect(hrefs).not.toContain('/coach/tactics-board');
		expect(hrefs).toContain('/coach/drills');
		expect(hrefs).toContain('/messages');
	});

	it('player catalog includes overflow routes in More section', () => {
		const sections = getNavCatalog('player').map((i) => i.section);
		expect(sections).toContain('More routes');
		expect(
			getNavCatalog('player').some((i) => i.href === '/player/settings'),
		).toBe(true);
	});

	it('isHrefAllowedForPersona rejects unknown hrefs', () => {
		expect(isHrefAllowedForPersona('/coach/tactical', 'coach')).toBe(true);
		expect(isHrefAllowedForPersona('/coach/tactics-board', 'coach')).toBe(false);
		expect(isHrefAllowedForPersona('/player/dashboard', 'player')).toBe(true);
	});

	it('resolveNavPersonaKey maps staff roles and contexts', () => {
		expect(resolveNavPersonaKey('parent', 'household')).toBe('parent');
		expect(resolveNavPersonaKey('recruiter', 'recruiter')).toBe('recruiter');
		expect(resolveNavPersonaKey('global_admin', 'admin')).toBe('admin');
		expect(resolveNavPersonaKey('director', 'director')).toBe('director');
		expect(resolveNavPersonaKey('registrar', 'registrar')).toBe('registrar');
	});
});
