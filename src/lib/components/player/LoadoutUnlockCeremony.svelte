<script lang="ts">
	import { goto } from '$app/navigation';
	import OperativeLoadoutPreview from '$lib/components/player/OperativeLoadoutPreview.svelte';
	import { getLoadoutCatalog } from '$lib/gamification/loadoutSchema.js';
	import { ceremonyOnCosmeticUnlock } from '$lib/services/dopamine.svelte.js';
	import {
		completeActiveLoadoutCeremony,
		loadoutUnlockQueue,
	} from '$lib/services/loadoutUnlocks.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let {
		playerEmail = '',
		operativeAvatar = undefined,
		operativeLoadout = undefined,
		ownedCosmetics = /** @type {string[]} */ ([]),
	} = $props();

	const active = $derived(loadoutUnlockQueue.active);
	const catalogById = $derived(new Map(getLoadoutCatalog().map((row) => [row.id, row])));

	const activeMeta = $derived.by(() => {
		if (!active) return null;
		const row = catalogById.get(active.cosmeticId);
		return {
			cosmeticId: active.cosmeticId,
			label: row?.label ?? active.cosmeticId.replace(/_/g, ' '),
			slot: row?.slot ?? 'border',
			replay: active.replay === true,
		};
	});

	const previewLoadout = $derived.by(() => {
		if (!activeMeta) return operativeLoadout;
		const base =
			operativeLoadout && typeof operativeLoadout === 'object' ?
				{ .../** @type {Record<string, unknown>} */ (operativeLoadout) }
			:	{ v: 1, equipped: {} };
		const equipped = {
			...(/** @type {Record<string, unknown>} */ (base).equipped ?? {}),
			[activeMeta.slot]: activeMeta.cosmeticId,
		};
		return { ...base, equipped };
	});

	const previewOwned = $derived.by(() => {
		if (!activeMeta) return ownedCosmetics;
		return Array.from(new Set([...ownedCosmetics, activeMeta.cosmeticId]));
	});

	let lastCelebratedId = '';

	$effect(() => {
		const item = active;
		if (!item) {
			lastCelebratedId = '';
			return;
		}
		const sig = `${item.cosmeticId}:${item.replay ? 'replay' : 'new'}`;
		if (sig === lastCelebratedId) return;
		lastCelebratedId = sig;
		void ceremonyOnCosmeticUnlock();
	});

	function dismiss() {
		const email = playerEmail || authStore.user?.email || '';
		completeActiveLoadoutCeremony(String(email).toLowerCase());
	}

	function equipInStudio() {
		if (!activeMeta) return;
		dismiss();
		void goto(`/player/armory?tab=studio&slot=${encodeURIComponent(activeMeta.slot)}`);
	}
</script>

{#if activeMeta}
	<div class="luc-backdrop player-dossier-root" role="presentation">
		<div
			class="luc-modal pd-glass-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby="loadout-unlock-title"
		>
			<p class="luc-eyebrow pd-label">Gear unlocked</p>
			<h2 id="loadout-unlock-title" class="luc-title">
				{activeMeta.replay ? 'Replay' : 'New gear earned'}: {activeMeta.label}
			</h2>
			<p class="luc-copy">
				{activeMeta.replay ?
					'Review your earned loadout piece. Equip it in Studio whenever you are ready.'
				:	'Your coach or training path verified this unlock. It is now part of your Armory collection.'}
			</p>

			<div class="luc-preview">
				<OperativeLoadoutPreview
					{operativeAvatar}
					operativeLoadout={previewLoadout}
					ownedCosmetics={previewOwned}
					size={128}
				/>
			</div>

			<div class="luc-actions">
				<button type="button" class="luc-btn luc-btn--gold" onclick={equipInStudio}>
					Equip in Studio
				</button>
				<button type="button" class="luc-btn luc-btn--ghost" onclick={dismiss}>Dismiss</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.luc-backdrop {
		position: fixed;
		inset: 0;
		z-index: 12000;
		display: grid;
		place-items: center;
		padding: 1.25rem;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(6px);
	}

	.luc-modal {
		width: min(100%, 26rem);
		padding: 1.35rem 1.25rem 1.15rem;
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.12));
		border-radius: 0.75rem;
		background: var(--pd-panel, #05050a);
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
	}

	.luc-eyebrow {
		margin: 0 0 0.35rem;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 75%, #fff);
	}

	.luc-title {
		margin: 0 0 0.65rem;
		font-size: 1.05rem;
		font-weight: 900;
		line-height: 1.35;
		color: var(--pd-text, #f4f4f5);
	}

	.luc-copy {
		margin: 0 0 1rem;
		font-size: 0.82rem;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.62);
	}

	.luc-preview {
		display: flex;
		justify-content: center;
		margin-bottom: 1.1rem;
		padding: 0.85rem;
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.08));
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.35);
	}

	.luc-actions {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.luc-btn {
		width: 100%;
		padding: 0.72rem 0.85rem;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.luc-btn--gold {
		border: 1px solid color-mix(in srgb, var(--pd-accent-action, #f0a500) 65%, #fff);
		background: color-mix(in srgb, var(--pd-accent-action, #f0a500) 12%, #000);
		color: #fff7e6;
	}

	.luc-btn--ghost {
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.14));
		background: transparent;
		color: rgba(255, 255, 255, 0.72);
	}
</style>
