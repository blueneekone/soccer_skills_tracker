<script lang="ts">
	/**
	 * SkillTreeArena.svelte
	 * ─────────────────────
	 * Vanguard Trinity — Glass layer. Pure SVG renderer for the Composite
	 * Snowflake skill tree. Zero state mutations, zero Firestore, zero
	 * business logic. All interaction is delegated to SkillTreeEngine.
	 *
	 * Rendering z-order (bottom → top):
	 *   1. Glassmorphism wrapper div
	 *   2. SVG canvas (viewBox 0 0 400 400)
	 *      a. <defs> — gradients + bloom filter
	 *      b. Spoke lines
	 *      c. Edge Bezier paths
	 *      d. Hex node polygons + selection rings + labels
	 *      e. Center glow disc
	 *   3. VanguardPrism absolute overlay
	 */

	import VanguardPrism from '$lib/components/player/VanguardPrism.svelte';
	import type { SkillTreeEngine } from './SkillTreeEngine.svelte.js';
	import type { ScoutsSix } from '$lib/states/ArmoryEngine.svelte.js';
	import { hexPolygonPoints, HEX_CIRCUMRADIUS } from './snowflakeGeometry.js';

	// ── Props ──────────────────────────────────────────────────────────────────
	interface Props {
		engine: SkillTreeEngine;
		/** Passed from Shell → VanguardPrism. Use `armory.playerStats`. */
		armoryStats?: Partial<ScoutsSix>;
		/** Neon accent colour — drives glow tint for the entire canvas. */
		tierAccent?: string;
	}

	let { engine, armoryStats = {}, tierAccent = '#14b8a6' }: Props = $props();

	/** Unique prefix so gradient/filter IDs don't collide across instances. */
	const uid = `sta-${Math.random().toString(36).slice(2, 7)}`;

	/** Outer polygon circumradius for the selection ring. */
	const SELECTION_R = HEX_CIRCUMRADIUS + 4;

	// ── Derived ────────────────────────────────────────────────────────────────

	/** Nodes that are fully visible — rendered as interactive hex polygons. */
	const visibleNodes = $derived(engine.nodes.filter((n) => n.visible));

	/** Nodes hidden by Fog of War — rendered as dim placeholder silhouettes. */
	const foggedNodes = $derived(engine.nodes.filter((n) => !n.visible));

	// ── Decay re-fog pulse ─────────────────────────────────────────────────────

	/**
	 * Tracks node IDs that just transitioned unlocked/mastered → locked due to
	 * skill decay. The animation CSS class is removed after the keyframe completes
	 * so subsequent renders don't re-trigger it.
	 */
	let decayedNodeIds = $state(new Set<string>());

	// Snapshot of last-known states for delta comparison.
	let prevNodeStates = new Map<string, string>();

	// Snapshot of last-known visibility for reveal-transition delta comparison.
	let prevNodeVisibility = new Map<string, boolean>();

	$effect(() => {
		const current = engine.nodes;
		const newlyDecayed = new Set<string>();
		const newlyRevealed = new Set<string>();

		for (const node of current) {
			const prevState = prevNodeStates.get(node.id);
			const prevVisible = prevNodeVisibility.get(node.id);

			// Detect unlocked/mastered → locked transition (decay re-fog).
			if (
				(prevState === 'unlocked' || prevState === 'mastered') &&
				node.state === 'locked'
			) {
				newlyDecayed.add(node.id);
			}

			// Detect hidden → visible transition (fog dispelled).
			if (prevVisible === false && node.visible === true) {
				newlyRevealed.add(node.id);
			}

			prevNodeStates.set(node.id, node.state);
			prevNodeVisibility.set(node.id, node.visible);
		}

		if (newlyDecayed.size > 0) {
			decayedNodeIds = new Set([...decayedNodeIds, ...newlyDecayed]);
			setTimeout(() => {
				decayedNodeIds = new Set(
					[...decayedNodeIds].filter((id) => !newlyDecayed.has(id)),
				);
			}, 1400);
		}

		if (newlyRevealed.size > 0) {
			engine.revealedTransitions = new Set([...engine.revealedTransitions, ...newlyRevealed]);
			setTimeout(() => {
				engine.revealedTransitions = new Set(
					[...engine.revealedTransitions].filter((id) => !newlyRevealed.has(id)),
				);
			}, 1400);
		}
	});

	// ── Pure render helpers (no state, safe to call from template) ────────────

	function nodeFill(state: string, hovered: boolean, selected: boolean): string {
		const boost = hovered || selected ? 0.2 : 0;
		if (state === 'locked') return `rgba(255,255,255,${(0.04 + boost).toFixed(2)})`;
		if (state === 'mastered') return `rgba(20, 184, 166,${Math.min(0.55 + boost, 0.9).toFixed(2)})`;
		return `rgba(20, 184, 166,${Math.min(0.25 + boost, 0.85).toFixed(2)})`;
	}

	function nodeStroke(state: string): string {
		return state === 'locked' ? 'rgba(255,255,255,0.08)' : tierAccent;
	}

	function nodeStrokeWidth(hovered: boolean): string {
		return hovered ? '1.5' : '0.8';
	}

	function edgeStroke(state: string): string {
		return state === 'locked' ? 'rgba(255,255,255,0.05)' : 'rgba(20, 184, 166,0.18)';
	}

	function labelFill(state: string): string {
		return state === 'locked' ? 'rgba(255,255,255,0.4)' : tierAccent;
	}

	function truncate(str: string, max = 12): string {
		return str.length > max ? `${str.slice(0, max)}` : str;
	}

	function bloomFilter(state: string): string | undefined {
		return state !== 'locked' ? `url(#${uid}-node-bloom)` : undefined;
	}
