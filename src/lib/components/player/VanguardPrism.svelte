<script lang="ts">
	/**
	 * VanguardPrism.svelte
	 * ────────────────────
	 * Dynamic hexagonal SVG stat radar — the "Avatar" of a player's athletic
	 * profile.  All rendering is pure SVG; zero external dependencies.
	 *
	 * Geometry
	 * ────────
	 * Six stats map to six polygon vertices, equally spaced at 60° intervals
	 * around a 100,100 centre point.  The distance of each vertex from the
	 * centre is proportional to the stat's normalised value (0 → 1).
	 *
	 * Vertex order (clockwise from top):
	 *   0 → PAC  (top,          -90°)
	 *   1 → ACC  (top-right,    -30°)
	 *   2 → POW  (bottom-right,  30°)
	 *   3 → VAN  (bottom,        90°)
	 *   4 → STM  (bottom-left,  150°)
	 *   5 → AGI  (top-left,    -150°)
	 *
	 * Stat normalisation
	 * ──────────────────
	 * Each `ScoutsSix` string value is parsed and normalised to [0, 1]:
	 *   PAC  "21.4 MPH" → MPH / 35     (0–35 mph window)
	 *   ACC  "1.52s"    → (3.5−t) / 3  (lower = faster = higher score)
	 *   POW  "32 in"    → in / 55       (0–55 inch window)
	 *   VAN  "94"       → n / 99        (direct composite score)
	 *   STM  "Lvl 18"   → lvl / 99      (RPG level)
	 *   AGI  "4.12s"    → (9−t) / 7    (lower = faster = higher score)
	 *
	 * Props
	 * ─────
	 *   stats        — ScoutsSix object (string values from ArmoryEngine)
	 *   size         — outer SVG size in pixels (default 120; the viewBox is 200×200)
	 *   accent       — primary glow colour (default #00f0ff, driven by tier or tenantId)
	 *   showLabels   — render stat abbreviations outside the hex (default false)
	 *   animated     — pulsing fill opacity animation (default true)
	 *   class        — extra CSS class
	 */

	import type { ScoutsSix } from '$lib/states/ArmoryEngine.svelte.js';
	import { normaliseScoutsSix } from '$lib/utils/scoutsSixNormalise.js';

	// ── Props ──────────────────────────────────────────────────────────────────
	interface Props {
		stats?: Partial<ScoutsSix>;
		size?: number;
		/** Glow accent — pass `armory.currentTier.accent` for tier-synced colours. */
		accent?: string;
		showLabels?: boolean;
		animated?: boolean;
		class?: string;
	}

	let {
		stats = {},
		size = 120,
		accent = '#00f0ff',
		showLabels = false,
		animated = true,
		class: extraClass = '',
	}: Props = $props();

	// ── SVG constants ─────────────────────────────────────────────────────────
	const CX = 100;
	const CY = 100;
	const MAX_R = 68;
	const LABEL_R = MAX_R + 14;

	/** Stat slots in clockwise vertex order, starting from top. */
	const SLOTS: { key: keyof ScoutsSix; label: string; angle: number }[] = [
		{ key: 'PAC', label: 'PAC', angle: -90 },
		{ key: 'ACC', label: 'ACC', angle: -30 },
		{ key: 'POW', label: 'POW', angle:  30 },
		{ key: 'VAN', label: 'VAN', angle:  90 },
		{ key: 'STM', label: 'STM', angle: 150 },
		{ key: 'AGI', label: 'AGI', angle: -150 },
	];

	/** Convert degrees → radians. */
	function rad(deg: number) { return (deg * Math.PI) / 180; }

	/** Vertex x,y at a given radius and angle. */
	function vertex(r: number, angleDeg: number) {
		return { x: CX + r * Math.cos(rad(angleDeg)), y: CY + r * Math.sin(rad(angleDeg)) };
	}

	/** Alias for the shared normalise util — imported from scoutsSixNormalise.ts. */
	const normalise = normaliseScoutsSix;

	// ── Derived polygon points ────────────────────────────────────────────────

	/** Full-size (100%) background hex outline. */
	const bgHexPoints = $derived(
		SLOTS.map(({ angle }) => {
			const { x, y } = vertex(MAX_R, angle);
			return `${x.toFixed(2)},${y.toFixed(2)}`;
		}).join(' ')
	);

	/** Grid rings at 25%, 50%, 75% of MAX_R. */
	const gridRings = $derived(
		[0.25, 0.5, 0.75].map((frac) =>
			SLOTS.map(({ angle }) => {
				const { x, y } = vertex(MAX_R * frac, angle);
				return `${x.toFixed(2)},${y.toFixed(2)}`;
			}).join(' ')
		)
	);

	/** Axis lines from centre to each MAX_R vertex. */
	const axes = $derived(
		SLOTS.map(({ angle }) => vertex(MAX_R, angle))
	);

	/** Label positions slightly outside MAX_R. */
	const labelPositions = $derived(
		SLOTS.map(({ angle, label }) => {
			const { x, y } = vertex(LABEL_R, angle);
			return { x: x.toFixed(1), y: y.toFixed(1), label };
		})
	);

	/** Stat fill polygon — driven reactively by `stats` prop. */
	const fillPoints = $derived(
		SLOTS.map(({ key, angle }) => {
			const v = normalise(key, stats[key]);
			const { x, y } = vertex(MAX_R * v, angle);
			return `${x.toFixed(2)},${y.toFixed(2)}`;
		}).join(' ')
	);

	/** Per-vertex "glow dot" positions (on the fill polygon boundary). */
	const glowDots = $derived(
		SLOTS.map(({ key, angle }) => {
			const v = normalise(key, stats[key]);
			return vertex(MAX_R * v, angle);
		})
	);

	/** Unique gradient ID to avoid collisions when multiple Prisms render. */
	const gradId = $derived(`vp-fill-${accent.replace('#', '')}`);
	const glowId = $derived(`vp-glow-${accent.replace('#', '')}`);
