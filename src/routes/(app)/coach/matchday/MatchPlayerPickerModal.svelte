<script lang="ts">
	import type { MatchDayPlayer } from '$lib/services/coach/MatchDayTelemetry.svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		open?: boolean;
		statType?: string;
		roster?: MatchDayPlayer[];
		onSelectPlayer?: (playerId: string) => void;
		onSelectUnassigned?: () => void;
		onClose?: () => void;
	}

	let {
		open = false,
		statType = 'GOAL',
		roster = [],
		onSelectPlayer = () => {},
		onSelectUnassigned = () => {},
		onClose = () => {},
	}: Props = $props();

	const displayStat = $derived.by(() => {
		switch (statType) {
			case 'GOAL': return '⚽ GOAL';
			case 'ASSIST': return '👟 ASSIST';
			case 'SHOT':
			case 'SHOT_ON_TARGET': return '🎯 SHOT';
			case 'TACKLE':
			case 'TACKLE_WON': return '🛡️ TACKLE';
			case 'SAVE': return '🧤 SAVE';
			case 'FOUL': return '⚠️ FOUL';
			case 'YELLOW_CARD': return '🟨 YELLOW CARD';
			case 'RED_CARD': return '🟥 RED CARD';
			default: return statType;
		}
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-items-center tw-justify-center tw-p-4 tw-bg-black/80 tw-backdrop-blur-sm"
		role="presentation"
		transition:fade={{ duration: 120 }}
		onclick={onClose}
	>
		<!-- Modal Container -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="tw-relative tw-w-full tw-max-w-lg tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-p-5 tw-shadow-2xl"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			style="border-radius: 0px;"
			transition:fly={{ y: 20, duration: 200, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4">
				<div class="tw-flex tw-items-center tw-gap-2.5">
					<span class="tw-w-2.5 tw-h-2.5 tw-bg-[#daff0a]"></span>
					<h3 class="tw-font-mono tw-text-sm tw-font-black tw-text-white tw-uppercase tw-tracking-wider tw-m-0">
						ATTRIBUTE {displayStat} TO ATHLETE
					</h3>
				</div>
				<button
					type="button"
					onclick={onClose}
					class="tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-xs tw-px-2 tw-py-1"
				>
					✕
				</button>
			</div>

			<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-mb-3">
				Select the squad athlete who performed this action:
			</p>

			<!-- Roster Grid -->
			<div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-2 tw-max-h-64 tw-overflow-y-auto tw-mb-4">
				{#each roster as player (player.id)}
					<button
						type="button"
						class="tw-flex tw-items-center tw-justify-between tw-p-2.5 tw-bg-[#0f172a] hover:tw-bg-[#14b8a6]/20 tw-border tw-border-[#334155] hover:tw-border-[#14b8a6] tw-text-left tw-transition-all active:tw-scale-[0.98] tw-cursor-pointer"
						style="border-radius: 0px;"
						onclick={() => onSelectPlayer(player.id)}
					>
						<div class="tw-flex tw-items-center tw-gap-2.5 tw-min-w-0">
							<span class="tw-font-mono tw-text-xs tw-font-black tw-text-[#daff0a]">
								{player.jersey ? `#${player.jersey}` : player.initials}
							</span>
							<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-slate-200 tw-truncate">
								{player.name}
							</span>
						</div>
						{#if player.position}
							<span class="tw-font-mono tw-text-[10px] tw-text-slate-500 tw-uppercase">
								{player.position}
							</span>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Footer with unassigned option -->
			<div class="tw-flex tw-items-center tw-justify-between tw-border-t tw-border-[#334155] tw-pt-3">
				<button
					type="button"
					onclick={onSelectUnassigned}
					class="tw-font-mono tw-text-xs tw-text-slate-400 hover:tw-text-white tw-underline tw-bg-transparent tw-border-none tw-cursor-pointer"
				>
					Log as Unassigned Team Stat
				</button>
				<button
					type="button"
					onclick={onClose}
					class="tw-px-3 tw-py-1.5 tw-bg-[#0f172a] hover:tw-bg-slate-800 tw-border tw-border-[#334155] tw-text-slate-300 tw-font-mono tw-text-xs tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
