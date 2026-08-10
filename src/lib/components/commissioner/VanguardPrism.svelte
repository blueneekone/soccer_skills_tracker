<script lang="ts">
	let {
		size = 400,
		metrics = {
			speed: 50,
			agility: 50,
			power: 50,
			stamina: 50,
			vision: 50,
			technique: 50
		}
	} = $props();

	// Calculate polygon points for the 6-axis chart
	const points = $derived.by(() => {
		const center = { x: 600, y: 400 };
		const radius = 300;
		const axes = ['speed', 'agility', 'power', 'stamina', 'vision', 'technique'] as const;

		return axes.map((axis, i) => {
			const angle = (Math.PI / 3) * i - Math.PI / 2;
			const value = metrics[axis] / 100;
			return {
				x: center.x + radius * Math.cos(angle) * value,
				y: center.y + radius * Math.sin(angle) * value
			};
		}).map(p => `${p.x},${p.y}`).join(' ');
	});

	// Pre-calculate full grid polygons
	const gridPolygons = [0.2, 0.4, 0.6, 0.8, 1.0].map(level => {
		const center = { x: 600, y: 400 };
		const radius = 300;
		return Array.from({ length: 6 }).map((_, i) => {
			const angle = (Math.PI / 3) * i - Math.PI / 2;
			return `${center.x + radius * Math.cos(angle) * level},${center.y + radius * Math.sin(angle) * level}`;
		}).join(' ');
	});

	const labels = [
		{ text: 'SPEED', x: 600, y: 70, align: 'middle' },
		{ text: 'AGILITY', x: 930, y: 250, align: 'start' },
		{ text: 'POWER', x: 930, y: 550, align: 'start' },
		{ text: 'STAMINA', x: 600, y: 730, align: 'middle' },
		{ text: 'VISION', x: 270, y: 550, align: 'end' },
		{ text: 'TECHNIQUE', x: 270, y: 250, align: 'end' }
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
				x2={600 + 300 * Math.cos(angle)}
				y2={400 + 300 * Math.sin(angle)}
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
			fill="rgba(20, 184, 166, 0.2)"
			stroke="#14b8a6"
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
				stroke="#14b8a6"
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
