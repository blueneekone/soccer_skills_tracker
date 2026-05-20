import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const FACADE = join(__dirname, '..', '..', 'auth.svelte.js');

describe('auth facade composition (Phase C)', () => {
	it('auth.svelte.js re-exports modular brain from src/lib/stores/auth/', () => {
		const src = readFileSync(FACADE, 'utf-8');
		expect(src).toMatch(/from '\$lib\/stores\/auth\/facade\.svelte\.js'/);
		expect(src).not.toMatch(/function createAuthStore\(\)/);
	});

	it('facade module wires lifecycle without embedding user/tenant state literals', () => {
		const facadePath = join(__dirname, '..', 'facade.svelte.js');
		const src = readFileSync(facadePath, 'utf-8');
		expect(src).toMatch(/createUserState/);
		expect(src).toMatch(/createTenantState/);
		expect(src).toMatch(/onAuthStateChanged/);
	});
});
