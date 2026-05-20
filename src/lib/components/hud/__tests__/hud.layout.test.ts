import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HUD = join(__dirname, '..');
const STYLES = join(__dirname, '../../../styles/hud-telemetry.css');

describe('Epic 1.2 — HUD bento + canvas ring layout', () => {
	const activeBounties = readFileSync(join(HUD, 'ActiveBounties.svelte'), 'utf8');
	const squadTelemetry = readFileSync(join(HUD, 'SquadTelemetryView.svelte'), 'utf8');
	const ringCanvas = readFileSync(join(HUD, 'HudSeededRingCanvas.svelte'), 'utf8');
	const styles = readFileSync(STYLES, 'utf8');

	it('ActiveBounties uses 12-column bento grid (no flex row layout)', () => {
		expect(activeBounties).toMatch(/bento-grid--12col/);
		expect(activeBounties).toMatch(/bento-grid--liquid/);
		expect(activeBounties).not.toMatch(/\.quest-row\s*\{[^}]*display:\s*flex/s);
		expect(activeBounties).toMatch(/HudSeededRingCanvas/);
	});

	it('SquadTelemetryView readiness HUD uses bento grid', () => {
		expect(squadTelemetry).toMatch(/hud-telemetry-root/);
		expect(squadTelemetry).toMatch(/bento-grid--12col/);
		expect(squadTelemetry).toMatch(/HudSeededRingCanvas/);
	});

	it('avatar containers enforce overflow hidden and 24px radius', () => {
		expect(styles).toMatch(/overflow:\s*hidden/);
		expect(styles).toMatch(/border-radius:\s*24px/);
		expect(ringCanvas).toMatch(/hud-seeded-ring__avatar/);
	});

	it('HUD spacing uses fluid clamp tokens', () => {
		expect(styles).toMatch(/clamp\(/);
		expect(styles).toMatch(/--hud-gap/);
	});

	it('HudSeededRingCanvas is Svelte 5 runes compliant', () => {
		expect(ringCanvas).toMatch(/\$props\(\)/);
		expect(ringCanvas).toMatch(/\$derived/);
		expect(ringCanvas).toMatch(/\$effect/);
		expect(ringCanvas).toMatch(/drawSeededProgressRing/);
	});
});
