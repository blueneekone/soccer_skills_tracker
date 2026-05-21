<script lang="ts">
	import { VANGUARD_PRISM_LABELS } from '$lib/utils/vanguard-prism.js';
	import type { VanguardAxisId } from '$lib/player/dashboard/vanguardProtocol.js';

	type Props = {
		/** Six 0–99 values: PAC · ACC · POW · COMP · STM · AGI (Vanguard Protocol) */
		values?: number[];
		selectedAxis?: VanguardAxisId | null;
		onAxisSelect?: (id: VanguardAxisId) => void;
	};

	const { values = [], selectedAxis = null, onAxisSelect }: Props = $props();

	const ATTRS = VANGUARD_PRISM_LABELS;
	const N = ATTRS.length;

	const CX = 140;
	const CY = 140;
	const R = 80;
	const LABEL_R = 116;
	const HIT_R = 14;
	const TIERS = [0.25, 0.5, 0.75, 1.0];

	const safeValues = $derived(
		values.length >= N
			? values
					.slice(0, N)
					.map((v) => Math.min(99, Math.max(0, Math.round(Number(v) || 0))))
			: Array(N).fill(0),
	);

	function pt(i: number, r: number): { x: number; y: number } {
		const a = (i * 2 * Math.PI) / N - Math.PI / 2;
		return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
	}

	function polygonPoints(r: number): string {
		return Array.from({ length: N }, (_, i) => {
			const p = pt(i, r);
			return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
		}).join(' ');
	}

	function anchorFor(i: number): 'start' | 'middle' | 'end' {
		const a = (i * 2 * Math.PI) / N - Math.PI / 2;
		const x = Math.cos(a);
		if (x > 0.25) return 'start';
		if (x < -0.25) return 'end';
		return 'middle';
	}

	function handleLabelClick(id: VanguardAxisId) {
		onAxisSelect?.(id);
	}

	function handleLabelKeydown(e: KeyboardEvent, id: VanguardAxisId) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onAxisSelect?.(id);
		}
	}

	const skillVertices = $derived(
		safeValues.map((v, i) => {
			const mult = Math.max(0.02, v / 99);
			return { ...pt(i, R * mult) };
		}),
	);

	const skillPolygonPoints = $derived(
		skillVertices.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
	);

	const labelVertices = $derived(
		ATTRS.map((label, i) => ({
			...pt(i, LABEL_R),
			hit: pt(i, LABEL_R),
			label,
			id: label as VanguardAxisId,
		})),
	);
</script>

<div class="ar-root">
	<svg
		class="ar-svg"
		viewBox="-30 -30 340 340"
		preserveAspectRatio="xMidYMid meet"
		role="img"
		aria-label="Vanguard Prism attribute radar"
	>
		{#each TIERS as tier, ti (tier)}
			<polygon
				points={polygonPoints(R * tier)}
				fill="none"
				stroke={ti === TIERS.length - 1 ? 'rgba(148,163,184,0.20)' : 'rgba(148,163,184,0.12)'}
				stroke-width={ti === TIERS.length - 1 ? '0.6' : '0.4'}
				vector-effect="non-scaling-stroke"
			/>
		{/each}

		{#each Array.from({ length: N }, (_, i) => i) as i (`spoke-${i}`)}
			{@const tip = pt(i, R)}
			<line
				x1={CX}
				y1={CY}
				x2={tip.x}
				y2={tip.y}
				stroke="rgba(148,163,184,0.10)"
				stroke-width="0.3"
				vector-effect="non-scaling-stroke"
			/>
		{/each}

		<polygon
			points={skillPolygonPoints}
			fill="color-mix(in srgb, var(--color-accent, #fbbf24) 18%, transparent)"
			stroke="var(--color-accent, #fbbf24)"
			stroke-width="1.4"
			stroke-linejoin="round"
			vector-effect="non-scaling-stroke"
		/>

		{#each skillVertices as v, vi (`vtx-${vi}`)}
			<circle cx={v.x} cy={v.y} r="2.5" fill="var(--color-accent, #fbbf24)" />
		{/each}

		{#each labelVertices as lv, li (`lbl-${li}`)}
			<circle
				cx={lv.hit.x}
				cy={lv.hit.y}
				r={HIT_R}
				fill="transparent"
				class="ar-hit"
				role="button"
				tabindex="0"
				aria-label="Select {lv.label}"
				aria-pressed={selectedAxis === lv.id}
				onclick={() => handleLabelClick(lv.id)}
				onkeydown={(e) => handleLabelKeydown(e, lv.id)}
			/>
			<text
				x={lv.x}
				y={lv.y}
				font-size="8"
				font-family="Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
				font-weight="700"
				letter-spacing="0.5"
				text-anchor={anchorFor(li)}
				dominant-baseline="middle"
				fill={selectedAxis === lv.id ? '#fbbf24' : '#cbd5e1'}
				class="ar-label"
				class:ar-label--selected={selectedAxis === lv.id}
				pointer-events="none"
			>{lv.label}</text>
		{/each}
	</svg>
</div>

<style>
	.ar-root {
		width: 100%;
		aspect-ratio: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ar-svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.ar-hit {
		cursor: pointer;
	}
	.ar-hit:focus-visible {
		outline: none;
	}
	.ar-hit:focus-visible + .ar-label {
		fill: #fbbf24;
	}
	.ar-label--selected {
		text-decoration: underline;
		text-decoration-color: #fbbf24;
	}
</style>
