<script lang="ts">
	let {
		size = 400,
		sixAxis = null,
		metrics = {
			speed: 50,
			agility: 50,
			power: 50,
			stamina: 50,
			vision: 50,
			technique: 50
		},
		playerLabel = ''
	} = $props();

	// If sixAxis array is passed, map it to metrics structure:
	const activeMetrics = $derived.by(() => {
		if (sixAxis && Array.isArray(sixAxis)) {
			return {
				speed: sixAxis[0] ?? 50,
				agility: sixAxis[1] ?? 50,
				power: sixAxis[2] ?? 50,
				stamina: sixAxis[3] ?? 50,
				vision: sixAxis[4] ?? 50,
				technique: sixAxis[5] ?? 50
			};
		}
		return metrics;
	});

	const center = { x: 600, y: 400 };
	const radius = 210;

	// Calculate polygon points for the 6-axis chart
	const points = $derived.by(() => {
		const axes = ['speed', 'agility', 'power', 'stamina', 'vision', 'technique'] as const;

		return axes.map((axis, i) => {
			const angle = (Math.PI / 3) * i - Math.PI / 2;
			const value = activeMetrics[axis] / 100;
			return {
				x: center.x + radius * Math.cos(angle) * value,
				y: center.y + radius * Math.sin(angle) * value
			};
		}).map(p => `${p.x},${p.y}`).join(' ');
	});

	// Pre-calculate full grid polygons
	const gridPolygons = [0.2, 0.4, 0.6, 0.8, 1.0].map(level => {
		return Array.from({ length: 6 }).map((_, i) => {
			const angle = (Math.PI / 3) * i - Math.PI / 2;
			return `${center.x + radius * Math.cos(angle) * level},${center.y + radius * Math.sin(angle) * level}`;
		}).join(' ');
	});

	const labels = [
		{ text: 'SPEED', x: 600, y: 150, align: 'middle' },
		{ text: 'AGILITY', x: 830, y: 295, align: 'start' },
		{ text: 'POWER', x: 830, y: 505, align: 'start' },
		{ text: 'STAMINA', x: 600, y: 650, align: 'middle' },
		{ text: 'VISION', x: 370, y: 505, align: 'end' },
		{ text: 'TECHNIQUE', x: 370, y: 295, align: 'end' }
	];
</script>

<div class="vanguard-prism tw-w-full tw-h-full tw-flex tw-items-center tw-justify-center" style="width: {size}px; height: {size}px;">
	<svg
		viewBox="0 0 1200 800"
		preserveAspectRatio="xMidYMid slice"
		class="tw-w-full tw-h-full"
		style="display: block;"
	>
		<defs>
			<filter id="neonBloom">
				<feGaussianBlur stdDeviation="4" result="coloredBlur"/>
				<feMerge>
					<feMergeNode in="coloredBlur"/>
					<feMergeNode in="SourceGraphic"/>
				</feMerge>
			</filter>
		</defs>

		{#if playerLabel}
			<text
				x="600"
				y="60"
				fill="#FAFAFA"
				font-size="28"
				font-family="Switzer, sans-serif"
				font-weight="bold"
				text-anchor="middle"
				dominant-baseline="middle"
			>
				{playerLabel}
			</text>
		{/if}

		<!-- Background grids -->
		{#each gridPolygons as polygon}
			<polygon
				points={polygon}
				fill="none"
				stroke="#334155"
				stroke-width="2"
				stroke-dasharray="4,4"
			/>
		{/each}

		<!-- Axis lines -->
		{#each labels as label, i}
			{@const angle = (Math.PI / 3) * i - Math.PI / 2}
			<line
				x1="600"
				y1="400"
				x2={600 + radius * Math.cos(angle)}
				y2={400 + radius * Math.sin(angle)}
				stroke="#334155"
				stroke-width="2"
			/>
			<text
				x={label.x}
				y={label.y}
				fill="#14b8a6"
				font-size="24"
				font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
				font-weight="bold"
				text-anchor={label.align}
				dominant-baseline="middle"
			>
				{label.text}
			</text>
		{/each}

		<!-- Data Polygon -->
		<polygon
			{points}
			fill="rgba(251, 191, 36, 0.15)"
			stroke="#fbbf24"
			stroke-width="4"
			class="data-polygon"
			filter="url(#neonBloom)"
		/>

		<!-- Data points -->
		{#each points.split(' ') as p}
			{@const [x, y] = p.split(',')}
			<circle
				cx={x}
				cy={y}
				r="6"
				fill="#000000"
				stroke="#fbbf24"
				stroke-width="4"
				filter="url(#neonBloom)"
			/>
		{/each}
	</svg>
</div>

<style>
	.data-polygon {
		transition: all 0.3s ease;
	}
</style>
