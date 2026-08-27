<script lang="ts">
	import { onDestroy } from 'svelte';

	interface TacticalEntity {
		id: string;
		x: number;
		y: number;
		label?: string;
		number?: string;
		position?: string;
		side?: 'team' | 'opponent' | 'friendly';
	}

	interface TacticalRoute {
		id: string;
		x1: number;
		y1: number;
		cx: number;
		cy: number;
		x2: number;
		y2: number;
		kind: 'cut' | 'curve' | 'pass';
		pathKind?: 'cut' | 'curve' | 'pass';
		color?: string;
		passPivotX?: number;
		passPivotY?: number;
		pivotX?: number;
		pivotY?: number;
		bindPlayerId?: string | null;
		delay?: number;
	}

	interface Props {
		entities?: TacticalEntity[];
		routes?: TacticalRoute[];
		tacticName?: string;
		onOpenWarRoom?: () => void;
	}

	let {
		entities = [],
		routes = [],
		tacticName = 'Active War Room Board',
		onOpenWarRoom,
	}: Props = $props();

	// ── View mode toggle ───────────────────────────────────────────────────────
	let viewMode = $state<'static' | 'animated'>('static');

	// ── Animation engine ───────────────────────────────────────────────────────
	const ANIM_DURATION_MS = 4000;
	let animProgress = $state(0);
	let isPlaying = $state(false);
	let rafId: number | null = null;
	let animStart: number | null = null;
	let pausedAt = 0;

	function sampleBezier(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, t: number) {
		const mt = 1 - t;
		return { x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2, y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2 };
	}

	function sampleLinear(x1: number, y1: number, x2: number, y2: number, t: number) {
		return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
	}

	// Default baseline squad if no entities in cartridge yet
	const baselineEntities: TacticalEntity[] = [
		{ id: 'b_gk', x: 120, y: 450, position: 'GK', number: '1', side: 'team' },
		{ id: 'b_cb1', x: 380, y: 300, position: 'CB', number: '4', side: 'team' },
		{ id: 'b_cb2', x: 380, y: 600, position: 'CB', number: '5', side: 'team' },
		{ id: 'b_cm', x: 680, y: 450, position: 'CM', number: '8', side: 'team' },
		{ id: 'b_rw', x: 1050, y: 220, position: 'RW', number: '7', side: 'team' },
		{ id: 'b_st', x: 1200, y: 450, position: 'ST', number: '9', side: 'team' },
		{ id: 'b_lw', x: 1050, y: 680, position: 'LW', number: '11', side: 'team' },
		{ id: 'b_opp1', x: 850, y: 380, position: 'OP', number: '6', side: 'opponent' },
		{ id: 'b_opp2', x: 850, y: 520, position: 'OP', number: '3', side: 'opponent' },
	];

	const displayEntities = $derived(entities.length > 0 ? entities : baselineEntities);

	const animatedEntities = $derived.by(() => {
		if (viewMode === 'static' || routes.length === 0) return displayEntities;
		const prog = animProgress;
		return displayEntities.map((ent) => {
			const route = routes.find((r) => r.bindPlayerId === ent.id);
			if (!route) return ent;
			const delayNorm = Math.max(0, (route.delay ?? 0) / ANIM_DURATION_MS);
			const span = Math.max(0.001, 1 - delayNorm);
			const u = prog < delayNorm ? 0 : Math.min(1, (prog - delayNorm) / span);
			const pk = route.pathKind ?? route.kind ?? 'curve';
			let pos: { x: number; y: number };
			if (pk === 'cut' || pk === 'pass') {
				const px = route.pivotX ?? route.passPivotX ?? route.cx;
				const py = route.pivotY ?? route.passPivotY ?? route.cy;
				pos = u < 0.5 ? sampleLinear(route.x1, route.y1, px, py, u * 2) : sampleLinear(px, py, route.x2, route.y2, (u - 0.5) * 2);
			} else {
				pos = sampleBezier(route.x1, route.y1, route.cx, route.cy, route.x2, route.y2, u);
			}
			return { ...ent, x: pos.x, y: pos.y };
		});
	});

	function startAnimation() {
		if (rafId !== null) cancelAnimationFrame(rafId);
		isPlaying = true;
		const fromProgress = pausedAt;
		animStart = null;
		function step(ts: number) {
			if (animStart === null) animStart = ts - fromProgress * ANIM_DURATION_MS;
			animProgress = Math.min(1, (ts - animStart) / ANIM_DURATION_MS);
			if (animProgress < 1) { rafId = requestAnimationFrame(step); }
			else { isPlaying = false; pausedAt = 0; rafId = null; }
		}
		rafId = requestAnimationFrame(step);
	}

	function pauseAnimation() {
		if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
		isPlaying = false; pausedAt = animProgress;
	}

	function resetAnimation() {
		if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
		isPlaying = false; animProgress = 0; pausedAt = 0;
	}

	function scrubAnimation(e: Event) {
		const val = parseFloat((e.target as HTMLInputElement).value);
		animProgress = val; pausedAt = val;
		if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; isPlaying = false; }
	}

	onDestroy(() => { if (rafId !== null) cancelAnimationFrame(rafId); });

	const passRoutes = $derived(routes.filter((r) => (r.pathKind ?? r.kind) === 'pass'));
	const runRoutes = $derived(routes.filter((r) => (r.pathKind ?? r.kind) !== 'pass'));
