<script lang="ts">
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
		color?: string;
		passPivotX?: number;
		passPivotY?: number;
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

	const displayEntities = $derived(
		entities.length > 0 ? entities : baselineEntities
	);

	const passRoutes = $derived(routes.filter((r) => r.kind === 'pass'));
	const runRoutes = $derived(routes.filter((r) => r.kind !== 'pass'));
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
			{#each displayEntities as entity (entity.id)}
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
