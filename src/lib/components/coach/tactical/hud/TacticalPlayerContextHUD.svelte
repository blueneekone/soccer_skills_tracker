<script lang="ts">
	import type { TacticalToken } from '$lib/states/war-room/types.js';

	interface Props {
		open: boolean;
		pos: { x: number; y: number } | null;
		player: TacticalToken | null;
		availableRoster?: TacticalToken[];
		onSwap?: (player: TacticalToken) => void;
		onUpdatePosition?: (position: string) => void;
		onToggleSide?: () => void;
		onClearRoutes?: () => void;
		onBench?: () => void;
		onClose?: () => void;
	}

	let {
		open = false,
		pos = null,
		player = null,
		availableRoster = [],
		onSwap,
		onUpdatePosition,
		onToggleSide,
		onClearRoutes,
		onBench,
		onClose,
	}: Props = $props();

	const ROLES = ['ST', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'LB', 'CB', 'RB', 'GK'];

	// Calculate bounded screen position
	let leftPx = $derived(pos ? Math.max(16, Math.min(window.innerWidth - 320, pos.x + 20)) : 0);
	let topPx = $derived(pos ? Math.max(70, Math.min(window.innerHeight - 380, pos.y - 40)) : 0);

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose?.();
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open && player && pos}
	<!-- Backdrop capture to dismiss cleanly on outside click -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="tw-fixed tw-inset-0 tw-z-[200] tw-bg-black/20"
		onclick={() => onClose?.()}
	></div>

	<div
		class="tactical-hud-card tw-fixed tw-z-[201] tw-w-72 tw-bg-[#020617]/95 tw-backdrop-blur-md tw-border tw-border-[#334155] tw-rounded-xl tw-p-3.5 tw-font-mono tw-text-white tw-shadow-[0_10px_35px_rgba(0,0,0,0.85)] tw-transition-all tw-animate-in tw-fade-in tw-zoom-in-95 tw-duration-150"
		style="left: {leftPx}px; top: {topPx}px;"
		role="dialog"
		aria-label="Tactical Athlete Context Menu"
	>
		<!-- Header -->
		<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-slate-800 tw-pb-2.5 tw-mb-3">
			<div class="tw-flex tw-items-center tw-gap-2.5 tw-min-w-0">
				<div
					class="tw-w-8 tw-h-8 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-font-black tw-text-xs tw-shrink-0 tw-border"
					style="background: {player.side === 'opponent' ? '#fbbf24' : '#14b8a6'}; color: #020617; border-color: {player.side === 'opponent' ? '#f59e0b' : '#0d9488'};"
				>
					{player.number || (player.name ? player.name.slice(0, 2).toUpperCase() : 'PL')}
				</div>
				<div class="tw-min-w-0">
					<h4 class="tw-m-0 tw-text-xs tw-font-bold tw-text-white tw-truncate">{player.name}</h4>
					<span class="tw-text-[10px] tw-tracking-wider tw-uppercase" style="color: {player.side === 'opponent' ? '#fbbf24' : '#14b8a6'};">
						{player.side === 'opponent' ? 'Opponent Marker' : 'Active Friendly'}
					</span>
				</div>
			</div>
			<button
				type="button"
				class="tw-text-slate-400 hover:tw-text-white tw-text-xs tw-px-1.5 tw-py-0.5 tw-rounded hover:tw-bg-slate-800 tw-transition-colors"
				onclick={() => onClose?.()}
			>
				✕
			</button>
		</div>

		<!-- Section 1.5: Mission Control Link -->
		<div class="tw-mb-3">
			<a
				href="/coach/dashboard?player={player.id}"
				class="tw-w-full tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a] hover:tw-bg-[#14b8a6]/20 tw-border tw-border-[#14b8a6]/50 hover:tw-border-[#14b8a6] tw-rounded tw-px-2.5 tw-py-2 tw-text-xs tw-text-[#14b8a6] hover:tw-text-[#daff0a] tw-transition-all tw-no-underline"
			>
				<span class="tw-font-bold tw-uppercase tw-tracking-widest">📊 Mission Control Stats</span>
				<span>↗</span>
			</a>
		</div>

		<!-- Section 1: Quick Swap Athlete -->
		<div class="tw-mb-3">
			<div class="tw-block tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-wider tw-mb-1.5">
				Swap Athlete on Pitch
			</div>
			<div class="tw-max-h-24 tw-overflow-y-auto tw-border tw-border-slate-800 tw-rounded tw-bg-[#05050a] st-scrollbar">
				{#each availableRoster as r (r.id)}
					{#if r.id !== player.id}
						<button
							type="button"
							class="tw-w-full tw-flex tw-items-center tw-justify-between tw-px-2 tw-py-1.5 tw-text-left tw-text-xs tw-text-slate-300 hover:tw-bg-slate-800 hover:tw-text-white tw-border-b tw-border-slate-800/50 last:tw-border-0 tw-transition-colors"
							onclick={(e) => {
								e.stopPropagation();
								onSwap?.(r);
								onClose?.();
							}}
						>
							<span>#{r.number || '—'} {r.name}</span>
							<span class="tw-text-[9px] tw-text-slate-500">{r.position || '—'}</span>
						</button>
					{/if}
				{/each}
				{#if availableRoster.length <= 1}
					<div class="tw-px-2 tw-py-2 tw-text-[10px] tw-text-slate-500 tw-text-center tw-italic">
						No other athletes available.
					</div>
				{/if}
			</div>
		</div>

		<!-- Section 2: Position Quick-Pills -->
		<div class="tw-mb-3">
			<span class="tw-block tw-text-[10px] tw-font-bold tw-text-slate-400 tw-uppercase tw-tracking-wider tw-mb-1.5">
				Tactical Role / Position
			</span>
			<div class="tw-grid tw-grid-cols-5 tw-gap-1">
				{#each ROLES as role}
					<button
						type="button"
						class="tw-py-1 tw-px-1 tw-text-[10px] tw-font-bold tw-border tw-rounded tw-transition-all {player.position === role ? 'tw-bg-[#daff0a] tw-text-[#020617] tw-border-[#daff0a] tw-shadow-[0_0_8px_#daff0a]' : 'tw-bg-[#0f172a] tw-border-slate-800 tw-text-slate-300 hover:tw-border-slate-600 hover:tw-text-white'}"
						onclick={() => {
							onUpdatePosition?.(role);
							onClose?.();
						}}
					>
						{role}
					</button>
				{/each}
			</div>
		</div>

		<!-- Section 3: Actions -->
		<div class="tw-border-t tw-border-slate-800 tw-pt-2.5 tw-flex tw-flex-col tw-gap-1.5">
			<button
				type="button"
				class="tw-w-full tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a] hover:tw-bg-[#1e293b] tw-border tw-border-slate-800 tw-rounded tw-px-2.5 tw-py-1.5 tw-text-xs tw-text-slate-200 hover:tw-text-white tw-transition-colors"
				onclick={() => {
					onToggleSide?.();
					onClose?.();
				}}
			>
				<span>Toggle Team Side</span>
				<span class="tw-text-[10px] tw-font-bold" style="color: {player.side === 'opponent' ? '#14b8a6' : '#fbbf24'};">
					➔ {player.side === 'opponent' ? 'Make Friendly' : 'Make Opponent'}
				</span>
			</button>

			<button
				type="button"
				class="tw-w-full tw-flex tw-items-center tw-justify-between tw-bg-[#0f172a] hover:tw-bg-[#1e293b] tw-border tw-border-slate-800 tw-rounded tw-px-2.5 tw-py-1.5 tw-text-xs tw-text-slate-200 hover:tw-text-white tw-transition-colors"
				onclick={() => {
					onClearRoutes?.();
					onClose?.();
				}}
			>
				<span>Clear Athlete Routes</span>
				<span class="tw-text-[10px] tw-text-amber-400 tw-font-bold">✕ Clear</span>
			</button>

			<button
				type="button"
				class="tw-w-full tw-flex tw-items-center tw-justify-between tw-bg-red-950/30 hover:tw-bg-red-950/60 tw-border tw-border-red-900/60 tw-rounded tw-px-2.5 tw-py-1.5 tw-text-xs tw-text-red-300 hover:tw-text-red-200 tw-transition-colors"
				onclick={() => {
					onBench?.();
					onClose?.();
				}}
			>
				<span>Recall to Bench</span>
				<span class="tw-text-[10px] tw-font-bold tw-text-red-400">⌫ Bench</span>
			</button>
		</div>
	</div>
{/if}

<style>
	.tactical-hud-card {
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.75), 0 0 15px rgba(20, 184, 166, 0.15);
	}
</style>