</script>

<!-- ─── Glassmorphism wrapper ──────────────────────────────────────────────── -->
<div
	class="st-arena tw-relative tw-w-full tw-rounded-xl tw-border tw-overflow-visible"
	style:background="rgba(2,2,2,0.85)"
	style:backdrop-filter="blur(12px)"
	style:border-color="rgba(20, 184, 166,0.12)"
	style:box-shadow="inset 0 0 48px rgba(20, 184, 166,0.04), 0 0 0 1px rgba(20, 184, 166,0.06)"
>
	<!-- ─── SVG snowflake canvas ────────────────────────────────────────────── -->
	<svg
		viewBox="0 0 400 400"
		class="tw-w-full tw-h-auto tw-block"
		preserveAspectRatio="xMidYMid meet"
		role="img"
		aria-label="Composite Snowflake skill tree"
	>
		<defs>
			<!-- Center prism glow: cyan → transparent -->
			<radialGradient id="{uid}-core-glow" cx="50%" cy="50%" r="50%">
				<stop offset="0%"   stop-color="#14b8a6" stop-opacity="0.24" />
				<stop offset="55%"  stop-color="#14b8a6" stop-opacity="0.07" />
				<stop offset="100%" stop-color="#14b8a6" stop-opacity="0"    />
			</radialGradient>

			<!-- Node bloom glow filter -->
			<filter id="{uid}-node-bloom" x="-40%" y="-40%" width="180%" height="180%">
				<feGaussianBlur stdDeviation="2" result="blur" />
				<feMerge>
					<feMergeNode in="blur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>

			<!-- Per-state node radial gradients -->
			<radialGradient id="{uid}-node-grad-locked" cx="50%" cy="50%" r="50%">
				<stop offset="0%"   stop-color="#ffffff" stop-opacity="0.06" />
				<stop offset="100%" stop-color="#ffffff" stop-opacity="0.01" />
			</radialGradient>
			<radialGradient id="{uid}-node-grad-unlocked" cx="50%" cy="50%" r="50%">
				<stop offset="0%"   stop-color={tierAccent} stop-opacity="0.4"  />
				<stop offset="100%" stop-color={tierAccent} stop-opacity="0.08" />
			</radialGradient>
			<radialGradient id="{uid}-node-grad-mastered" cx="50%" cy="50%" r="50%">
				<stop offset="0%"   stop-color={tierAccent} stop-opacity="0.75" />
				<stop offset="100%" stop-color={tierAccent} stop-opacity="0.28" />
			</radialGradient>
		</defs>

		<!-- ── (b) Spoke lines ───────────────────────────────────────────────── -->
		{#each engine.spokeLines as spoke (spoke.attr)}
			<line
				x1={spoke.x1} y1={spoke.y1}
				x2={spoke.x2} y2={spoke.y2}
				stroke="rgba(20, 184, 166,0.10)"
				stroke-width="0.5"
			/>
		{/each}

		<!-- ── (c) Edge Bezier paths ─────────────────────────────────────────── -->
		{#each visibleNodes as node (node.id)}
			{#if node.edgePath}
				<path
					d={node.edgePath}
					stroke={edgeStroke(node.state)}
					stroke-width="0.5"
					fill="none"
				/>
			{/if}
		{/each}

		<!-- ── (c2) Fogged edge ghost paths ──────────────────────────────────── -->
		{#each foggedNodes as node (node.id)}
			{#if node.edgePath}
				<path
					d={node.edgePath}
					stroke="rgba(255,255,255,0.02)"
					stroke-width="0.5"
					fill="none"
					aria-hidden="true"
				/>
			{/if}
		{/each}

		<!-- ── (d) Hex node polygons ─────────────────────────────────────────── -->
		{#each visibleNodes as node (node.id)}
			{@const isHovered  = node.id === engine.hoveredNodeId}
			{@const isSelected = node.id === engine.selectedNodeId}
			{@const isMastered = node.state === 'mastered'}
			{@const isDecaying = decayedNodeIds.has(node.id)}
			{@const isRevealed = engine.revealedTransitions.has(node.id)}

			<!-- Selection ring — rendered first (behind the main hex) -->
			{#if isSelected}
				<polygon
					points={hexPolygonPoints(node.cx, node.cy, SELECTION_R, 30)}
					fill="none"
					stroke={tierAccent}
					stroke-width="1"
					stroke-dasharray="3 2"
					stroke-opacity="0.75"
					class="tw-pointer-events-none"
				/>
			{/if}

			<!-- Main hex node -->
			<polygon
				points={node.hexPoints}
				fill={nodeFill(node.state, isHovered, isSelected)}
				stroke={nodeStroke(node.state)}
				stroke-width={nodeStrokeWidth(isHovered)}
				filter={bloomFilter(node.state)}
				class="{isMastered ? 'st-node-mastered' : ''} {isDecaying ? 'st-node-decayed' : ''} {isRevealed ? 'st-node-revealed' : ''} tw-cursor-pointer"
				role="button"
				aria-label="Skill: {node.label} ({node.state})"
				tabindex="0"
				onclick={() => engine.selectNode(node.id)}
				onpointerenter={() => engine.hoverNode(node.id)}
				onpointerleave={() => engine.hoverNode(null)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						engine.selectNode(node.id);
					}
				}}
			/>

			<!-- Hover / selection label -->
			{#if isHovered || isSelected}
				<text
					x={node.cx}
					y={node.cy - 20}
					text-anchor="middle"
					dominant-baseline="auto"
					font-family="'JetBrains Mono', 'Fira Code', monospace"
					font-size="8"
					letter-spacing="0.15em"
					fill={labelFill(node.state)}
					class="tw-pointer-events-none tw-select-none"
				>
					{truncate(node.label)}
				</text>
			{/if}
		{/each}

		<!-- ── (d2) Fogged hex silhouettes ───────────────────────────────────── -->
		{#each foggedNodes as node (node.id)}
			<polygon
				points={node.hexPoints}
				fill="rgba(255,255,255,0.03)"
				stroke="rgba(255,255,255,0.05)"
				stroke-width="0.5"
				class="st-node-fogged tw-pointer-events-none"
				aria-hidden="true"
			/>
		{/each}

		<!-- ── (e) Center glow disc ──────────────────────────────────────────── -->
		<circle
			cx="200" cy="200" r="75"
			fill="url(#{uid}-core-glow)"
			class="tw-pointer-events-none"
		/>
	</svg>

	<!-- ── VanguardPrism overlay (absolute, centered over SVG) ─────────────── -->
	<div
		class="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-pointer-events-none"
	>
		<VanguardPrism
			stats={armoryStats}
			accent={tierAccent}
			showLabels={true}
			animated={true}
			size={160}
		/>
	</div>
</div>

<style>
	.st-arena {
		position: relative;
		overflow: visible;
	}

	@keyframes stNodePulse {
		0%, 100% { opacity: 0.8; }
		50%       { opacity: 1;   }
	}

	.st-node-mastered {
		animation: stNodePulse 3s ease-in-out infinite;
	}

	/**
	 * Decay re-fog pulse — fires once when a node transitions
	 * unlocked/mastered → locked due to Skill Decay (Epic 5).
	 * A red-orange drain flash reinforces Loss Avoidance feedback.
	 */
	@keyframes stNodeDecay {
		0%   { opacity: 1;   filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.9)); }
		40%  { opacity: 0.6; filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.6)); }
		100% { opacity: 1;   filter: none; }
	}

	.st-node-decayed {
		animation: stNodeDecay 1.4s ease-out forwards;
	}

	/**
	 * Fog-dispelled reveal pulse — fires once when a node transitions
	 * hidden → visible (Fog of War lifted by tier or parent unlock).
	 * Inverse of the decay flash: cyan surge → settle.
	 */
	@keyframes stNodeReveal {
		0%   { opacity: 0;   filter: drop-shadow(0 0 10px rgba(20, 184, 166, 0.0)); }
		30%  { opacity: 1;   filter: drop-shadow(0 0 14px rgba(20, 184, 166, 1.0)); }
		100% { opacity: 1;   filter: none; }
	}

	.st-node-revealed {
		animation: stNodeReveal 1.4s ease-out forwards;
	}

	/**
	 * Fogged placeholder silhouette — slow ambient drift to signal
	 * "something is hidden here" without revealing content.
	 */
	@keyframes stNodeFog {
		0%, 100% { opacity: 0.04; }
		50%       { opacity: 0.09; }
	}

	.st-node-fogged {
		animation: stNodeFog 4s ease-in-out infinite;
	}
</style>
