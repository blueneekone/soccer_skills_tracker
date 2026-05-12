/**
 * SkillTreeEngine.svelte.ts
 * ─────────────────────────
 * Vanguard Trinity Brain — pure TypeScript Svelte 5 state machine for the
 * Phase 3 / Epic 5 Composite Snowflake skill tree.
 *
 * Architecture contract
 * ─────────────────────
 * • No DOM access. No Firestore. All state is derived from:
 *     (a) ArmoryEngine reference    — provides live ScoutsSix ratings
 *     (b) PHYSICAL_SNOWFLAKE_TAXONOMY — authored synthetic node definitions
 *     (c) snowflakeGeometry helpers — pure coordinate calculations
 *
 * • The engine holds a REFERENCE to the caller's ArmoryEngine instance.
 *   Do NOT clone it — Svelte 5 $derived getters must read through the same
 *   reactive signal to remain live.
 *
 * • Fog of War hook (Epic 7 placeholder):
 *     `isNodeVisible(nodeId)` currently returns `true` for every node.
 *     Epic 7 will swap this predicate to a threshold-based unlock rule.
 *     The Arena renders only nodes for which isNodeVisible returns true,
 *     so the swap requires no changes outside this engine.
 *
 * Reactive derivation chain
 * ─────────────────────────
 *   armory.playerStats  →  normalisedRatings  →  nodes (RenderableNode[])
 *                                               →  branchSummaries
 *                                               →  selectedNodeDetail
 *
 * Public state mutations
 * ──────────────────────
 *   selectNode(id)     — set selectedNodeId (null to deselect)
 *   focusBranch(attr)  — highlight an entire branch (null to clear)
 *   hoverNode(id)      — set hover overlay (null to clear)
 */

import { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';
import type { ScoutsSix } from '$lib/states/ArmoryEngine.svelte.js';
import {
	branchAxisAngle,
	nodePosition,
	bezierEdgePath,
	hexPolygonPoints,
	spokeEndpoints,
	HEX_CIRCUMRADIUS,
} from './snowflakeGeometry.js';
import {
	PHYSICAL_SNOWFLAKE_TAXONOMY,
	TAXONOMY_BY_ID,
	TAXONOMY_BY_ATTR,
} from '$lib/data/skillTree/physicalSnowflakeTaxonomy.js';
import type { SyntheticNode } from '$lib/data/skillTree/physicalSnowflakeTaxonomy.js';
import { normaliseScoutsSix } from '$lib/utils/scoutsSixNormalise.js';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Node state for rendering — progress drives fill opacity. */
export type NodeState = 'locked' | 'unlocked' | 'mastered';

/**
 * A single synthetic node enriched with geometry and progress data,
 * ready for direct consumption by SkillTreeArena.
 */
export type RenderableNode = SyntheticNode & {
	/** SVG viewBox centre coordinates (in 400×400 space). */
	cx: number;
	cy: number;
	/** Pre-computed SVG polygon points string for the hex shape. */
	hexPoints: string;
	/** Normalised progress of the parent attribute (0..1). */
	progress: number;
	/** Computed display state from progress vs threshold. */
	state: NodeState;
	/** Whether the node should be rendered (Fog of War hook). */
	visible: boolean;
	/** SVG `d` path from parent node (or spoke start) to this node. */
	edgePath: string;
	/** Edge start coordinates (parent node centre or spoke entry point). */
	edgeX1: number;
	edgeY1: number;
};

/** Per-branch summary for the HUD chips. */
export type BranchSummary = {
	attr: keyof ScoutsSix;
	label: string;
	unlocked: number;
	total: number;
	progress: number; // 0..1 normalised attribute rating
	accent: string;
};

/** Spoke line endpoints pre-computed for the Arena renderer. */
export type SpokeLine = {
	attr: keyof ScoutsSix;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
};

// ── Attribute labels (short) ──────────────────────────────────────────────────

const ATTR_LABELS: Record<keyof ScoutsSix, string> = {
	PAC: 'Pace',
	ACC: 'Accel',
	POW: 'Power',
	VAN: 'Vanguard',
	STM: 'Stamina',
	AGI: 'Agility',
};

const SCOUTS_SIX_KEYS: (keyof ScoutsSix)[] = ['PAC', 'ACC', 'POW', 'VAN', 'STM', 'AGI'];

// ── Engine class ──────────────────────────────────────────────────────────────

export class SkillTreeEngine {

	// ── External reference ────────────────────────────────────────────────
	/** Live ArmoryEngine reference — NOT cloned. Reads stay reactive. */
	readonly #armory: ArmoryEngine;

	// ── Selection state ───────────────────────────────────────────────────

	/** ID of the currently selected node, or null for no selection. */
	selectedNodeId = $state<string | null>(null);

	/** The attribute branch currently highlighted in the HUD, or null. */
	focusedBranch = $state<keyof ScoutsSix | null>(null);

	/** ID of the node currently under the pointer (hover), or null. */
	hoveredNodeId = $state<string | null>(null);

	// ── Constructor ───────────────────────────────────────────────────────

	constructor(armory: ArmoryEngine) {
		this.#armory = armory;
	}

	// ── Fog of War stub ───────────────────────────────────────────────────

	/**
	 * Determine whether a node should be rendered.
	 *
	 * Phase 3 / Sprint 5.1: always returns `true` — all nodes are visible.
	 *
	 * Epic 7 (Asymmetric UI Fog of War) will replace this predicate with
	 * a threshold-based unlock rule: rank > 1 nodes are hidden until their
	 * parentNode is in 'unlocked' or 'mastered' state.  Because Arena
	 * checks `isNodeVisible` before rendering, Epic 7 requires zero changes
	 * to the rendering layer.
	 *
	 * @param _nodeId  The synthetic node ID (unused until Epic 7).
	 */
	isNodeVisible(_nodeId: string): boolean {
		return true;
	}

	// ── Reactive derivations ──────────────────────────────────────────────

	/**
	 * Normalised ratings for all six ScoutsSix attributes.
	 * Re-computed whenever armory.playerStats changes.
	 */
	get normalisedRatings(): Record<keyof ScoutsSix, number> {
		const s = this.#armory.playerStats;
		return {
			PAC: normaliseScoutsSix('PAC', s.PAC),
			ACC: normaliseScoutsSix('ACC', s.ACC),
			POW: normaliseScoutsSix('POW', s.POW),
			VAN: normaliseScoutsSix('VAN', s.VAN),
			STM: normaliseScoutsSix('STM', s.STM),
			AGI: normaliseScoutsSix('AGI', s.AGI),
		};
	}

	/**
	 * All 30 synthetic nodes enriched with geometry, progress, and state.
	 * The Arena iterates this array directly — no further transformation needed.
	 */
	get nodes(): RenderableNode[] {
		const ratings = this.normalisedRatings;
		return PHYSICAL_SNOWFLAKE_TAXONOMY.map((node): RenderableNode => {
			const axisDeg = branchAxisAngle(node.parentAttr);
			const { x: cx, y: cy } = nodePosition(node.rank, node.fanOffsetDeg, axisDeg);
			const progress = ratings[node.parentAttr];
			const state = this.#nodeState(progress, node.threshold);
			const visible = this.isNodeVisible(node.id);
			const hexPoints = hexPolygonPoints(cx, cy, HEX_CIRCUMRADIUS, 30); // flat-top orientation

			// Edge path from parent node to this node.
			const { edgeX1, edgeY1, edgePath } = this.#computeEdge(node, axisDeg);

			return {
				...node,
				cx,
				cy,
				hexPoints,
				progress,
				state,
				visible,
				edgePath,
				edgeX1,
				edgeY1,
			};
		});
	}

	/**
	 * Branch summary objects consumed by the HUD chips row.
	 * One entry per ScoutsSix attribute, in canonical order.
	 */
	get branchSummaries(): BranchSummary[] {
		const ratings = this.normalisedRatings;
		return SCOUTS_SIX_KEYS.map((attr): BranchSummary => {
			const branchNodes = TAXONOMY_BY_ATTR[attr];
			const progress = ratings[attr];
			const unlocked = branchNodes.filter(
				(n) => this.#nodeState(progress, n.threshold) !== 'locked',
			).length;
			return {
				attr,
				label: ATTR_LABELS[attr],
				unlocked,
				total: branchNodes.length,
				progress,
				accent: this.accentForBranch(attr),
			};
		});
	}

	/**
	 * Spoke lines (one per attribute branch) from the prism boundary outward.
	 * Passed to the Arena so it can render backdrop spoke geometry separately
	 * from node polygons (z-order: spokes behind nodes).
	 */
	get spokeLines(): SpokeLine[] {
		return SCOUTS_SIX_KEYS.map((attr) => {
			const { x1, y1, x2, y2 } = spokeEndpoints(attr);
			return { attr, x1, y1, x2, y2 };
		});
	}

	/**
	 * Detail data for the currently selected node, or null.
	 * Consumed by the HUD bottom detail panel.
	 */
	get selectedNodeDetail(): (RenderableNode & { attrLabel: string; progressPct: number }) | null {
		if (!this.selectedNodeId) return null;
		const node = this.nodes.find((n) => n.id === this.selectedNodeId);
		if (!node) return null;
		return {
			...node,
			attrLabel: ATTR_LABELS[node.parentAttr],
			progressPct: Math.round(node.progress * 100),
		};
	}

	/**
	 * Neon accent colour for a branch.
	 * Reads from `armory.currentTier.accent` so the entire snowflake
	 * re-tints automatically when a player reaches a new tier.
	 *
	 * Individual branch identity tints are subtly derived by rotating the
	 * hue of the tier accent, keeping the cyberpunk aesthetic cohesive.
	 */
	accentForBranch(_attr: keyof ScoutsSix): string {
		// Sprint 5.1: all branches share the tier accent.
		// Future sprint can introduce per-branch hue rotation here.
		return this.#armory.currentTier.accent;
	}

	// ── State mutation methods ────────────────────────────────────────────

	/** Select a node. Pass null to clear selection. */
	selectNode(id: string | null): void {
		this.selectedNodeId = id === this.selectedNodeId ? null : id;
	}

	/** Highlight a branch. Pass null to clear focus. */
	focusBranch(attr: keyof ScoutsSix | null): void {
		this.focusedBranch = attr === this.focusedBranch ? null : attr;
	}

	/** Set hover state. Pass null when pointer leaves. */
	hoverNode(id: string | null): void {
		this.hoveredNodeId = id;
	}

	// ── Private helpers ───────────────────────────────────────────────────

	/**
	 * Compute the node render state from normalised progress and threshold.
	 *
	 *   progress < threshold                  → 'locked'
	 *   threshold ≤ progress < threshold+0.15 → 'unlocked'
	 *   progress ≥ threshold + 0.15           → 'mastered'
	 */
	#nodeState(progress: number, threshold: number): NodeState {
		if (progress < threshold) return 'locked';
		if (progress >= threshold + 0.15) return 'mastered';
		return 'unlocked';
	}

	/**
	 * Compute edge path from a node's parent (or the spoke start) to the
	 * node centre.  Used by the Arena to draw the snowflake connection lines.
	 */
	#computeEdge(
		node: SyntheticNode,
		axisDeg: number,
	): { edgeX1: number; edgeY1: number; edgePath: string } {
		const { x: cx, y: cy } = nodePosition(node.rank, node.fanOffsetDeg, axisDeg);

		if (node.parentNodeId === null) {
			// Rank-1 node: edge starts at the prism boundary.
			const { x1, y1 } = spokeEndpoints(node.parentAttr);
			return {
				edgeX1: x1,
				edgeY1: y1,
				edgePath: bezierEdgePath(x1, y1, cx, cy),
			};
		}

		// Rank-2 or rank-3 node: find parent in taxonomy.
		const parent = TAXONOMY_BY_ID[node.parentNodeId];
		if (!parent) {
			// Safety fallback — should never happen with a valid taxonomy.
			const { x1, y1 } = spokeEndpoints(node.parentAttr);
			return { edgeX1: x1, edgeY1: y1, edgePath: '' };
		}
		const { x: px, y: py } = nodePosition(parent.rank, parent.fanOffsetDeg, axisDeg);
		return {
			edgeX1: px,
			edgeY1: py,
			edgePath: bezierEdgePath(px, py, cx, cy),
		};
	}
}
