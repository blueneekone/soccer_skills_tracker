<script lang="ts">
	import { VANGUARD_PRISM_LABELS } from '$lib/utils/vanguard-prism.js';
	import type { VanguardAxisId } from '$lib/player/dashboard/vanguardProtocol.js';

	type Props = {
		/** Six 0–99 values: PAC · ACC · POW · COMP · STM · AGI (Vanguard Protocol) */
		values?: number[];
		selectedAxis?: VanguardAxisId | null;
		onAxisSelect?: (id: VanguardAxisId) => void;
	};

	let { values = [], selectedAxis = null, onAxisSelect }: Props = $props();

	const ATTRS = VANGUARD_PRISM_LABELS;
	const N = ATTRS.length;

	const safeValues = $derived(
		values.length >= N
			? values
					.slice(0, N)
					.map((v) => Math.min(99, Math.max(0, Math.round(Number(v) || 0))))
			: Array(N).fill(0)
	);

	const R = 100;
	const CX = 150;
	const CY = 150;

	// Compute polygon points for values
	const skillPolygonPoints = $derived.by(() => {
		return safeValues
			.map((val, i) => {
				const angle = (i * 2 * Math.PI) / N - Math.PI / 2;
				const r = (val / 99) * R;
				const x = CX + r * Math.cos(angle);
				const y = CY + r * Math.sin(angle);
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	});

	const skillVertices = $derived.by(() => {
		return safeValues.map((val, i) => {
			const angle = (i * 2 * Math.PI) / N - Math.PI / 2;
			const r = (val / 99) * R;
			return {
				x: CX + r * Math.cos(angle),
				y: CY + r * Math.sin(angle),
				val,
				label: ATTRS[i],
				axis: ATTRS[i] as VanguardAxisId
			};
		});
	});

	// Grid circles/rings (20%, 40%, 60%, 80%, 100%)
	const gridRings = [20, 40, 60, 80, 100];
	const allZero = $derived(safeValues.every((v) => v === 0));
</script>

<div class="tw-w-full tw-h-full tw-min-h-[280px] tw-relative tw-flex tw-items-center tw-justify-center">
	<svg
		viewBox="0 0 300 300"
		class="vanguard-prism-svg prism-chart tw-w-full tw-h-full tw-max-w-[320px] tw-max-h-[320px]"
	>
		<defs>
			<filter id="pdDataBloom">
				<feGaussianBlur stdDeviation="2" result="coloredBlur" />
				<feMerge>
					<feMergeNode in="coloredBlur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<!-- Grid Rings -->
		{#each gridRings as ringPct}
			{@const ringR = (ringPct / 100) * R}
			<polygon
				points={Array.from({ length: N }, (_, i) => {
					const angle = (i * 2 * Math.PI) / N - Math.PI / 2;
					return `${(CX + ringR * Math.cos(angle)).toFixed(1)},${(CY + ringR * Math.sin(angle)).toFixed(1)}`;
				}).join(' ')}
				fill="none"
				stroke="#334155"
				stroke-width="1"
				opacity="0.5"
			/>
		{/each}

		<!-- Radial Axis Lines -->
		{#each Array.from({ length: N }) as _, i}
			{@const angle = (i * 2 * Math.PI) / N - Math.PI / 2}
			<line
				x1={CX}
				y1={CY}
				x2={(CX + R * Math.cos(angle)).toFixed(1)}
				y2={(CY + R * Math.sin(angle)).toFixed(1)}
				stroke="#334155"
				stroke-width="1"
			/>
		{/each}

		<!-- Skill Data Polygon -->
		<polygon
			points={skillPolygonPoints}
			fill="rgba(20, 184, 166, 0.25)"
			stroke="#14b8a6"
			stroke-width="2"
			filter="url(#pdDataBloom)"
			style="fill: var(--pd-accent-data, rgba(20,184,166,0.25)); stroke: var(--pd-accent-data, #14b8a6);"
		/>

		<!-- Vertices and Labels -->
		{#each skillVertices as vtx}
			<circle
				cx={vtx.x}
				cy={vtx.y}
				r={selectedAxis === vtx.axis ? "6" : "4"}
				fill="#14b8a6"
				stroke="#020617"
				stroke-width="1.5"
				class="tw-cursor-pointer hover:tw-r-6 tw-transition-all"
				style="fill: var(--pd-accent-data, #14b8a6);"
				onclick={() => onAxisSelect?.(vtx.axis)}
			/>
		{/each}

		<!-- Axis Labels -->
		{#each Array.from({ length: N }) as _, i}
			{@const angle = (i * 2 * Math.PI) / N - Math.PI / 2}
			{@const labelR = R + 18}
			{@const lx = CX + labelR * Math.cos(angle)}
			{@const ly = CY + labelR * Math.sin(angle)}
			<text
				x={lx}
				y={ly}
				text-anchor="middle"
				dominant-baseline="central"
				fill="#94a3b8"
				font-family="Geist Mono, monospace"
				font-size="10"
				font-weight="bold"
			>
				{ATTRS[i]}
			</text>
		{/each}
	</svg>
</div>
