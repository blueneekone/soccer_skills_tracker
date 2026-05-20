import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ENGINE = join(__dirname, '..', '..', '..', 'components', 'coach', 'TacticalEngine.svelte.ts');
const BRAIN = join(__dirname, '..', 'tacticalWarRoom.svelte.ts');

describe('TacticalEngine factory (Phase C)', () => {
	it('war-room brain module owns createTacticalWarRoom implementation', () => {
		const brain = readFileSync(BRAIN, 'utf-8');
		expect(brain).toMatch(/export function createTacticalWarRoom/);
		expect(brain).toMatch(/wireTacticalPlayback/);
		expect(brain.length).toBeGreaterThan(5000);
	});

	it('TacticalEngine.svelte.ts is a thin factory re-export', () => {
		const src = readFileSync(ENGINE, 'utf-8');
		expect(src).toMatch(/from '\$lib\/states\/war-room\/tacticalWarRoom\.svelte\.js'/);
		expect(src).not.toMatch(/export function createTacticalWarRoom\(/);
		expect(src.split('\n').length).toBeLessThan(40);
	});
});
