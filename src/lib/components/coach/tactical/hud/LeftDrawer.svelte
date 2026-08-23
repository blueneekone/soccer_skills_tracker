<script>
	/**
	 * LeftDrawer.svelte — Slide-out drawer on the left side of the War Room.
	 * Houses:
	 * 1. Drawing Tools (Route shapes, Ink colors, Board operations, Player/Ball modes)
	 * 2. Active Roster (Draggable player tokens with positions & initials)
	 * 3. Drill Info (Drill parameters, pitch geometry dimensions, tactical cues)
	 */

	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel, isOpen: boolean, onClose: () => void }} */
	let { model: engine, isOpen = false, onClose } = $props();

	/** @type {'tools' | 'roster' | 'info'} */
	let activeTab = $state('tools');

	const INK_PALETTE = /** @type {const} */ (['#14b8a6', '#ef4444', '#d97706', '#ffffff', '#daff0a']);

	function getPlayerInitials(name) {
		if (!name) return '??';
		const parts = name.trim().split(/\s+/);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	const rosterList = $derived(
		Array.isArray(engine?.host?.wrBucketXi) && engine.host.wrBucketXi.length > 0
			? engine.host.wrBucketXi
			: [
					{ id: 'def_1', name: 'John Smith', position: 'CB' },
					{ id: 'def_2', name: 'Marcus Price', position: 'ST' },
					{ id: 'def_3', name: 'Alex Johnson', position: 'CDM' },
					{ id: 'def_4', name: 'David Lee', position: 'LWB' },
					{ id: 'def_5', name: 'Sam Taylor', position: 'GK' }
				]
	);
</script>

<!-- Left Slide-Out Drawer Overlay Container -->
<div
	class="tw-pointer-events-none tw-fixed tw-inset-y-0 tw-left-0 tw-z-50 tw-w-96 tw-max-w-[90vw]"
	role="region"
	aria-label="War Room Tools and Roster Deck"
>
	<div
		class="tw-pointer-events-auto tw-flex tw-h-full tw-w-full tw-flex-col tw-border-r tw-border-[#334155] tw-bg-[#0a0a0a]/95 tw-font-mono tw-text-slate-200 tw-backdrop-blur-xl tw-shadow-[15px_0_30px_rgba(0,0,0,0.8)] tw-transition-transform tw-duration-300"
		style="transform: translateX({isOpen ? '0%' : '-100%'});"
		aria-hidden={!isOpen}
	>
		<!-- Header -->
		<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-bg-[#0f172a]/90 tw-px-4 tw-py-3">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-inline-block tw-h-2.5 tw-w-2.5 tw-bg-[#daff0a]"></span>
				<h2 class="tw-m-0 tw-text-xs tw-font-bold tw-tracking-widest tw-text-slate-100 tw-uppercase">
					[ TOOLS_&_ROSTER_DECK ]
				</h2>
			</div>
			<button
				type="button"
				class="tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-border tw-border-slate-700 tw-bg-[#0a0a0a] tw-text-slate-400 hover:tw-border-[#daff0a] hover:tw-text-[#daff0a] tw-transition-colors"
				onclick={onClose}
				title="Close Tools Drawer"
				aria-label="Close Tools Drawer"
			>
				✕
			</button>
		</div>

		<!-- Nav Tabs -->
		<div class="tw-grid tw-grid-cols-3 tw-border-b tw-border-[#334155] tw-bg-[#050811] tw-text-[10px] tw-font-bold tw-tracking-wider">
			<button
				type="button"
				class="tw-py-2.5 tw-text-center tw-border-r tw-border-[#334155] tw-transition-colors {activeTab === 'tools' ? 'tw-bg-[#0f172a] tw-text-[#daff0a] tw-border-b-2 tw-border-b-[#daff0a]' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
				onclick={() => activeTab = 'tools'}
			>
				DRAW TOOLS
			</button>
			<button
				type="button"
				class="tw-py-2.5 tw-text-center tw-border-r tw-border-[#334155] tw-transition-colors {activeTab === 'roster' ? 'tw-bg-[#0f172a] tw-text-[#14b8a6] tw-border-b-2 tw-border-b-[#14b8a6]' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
				onclick={() => activeTab = 'roster'}
			>
				ROSTER ({rosterList.length})
			</button>
			<button
				type="button"
				class="tw-py-2.5 tw-text-center tw-transition-colors {activeTab === 'info' ? 'tw-bg-[#0f172a] tw-text-[#fbbf24] tw-border-b-2 tw-border-b-[#fbbf24]' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
				onclick={() => activeTab = 'info'}
			>
				DRILL INFO
			</button>
		</div>

		<!-- Tab Body -->
		<div class="tw-flex-1 tw-overflow-y-auto tw-p-4 tw-space-y-6">
			{#if activeTab === 'tools'}
				<!-- DRAWING TOOLS TAB -->
				<section>
					<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-2">
						ROUTE_SHAPE
					</p>
					<div class="tw-grid tw-grid-cols-3 tw-gap-2">
						<button
							type="button"
							class="tw-border tw-px-2 tw-py-2 tw-text-xs tw-text-center tw-transition-all {engine.routeDrawKind === 'curve' ? 'tw-bg-[#daff0a]/20 tw-border-[#daff0a] tw-text-[#daff0a] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-300 hover:tw-border-slate-500'}"
							onclick={(e) => {
								e.stopPropagation();
								engine.routeDrawKind = 'curve';
								engine.updateSelectedRouteShape?.('curve');
							}}
						>
							[ CURVE ]
						</button>
						<button
							type="button"
							class="tw-border tw-px-2 tw-py-2 tw-text-xs tw-text-center tw-transition-all {engine.routeDrawKind === 'cut' ? 'tw-bg-[#14b8a6]/20 tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-300 hover:tw-border-slate-500'}"
							onclick={(e) => {
								e.stopPropagation();
								engine.routeDrawKind = 'cut';
								engine.updateSelectedRouteShape?.('cut');
							}}
						>
							[ CUT ]
						</button>
						<button
							type="button"
							class="tw-border tw-px-2 tw-py-2 tw-text-xs tw-text-center tw-transition-all {engine.routeDrawKind === 'pass' ? 'tw-bg-[#fbbf24]/20 tw-border-[#fbbf24] tw-text-[#fbbf24] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-300 hover:tw-border-slate-500'}"
							onclick={(e) => {
								e.stopPropagation();
								engine.routeDrawKind = 'pass';
								engine.updateSelectedRouteShape?.('pass');
							}}
						>
							[ PASS ]
						</button>
					</div>
				</section>

				<section>
					<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-2">
						INK_COLOR
					</p>
					<div class="tw-flex tw-items-center tw-gap-3">
						{#each INK_PALETTE as color (color)}
							<button
								type="button"
								class="tw-h-7 tw-w-7 tw-border tw-transition-transform active:tw-scale-90 {engine.activeRouteColor === color ? 'tw-border-white tw-scale-110 tw-shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'tw-border-transparent hover:tw-border-slate-500'}"
								style="background: {color};"
								onclick={(e) => {
									e.stopPropagation();
									engine.activeRouteColor = color;
									engine.updateSelectedRouteColor?.(color);
								}}
								aria-label="Route color {color}"
							></button>
						{/each}
					</div>
				</section>

				<section>
					<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-2">
						DRAW_MODES
					</p>
					<div class="tw-grid tw-grid-cols-2 tw-gap-2">
						<button
							type="button"
							class="tw-border tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-transition-all {engine.activeTool === 'ROUTE' && engine.routeDrawKind === 'cut' ? 'tw-bg-[#daff0a]/20 tw-border-[#daff0a] tw-text-[#daff0a] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-300'}"
							onclick={() => {
								engine.setActiveTool('ROUTE');
								engine.routeDrawKind = 'cut';
							}}
						>
							🏃 PLAYER RUN
						</button>
						<button
							type="button"
							class="tw-border tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-transition-all {engine.activeTool === 'ROUTE' && engine.routeDrawKind === 'pass' ? 'tw-bg-[#14b8a6]/20 tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-bold' : 'tw-bg-[#0f172a] tw-border-slate-700 tw-text-slate-300'}"
							onclick={() => {
								engine.setActiveTool('ROUTE');
								engine.routeDrawKind = 'pass';
							}}
						>
							⚽ BALL PASS
						</button>
					</div>
				</section>

				<section>
					<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-2">
						BOARD_OPERATIONS
					</p>
					<div class="tw-flex tw-flex-col tw-gap-2">
						<button
							type="button"
							class="tw-border tw-border-slate-700 tw-bg-[#0f172a] tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-text-slate-200 hover:tw-border-[#14b8a6] hover:tw-text-[#14b8a6] tw-transition-colors"
							onclick={(e) => {
								e.stopPropagation();
								engine.injectBall();
							}}
						>
							⚽ INJECT BALL TO PITCH
						</button>
						<button
							type="button"
							class="tw-border tw-border-slate-700 tw-bg-[#0f172a] tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-text-slate-200 hover:tw-border-[#fbbf24] hover:tw-text-[#fbbf24] tw-transition-colors"
							onclick={(e) => {
								e.stopPropagation();
								engine.recallBench();
							}}
						>
							👥 RECALL BENCH
						</button>
						<button
							type="button"
							class="tw-border tw-border-red-900/60 tw-bg-red-950/30 tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-text-red-400 hover:tw-bg-red-950/60 hover:tw-border-red-500 tw-transition-colors"
							onclick={(e) => {
								e.stopPropagation();
								engine.clearRoutesOnly();
							}}
						>
							⊗ CLEAR ALL ROUTES
						</button>
						<button
							type="button"
							class="tw-border tw-border-red-800 tw-bg-red-950/60 tw-px-3 tw-py-2 tw-text-xs tw-text-left tw-text-red-300 hover:tw-bg-red-900 hover:tw-text-white tw-font-bold tw-transition-colors"
							onclick={(e) => {
								e.stopPropagation();
								engine.clearPitch?.();
							}}
						>
							✕ CLEAR ENTIRE PITCH
						</button>
					</div>
				</section>

			{:else if activeTab === 'roster'}
				<!-- ACTIVE ROSTER TAB -->
				<section>
					<div class="sstracker-roster-tray tw-flex tw-flex-col tw-gap-2">
						<p class="tw-text-[10px] tw-font-bold tw-tracking-widest tw-text-slate-400 tw-uppercase tw-mb-1">
							SQUAD ACTIVE ROSTER ({rosterList.length})
						</p>
						<p class="tw-text-[11px] tw-text-slate-400 tw-mb-3 tw-leading-relaxed">
							Drag player tokens or click to position them on the tactical arena.
						</p>
						<div class="tw-flex tw-flex-col tw-gap-1.5 tw-max-h-[60vh] tw-overflow-y-auto tw-pr-1">
							{#each rosterList as p (p.id)}
								{@const initials = getPlayerInitials(p.name)}
								<div
									class="roster-player-token tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-3 tw-py-2 tw-text-xs tw-text-[#d4d4d8] hover:tw-border-[#14b8a6] tw-cursor-grab active:tw-scale-[0.98] tw-transition-all"
								>
									<div class="tw-flex tw-items-center tw-gap-2.5 tw-min-w-0">
										<span class="tw-flex tw-h-6 tw-w-6 tw-items-center tw-justify-center tw-border tw-border-[#14b8a6] tw-bg-[#14b8a6]/20 tw-text-[10px] tw-font-bold tw-text-[#14b8a6]">
											{initials}
										</span>
										<span class="tw-truncate tw-font-mono tw-text-xs tw-text-slate-100">{p.name}</span>
									</div>
									<span class="tw-border tw-border-slate-700 tw-bg-[#050811] tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-bold tw-text-[#fbbf24]">
										{p.position || 'MID'}
									</span>
								</div>
							{/each}
						</div>
					</div>
				</section>

			{:else if activeTab === 'info'}
				<!-- DRILL INFO TAB -->
				<section class="tw-space-y-4">
					<div>
						<h4 class="tw-text-xs tw-font-bold tw-text-[#fbbf24] tw-uppercase tw-mb-1">Drill Parameters & Formations</h4>
						<p class="tw-text-xs tw-text-slate-300 tw-leading-relaxed">
							Standard tactical pitch grid calibrated to FIFA standard ratios. Coordinate system maps from (0,0) top-left to (1600,900) bottom-right.
						</p>
					</div>

					<div class="tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-3 tw-space-y-2">
						<div class="tw-text-[10px] tw-font-bold tw-text-[#14b8a6] tw-uppercase">PITCH BENCHMARKS</div>
						<div class="tw-text-xs tw-text-slate-300 tw-flex tw-justify-between">
							<span>Full Field:</span>
							<span class="tw-text-slate-400">110 × 70 Yards (11v11)</span>
						</div>
						<div class="tw-text-xs tw-text-slate-300 tw-flex tw-justify-between">
							<span>Half Court:</span>
							<span class="tw-text-slate-400">Attacking 3rd / Box Drill</span>
						</div>
						<div class="tw-text-xs tw-text-slate-300 tw-flex tw-justify-between">
							<span>Grid Scale:</span>
							<span class="tw-text-slate-400">1600 × 900 Canvas Units</span>
						</div>
					</div>

					<div class="tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-3 tw-space-y-2">
						<div class="tw-text-[10px] tw-font-bold tw-text-[#daff0a] tw-uppercase">TACTICAL OBJECTIVES</div>
						<ul class="tw-list-disc tw-list-inside tw-space-y-1 tw-text-xs tw-text-slate-300">
							<li>Overlapping run mechanics for wing backs.</li>
							<li>Third-man passing combinations in transition.</li>
							<li>Compact defensive diamond positioning.</li>
						</ul>
					</div>
				</section>
			{/if}
		</div>
	</div>
</div>
