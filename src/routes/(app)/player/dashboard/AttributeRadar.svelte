<script lang="ts">
	import { VANGUARD_PRISM_LABELS } from '$lib/utils/vanguard-prism.js';

	type Props = {
		/** Six 0–99 values: PACE · ACCEL · AGILITY · STAMINA · POWER · VANGUARD */
		values?: number[];
	};

	const { values = [] }: Props = $props();

	const ATTRS = VANGUARD_PRISM_LABELS;
	const N = ATTRS.length;

	const CX = 140;
	const CY = 140;
	const R = 80;
	const LABEL_R = 116;
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
		ATTRS.map((label, i) => ({ ...pt(i, LABEL_R), label })),
	);
</script>

<div class="ar-root">
	<svg
		class="ar-svg"
		viewBox="0 0 280 280"
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
			fill="rgba(20,184,166,0.16)"
			stroke="#14b8a6"
			stroke-width="1.4"
			stroke-linejoin="round"
			vector-effect="non-scaling-stroke"
		/>

		{#each skillVertices as v, vi (`vtx-${vi}`)}
			<circle cx={v.x} cy={v.y} r="2.5" fill="#14b8a6" />
		{/each}

		{#each labelVertices as lv, li (`lbl-${li}`)}
			<text
				x={lv.x}
				y={lv.y}
				font-size="8"
				font-family="Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
				font-weight="700"
				letter-spacing="0.5"
				text-anchor={anchorFor(li)}
				dominant-baseline="middle"
				fill="#cbd5e1"
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
</style>
