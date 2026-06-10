<script>
	import TacticalDock from './tactical/hud/TacticalDock.svelte';
	import CommandDrawer from './tactical/hud/CommandDrawer.svelte';
	import ContextRadial from './tactical/hud/ContextRadial.svelte';

	/** @type {{ model: import('./TacticalEngine.svelte.ts').TacticalWarRoomModel, ondeploy?: (cartridge: import('$lib/states/war-room/types').TacticalCartridge) => void }} */
	let { model, ondeploy } = $props();

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
</script>

<!--
  HUD root: full-area overlay at z-10, pointer-events-none so the SVG pitch
  beneath (z-0) remains fully interactive.
  overflow-hidden clips CommandDrawer when it translates off-screen right.
  Child components opt back in with pointer-events-auto.
-->
<div class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-10 tw-overflow-hidden">
	<TacticalDock {model} {deployPhase} onDeploy={handleDeploy} />
	<CommandDrawer {model} />
	<ContextRadial
		{deployPhase}
		{deployProgress}
		{deployXpBounty}
		{deployCartridgeId}
		onClose={closeDeploy}
	/>
</div>
