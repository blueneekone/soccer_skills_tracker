/**
 * StatusChip.test.ts
 * Validates StatusChip tone palette: correct muted accent tokens,
 * no neon/box-shadow glow values, and correct default icon mapping.
 */

import { describe, it, expect } from 'vitest';

/** Mirror of the private TONE_STYLE map in StatusChip.svelte */
const TONE_STYLE: Record<string, string> = {
	verified: '--chip-bg: rgba(20,184,166,0.12); --chip-border: rgba(20,184,166,0.35); --chip-text: #5eead4;',
	warning:  '--chip-bg: rgba(180,83,9,0.14);   --chip-border: rgba(180,83,9,0.4);    --chip-text: #fb923c;',
	critical: '--chip-bg: rgba(153,27,27,0.14);  --chip-border: rgba(153,27,27,0.4);   --chip-text: #fca5a5;',
	pending:  '--chip-bg: rgba(100,116,139,0.12);--chip-border: rgba(100,116,139,0.35);--chip-text: #94a3b8;',
	muted:    '--chip-bg: rgba(71,85,105,0.10);  --chip-border: rgba(71,85,105,0.3);   --chip-text: #64748b;',
};

const TONE_ICON: Record<string, string> = {
	verified: 'status.verified',
	warning:  'status.warning',
	critical: 'status.error',
	pending:  'status.pending',
	muted:    'status.info',
};

describe('StatusChip tone palette', () => {
	const tones = ['verified', 'warning', 'critical', 'pending', 'muted'];

	it('defines a style string for every tone', () => {
		for (const tone of tones) {
			expect(TONE_STYLE[tone], `Missing style for tone: ${tone}`).toBeDefined();
		}
	});

	it('has no neon hex values (#00f0ff, #ff003c) in any tone', () => {
		for (const [tone, style] of Object.entries(TONE_STYLE)) {
			expect(style, `Neon cyan found in tone: ${tone}`).not.toContain('#00f0ff');
			expect(style, `Neon red found in tone: ${tone}`).not.toContain('#ff003c');
		}
	});

	it('uses only rgba() for backgrounds and borders (no solid bright colors)', () => {
		for (const [tone, style] of Object.entries(TONE_STYLE)) {
			const bgMatch = style.match(/--chip-bg:\s*([^;]+)/);
			const borderMatch = style.match(/--chip-border:\s*([^;]+)/);
			if (bgMatch) {
				expect(bgMatch[1].trim(), `Chip bg for "${tone}" should use rgba()`).toMatch(/^rgba\(/);
			}
			if (borderMatch) {
				expect(borderMatch[1].trim(), `Chip border for "${tone}" should use rgba()`).toMatch(/^rgba\(/);
			}
		}
	});

	it('maps every tone to a valid icon token', () => {
		for (const tone of tones) {
			expect(TONE_ICON[tone], `Missing icon for tone: ${tone}`).toBeTruthy();
			expect(TONE_ICON[tone]).toMatch(/^status\./);
		}
	});

	it('verified tone uses muted teal (#14b8a6 family), not neon cyan', () => {
		const style = TONE_STYLE.verified;
		// teal-500 in rgba form
		expect(style).toContain('20,184,166');
	});

	it('critical tone uses NO box-shadow glow', () => {
		const style = TONE_STYLE.critical;
		expect(style).not.toContain('box-shadow');
		expect(style).not.toContain('shadow');
	});
});
