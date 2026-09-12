import { describe, it, expect } from 'vitest';
import Page from '../+page.svelte';
import PlayerArena from '../PlayerArena.svelte';
import PlayerHUD from '../PlayerHUD.svelte';
import { PlayerDashboardEngine } from '../PlayerDashboardEngine.svelte.js';

describe('Player Dashboard - Vanguard Trinity Components (Sprint 3.1)', () => {
	it('defines the Shell (+page.svelte)', () => {
		expect(Page).toBeDefined();
	});

	it('defines the Glass (PlayerArena.svelte)', () => {
		expect(PlayerArena).toBeDefined();
	});

	it('defines the HUD (PlayerHUD.svelte)', () => {
		expect(PlayerHUD).toBeDefined();
	});

	it('instantiates the Brain (PlayerDashboardEngine.svelte.ts)', () => {
		const engine = new PlayerDashboardEngine();
		expect(engine).toBeDefined();
		expect(typeof engine.subscribe).toBe('function');
		expect(typeof engine.signAttestation).toBe('function');
	});
});
