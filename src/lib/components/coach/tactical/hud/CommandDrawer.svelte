<script>
	/**
	 * CommandDrawer.svelte — Right slide-out drawer for the War Room.
	 * Houses:
	 * 1. System Commands & Board Operations
	 * 2. Help Manual & Pediatric Laws tab
	 */
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel }} */
	let { model: engine } = $props();

	/** @type {'system' | 'help'} */
	let activeTab = $state('system');

	const INK_PALETTE = /** @type {const} */ (['#14b8a6', '#ef4444', '#d97706', '#ffffff']);
</script>

<!-- Z2 Right System / Help Drawer -->
<div
	class="coach-tac-z2-drawer-wrap"
	role="complementary"
	aria-label="Command and Help drawer"
>
	<div
		class="coach-tac-z2-drawer tw-w-96 tw-max-w-[90vw] tw-flex tw-flex-col tw-bg-[#0a0a0a]/95 tw-border-l tw-border-[#334155] tw-backdrop-blur-xl tw-shadow-2xl"
		style="transform: translateX({engine.isDrawerOpen ? '0%' : '100%'});"
		aria-hidden={!engine.isDrawerOpen}
	>
		<!-- Header -->
		<div class="coach-tac-z2-header tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-bg-[#0f172a]/90 tw-px-4 tw-py-3">
			<div class="tw-flex tw-items-center tw-gap-2">
				<span class="tw-inline-block tw-h-2.5 tw-w-2.5 tw-bg-[#06b6d4]"></span>
				<h2 class="coach-tac-z2-title tw-m-0 tw-text-xs tw-font-bold tw-tracking-widest tw-text-slate-100 tw-uppercase">
					[ SYS_COMMANDS_&_HELP ]
				</h2>
			</div>
			<button
				type="button"
				class="tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-border tw-border-slate-700 tw-bg-[#0a0a0a] tw-text-slate-400 hover:tw-border-[#06b6d4] hover:tw-text-[#06b6d4] tw-transition-colors"
				onclick={(e) => {
					e.stopPropagation();
					engine.isDrawerOpen = false;
				}}
				title="Close System Drawer"
				aria-label="Close System Drawer"
			>
				✕
			</button>
		</div>

		<!-- Nav Tabs -->
		<div class="tw-grid tw-grid-cols-2 tw-border-b tw-border-[#334155] tw-bg-[#050811] tw-text-[10px] tw-font-bold tw-tracking-wider">
			<button
				type="button"
				class="tw-py-2.5 tw-text-center tw-border-r tw-border-[#334155] tw-transition-colors {activeTab === 'system' ? 'tw-bg-[#0f172a] tw-text-[#06b6d4] tw-border-b-2 tw-border-b-[#06b6d4]' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
				onclick={() => activeTab = 'system'}
			>
				SYSTEM COMMANDS
			</button>
			<button
				type="button"
				class="tw-py-2.5 tw-text-center tw-transition-colors {activeTab === 'help' ? 'tw-bg-[#0f172a] tw-text-[#fbbf24] tw-border-b-2 tw-border-b-[#fbbf24]' : 'tw-text-slate-400 hover:tw-text-slate-200'}"
				onclick={() => activeTab = 'help'}
			>
				HELP & LAWS
			</button>
		</div>

		<!-- Tab Content Body -->
		<div class="tw-flex-1 tw-overflow-y-auto tw-p-5 tw-pt-3 tw-space-y-6">
			{#if activeTab === 'system'}
				<!-- SYSTEM COMMANDS TAB -->
				<section>
					<p class="coach-tac-z2-section-label">ROUTE_SHAPE</p>
					<div class="tw-flex tw-gap-2">
						<button
							type="button"
							class="coach-tac-z2-seg {engine.routeDrawKind === 'curve' ? 'coach-tac-z2-seg--curve-active' : ''}"
							onclick={(e) => {
								e.stopPropagation();
								engine.routeDrawKind = 'curve';
								engine.updateSelectedRouteShape?.('curve');
							}}
							aria-pressed={engine.routeDrawKind === 'curve'}
						>
							[ CURVE ]
						</button>
						<button
							type="button"
							class="coach-tac-z2-seg {engine.routeDrawKind === 'cut' ? 'coach-tac-z2-seg--active' : ''}"
							onclick={(e) => {
								e.stopPropagation();
								engine.routeDrawKind = 'cut';
								engine.updateSelectedRouteShape?.('cut');
							}}
							aria-pressed={engine.routeDrawKind === 'cut'}
						>
							[ CUT ]
						</button>
						<button
							type="button"
							class="coach-tac-z2-seg {engine.routeDrawKind === 'pass' ? 'coach-tac-z2-seg--active' : ''}"
							onclick={(e) => {
								e.stopPropagation();
								engine.routeDrawKind = 'pass';
								engine.updateSelectedRouteShape?.('pass');
							}}
							aria-pressed={engine.routeDrawKind === 'pass'}
						>
							[ PASS ]
						</button>
					</div>
				</section>

				<section>
					<p class="coach-tac-z2-section-label">INK_COLOR</p>
					<div class="tw-flex tw-gap-2.5">
						{#each INK_PALETTE as color (color)}
							<button
								type="button"
								class="coach-tac-z2-ink {engine.activeRouteColor === color ? 'coach-tac-z2-ink--active' : ''}"
								style="--ink-color: {color}; background: {color};"
								onclick={(e) => {
									e.stopPropagation();
									engine.activeRouteColor = color;
									engine.updateSelectedRouteColor?.(color);
								}}
								aria-label="Route color {color}"
								aria-pressed={engine.activeRouteColor === color}
							></button>
						{/each}
					</div>
				</section>

				<section>
					<p class="coach-tac-z2-section-label">BOARD_OPS</p>
					<div class="tw-flex tw-flex-col tw-gap-2">
						<button
							type="button"
							class="coach-tac-z2-seg"
							onclick={(e) => {
								e.stopPropagation();
								engine.injectBall();
							}}
						>
							INJECT_BALL
						</button>
						<button
							type="button"
							class="coach-tac-z2-seg"
							onclick={(e) => {
								e.stopPropagation();
								engine.recallBench();
							}}
						>
							RECALL_BENCH
						</button>
						<button
							type="button"
							class="coach-tac-z2-seg coach-tac-z2-seg--danger"
							onclick={(e) => {
								e.stopPropagation();
								engine.clearPitch?.();
							}}
						>
							CLR_PITCH
						</button>
						<button
							type="button"
							class="coach-tac-z2-seg coach-tac-z2-seg--danger"
							onclick={(e) => {
								e.stopPropagation();
								engine.clearRoutesOnly();
							}}
						>
							CLR_ROUTES
						</button>
					</div>
				</section>

				<section>
					<p class="coach-tac-z2-section-label">SIMULATION</p>
					<div class="tw-flex tw-flex-col tw-gap-2">
						<button
							type="button"
							class="coach-tac-z2-action coach-tac-z2-action--outline"
							onclick={(e) => {
								e.stopPropagation();
								engine.isMistakeActive = true;
							}}
						>
							[ SIM MISTAKE ]
						</button>
					</div>
				</section>

				<!-- Diagnostic Trigger Button -->
				<section class="tw-pt-2 tw-border-t tw-border-slate-800">
					<button
						type="button"
						class="tw-w-full tw-bg-amber-950/40 tw-border tw-border-amber-500/50 tw-text-amber-400 tw-px-3 tw-py-2 tw-text-[10px] tw-font-bold hover:tw-bg-amber-500/20 tw-transition-all"
						onclick={() => {
							engine.isMistakeActive = true;
						}}
					>
						[ SYSTEM_DIAGNOSTIC: INJECT_PATH_DEVIATION ]
					</button>
				</section>

			{:else if activeTab === 'help'}
				<!-- HELP & LAWS TAB -->
				<div class="tw-space-y-6">
					<!-- Section 1: Core Maturation & Positional Blueprint -->
					<div>
						<h4 class="tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-text-xs tw-mb-2">1. Core Maturation & Positional Blueprint</h4>
						<ul class="tw-space-y-2 tw-text-slate-400 tw-text-xs">
							<li><strong class="tw-text-slate-200">CB (Center Back):</strong> Spatial anchor; accelerated tactical orientation (sensitive ages 12–14).</li>
							<li><strong class="tw-text-slate-200">CDM (Defensive Midfielder):</strong> Transition engine; kinesthetic differentiation (sensitive ages 10–11).</li>
							<li><strong class="tw-text-slate-200">LWB (Wing Back):</strong> High-speed overlapping; aligns with agility adaptation (ages 8–13).</li>
							<li><strong class="tw-text-slate-200">ST (Striker):</strong> Peak spatial reaction and synchronization (sensitive ages 6–10).</li>
							<li><strong class="tw-text-slate-200">GK (Goalkeeper):</strong> Visual reactions and upper-body hand-eye coordination.</li>
						</ul>
					</div>

					<!-- Section 2: Pitch Dimensions per Age Group -->
					<div>
						<h4 class="tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-text-xs tw-mb-2">2. Pitch Dimensions per Age Group</h4>
						<ul class="tw-space-y-2 tw-text-slate-400 tw-text-xs">
							<li><strong class="tw-text-slate-200">U6 / U8 (FUNdamentals):</strong> 4v4 (No GK) | 25 × 15 Yards</li>
							<li><strong class="tw-text-slate-200">U10 (Learn to Train):</strong> 7v7 (With GK) | 55 × 35 Yards</li>
							<li><strong class="tw-text-slate-200">U12 (Learn to Train):</strong> 9v9 (With GK) | 75 × 50 Yards</li>
							<li><strong class="tw-text-slate-200">U14+ (Train to Train):</strong> 11v11 | 110 × 70 Yards</li>
						</ul>
					</div>

					<!-- Section 3: Pediatric Safety & Laws -->
					<div>
						<h4 class="tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-text-xs tw-mb-2">3. Pediatric Safety & Laws</h4>
						<ul class="tw-space-y-2 tw-text-slate-400 tw-text-xs">
							<li>Requires a <strong class="tw-text-slate-200">2:1 or 3:1 training-to-competition ratio</strong>.</li>
							<li>Organized training limit: age in hours per week maximum.</li>
							<li>Max 8 months cumulative per year in single sport.</li>
							<li>Minimum 2 complete, consecutive rest days per week.</li>
						</ul>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
