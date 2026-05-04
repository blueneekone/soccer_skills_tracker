import type { TacticalToken } from './types';

export const VIEW_W = 1600;
export const VIEW_H = 900;
export const DISC_HIT_R = 32;
export const SIM_ROUTE_DURATION_MS = 2000;
export const DELAY_STEP_MS = 500;
export const TRAIL_MAX_POINTS = 140;
export const DRAG_TRAIL_MAX_POINTS = 20;

export const INK_PALETTE = ['#00f0ff', '#ff00ff', '#ffff00', '#ffffff'] as const;

export const FRIENDLY_RING = '#00f0ff';
export const OPP_RING = '#fb7185';

const OPP_FORMATION_LABELS = [
	'GK',
	'CB',
	'CB',
	'LB',
	'RB',
	'CM',
	'CM',
	'LW',
	'RW',
	'ST',
	'CF',
] as const;

/** Synthetic opposition roster for the radial deploy modal. */
export const MOCK_OPPOSITION: TacticalToken[] = Array.from({ length: 11 }, (_, i) => ({
	id: `OPP-${String(i + 1).padStart(2, '0')}`,
	name: `HOSTILE ${String(i + 1).padStart(2, '0')}`,
	number: String(i + 1).padStart(2, '0'),
	position: OPP_FORMATION_LABELS[i] ?? 'X',
	color: OPP_RING,
	side: 'opponent' as const,
}));

export const HUB_ORBIT = 118;
export const HUB_HOVER_PX = 52;