</script>


<div class="tw-flex tw-flex-col tw-h-full tw-bg-[#090d16] tw-border tw-border-[#1e293b] tw-rounded-2xl tw-overflow-hidden tw-shadow-2xl">
	<!-- Stage Top Action Bar -->
	<div class="tw-bg-[#0f172a] tw-border-b tw-border-[#1e293b] tw-px-4 tw-py-3 tw-flex tw-items-center tw-justify-between tw-gap-3">
		<div class="tw-flex tw-items-center tw-gap-2.5">
			<span class="tw-h-2 tw-w-2 tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_8px_#14b8a6]"></span>
			<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-white tw-tracking-wide tw-truncate tw-max-w-[260px]">
				{tacticName}
			</span>
			<span class="tw-bg-[#14b8a6]/15 tw-border tw-border-[#14b8a6]/30 tw-text-[#14b8a6] tw-font-mono tw-text-[10px] tw-px-2 tw-py-0.5 tw-rounded-md">
				WAR ROOM SYNCED
			</span>
		</div>

		{#if onOpenWarRoom}
			<button
				type="button"
				class="tw-inline-flex tw-items-center tw-gap-1.5 tw-bg-[#1e293b] hover:tw-bg-slate-700 tw-border tw-border-slate-600/60 tw-text-slate-200 hover:tw-text-white tw-font-mono tw-text-[11px] tw-font-semibold tw-px-3 tw-py-1.5 tw-rounded-lg active:tw-scale-[0.98] tw-transition-all"
				onclick={onOpenWarRoom}
			>
				<span>⚡ Edit in War Room</span>
				<span class="tw-text-[#14b8a6]">→</span>
			</button>
		{/if}

		<!-- View Mode Switcher -->
		<div class="tw-flex tw-items-center tw-gap-1 tw-bg-[#020617] tw-border tw-border-slate-800 tw-rounded-lg tw-p-0.5">
			<button
				type="button"
				class="tw-px-2.5 tw-py-1 tw-font-mono tw-text-[10px] tw-font-bold tw-rounded tw-transition-all {viewMode === 'static' ? 'tw-bg-[#1e293b] tw-text-white' : 'tw-text-slate-500 hover:tw-text-slate-300'}"
				onclick={() => { viewMode = 'static'; resetAnimation(); }}
			>
				📋 Static
			</button>
			<button
				type="button"
				class="tw-px-2.5 tw-py-1 tw-font-mono tw-text-[10px] tw-font-bold tw-rounded tw-transition-all {viewMode === 'animated' ? 'tw-bg-[#1e293b] tw-text-[#daff0a]' : 'tw-text-slate-500 hover:tw-text-slate-300'}"
				onclick={() => { viewMode = 'animated'; }}
				disabled={routes.length === 0}
				title={routes.length === 0 ? 'No routes to animate — draw routes in the War Room first' : 'Animate player motions'}
			>
				📹 Animated
			</button>
		</div>
	</div>

	<!-- Interactive Pitch Stage (SVG 1600x900) -->
	<div class="tw-relative tw-flex-1 tw-flex tw-items-center tw-justify-center tw-p-4 tw-bg-[#050811]">
		<svg
			viewBox="0 0 1600 900"
			class="tw-w-full tw-h-auto tw-max-h-[460px] tw-rounded-xl tw-shadow-inner tw-border tw-border-slate-800/80"
			style="background: #090e1a;"
			preserveAspectRatio="xMidYMid meet"
		>
			<defs>
				<!-- Subtle pitch grass grid pattern -->
				<pattern id="drill-pitch-grid" width="80" height="80" patternUnits="userSpaceOnUse">
					<rect width="80" height="80" fill="#090e1a" />
					<line x1="0" y1="0" x2="80" y2="0" stroke="rgba(30, 41, 59, 0.4)" stroke-width="1" />
					<line x1="0" y1="0" x2="0" y2="80" stroke="rgba(30, 41, 59, 0.4)" stroke-width="1" />
				</pattern>

				<!-- Glow Filters -->
				<filter id="neon-cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
					<feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#14b8a6" flood-opacity="0.8" />
				</filter>
				<filter id="neon-yellow-glow" x="-20%" y="-20%" width="140%" height="140%">
					<feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#daff0a" flood-opacity="0.8" />
				</filter>
				<filter id="neon-gold-glow" x="-20%" y="-20%" width="140%" height="140%">
					<feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#fbbf24" flood-opacity="0.8" />
				</filter>

				<!-- Markers for arrowheads -->
				<marker id="arrow-run" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<path d="M 0 1 L 10 5 L 0 9 z" fill="#daff0a" />
				</marker>
				<marker id="arrow-pass" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" />
				</marker>
			</defs>

			<!-- Pitch Background & Grid -->
			<rect width="1600" height="900" fill="url(#drill-pitch-grid)" />

			<!-- Pitch Touchlines & Perimeter -->
			<rect x="40" y="40" width="1520" height="820" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-opacity="0.4" />

			<!-- Halfway Line -->
			<line x1="800" y1="40" x2="800" y2="860" stroke="#14b8a6" stroke-width="1.5" stroke-opacity="0.4" />

			<!-- Center Circle & Center Spot -->
			<circle cx="800" cy="450" r="140" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-opacity="0.4" />
			<circle cx="800" cy="450" r="6" fill="#14b8a6" fill-opacity="0.6" />

			<!-- Left Penalty Box -->
			<rect x="40" y="230" width="260" height="440" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-opacity="0.4" />
			<rect x="40" y="340" width="100" height="220" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-opacity="0.3" />
			<circle cx="220" cy="450" r="5" fill="#14b8a6" fill-opacity="0.6" />

			<!-- Right Penalty Box -->
			<rect x="1300" y="230" width="260" height="440" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-opacity="0.4" />
			<rect x="1460" y="340" width="100" height="220" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-opacity="0.3" />
			<circle cx="1380" cy="450" r="5" fill="#14b8a6" fill-opacity="0.6" />

			<!-- ── Tactical Routes from War Room ── -->
			<!-- 1. Player Run Routes (Curved / Cut) -->
			{#each runRoutes as r (r.id)}
				<path
					d="M {r.x1} {r.y1} Q {r.cx} {r.cy} {r.x2} {r.y2}"
					fill="none"
					stroke="#daff0a"
					stroke-width="3"
					stroke-linecap="round"
					filter="url(#neon-yellow-glow)"
					marker-end="url(#arrow-run)"
				/>
			{/each}

			<!-- 2. Ball Pass Routes (with Movable Pivot Point Kinematics) -->
			{#each passRoutes as r (r.id)}
				{@const px = typeof r.passPivotX === 'number' ? r.passPivotX : r.cx}
				{@const py = typeof r.passPivotY === 'number' ? r.passPivotY : r.cy}
				<!-- Dribble / Carry section to pivot -->
				<line
					x1={r.x1}
					y1={r.y1}
					x2={px}
					y2={py}
					stroke="#14b8a6"
					stroke-width="2.5"
					stroke-dasharray="4,4"
					filter="url(#neon-cyan-glow)"
				/>
				<!-- Pass Pivot Anchor Disc -->
				<circle
					cx={px}
					cy={py}
					r="9"
					fill="#020617"
					stroke="#fbbf24"
					stroke-width="2.5"
					filter="url(#neon-gold-glow)"
				/>
				<circle cx={px} cy={py} r="4" fill="#fbbf24" />

				<!-- Final Pass from pivot to target -->
				<line
					x1={px}
					y1={py}
					x2={r.x2}
					y2={r.y2}
					stroke="#fbbf24"
					stroke-width="3.5"
					marker-end="url(#arrow-pass)"
					filter="url(#neon-gold-glow)"
				/>
			{/each}

			<!-- ── Tactical Tokens / Players ── -->
			{#each animatedEntities as entity (entity.id)}
				{@const isOpp = entity.side === 'opponent'}
				<g transform="translate({entity.x}, {entity.y})">
					<!-- Token Base Circle -->
					<circle
						r="24"
						fill={isOpp ? '#450a0a' : '#042f2e'}
						stroke={isOpp ? '#ef4444' : '#14b8a6'}
						stroke-width="2"
						filter={isOpp ? undefined : 'url(#neon-cyan-glow)'}
					/>
					<!-- Inner indicator -->
					<circle
						r="20"
						fill={isOpp ? '#7f1d1d' : '#0f766e'}
						fill-opacity="0.8"
					/>
					<!-- Jersey / Position Text -->
					<text
						text-anchor="middle"
						dominant-baseline="central"
						fill="#fafafa"
						font-family="monospace"
						font-size="12"
						font-weight="bold"
					>
						{entity.position || entity.number || (isOpp ? 'OP' : 'PL')}
					</text>
				</g>
			{/each}
		</svg>
	</div>

	<!-- Animated Playback Controls -->
	{#if viewMode === 'animated'}
		<div class="tw-bg-[#050811] tw-border-t tw-border-[#1e293b] tw-px-4 tw-py-2.5 tw-flex tw-items-center tw-gap-3">
			<!-- Rewind -->
			<button
				type="button"
				class="tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-xs tw-w-7 tw-h-7 tw-flex tw-items-center tw-justify-center tw-rounded tw-border tw-border-slate-800 hover:tw-border-slate-600 tw-transition-all"
				onclick={resetAnimation}
				title="Rewind"
				aria-label="Rewind animation"
			>
				<span aria-hidden="true">|◀</span>
			</button>

			<!-- Play / Pause -->
			<button
				type="button"
				class="tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-rounded-full tw-border tw-transition-all {isPlaying ? 'tw-bg-[#daff0a]/20 tw-border-[#daff0a]/60 tw-text-[#daff0a]' : 'tw-bg-[#14b8a6]/15 tw-border-[#14b8a6]/50 tw-text-[#14b8a6]'}"
				onclick={() => { if (isPlaying) { pauseAnimation(); } else { if (animProgress >= 1) { resetAnimation(); } startAnimation(); } }}
				title={isPlaying ? 'Pause' : 'Play animation'}
				aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
				aria-pressed={isPlaying}
			>
				{#if isPlaying}
					<svg class="tw-w-3.5 tw-h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
					</svg>
				{:else}
					<svg class="tw-w-3.5 tw-h-3.5 tw-translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M8 5v14l11-7z"/>
					</svg>
				{/if}
			</button>

			<!-- Timeline Scrubber -->
			<input
				type="range"
				min="0"
				max="1"
				step="0.002"
				value={animProgress}
				oninput={scrubAnimation}
				class="tw-flex-1 tw-accent-[#daff0a] tw-h-1 tw-cursor-pointer"
				aria-label="Animation timeline scrubber"
			/>

			<!-- Time display -->
			<span class="tw-font-mono tw-text-[10px] tw-text-[#daff0a] tw-w-10 tw-text-right">
				{(animProgress * 4).toFixed(1)}s
			</span>

			<span class="tw-font-mono tw-text-[10px] tw-text-slate-600 tw-hidden sm:tw-block">
				{routes.length} routes
			</span>
		</div>
	{/if}

	<!-- Stage Footer Telemetry Bar -->
	<div class="tw-bg-[#0f172a] tw-border-t tw-border-[#1e293b] tw-px-4 tw-py-2.5 tw-flex tw-items-center tw-justify-between tw-text-[11px] tw-font-mono tw-text-slate-400">
		<div class="tw-flex tw-items-center tw-gap-4">
			<span>Players on pitch: <strong class="tw-text-white">{displayEntities.length}</strong></span>
			<span>Movement routes: <strong class="tw-text-[#daff0a]">{runRoutes.length}</strong></span>
			<span>Pass sequences: <strong class="tw-text-[#fbbf24]">{passRoutes.length}</strong></span>
		</div>
		<span class="tw-text-slate-500">Scale: 1600 × 900 Native SIEM</span>
	</div>
</div>
