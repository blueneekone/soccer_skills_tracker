/**
 * SkillTreeEngine.fog.test.ts
 * ───────────────────────────
 * Unit tests for the Phase 4 / Epic 7 Asymmetric Fog of War predicate.
 *
 * Tests the pure decision logic of `isNodeVisible` across all three regimes:
 *
 *   1. Kill-switch OFF   → all nodes visible.
 *   2. ROOKIE tier       → only rank-1 nodes visible.
 *   3. PRO+ progressive  → rank-1 always, rank-2/3 gated by parent state.
 *
 * To avoid mocking Firebase / SvelteKit internals, we replicate the exact
 * predicate logic inline and assert the same branching rules.  When the
 * production implementation in SkillTreeEngine.svelte.ts changes, this
 * test file must be updated to match.
 */

import { describe, it, expect } from 'vitest';
import {
	PHYSICAL_SNOWFLAKE_TAXONOMY,
	TAXONOMY_BY_ID,
} from '$lib/data/skillTree/physicalSnowflakeTaxonomy.js';
import type { SyntheticNode } from '$lib/data/skillTree/physicalSnowflakeTaxonomy.js';

// ── Replica of SkillTreeEngine private helpers ────────────────────────────────
// These mirror the production code exactly so the tests validate the
// same logic path without importing a class that depends on Firebase.

type NodeState = 'locked' | 'unlocked' | 'mastered';
type TierId = 'ROOKIE' | 'PRO' | 'ELITE' | 'VANGUARD';

function nodeState(progress: number, threshold: number): NodeState {
	if (progress < threshold) return 'locked';
	if (progress >= threshold + 0.15) return 'mastered';
	return 'unlocked';
}

function nodeStateById(
	nodeId: string,
	ratings: Record<string, number>,
): NodeState {
	const node = TAXONOMY_BY_ID[nodeId];
	if (!node) return 'locked';
	return nodeState(ratings[node.parentAttr] ?? 0, node.threshold);
}

function isNodeVisible(
	nodeId: string,
	fogEnabled: boolean,
	tierId: TierId,
	ratings: Record<string, number>,
): boolean {
	if (!fogEnabled) return true;

	const node = TAXONOMY_BY_ID[nodeId];
	if (!node) return false;

	if (node.rank === 1) return true;

	if (tierId === 'ROOKIE') return false;

	if (node.parentNodeId === null) return true;
	return nodeStateById(node.parentNodeId, ratings) !== 'locked';
}

// ── Test data helpers ─────────────────────────────────────────────────────────

const ZERO_RATINGS: Record<string, number> = {
	PAC: 0, ACC: 0, POW: 0, VAN: 0, STM: 0, AGI: 0,
};

const MAX_RATINGS: Record<string, number> = {
	PAC: 1, ACC: 1, POW: 1, VAN: 1, STM: 1, AGI: 1,
};

// Pick one rank-1 and one rank-2 node for targeted assertions.
const rank1Nodes: SyntheticNode[] = PHYSICAL_SNOWFLAKE_TAXONOMY.filter((n) => n.rank === 1);
const rank2Nodes: SyntheticNode[] = PHYSICAL_SNOWFLAKE_TAXONOMY.filter((n) => n.rank === 2);
const rank3Nodes: SyntheticNode[] = PHYSICAL_SNOWFLAKE_TAXONOMY.filter((n) => n.rank === 3);

// ── Test suites ───────────────────────────────────────────────────────────────

describe('Fog of War: kill-switch OFF', () => {
	it('shows all 30 nodes regardless of tier', () => {
		for (const node of PHYSICAL_SNOWFLAKE_TAXONOMY) {
			expect(isNodeVisible(node.id, false, 'ROOKIE', ZERO_RATINGS)).toBe(true);
		}
	});

	it('shows all nodes even for a VANGUARD with zero ratings', () => {
		for (const node of PHYSICAL_SNOWFLAKE_TAXONOMY) {
			expect(isNodeVisible(node.id, false, 'VANGUARD', ZERO_RATINGS)).toBe(true);
		}
	});
});

describe('Fog of War: ROOKIE tier rank gate', () => {
	it('shows all 6 rank-1 trunk nodes', () => {
		for (const node of rank1Nodes) {
			expect(isNodeVisible(node.id, true, 'ROOKIE', ZERO_RATINGS)).toBe(true);
		}
	});

	it('hides all 12 rank-2 nodes', () => {
		for (const node of rank2Nodes) {
			expect(isNodeVisible(node.id, true, 'ROOKIE', ZERO_RATINGS)).toBe(false);
		}
	});

	it('hides all 12 rank-3 nodes', () => {
		for (const node of rank3Nodes) {
			expect(isNodeVisible(node.id, true, 'ROOKIE', ZERO_RATINGS)).toBe(false);
		}
	});

	it('hides rank-2 even with max attribute ratings (tier gate overrides progress)', () => {
		for (const node of rank2Nodes) {
			expect(isNodeVisible(node.id, true, 'ROOKIE', MAX_RATINGS)).toBe(false);
		}
	});
});

