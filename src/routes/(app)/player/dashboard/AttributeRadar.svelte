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
	const N = $derived(ATTRS.length);

	// Expanded viewBox centre + radii so labels never clip
	const CX = 120;
	const CY = 120;
	const R = 72;        // outer web radius
	const LABEL_R = 98;  // label placement radius — well clear of the web
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

	/**
	 * Angle-aware text-anchor: right-side labels anchor start, left-side anchor end,
	 * top/bottom labels stay centred. Prevents label overlap with the polygon.
	 */
	function anchorFor(i: number): 'start' | 'middle' | 'end' {
		const a = (i * 2 * Math.PI) / N - Math.PI / 2;
		const x = Math.cos(a);
		if (x > 0.25) return 'start';
		if (x < -0.25) return 'end';
		return 'middle';
	}

	const skillVertices = $derived(
		safeValues.map((v, i) => {
			const mult = Math.max(0.04, v / 99);
			return { ...pt(i, R * mult), raw: v };
		}),
	);

	const skillPolygonPoints = $derived(
		skillVertices.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
	);

	const labelVertices = $derived(
		ATTRS.map((attr, i) => ({ ...pt(i, LABEL_R), attr })),
	);
</script>

<div class="ar-root">
	<svg
		class="ar-svg"
		viewBox="0 0 240 240"
		preserveAspectRatio="xMidYMid meet"
		role="img"
		aria-label="Attribute radar chart"
	>
		<!-- ── Web tiers (concentric pentagons) — low-contrast slate lines ──── -->
		{#each TIERS as tier, ti (tier)}
			<polygon
				points={pentagonPoints(R * tier)}
				fill="none"
				stroke="rgba(148, 163, 184, 0.20)"
				stroke-width={ti === TIERS.length - 1 ? '0.6' : '0.4'}
				vector-effect="non-scaling-stroke"
			/>
		{/each}

		<!-- ── Axis spokes — hairline slate ──────────────────────────────────── -->
		{#each ATTRS as _attr, i (`spoke-${i}`)}
			{@const tip = pt(i, R)}
			<line
				x1={CX} y1={CY}
				x2={tip.x} y2={tip.y}
				stroke="rgba(148, 163, 184, 0.15)"
				stroke-width="0.4"
				vector-effect="non-scaling-stroke"
			/>
		{/each}

		<!-- ── Skill envelope — muted slate-teal, no glow ───────────────────── -->
		<polygon
			points={skillPolygonPoints}
			fill="rgba(20, 184, 166, 0.18)"
			stroke="#14b8a6"
			stroke-width="1.5"
			stroke-linejoin="round"
			vector-effect="non-scaling-stroke"
		/>

		<!-- ── Per-vertex dots — neutral white ──────────────────────────────── -->
		{#each skillVertices as v, vi (`vtx-${vi}`)}
			<circle
				cx={v.x}
				cy={v.y}
				r="2.5"
				fill="#f8fafc"
			/>
		{/each}

		<!-- ── Axis labels — Geist Mono, slate-300, angle-aware anchoring ───── -->
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
			>{lv.attr.name.toUpperCase()}</text>
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
