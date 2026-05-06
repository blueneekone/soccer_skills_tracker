<script>
	/** @type {{ model: import('$lib/components/coach/TacticalEngine.svelte.ts').TacticalWarRoomModel }} */
	let { model } = $props();

	const INK_PALETTE = /** @type {const} */ (['#00f0ff', '#ff00ff', '#ffff00', '#ffffff']);

	const segBtn =
		'tw-w-full tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/30 tw-px-3 tw-py-2.5 tw-text-left tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-[0.14em] tw-text-white/55 tw-transition-colors hover:tw-border-[#00f0ff]/35 hover:tw-text-[#00f0ff]';
	const segBtnOn = 'tw-border-[#00f0ff]/50 !tw-bg-[#00f0ff]/10 !tw-text-[#00f0ff]';
</script>

<!--
  Drawer toggle tab — right edge of the arena, always visible through the
  pointer-events-none HUD shell.
-->
<button
	type="button"
	class="tw-pointer-events-auto tw-absolute tw-right-0 tw-top-[42%] -tw-translate-y-1/2 tw-z-30 tw-flex tw-h-16 tw-w-6 tw-items-center tw-justify-center tw-rounded-l-lg tw-border tw-border-r-0 tw-border-[#00f0ff]/25 tw-bg-[#020202]/90 tw-backdrop-blur-xl tw-text-[#00f0ff]/50 tw-transition-all hover:tw-border-[#00f0ff]/50 hover:tw-text-[#00f0ff] hover:tw-shadow-[-4px_0_16px_rgba(0,240,255,0.14)]"
	onclick={() => (model.isDrawerOpen = !model.isDrawerOpen)}
	aria-label={model.isDrawerOpen ? 'Close command drawer' : 'Open command drawer'}
	aria-expanded={model.isDrawerOpen}
>
	<!-- Rotated label pill -->
	<span class="tw-font-mono tw-text-[8px] tw-font-bold tw-tracking-widest [writing-mode:vertical-rl] tw-select-none">
		{model.isDrawerOpen ? '▶' : '◀'}
	</span>
</button>

<!--
  Slide-in drawer panel. Translates fully off-screen right when closed;
  the parent HUD has overflow-hidden so it is clipped cleanly.
-->
<div
	class="tw-pointer-events-auto tw-absolute tw-right-0 tw-top-0 tw-h-full tw-w-72 tw-border-l tw-border-[#00f0ff]/18 tw-bg-[#020202]/96 tw-backdrop-blur-2xl tw-overflow-y-auto tw-overflow-x-hidden tw-transition-transform tw-duration-300 tw-ease-[cubic-bezier(0.23,1,0.32,1)]
		{model.isDrawerOpen ? 'tw-translate-x-0' : 'tw-translate-x-full'}"
	aria-hidden={!model.isDrawerOpen}
