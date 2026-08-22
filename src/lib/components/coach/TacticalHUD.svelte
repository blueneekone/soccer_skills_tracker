<script>
	import TacticalDock from './tactical/hud/TacticalDock.svelte';
	import CommandDrawer from './tactical/hud/CommandDrawer.svelte';
	import ContextRadial from './tactical/hud/ContextRadial.svelte';

	/** @type {{ model: import('./TacticalEngine.svelte.ts').TacticalWarRoomModel, ondeploy?: (cartridge: import('$lib/states/war-room/types').TacticalCartridge) => void, isHalfField?: boolean, onToggleHalfField?: () => void, onToggleToolbar?: () => void }} */
	let { model, ondeploy, isHalfField, onToggleHalfField, onToggleToolbar } = $props();

	// ── Deploy sequence — owned here, threaded to Dock (button) and ContextRadial (modal) ──
	let deployPhase = $state(/** @type {'idle' | 'deploying' | 'success'} */ ('idle'));
	let deployProgress = $state(0);
	let deployXpBounty = $state(0);
	let deployCartridgeId = $state('');

	function computeXpBounty() {
		const totalDist = model.routesLive.reduce((acc, r) => {
			const chord = Math.hypot(r.x2 - r.x1, r.y2 - r.y1);
			const arms = Math.hypot(r.cx - r.x1, r.cy - r.y1) + Math.hypot(r.x2 - r.cx, r.y2 - r.cy);
			return acc + (chord + arms) / 2;
		}, 0);
		return Math.max(50, Math.round(totalDist / 8) + 50 * Math.max(1, model.routesLive.length));
	}

	function handleDeploy() {
		const cartridge = model.serializeToCartridge();
		deployCartridgeId = cartridge.id.slice(0, 8).toUpperCase();
		deployXpBounty = computeXpBounty();
		deployPhase = 'deploying';
		deployProgress = 0;

		// Persist the deployed play (the page implements the Firestore write).
		void ondeploy?.(cartridge);

		const start = performance.now();
		const duration = 1800;

		function step() {
			deployProgress = Math.min(1, (performance.now() - start) / duration);
			if (deployProgress < 1) {
				requestAnimationFrame(step);
			} else {
				setTimeout(() => { deployPhase = 'success'; }, 180);
			}
		}
		requestAnimationFrame(step);
	}

	function closeDeploy() {
		deployPhase = 'idle';
		deployProgress = 0;
	}

	let isHelpOpen = $state(false);
	let isRosterOpen = $state(true);

	function getPlayerInitials(name) {
		if (!name) return '??';
		const parts = name.trim().split(/\s+/);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	const rosterList = $derived(
		Array.isArray(model?.host?.wrBucketXi) && model.host.wrBucketXi.length > 0
			? model.host.wrBucketXi
			: [
					{ id: 'def_1', name: 'John Smith', position: 'CB' },
					{ id: 'def_2', name: 'Marcus Price', position: 'ST' },
					{ id: 'def_3', name: 'Alex Johnson', position: 'CDM' },
					{ id: 'def_4', name: 'David Lee', position: 'LWB' },
					{ id: 'def_5', name: 'Sam Taylor', position: 'GK' }
				]
	);
</script>

<!--
  HUD root: full-area overlay at z-10, pointer-events-none so the SVG pitch
  beneath (z-0) remains fully interactive.
  overflow-hidden clips CommandDrawer when it translates off-screen right.
  Child components opt back in with pointer-events-auto.
-->
<div class="tactical-hud-panel tw-pointer-events-none tw-absolute tw-inset-0 tw-z-10 tw-overflow-hidden" style="border-radius: 0px;">
	<!-- [ ROSTER ] Toggle Trigger Button -->
	<button
		type="button"
		class="sstracker-roster-trigger-btn tw-pointer-events-auto tw-absolute tw-top-3 tw-left-20 tw-z-30 tw-bg-[#0a0a0a]/90 tw-border tw-border-slate-800 tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs {isRosterOpen ? 'tw-border-[#14b8a6] tw-text-[#14b8a6]' : 'tw-text-slate-400 hover:tw-border-[#14b8a6] hover:tw-text-[#14b8a6]'} active:tw-scale-[0.98] tw-transition-all"
		style="border-radius: 0px;"
		onclick={() => { isRosterOpen = !isRosterOpen; }}
	>
		[ 👥 ROSTER ({rosterList.length}) ]
	</button>

	<!-- Active Team Roster Sidebar (Collapsible Tray) -->
	{#if isRosterOpen}
		<div
			class="sstracker-roster-tray tw-pointer-events-auto tw-absolute tw-top-14 tw-left-4 tw-z-40 tw-w-56 tw-bg-[#0a0a0a]/95 tw-border tw-border-slate-800 tw-p-3 tw-backdrop-blur-xl tw-shadow-2xl"
			style="border-radius: 0px;"
		>
			<div class="tw-text-[11px] tw-font-bold tw-tracking-wider tw-text-slate-400 tw-uppercase tw-mb-2 tw-border-b tw-border-slate-800 tw-pb-1 tw-flex tw-items-center tw-justify-between">
				<span>ACTIVE ROSTER ({rosterList.length})</span>
				<button
					type="button"
					class="tw-text-slate-500 hover:tw-text-white tw-text-xs tw-px-1"
					onclick={() => { isRosterOpen = false; }}
					title="Collapse Roster"
					aria-label="Collapse Roster"
				>
					✕
				</button>
			</div>
			<div class="tw-flex tw-flex-col tw-gap-1.5 tw-max-h-60 tw-overflow-y-auto">
				{#each rosterList as p (p.id)}
					{@const initials = getPlayerInitials(p.name)}
					<div
						class="roster-player-token tw-flex tw-items-center tw-gap-2 tw-bg-slate-900/90 tw-border tw-border-slate-800 tw-px-2 tw-py-1.5 tw-text-xs tw-text-[#d4d4d8] hover:tw-border-[#14b8a6] tw-cursor-grab active:tw-scale-[0.98] tw-transition-all"
						style="border-radius: 0px;"
					>
						<span class="tw-flex tw-items-center tw-justify-center tw-w-6 tw-h-6 tw-bg-[#14b8a6]/20 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-font-bold tw-text-[10px]">
							{initials}
						</span>
						<div class="tw-flex tw-flex-col tw-min-w-0">
							<span class="tw-truncate tw-font-mono tw-text-[11px] tw-text-slate-200">{p.name}</span>
							<span class="tw-text-[9px] tw-font-mono tw-text-slate-500">{p.position || 'MID'}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- [ HUD_HELP ] Console Toggle Button -->
	<button
		type="button"
		class="hud-help-trigger-btn tw-pointer-events-auto tw-absolute tw-top-4 tw-right-36 tw-z-30 tw-bg-[#0a0a0a]/90 tw-border tw-border-slate-800 tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs tw-text-[#06b6d4] hover:tw-border-[#06b6d4] active:tw-scale-[0.98] tw-transition-all"
		style="border-radius: 0px;"
		onclick={() => { isHelpOpen = !isHelpOpen; }}
	>
		[ HUD_HELP ]
	</button>

	<!-- Sliding Help Manual Console -->
	{#if isHelpOpen}
		<div
			class="hud-help-sliding-console tw-pointer-events-auto tw-absolute tw-top-0 tw-right-0 tw-bottom-0 tw-z-40 tw-w-96 tw-bg-[#0a0a0a]/95 tw-border-l tw-border-slate-800 tw-p-6 tw-overflow-y-auto tw-font-mono tw-text-xs tw-text-slate-300 tw-backdrop-blur-xl"
			style="border-radius: 0px;"
		>
			<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-slate-800 tw-pb-3 tw-mb-4">
				<span class="tw-font-bold tw-text-sm tw-text-[#06b6d4]">[ HUD_HELP ] MANUAL & LAWS</span>
				<button
					type="button"
					class="tw-text-slate-500 hover:tw-text-white tw-px-2"
					onclick={() => { isHelpOpen = false; }}
				>
					✕
				</button>
			</div>

			<!-- Section 1: Core Maturation & Positional Blueprint -->
			<div class="tw-mb-6">
				<h4 class="tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-mb-2">1. Core Maturation & Positional Blueprint</h4>
				<ul class="tw-space-y-2 tw-text-slate-400">
					<li><strong class="tw-text-slate-200">CB (Center Back):</strong> Spatial anchor; requires accelerated tactical orientation (sensitive period ages 12–14).</li>
					<li><strong class="tw-text-slate-200">CDM (Defensive Midfielder):</strong> Transition engine; demands optimal kinesthetic differentiation (sensitive period ages 10–11).</li>
					<li><strong class="tw-text-slate-200">LWB (Wing Back):</strong> High-speed overlapping; aligns with early agility adaptation (ages 8–13).</li>
					<li><strong class="tw-text-slate-200">ST (Striker):</strong> Peak spatial reaction and synchronization (sensitive period ages 6–10).</li>
					<li><strong class="tw-text-slate-200">GK (Goalkeeper):</strong> Exceptional visual reactions and upper-body coordination.</li>
				</ul>
			</div>

			<!-- Section 2: Pitch Dimensions per Age Group -->
			<div class="tw-mb-6">
				<h4 class="tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-mb-2">2. Pitch Dimensions per Age Group</h4>
				<ul class="tw-space-y-2 tw-text-slate-400">
					<li><strong class="tw-text-slate-200">U6 / U8 (FUNdamentals Stage):</strong> 4v4 (No GK) | 25 x 15 Yards</li>
					<li><strong class="tw-text-slate-200">U10 (Learn to Train Stage):</strong> 7v7 (With GK) | 55 x 35 Yards</li>
					<li><strong class="tw-text-slate-200">U12 (Learn to Train Stage):</strong> 9v9 (With GK) | 75 x 50 Yards</li>
					<li><strong class="tw-text-slate-200">U14+ (Train to Train Stage):</strong> 11v11 | 110 x 70 Yards</li>
				</ul>
			</div>

			<!-- Section 3: Pediatric Safety & Laws -->
			<div class="tw-mb-6">
				<h4 class="tw-text-[#fbbf24] tw-font-bold tw-uppercase tw-mb-2">3. Pediatric Safety & Laws</h4>
				<ul class="tw-space-y-2 tw-text-slate-400">
					<li>Requires a <strong class="tw-text-slate-200">2:1 or 3:1 training-to-competition ratio</strong>.</li>
					<li>Organized training limit: age in hours per week max.</li>
					<li>Max 8 months cumulative per year in single sport.</li>
					<li>Minimum 2 complete, consecutive days off per week.</li>
				</ul>
			</div>

			<!-- Diagnostic Trigger Button -->
			<div class="tw-pt-4 tw-border-t tw-border-slate-800">
				<button
					type="button"
					class="tw-w-full tw-bg-amber-950/40 tw-border tw-border-amber-500/50 tw-text-amber-400 tw-px-3 tw-py-2 tw-text-[10px] tw-font-bold hover:tw-bg-amber-500/20 tw-transition-all"
					style="border-radius: 0px;"
					onclick={() => {
						model.isMistakeActive = true;
					}}
				>
					[ SYSTEM_DIAGNOSTIC: INJECT_PATH_DEVIATION ]
				</button>
			</div>
		</div>
	{/if}

	<TacticalDock {model} {deployPhase} onDeploy={handleDeploy} {isHalfField} {onToggleHalfField} {onToggleToolbar} />
	<CommandDrawer {model} />
	<ContextRadial
		{deployPhase}
		{deployProgress}
		{deployXpBounty}
		{deployCartridgeId}
		onClose={closeDeploy}
	/>
</div>
