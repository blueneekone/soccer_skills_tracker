<script>
	import TacticalDock from './tactical/hud/TacticalDock.svelte';
	import LeftDrawer from './tactical/hud/LeftDrawer.svelte';
	import CommandDrawer from './tactical/hud/CommandDrawer.svelte';
	import ContextRadial from './tactical/hud/ContextRadial.svelte';

	/** @type {{ model: import('./TacticalEngine.svelte.ts').TacticalWarRoomModel, ondeploy?: (cartridge: import('$lib/states/war-room/types').TacticalCartridge) => void, isHalfField?: boolean, onToggleHalfField?: () => void, onToggleToolbar?: () => void, onExit?: () => void }} */
	let { model, ondeploy, isHalfField, onToggleHalfField, onToggleToolbar, onExit } = $props();

	// ── Deploy sequence — owned here, threaded to Dock (button) and ContextRadial (modal) ──
	let deployPhase = $state(/** @type {'idle' | 'deploying' | 'success'} */ ('idle'));
	let deployProgress = $state(0);
	let deployXpBounty = $state(0);
	let deployCartridgeId = $state('');

	let isLeftDrawerOpen = $state(false);

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
</script>

<!--
  HUD root: full-area overlay at z-10, pointer-events-none so the SVG pitch
  beneath (z-0) remains fully interactive.
  Child components opt back in with pointer-events-auto.
-->
<div class="tactical-hud-panel tw-pointer-events-none tw-absolute tw-inset-0 tw-z-10 tw-overflow-hidden" style="border-radius: 0px;">
	<!-- Top Bar Floating Action Deck -->
	<div class="tw-pointer-events-auto tw-absolute tw-top-3 tw-left-3 tw-z-30 tw-flex tw-items-center tw-gap-2">
		<!-- [ TOOLS & ROSTER ] Trigger Button -->
		<button
			type="button"
			class="tw-bg-[#0a0a0a]/90 tw-border tw-border-slate-800 tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs {isLeftDrawerOpen ? 'tw-border-[#daff0a] tw-text-[#daff0a]' : 'tw-text-slate-300 hover:tw-border-[#daff0a] hover:tw-text-[#daff0a]'} active:tw-scale-[0.98] tw-transition-all"
			style="border-radius: 0px;"
			onclick={() => { isLeftDrawerOpen = !isLeftDrawerOpen; }}
			title="Toggle Tools & Roster Slide-Out"
			aria-label="Toggle Tools & Roster"
		>
			[ ⚡ TOOLS & ROSTER ]
		</button>
	</div>

	<div class="tw-pointer-events-auto tw-absolute tw-top-3 tw-right-3 tw-z-30 tw-flex tw-items-center tw-gap-2">
		<!-- [ SYS.MENU & HELP ] Trigger Button -->
		<button
			type="button"
			class="tw-bg-[#0a0a0a]/90 tw-border tw-border-slate-800 tw-px-3 tw-py-1.5 tw-font-mono tw-text-xs {model.isDrawerOpen ? 'tw-border-[#06b6d4] tw-text-[#06b6d4]' : 'tw-text-slate-300 hover:tw-border-[#06b6d4] hover:tw-text-[#06b6d4]'} active:tw-scale-[0.98] tw-transition-all"
			style="border-radius: 0px;"
			onclick={() => { model.isDrawerOpen = !model.isDrawerOpen; }}
			title="Toggle System Menu and Help Drawer"
			aria-label="Toggle System Menu and Help Drawer"
		>
			[ ⚙ SYS.MENU & HELP ]
		</button>
	</div>

	<!-- Left Slide-Out Drawer (Tools, Roster, Drill Info) -->
	<LeftDrawer
		{model}
		isOpen={isLeftDrawerOpen}
		onClose={() => isLeftDrawerOpen = false}
	/>

	<!-- Right Slide-Out Drawer (System Commands & Help/Laws) -->
	<CommandDrawer {model} />

	<!-- Bottom Tray / Tactical Dock with Integrated Exit Button -->
	<TacticalDock
		{model}
		{deployPhase}
		onDeploy={handleDeploy}
		{isHalfField}
		{onToggleHalfField}
		{onToggleToolbar}
		{isLeftDrawerOpen}
		onToggleLeftDrawer={() => isLeftDrawerOpen = !isLeftDrawerOpen}
		{onExit}
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
