<script lang="ts">
	/**
	 * VanguardPrism.svelte — Federation SVG 6-Axis Matrix
	 * STRICT RESTRICTIONS: Pure SVG only. NO Canvas wrappers. NO Tailwind text size inside <svg>.
	 * Standard viewBox geometries (viewBox="0 0 1200 800") with preserveAspectRatio="xMidYMid slice"
	 * Max 80 lines. Uses Vanguard PRISM.
	 */
	import { VANGUARD_PRISM_LABELS } from '$lib/utils/vanguard-prism.js';

	interface Props {
		sixAxis: number[]; // 0-99 array matching VANGUARD_PRISM_LABELS length
		playerLabel?: string;
	}

	let { sixAxis, playerLabel = 'Unknown' }: Props = $props();

	// SVG Constants for 1200x800 viewBox centering
	const CX = 600;
	const CY = 400;
	const R = 300;

	$effect(() => {
		if (sixAxis.length !== 6) console.warn("Invalid 6-axis data", sixAxis);
	});

	// Calculate vertex positions in standard geometry
	const getPoint = (val: number, idx: number, total: number) => {
		const angle = (Math.PI * 2 * idx) / total - Math.PI / 2;
		const rad = (val / 99) * R;
		return { x: CX + rad * Math.cos(angle), y: CY + rad * Math.sin(angle) };
	};

	let outerPoints = $derived(VANGUARD_PRISM_LABELS.map((_, i) => getPoint(99, i, 6)).map(p => `${p.x},${p.y}`).join(' '));
	let statPoints = $derived(sixAxis.map((val, i) => getPoint(val || 10, i, 6)).map(p => `${p.x},${p.y}`).join(' '));
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 1200 800"
	preserveAspectRatio="xMidYMid slice"
	class="vanguard-prism-svg tw-w-full tw-h-full"
>
	<defs>
		<radialGradient id="prism-glow" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stop-color="#14b8a6" stop-opacity="0.5" />
			<stop offset="100%" stop-color="#14b8a6" stop-opacity="0" />
		</radialGradient>
	</defs>

	<!-- Outer Hexagon Grid Base -->
	<polygon points={outerPoints} fill="#0f172a" stroke="#334155" stroke-width="2" />

	<!-- Internal Radar Web Lines -->
	{#each [33, 66] as step}
		<polygon points={VANGUARD_PRISM_LABELS.map((_, i) => getPoint(step, i, 6)).map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#1e293b" stroke-width="1.5" />
	{/each}
	{#each VANGUARD_PRISM_LABELS as _, i}
		{@const end = getPoint(99, i, 6)}
		<line x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="#334155" stroke-width="1" stroke-dasharray="4,4" />
	{/each}

	<!-- Dynamic Stat Polygon -->
	<polygon points={statPoints} fill="url(#prism-glow)" stroke="#14b8a6" stroke-width="3" />

	<!-- Data Dots -->
	{#each sixAxis as val, i}
		{@const pt = getPoint(val || 10, i, 6)}
		<circle cx={pt.x} cy={pt.y} r="6" fill="#14b8a6" />
	{/each}

	<!-- Labels (Native SVG Text, strictly no tailwind classes for size) -->
	{#each VANGUARD_PRISM_LABELS as label, i}
		{@const p = getPoint(115, i, 6)}
		<text x={p.x} y={p.y} fill="#14b8a6" font-size="24" font-family="Geist Mono, monospace" text-anchor="middle" dominant-baseline="middle">
			{label}
		</text>
	{/each}

	<!-- Center Label -->
	<text x={CX} y={CY + 360} fill="#ffffff" font-size="28" font-family="Geist Sans, sans-serif" font-weight="bold" text-anchor="middle">
		{playerLabel.toUpperCase()}
	</text>
</svg>
