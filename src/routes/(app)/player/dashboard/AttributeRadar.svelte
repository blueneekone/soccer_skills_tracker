<script lang="ts">
	import { sportsConfigStore } from '$lib/stores/sportsConfigStore.svelte.js';
	import { getRpgSportConfig } from '$lib/config/sports.js';

	type Props = {
		/** 5 values 0-99, aligned to the active RPG sport config attributes */
		values?: number[];
		/** Optional sport override; defaults to the workspace active sport. */
		sportId?: string;
	};

	const { values = [], sportId }: Props = $props();

	const rpgConfig = $derived(getRpgSportConfig(sportId ?? sportsConfigStore.currentSportConfig?.sportId));
	const ATTRS = $derived(rpgConfig.attributes); // 5 items
	const N = $derived(ATTRS.length); // 5
	const CX = 100;
	const CY = 100;
	const R = 68;        // outer web radius
	const LABEL_R = 88;  // label placement radius
	const TIERS = [0.2, 0.4, 0.6, 0.8, 1.0];

	const safeValues = $derived(
		values.length >= N
			? values.slice(0, N).map(v => Math.min(99, Math.max(0, Math.round(Number(v) || 0))))
			: ATTRS.map(() => 45),
	);

	/** Cartesian point on the pentagon */
	function pt(i: number, r: number): { x: number; y: number } {
		const a = (i * 2 * Math.PI) / N - Math.PI / 2;
		return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
	}

	/** Pentagon polygon points string at radius r */
	function pentagonPoints(r: number): string {
		return Array.from({ length: N }, (_, i) => {
			const p = pt(i, r);
			return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
		}).join(' ');
	}

	const skillVertices = $derived(
		safeValues.map((v, i) => {
			const mult = Math.max(0.04, v / 99);
			return { ...pt(i, R * mult), raw: v, color: ATTRS[i].hexColor };
		}),
	);

	const skillPolygonPoints = $derived(
		skillVertices.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
	);

	const labelVertices = $derived(
		ATTRS.map((attr, i) => ({ ...pt(i, LABEL_R), attr })),
	);

	// Unique filter id per instance to avoid SVG filter collisions
	const uid = `ar-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="ar-root">
	<svg
		class="ar-svg"
		viewBox="0 0 200 200"
		preserveAspectRatio="xMidYMid meet"
		role="img"
		aria-label="Attribute radar chart"
	>
		<defs>
			<!-- Neon bloom filter for polygon + dots -->
			<filter id="{uid}-bloom" x="-35%" y="-35%" width="170%" height="170%">
				<feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
				<feMerge>
					<feMergeNode in="blur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<!-- ── Web tiers (concentric pentagons) ─────────────────────────────── -->
		{#each TIERS as tier, ti (tier)}
			<polygon
				points={pentagonPoints(R * tier)}
				fill="none"
				stroke="rgba(0, 240, 255, 0.10)"
				stroke-width={ti === TIERS.length - 1 ? '0.5' : '0.35'}
				vector-effect="non-scaling-stroke"
			/>
		{/each}

		<!-- ── Axis spokes ───────────────────────────────────────────────────── -->
		{#each ATTRS as attr, i (`spoke-${i}`)}
			{@const tip = pt(i, R)}
			<line
				x1={CX} y1={CY}
				x2={tip.x} y2={tip.y}
				stroke="rgba(0, 240, 255, 0.14)"
				stroke-width="0.4"
				vector-effect="non-scaling-stroke"
			/>
		{/each}

		<!-- ── Skill envelope: unified cyan fill + glowing stroke ───────────── -->
		<polygon
			points={skillPolygonPoints}
			fill="rgba(0, 240, 255, 0.15)"
			stroke="#00f0ff"
			stroke-width="2"
			stroke-linejoin="round"
			vector-effect="non-scaling-stroke"
			style="filter: drop-shadow(0px 0px 4px #00f0ff)"
			filter="url(#{uid}-bloom)"
		/>

		<!-- ── Per-vertex dots (per-attribute color) ──────────────────────────── -->
		{#each skillVertices as v, vi (`vtx-${vi}`)}
			<circle
				cx={v.x}
				cy={v.y}
				r="3"
				fill={v.color}
				style="filter: drop-shadow(0 0 3px {v.color})"
			/>
		{/each}

		<!-- ── Axis labels (per-attribute color, monospace micro-type) ───────── -->
		{#each labelVertices as lv, li (`lbl-${li}`)}
			<text
				x={lv.x}
				y={lv.y}
				font-size="7.5"
				font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
				font-weight="800"
				letter-spacing="0.8"
				text-anchor="middle"
				dominant-baseline="middle"
				fill={lv.attr.hexColor}
				style="filter: drop-shadow(0 0 4px {lv.attr.hexColor}); pointer-events:none;"
			>{lv.attr.name.toUpperCase().slice(0, 6)}</text>
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
