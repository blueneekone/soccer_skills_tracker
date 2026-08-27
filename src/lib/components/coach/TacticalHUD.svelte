<script>
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import TacticalDock from './tactical/hud/TacticalDock.svelte';
	import TacticsHubDrawer from './tactical/hud/TacticsHubDrawer.svelte';
	import ContextRadial from './tactical/hud/ContextRadial.svelte';
	import DrillDesignerOverlay from './tactical/hud/DrillDesignerOverlay.svelte';

	/** @type {{ model: import('./TacticalEngine.svelte.ts').TacticalWarRoomModel, ondeploy?: (cartridge: import('$lib/states/war-room/types').TacticalCartridge) => void, isHalfField?: boolean, onToggleHalfField?: () => void, onToggleToolbar?: () => void, onExit?: () => void }} */
	let { model, ondeploy, isHalfField, onToggleHalfField, onToggleToolbar, onExit } = $props();

	// ── Deploy sequence — owned here, threaded to Dock (button) and ContextRadial (modal) ──
	let deployPhase = $state(/** @type {'idle' | 'deploying' | 'success'} */ ('idle'));
	let deployProgress = $state(0);
	let deployXpBounty = $state(0);
	let deployCartridgeId = $state('');

	let isTacticsHubOpen = $state(false);
	let isDrillDesignerOpen = $state(false);

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
		const duration = 1200;
		const tacticId = cartridge.id;

		function step() {
			deployProgress = Math.min(1, (performance.now() - start) / duration);
			if (deployProgress < 1) {
				requestAnimationFrame(step);
			} else {
				setTimeout(() => {
					deployPhase = 'success';
					// Navigate to Drill Designer with the tactic pre-loaded
					setTimeout(() => {
						untrack(() => {
							goto(`/coach/forge?tab=designer&tacticId=${encodeURIComponent(tacticId)}`);
						});
					}, 600);
				}, 180);
			}
		}
		requestAnimationFrame(step);
	}

	function closeDeploy() {
		deployPhase = 'idle';
		deployProgress = 0;
	}
</script>

<!--
  HUD root: full-area overlay at z-10, pointer-events-none so the SVG pitch
  beneath (z-0) remains fully interactive.
  Child components opt back in with pointer-events-auto.
-->
<div class="tactical-hud-panel tw-pointer-events-none tw-absolute tw-inset-0 tw-z-10 tw-overflow-hidden" style="border-radius: 0px;">
	<!-- Top Bar Floating Action Deck -->
	<div class="tw-pointer-events-auto tw-absolute tw-top-3 tw-left-3 tw-z-30 tw-flex tw-items-center tw-gap-2">
		<!-- Tactical Hub Trigger Button -->
		<button
			type="button"
			class="tw-bg-[#030712]/90 tw-backdrop-blur-md tw-border tw-border-slate-700/80 tw-px-3.5 tw-py-2 tw-font-mono tw-text-xs tw-font-semibold tw-tracking-wide {isTacticsHubOpen ? 'tw-bg-teal-950/70 tw-border-teal-500/80 tw-text-teal-300 tw-shadow-[0_0_15px_rgba(20,184,166,0.3)]' : 'tw-text-slate-200 hover:tw-text-white hover:tw-border-slate-500 hover:tw-bg-slate-800/80'} active:tw-scale-[0.98] tw-transition-all tw-rounded-xl tw-shadow-xl tw-flex tw-items-center tw-gap-2"
			onclick={() => { isTacticsHubOpen = !isTacticsHubOpen; }}
			title="Toggle Tactics Hub Drawer"
			aria-label="Toggle Tactics Hub Drawer"
		>
			<span class="tw-h-2 tw-w-2 tw-rounded-full {isTacticsHubOpen ? 'tw-bg-teal-400 tw-shadow-[0_0_8px_#2dd4bf]' : 'tw-bg-slate-500'}"></span>
			<span>Tactical Hub</span>
		</button>
	</div>

	<TacticsHubDrawer
		{model}
		isOpen={isTacticsHubOpen}
		onClose={() => isTacticsHubOpen = false}
	/>

	<!-- Bottom Tray / Tactical Dock with Integrated Exit Button -->
	<TacticalDock
		{model}
		{deployPhase}
		onDeploy={() => isDrillDesignerOpen = true}
		{isHalfField}
		{onToggleHalfField}
		{onToggleToolbar}
		isTacticsHubOpen={isTacticsHubOpen}
		onToggleTacticsHub={() => isTacticsHubOpen = !isTacticsHubOpen}
		{onExit}
	/>

	<DrillDesignerOverlay
		isOpen={isDrillDesignerOpen}
		onClose={() => isDrillDesignerOpen = false}
		onMistakeTrigger={() => model.isMistakeActive = true}
		onFinalizeDeploy={() => {
			isDrillDesignerOpen = false;
			handleDeploy();
		}}
	/>

	<!-- Deployed Drill Radial Modal -->
	<ContextRadial
		{deployPhase}
		{deployProgress}
		{deployXpBounty}
		{deployCartridgeId}
		onClose={closeDeploy}
	/>
</div>