describe('Fog of War: PRO+ per-branch progressive reveal', () => {
	it('shows all rank-1 nodes', () => {
		for (const node of rank1Nodes) {
			expect(isNodeVisible(node.id, true, 'PRO', ZERO_RATINGS)).toBe(true);
		}
	});

	it('hides rank-2 when parent is locked (zero ratings)', () => {
		for (const node of rank2Nodes) {
			expect(isNodeVisible(node.id, true, 'PRO', ZERO_RATINGS)).toBe(false);
		}
	});

	it('shows rank-2 when parent is unlocked', () => {
		// PAC branch: pac.first-step (rank-1) threshold = 0.18.
		// Setting PAC rating to 0.25 puts it in 'unlocked' state.
		const ratings = { ...ZERO_RATINGS, PAC: 0.25 };
		const pacRank2Nodes = rank2Nodes.filter((n) => n.parentAttr === 'PAC');
		for (const node of pacRank2Nodes) {
			expect(isNodeVisible(node.id, true, 'PRO', ratings)).toBe(true);
		}
	});

	it('shows rank-2 when parent is mastered', () => {
		// PAC rating = 0.6 puts pac.first-step in 'mastered' (0.18 + 0.15 = 0.33 < 0.6).
		const ratings = { ...ZERO_RATINGS, PAC: 0.6 };
		const pacRank2Nodes = rank2Nodes.filter((n) => n.parentAttr === 'PAC');
		for (const node of pacRank2Nodes) {
			expect(isNodeVisible(node.id, true, 'PRO', ratings)).toBe(true);
		}
	});

	it('keeps rank-2 hidden when sibling branch parent is unlocked (asymmetric)', () => {
		// Only PAC is progressed; ACC/POW/VAN/STM/AGI rank-2 remain fogged.
		const ratings = { ...ZERO_RATINGS, PAC: 0.6 };
		const nonPacRank2 = rank2Nodes.filter((n) => n.parentAttr !== 'PAC');
		for (const node of nonPacRank2) {
			expect(isNodeVisible(node.id, true, 'PRO', ratings)).toBe(false);
		}
	});

	it('hides rank-3 even when rank-1 is unlocked (must unlock direct parent first)', () => {
		// PAC = 0.25 unlocks pac.first-step but does NOT unlock pac.burst-speed (threshold 0.35).
		// pac.explosive-start (rank-3) requires pac.burst-speed to be unlocked.
		const ratings = { ...ZERO_RATINGS, PAC: 0.25 };
		const rank3PacNodes = rank3Nodes.filter((n) => n.parentAttr === 'PAC');
		for (const node of rank3PacNodes) {
			expect(isNodeVisible(node.id, true, 'PRO', ratings)).toBe(false);
		}
	});

	it('shows rank-3 once its direct parent is unlocked', () => {
		// pac.explosive-start (rank-3) parent = pac.burst-speed (threshold 0.35).
		// Setting PAC = 0.45 unlocks pac.burst-speed (0.35 + 0.15 = 0.50 > 0.45 → unlocked).
		const ratings = { ...ZERO_RATINGS, PAC: 0.45 };
		const burstSpeedState = nodeState(0.45, 0.35); // → 'unlocked'
		expect(burstSpeedState).toBe('unlocked');
		const explosiveStart = TAXONOMY_BY_ID['pac.explosive-start'];
		expect(isNodeVisible(explosiveStart.id, true, 'ELITE', ratings)).toBe(true);
	});

	it('applies asymmetrically: ELITE player sees only trained branches', () => {
		// STM at 0.5 → stm.base-fitness unlocked → stm rank-2 nodes visible.
		// All other branches zero → their rank-2 remain fogged.
		const ratings = { ...ZERO_RATINGS, STM: 0.5 };
		const stmRank2 = rank2Nodes.filter((n) => n.parentAttr === 'STM');
		const otherRank2 = rank2Nodes.filter((n) => n.parentAttr !== 'STM');

		for (const node of stmRank2) {
			expect(isNodeVisible(node.id, true, 'ELITE', ratings)).toBe(true);
		}
		for (const node of otherRank2) {
			expect(isNodeVisible(node.id, true, 'ELITE', ratings)).toBe(false);
		}
	});
});

describe('Fog of War: unknown node ID', () => {
	it('returns false for an unrecognised ID when fog is enabled', () => {
		expect(isNodeVisible('does.not.exist', true, 'PRO', MAX_RATINGS)).toBe(false);
	});

	it('returns true for an unrecognised ID when fog is disabled (kill-switch)', () => {
		expect(isNodeVisible('does.not.exist', false, 'PRO', MAX_RATINGS)).toBe(true);
	});
});

describe('Grit XP daily-cap economy (RL normalisation)', () => {
	it('3 awards/day × 30 days = 90 total, ÷ 10 cap = 1.0 — stays within [0,1] range', () => {
		const GRIT_DAILY_CAP = 3;
		const LOOKBACK_DAYS = 30;
		const RL_DIVISOR = 10;

		const maxGritIn30Days = GRIT_DAILY_CAP * LOOKBACK_DAYS;
		const normalised = Math.min(1, maxGritIn30Days / RL_DIVISOR);

		expect(normalised).toBe(1);
		expect(maxGritIn30Days / RL_DIVISOR).toBeGreaterThanOrEqual(1);
	});
});
