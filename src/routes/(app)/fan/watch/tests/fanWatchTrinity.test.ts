import { describe, it, expect } from 'vitest';
import Page from '../+page.svelte';
import BroadcastArena from '../BroadcastArena.svelte';
import BroadcastHUD from '../BroadcastHUD.svelte';

describe('Fan OS Watch - Vanguard Trinity Components', () => {
	it('defines the Shell (+page.svelte)', () => {
		expect(Page).toBeDefined();
	});

	it('defines the Glass (BroadcastArena.svelte)', () => {
		expect(BroadcastArena).toBeDefined();
	});

	it('defines the HUD (BroadcastHUD.svelte)', () => {
		expect(BroadcastHUD).toBeDefined();
	});
});
