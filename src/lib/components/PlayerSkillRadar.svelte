<script>
	/**
	 * Pure-SVG Vanguard radar — cyan-to-transparent gradient fill, neon stroke,
	 * no Chart.js, no blocky CSS borders. Hex polygon (6 axes) to match the
	 * Vanguard Manifesto attribute schema.
	 *
	 * @type {{ labels?: string[]; values?: number[]; variant?: 'default' | 'lobby' }}
	 */
	let {
		labels = [],
		values = [],
		variant = /** @type {'default' | 'lobby'} */ ('default'),
	} = $props();

	const N = 6;
	const CX = 50;
	const CY = 50;
	const R = 36;
	const TIERS = [0.22, 0.42, 0.62, 0.82, 1];

	const lobbyMode = $derived(variant === 'lobby');
	const strokeColor = $derived(lobbyMode ? '#14b8a6' : '#a855f7');

	const safeLabels = $derived(
		labels.length >= N ? labels.slice(0, N) : ['—', '—', '—', '—', '—', '—'],
	);
	const safeValues = $derived(
		values.length >= N
			? values.slice(0, N).map((v) => Math.min(99, Math.max(0, Number(v) || 0)))
			: [55, 55, 55, 55, 55, 55],
	);

	/**
	 * @param {number} i
	 * @param {number} mult
	 */
	function polar(i, mult) {
		const a = (i * 2 * Math.PI) / N - Math.PI / 2;
		return { x: CX + R * mult * Math.cos(a), y: CY + R * mult * Math.sin(a) };
	}

	const skillVertices = $derived(
		safeValues.map((v, i) => {
			const p = polar(i, Math.max(0.05, v / 99));
			return { x: p.x, y: p.y, raw: v };
		}),
	);

	const skillPolygonPoints = $derived(
		skillVertices.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
	);

	// Per-instance filter id so multiple radars don't collide.
	const uid = `psr-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="tw-relative tw-w-full {lobbyMode ? 'tw-aspect-square' : 'tw-aspect-[4/3]'}">
	<svg
		class="tw-block tw-h-full tw-w-full"
		viewBox="0 0 100 100"
		preserveAspectRatio="xMidYMid meet"
		role="img"
		aria-label="Player skill radar"
	>
		<defs>
			<radialGradient id="{uid}-fill" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stop-color="#14b8a6" stop-opacity="0.55" />
				<stop offset="60%" stop-color="#14b8a6" stop-opacity="0.18" />
				<stop offset="100%" stop-color="#14b8a6" stop-opacity="0" />
			</radialGradient>
			<filter id="{uid}-bloom" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur in="SourceGraphic" stdDeviation="0.9" result="blur" />
				<feMerge>
					<feMergeNode in="blur" />
					<feMergeNode in="blur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<!-- Concentric web tiers -->
		{#each TIERS as t (t)}
			<circle
				cx={CX}
				cy={CY}
				r={R * t}
				fill="none"
				stroke="rgba(20, 184, 166, 0.12)"
				stroke-width="0.35"
				vector-effect="non-scaling-stroke"
			/>
		{/each}

		<!-- Axis spokes -->
		{#each safeLabels as _, i (`spoke-${i}`)}
			{@const hub = polar(i, 0)}
			{@const tip = polar(i, 1.06)}
			<line
				x1={hub.x}
				y1={hub.y}
				x2={tip.x}
				y2={tip.y}
				stroke="rgba(20, 184, 166, 0.18)"
				stroke-width="0.4"
				vector-effect="non-scaling-stroke"
			/>
		{/each}

		<!-- Skill envelope: cyan radial gradient fill + neon stroke -->
		<polygon
			points={skillPolygonPoints}
			fill="url(#{uid}-fill)"
			stroke={strokeColor}
			stroke-width="1.4"
			stroke-linejoin="round"
			vector-effect="non-scaling-stroke"
			filter="url(#{uid}-bloom)"
		/>

		<!-- Vertex markers -->
		{#each skillVertices as v, vi (`vtx-${vi}`)}
			<circle
				cx={v.x}
				cy={v.y}
				r="1.6"
				fill="#14b8a6"
				filter="url(#{uid}-bloom)"
			/>
		{/each}

		<!-- Axis labels -->
		{#each safeLabels as lbl, li (`lbl-${lbl}-${li}`)}
			{@const lp = polar(li, 1.32)}
			<text
				class="tw-pointer-events-none tw-font-mono tw-fill-slate-200"
				x={lp.x}
				y={lp.y}
				font-size="6"
				font-weight="700"
				letter-spacing="0.6"
				text-anchor="middle"
				dominant-baseline="middle"
			>{lbl}</text>
		{/each}
	</svg>
</div>
