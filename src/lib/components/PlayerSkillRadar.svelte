<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let {
		labels = [],
		values = [],
	} = $props();

	/** @type {null | typeof import('chart.js').Chart} */
	let ChartCtor = null;
	let chartJsReady = $state(false);
	let radarEl = $state(/** @type {HTMLCanvasElement | undefined} */ (undefined));
	/** @type {import('chart.js').Chart | null} */
	let radarInstance = null;

	onMount(() => {
		if (!browser) return;
		(async () => {
			const mod = await import('chart.js');
			ChartCtor = mod.Chart;
			mod.Chart.register(...mod.registerables);
			chartJsReady = true;
		})();
	});

	function hexToRgba(hex, alpha) {
		const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
		if (!m) return `rgba(245, 158, 11, ${alpha})`;
		const n = parseInt(m[1], 16);
		const r = (n >> 16) & 255;
		const g = (n >> 8) & 255;
		const b = n & 255;
		return `rgba(${r},${g},${b},${alpha})`;
	}

	/**
	 * @param {string} color
	 * @param {number} alpha
	 */
	function withAlpha(color, alpha) {
		const c = color.trim();
		if (c.startsWith('#')) return hexToRgba(c, alpha);
		const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c);
		if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`;
		return `rgba(245, 158, 11, ${alpha})`;
	}

	$effect(() => {
		if (!browser || !chartJsReady || !ChartCtor || !radarEl) return;

		const lab = labels.length >= 6 ? labels.slice(0, 6) : ['—', '—', '—', '—', '—', '—'];
		const data =
			values.length >= 6 ?
				values.slice(0, 6).map((v) => Math.min(99, Math.max(0, Number(v) || 0)))
			:	[55, 55, 55, 55, 55, 55];

		if (radarInstance) {
			radarInstance.destroy();
			radarInstance = null;
		}

		const cs = getComputedStyle(document.documentElement);
		const brand = cs.getPropertyValue('--brand-primary').trim() || '#f59e0b';
		const grid = cs.getPropertyValue('--chart-grid').trim() || 'rgba(15,23,42,0.12)';
		const tick = cs.getPropertyValue('--chart-tick').trim() || '#334155';
		const fill = withAlpha(brand, 0.2);

		radarInstance = new ChartCtor(radarEl, {
			type: 'radar',
			data: {
				labels: lab,
				datasets: [
					{
						label: 'Skills',
						data,
						backgroundColor: fill,
						borderColor: brand,
						borderWidth: 2,
						pointBackgroundColor: brand,
						pointBorderColor: '#fff',
						pointHoverBackgroundColor: '#fff',
					},
				],
			},
			options: {
				scales: {
					r: {
						min: 0,
						max: 99,
						ticks: {
							stepSize: 25,
							color: tick,
							backdropColor: 'transparent',
						},
						grid: { color: grid },
						angleLines: { color: grid },
						pointLabels: { color: tick, font: { size: 11, weight: '600' } },
					},
				},
				plugins: {
					legend: { display: false },
				},
				responsive: true,
				maintainAspectRatio: false,
			},
		});

		return () => {
			if (radarInstance) {
				radarInstance.destroy();
				radarInstance = null;
			}
		};
	});
</script>

<div class="psr">
	<div class="psr__canvas-wrap">
		<canvas bind:this={radarEl} class="psr__canvas"></canvas>
	</div>
</div>

<style>
	.psr {
		width: 100%;
	}

	.psr__canvas-wrap {
		position: relative;
		height: min(300px, 58vw);
		width: 100%;
	}

	.psr__canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