>
	<!-- Neon left-edge glow line -->
	<div
		class="tw-pointer-events-none tw-absolute tw-inset-y-0 tw-left-0 tw-w-px tw-bg-gradient-to-b tw-from-transparent tw-via-[#00f0ff]/35 tw-to-transparent"
		aria-hidden="true"
	></div>

	<!-- Panel header -->
	<div
		class="tw-sticky tw-top-0 tw-z-10 tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#00f0ff]/15 tw-bg-[#020202]/90 tw-px-5 tw-py-4 tw-backdrop-blur-xl"
	>
		<span class="tw-font-mono tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-[#00f0ff]/65">
			COMMAND_CONSOLE
		</span>
		<button
			type="button"
			class="tw-flex tw-h-6 tw-w-6 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-white/10 tw-font-mono tw-text-[11px] tw-text-white/35 tw-transition-colors hover:tw-border-white/30 hover:tw-text-white/75"
			onclick={() => (model.isDrawerOpen = false)}
			aria-label="Close command drawer"
		>✕</button>
	</div>

	<!-- Scrollable content -->
	<div class="tw-space-y-6 tw-p-5">

		<!-- ROUTE_SHAPE -->
		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/28">
				ROUTE_SHAPE
			</p>
			<div class="tw-flex tw-gap-2">
				<button
					type="button"
					class="{segBtn} {model.routeDrawKind === 'curve' ? segBtnOn : ''}"
					onclick={() => (model.routeDrawKind = 'curve')}
					aria-pressed={model.routeDrawKind === 'curve'}
				>CURVE</button>
				<button
					type="button"
					class="{segBtn} {model.routeDrawKind === 'cut' ? segBtnOn : ''}"
					onclick={() => (model.routeDrawKind = 'cut')}
					aria-pressed={model.routeDrawKind === 'cut'}
				>CUT</button>
			</div>
		</section>

		<!-- INK_COLOR -->
		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/28">
				INK_COLOR
			</p>
			<div class="tw-flex tw-gap-2">
				{#each INK_PALETTE as color (color)}
					<button
						type="button"
						class="tw-h-7 tw-flex-1 tw-skew-x-[-12deg] tw-border tw-transition-all
							{model.activeRouteColor === color
								? 'tw-scale-105 tw-border-white tw-shadow-[0_0_10px_var(--ink)]'
								: 'tw-border-white/20 hover:tw-border-[#00f0ff]/50'}"
						style="background:{color}; --ink:{color};"
						onclick={() => (model.activeRouteColor = color)}
						aria-label="Route color {color}"
						aria-pressed={model.activeRouteColor === color}
					></button>
				{/each}
			</div>
		</section>

		<!-- VIEW -->
		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/28">
				VIEW
			</p>
			<div class="tw-flex tw-flex-col tw-gap-2">
				<button
					type="button"
					class="{segBtn} {model.showLabels ? segBtnOn : ''}"
					onclick={() => (model.showLabels = !model.showLabels)}
					aria-pressed={model.showLabels}
				>SHOW_LABELS</button>
				<button
					type="button"
					class="tw-w-full tw-rounded-lg tw-border tw-px-3 tw-py-2.5 tw-text-left tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-[0.14em] tw-transition-colors
						{model.isHolotableMode
							? 'tw-border-[#ff003c]/50 tw-bg-[#ff003c]/10 tw-text-[#ff003c]'
							: 'tw-border-white/10 tw-bg-black/30 tw-text-white/55 hover:tw-border-[#ff003c]/35 hover:tw-text-[#ff003c]'}"
					onclick={() => (model.isHolotableMode = !model.isHolotableMode)}
					aria-pressed={model.isHolotableMode}
				>3D_HOLOTABLE</button>
			</div>
		</section>

		<!-- BOARD_OPS -->
		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/28">
				BOARD_OPS
			</p>
			<div class="tw-flex tw-flex-col tw-gap-2">
				<button
					type="button"
					class={segBtn}
					onclick={model.recallBench}
				>RECALL_BENCH</button>
				<button
					type="button"
					class="tw-w-full tw-rounded-lg tw-border tw-border-white/10 tw-bg-black/30 tw-px-3 tw-py-2.5 tw-text-left tw-font-mono tw-text-[9px] tw-font-bold tw-tracking-[0.14em] tw-text-white/55 tw-transition-colors hover:tw-border-[#ff003c]/35 hover:tw-text-[#ff003c]"
					onclick={model.clearRoutesOnly}
				>CLR_ROUTES</button>
			</div>
		</section>

		<!-- ROSTER (placeholder, future epoch) -->
		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/28">
				ROSTER / BENCH
			</p>
			<div
				class="tw-flex tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-white/6 tw-bg-white/[0.025] tw-px-4 tw-py-6"
			>
				<span class="tw-font-mono tw-text-[8px] tw-text-white/22">ROSTER_PANEL · NEXT_EPOCH</span>
			</div>
		</section>

		<!-- TACTIC_BANK (placeholder) -->
		<section>
			<p class="tw-mb-2.5 tw-font-mono tw-text-[8px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-white/28">
				TACTIC_BANK
			</p>
			<div
				class="tw-flex tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-white/6 tw-bg-white/[0.025] tw-px-4 tw-py-6"
			>
				<span class="tw-font-mono tw-text-[8px] tw-text-white/22">LOAD · SAVE · NEXT_EPOCH</span>
			</div>
		</section>

	</div>
</div>
