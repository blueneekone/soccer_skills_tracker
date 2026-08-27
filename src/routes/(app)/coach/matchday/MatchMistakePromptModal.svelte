<script lang="ts">
	import type { MatchDayPlayer } from '$lib/services/coach/MatchDayTelemetry.svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		open?: boolean;
		roster?: MatchDayPlayer[];
		initialPlayerId?: string;
		onConfirm?: (playerId: string, note: string) => void;
		onClose?: () => void;
	}

	let {
		open = false,
		roster = [],
		initialPlayerId = '',
		onConfirm = () => {},
		onClose = () => {},
	}: Props = $props();

	let selectedPlayerId = $state('');
	let noteText = $state('');

	$effect(() => {
		if (open) {
			selectedPlayerId = initialPlayerId || (roster[0]?.id || '');
			noteText = '';
		}
	});

	const QUICK_TAGS = [
		'Lost runner on set piece',
		'Turnover under high press',
		'Weak clearance into danger',
		'Late challenge / mistimed tackle',
		'Misplaced backpass',
		'Poor body shape / failed scan',
		'Out of defensive shape',
		'Hesitation in final third',
	];

	function applyTag(tag: string) {
		noteText = tag;
	}

	function handleSubmit(e?: Event) {
		if (e) e.preventDefault();
		const finalNote = noteText.trim() || 'Tactical mistake / error';
		onConfirm(selectedPlayerId, finalNote);
	}

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
		class="tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-items-center tw-justify-center tw-p-4 tw-bg-black/85 tw-backdrop-blur-sm"
		role="presentation"
		transition:fade={{ duration: 120 }}
		onclick={onClose}
	>
		<!-- Modal Container -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="tw-relative tw-w-full tw-max-w-md tw-bg-[#080d1a] tw-border tw-border-[#334155] tw-p-5 tw-shadow-2xl"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			style="border-radius: 0px;"
			transition:fly={{ y: 20, duration: 200, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<form onsubmit={handleSubmit}>
			<!-- Header -->
			<div class="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-[#334155] tw-pb-3 tw-mb-4">
				<div class="tw-flex tw-items-center tw-gap-2.5">
					<span class="tw-w-2.5 tw-h-2.5 tw-bg-rose-500"></span>
					<h3 class="tw-font-mono tw-text-sm tw-font-black tw-text-white tw-uppercase tw-tracking-wider tw-m-0">
						⚡ LOG MISTAKE & TACTICAL REMINDER
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

			<p class="tw-font-mono tw-text-xs tw-text-slate-300 tw-mb-4 tw-leading-relaxed">
				Record what happened on the pitch so you have an exact reminder for the post-match debrief and film review.
			</p>

			<!-- Target Player Selector -->
			<div class="tw-mb-4">
				<label for="mistake-player-select" class="tw-block tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-wider tw-mb-1.5">
					Target Athlete
				</label>
				<select
					id="mistake-player-select"
					bind:value={selectedPlayerId}
					class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] focus:tw-border-rose-400 tw-text-white tw-font-mono tw-text-xs tw-px-3 tw-py-2 tw-outline-none"
					style="border-radius: 0px;"
				>
					{#each roster as player}
						<option value={player.id}>
							{player.jersey ? `#${player.jersey} ` : ''}{player.name}
						</option>
					{/each}
					{#if roster.length === 0}
						<option value="">General Squad / Unassigned</option>
					{/if}
				</select>
			</div>

			<!-- Quick-Tag Chips -->
			<div class="tw-mb-4">
				<div class="tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-wider tw-mb-1.5">
					Quick Cue Suggestions
				</div>
				<div class="tw-flex tw-flex-wrap tw-gap-1.5">
					{#each QUICK_TAGS as tag}
						<button
							type="button"
							onclick={() => applyTag(tag)}
							class="tw-font-mono tw-text-[10px] tw-px-2 tw-py-1 tw-border tw-transition-colors tw-cursor-pointer {noteText === tag ? 'tw-bg-rose-950/60 tw-border-rose-500 tw-text-rose-200' : 'tw-bg-[#0f172a] tw-border-[#334155] tw-text-slate-300 hover:tw-border-slate-400'}"
							style="border-radius: 0px;"
						>
							{tag}
						</button>
					{/each}
				</div>
			</div>

			<!-- Reminder Text Input -->
			<div class="tw-mb-5">
				<label for="mistake-note-input" class="tw-block tw-font-mono tw-text-[10px] tw-text-slate-400 tw-uppercase tw-tracking-wider tw-mb-1.5">
					Coach Reminder Note
				</label>
				<textarea
					id="mistake-note-input"
					bind:value={noteText}
					rows="3"
					placeholder="What happened? (e.g. Lost mark on 6-yard box; rushed first touch under pressure)..."
					class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-[#334155] focus:tw-border-rose-400 tw-text-white tw-font-mono tw-text-xs tw-p-2.5 tw-outline-none tw-resize-none"
					style="border-radius: 0px;"
				></textarea>
			</div>

			<!-- Actions -->
			<div class="tw-flex tw-items-center tw-justify-between tw-border-t tw-border-[#334155] tw-pt-3.5">
				<button
					type="button"
					onclick={onClose}
					class="tw-px-3 tw-py-2 tw-bg-transparent hover:tw-bg-slate-800 tw-border tw-border-[#334155] tw-text-slate-400 hover:tw-text-white tw-font-mono tw-text-xs tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					Cancel
				</button>

				<button
					type="submit"
					class="tw-px-4 tw-py-2 tw-bg-rose-950/80 hover:tw-bg-rose-600 tw-border tw-border-rose-500 tw-text-rose-200 hover:tw-text-white tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-all active:tw-scale-95 tw-cursor-pointer"
					style="border-radius: 0px;"
				>
					⚡ Record Reminder
				</button>
			</div>
			</form>
		</div>
	</div>
{/if}