</script>

<!-- ─── SVG ──────────────────────────────────────────────────────────────── -->
<svg
	class="vp-root {extraClass}"
	width={size}
	height={size}
	viewBox="0 0 200 200"
	role="img"
	aria-label="Vanguard Prism — athletic stat hexagon"
>
	<defs>
		<!-- Radial fill gradient, anchored to the accent colour -->
		<radialGradient id={gradId} cx="50%" cy="50%" r="50%">
			<stop offset="0%"   stop-color={accent} stop-opacity="0.55" />
			<stop offset="65%"  stop-color={accent} stop-opacity="0.22" />
			<stop offset="100%" stop-color={accent} stop-opacity="0.06" />
		</radialGradient>

		<!-- Drop-shadow / glow filter for the stroke and dots -->
		<filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
			<feGaussianBlur stdDeviation="2.5" result="blur" />
			<feMerge>
				<feMergeNode in="blur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>

	<!-- ── Background grid ───────────────────────────────────────────────── -->

	<!-- Axis lines (centre → vertex) -->
	{#each axes as { x, y }}
		<line
			x1={CX} y1={CY}
			x2={x.toFixed(2)} y2={y.toFixed(2)}
			stroke={accent}
			stroke-width="0.5"
			stroke-opacity="0.12"
		/>
	{/each}

	<!-- Grid rings (25%, 50%, 75%) -->
	{#each gridRings as pts}
		<polygon
			points={pts}
			fill="none"
			stroke={accent}
			stroke-width="0.5"
			stroke-opacity="0.12"
		/>
	{/each}

	<!-- Outer hex boundary -->
	<polygon
		points={bgHexPoints}
		fill="none"
		stroke={accent}
		stroke-width="0.8"
		stroke-opacity="0.22"
	/>

	<!-- ── Stat fill polygon ──────────────────────────────────────────────── -->
	<polygon
		points={fillPoints}
		fill="url(#{gradId})"
		stroke="none"
		class={animated ? 'vp-fill' : ''}
	/>

	<!-- Stat outline -->
	<polygon
		points={fillPoints}
		fill="none"
		stroke={accent}
		stroke-width="1.5"
		stroke-linejoin="round"
		filter="url(#{glowId})"
		class={animated ? 'vp-stroke' : ''}
	/>

	<!-- Vertex glow dots (at each stat intersection) -->
	{#each glowDots as { x, y }, i (i)}
		<circle
			cx={x.toFixed(2)} cy={y.toFixed(2)}
			r="2.5"
			fill={accent}
			opacity="0.9"
			filter="url(#{glowId})"
		/>
	{/each}

	<!-- ── Centre user icon ───────────────────────────────────────────────── -->
	<!-- Minimalist silhouette: circle (head) + arc (shoulders) -->
	<g class="vp-user-icon" aria-hidden="true">
		<!-- Icon ring -->
		<circle
			cx={CX} cy={CY}
			r="16"
			fill="rgba(1,4,9,0.75)"
			stroke={accent}
			stroke-width="1"
			stroke-opacity="0.4"
		/>
		<!-- Head -->
		<circle
			cx={CX} cy={CY - 3}
			r="4.5"
			fill={accent}
			opacity="0.55"
		/>
		<!-- Shoulders (clipped arc) -->
		<clipPath id="vp-icon-clip">
			<circle cx={CX} cy={CY} r="14.5" />
		</clipPath>
		<ellipse
			cx={CX} cy={CY + 14}
			rx="8" ry="6.5"
			fill={accent}
			opacity="0.4"
			clip-path="url(#vp-icon-clip)"
		/>
	</g>

	<!-- ── Stat labels (optional) ────────────────────────────────────────── -->
	{#if showLabels}
		{#each labelPositions as { x, y, label }}
			<text
				{x} {y}
				text-anchor="middle"
				dominant-baseline="middle"
				font-family="'JetBrains Mono', 'Fira Code', monospace"
				font-size="10"
				font-weight="700"
				fill={accent}
				opacity="0.65"
				letter-spacing="0.08em"
			>
				{label}
			</text>
		{/each}
	{/if}
</svg>

<style>
	.vp-root {
		display: block;
		overflow: visible;
	}

	/* Subtle fill-opacity pulse */
	@keyframes vpFillPulse {
		0%, 100% { opacity: 0.85; }
		50%       { opacity: 1;    }
	}

	@keyframes vpStrokePulse {
		0%, 100% { opacity: 0.8;  stroke-width: 1.5px; }
		50%       { opacity: 1;   stroke-width: 2px;   }
	}

	.vp-fill {
		animation: vpFillPulse 4s ease-in-out infinite;
	}

	.vp-stroke {
		animation: vpStrokePulse 4s ease-in-out infinite;
	}
</style>
