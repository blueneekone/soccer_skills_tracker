<script lang="ts">
	import { doc, updateDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import HologramCardShell from '$lib/components/player/HologramCardShell.svelte';
	import OperativeAvatarDesigner from '$lib/components/player/OperativeAvatarDesigner.svelte';
	import OperativeLoadoutPreview from '$lib/components/player/OperativeLoadoutPreview.svelte';
	import ProPlayerCard from '$lib/components/stats/ProPlayerCard.svelte';
	import {
		LOADOUT_SLOTS,
		OPERATIVE_LOADOUT_VERSION,
		canEquipItem,
		defaultOperativeLoadout,
		getLoadoutCatalog,
		getOwnedCatalogForSlot,
		parseOperativeLoadout,
		type LoadoutSlotId,
		type OperativeLoadoutV1,
	} from '$lib/gamification/loadoutSchema.js';
	import Swal from 'sweetalert2';
	const SLOT_LABELS: Record<LoadoutSlotId, string> = {
		border: 'Border',
		badge: 'Badge',
		banner: 'Banner',
		title: 'Title',
	};
	let {
		operativeAvatar = $bindable(undefined),
		operativeLoadout = $bindable(defaultOperativeLoadout()),
		ownedCosmetics = $bindable(/** @type {string[]} */ ([])),
		playerEmailKey = '',
		playerDisplayName = 'Operative',
		rankLabel = 'Recruit',
		telemetryTotalXp = '',
		initialSlot = undefined,
	}: {
		operativeAvatar?: unknown;
		operativeLoadout?: OperativeLoadoutV1;
		ownedCosmetics?: string[];
		playerEmailKey?: string;
		playerDisplayName?: string;
		rankLabel?: string;
		telemetryTotalXp?: string;
		initialSlot?: LoadoutSlotId;
	} = $props();
	let selectedSlot = $state<LoadoutSlotId>('border');
	let syncBusy = $state(false);
	let avatarSaveBusy = $state(false);

	$effect(() => {
		if (initialSlot && (LOADOUT_SLOTS as readonly string[]).includes(initialSlot)) {
			selectedSlot = initialSlot;
		}
	});

	const catalog = $derived(getLoadoutCatalog());
	const ownedSet = $derived(new Set(ownedCosmetics));
	const ownedForSlot = $derived(getOwnedCatalogForSlot(selectedSlot, ownedCosmetics, catalog));
	const lockedForSlot = $derived(
		catalog.filter((entry) => entry.slot === selectedSlot && !ownedSet.has(entry.id)),
	);
	const equippedId = $derived(operativeLoadout.equipped[selectedSlot] ?? null);
	const equippedLabel = $derived.by(() => {
		if (!equippedId) return 'None equipped';
		return catalog.find((row) => row.id === equippedId)?.label ?? equippedId;
	});
	function equipItem(itemId: string) {
		if (!canEquipItem(selectedSlot, itemId, ownedCosmetics, catalog)) return;
		operativeLoadout = {
			v: OPERATIVE_LOADOUT_VERSION,
			equipped: { ...operativeLoadout.equipped, [selectedSlot]: itemId },
		};
	}
	function unequipSlot() {
		operativeLoadout = {
			v: OPERATIVE_LOADOUT_VERSION,
			equipped: { ...operativeLoadout.equipped, [selectedSlot]: null },
		};
	}
	async function saveOperativeAvatarConfig() {
		if (avatarSaveBusy || operativeAvatar == null) return;
		const emailKey = playerEmailKey.trim().toLowerCase();
		if (!emailKey) {
			void Swal.fire({
				text: 'Sign in to update your operative.',
				icon: 'error',
				background: '#05050a',
				color: '#e5e5e5',
			});
			return;
		}
		avatarSaveBusy = true;
		try {
			await updateDoc(doc(db, 'users', emailKey), {
				operativeAvatar,
			});
			const prof = authStore.userProfile;
			const merged = {
				...(prof && typeof prof === 'object' ? prof : {}),
				operativeAvatar,
			};
			authStore.setProfile(/** @type {Record<string, unknown>} */ (merged));
			void Swal.fire({
				text: 'Operative profile synced to Command.',
				icon: 'success',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 4000,
				timerProgressBar: true,
				background: '#05050a',
				color: '#e5e5e5',
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Could not save operative configuration.';
			void Swal.fire({
				text: msg,
				icon: 'error',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 5000,
				timerProgressBar: true,
				background: '#05050a',
				color: '#e5e5e5',
			});
		} finally {
			avatarSaveBusy = false;
		}
	}
	async function syncLoadout() {
		if (syncBusy) return;
		const emailKey = playerEmailKey.trim().toLowerCase();
		if (!emailKey) {
			void Swal.fire({
				text: 'Sign in to sync your loadout.',
				icon: 'error',
				background: '#05050a',
				color: '#e5e5e5',
			});
			return;
		}
		const parsed = parseOperativeLoadout(operativeLoadout) ?? defaultOperativeLoadout();
		syncBusy = true;
		try {
			await updateDoc(doc(db, 'users', emailKey), {
				operativeLoadout: parsed,
			});
			const prof = authStore.userProfile;
			const merged = {
				...(prof && typeof prof === 'object' ? prof : {}),
				operativeLoadout: parsed,
			};
			authStore.setProfile(/** @type {Record<string, unknown>} */ (merged));
			void Swal.fire({
				text: 'Loadout synced to Command.',
				icon: 'success',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 4000,
				timerProgressBar: true,
				background: '#05050a',
				color: '#e5e5e5',
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Could not sync loadout.';
			void Swal.fire({
				text: msg,
				icon: 'error',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 5000,
				timerProgressBar: true,
				background: '#05050a',
				color: '#e5e5e5',
			});
		} finally {
			syncBusy = false;
		}
	}
</script>

<section class="ols-root player-dossier-root" aria-label="Operative loadout studio">
	<div class="ols-grid bento-grid bento-grid--12col bento-grid--liquid">
		{#if playerEmailKey}
			<div class="ols-dossier-panel bento-span-12 tw-min-w-0">
				<p class="ols-panel-head qa-mono">DOSSIER CARD PREVIEW</p>
				<div class="ols-dossier-body">
					<div class="ols-dossier-card">
						<HologramCardShell
							accent="var(--pd-accent-data, #14b8a6)"
							ariaLabel="Operative dossier card"
						>
							<ProPlayerCard
								dossierPreview
								playerEmailKey={playerEmailKey}
								playerDisplayName={playerDisplayName}
								{operativeAvatar}
								{operativeLoadout}
								{ownedCosmetics}
								{rankLabel}
								{telemetryTotalXp}
								telemetryWorkouts=""
								telemetryJoinDate=""
							/>
						</HologramCardShell>
					</div>
				</div>
			</div>
		{/if}
		<div class="ols-portrait-panel bento-span-6 tw-min-w-0">
			<p class="ols-panel-head qa-mono">OPERATIVE PORTRAIT · VECTOR STUDIO</p>
			<div class="ols-portrait-body">
				<p class="ols-portrait-copy">
					Design your Bauhaus vector portrait with sliders or randomize. Only a short text seed is saved —
					no photo upload, no 3D meshes.
				</p>
				{#if operativeAvatar != null}
					<OperativeAvatarDesigner bind:operativeAvatar />
				{/if}
				<button
					type="button"
					class="ols-save-portrait qa-mono"
					disabled={avatarSaveBusy || !playerEmailKey || operativeAvatar == null}
					onclick={() => void saveOperativeAvatarConfig()}
				>
					{avatarSaveBusy ? 'SYNCING…' : 'UPDATE OPERATIVE'}
				</button>
				<p class="ols-portrait-hint qa-mono">
					Writes <span class="ols-portrait-hint__code">operativeAvatar</span> to Firestore and unlocks the HQ
					profile gate when complete.
				</p>
			</div>
		</div>
		<div class="ols-workshop-panel bento-span-6 tw-min-w-0">
			<p class="ols-panel-head qa-mono">LIVE PREVIEW · LOADOUT SLOTS</p>
			<div class="ols-workshop-body">
				<div class="ols-preview-row ols-preview-stage">
					<OperativeLoadoutPreview
						{operativeAvatar}
						{operativeLoadout}
						{ownedCosmetics}
						size={128}
						class="ols-preview-ring"
					/>
					<p class="ols-preview-hint qa-mono">
						Portrait from operativeAvatar · equipped digital slots overlay here and on HQ.
					</p>
				</div>
				<div class="ols-slot-tabs" role="tablist" aria-label="Loadout slot picker">
					{#each LOADOUT_SLOTS as slot (slot)}
						<button
							type="button"
							class="ols-slot-tab"
							class:ols-slot-tab--active={selectedSlot === slot}
							role="tab"
							aria-selected={selectedSlot === slot}
							onclick={() => (selectedSlot = slot)}
						>
							{SLOT_LABELS[slot]}
						</button>
					{/each}
				</div>
				<p class="ols-equipped qa-mono">
					Equipped · <span class="ols-equipped__value">{equippedLabel}</span>
				</p>
				<div class="ols-catalog" role="tabpanel">
					{#if ownedForSlot.length === 0 && lockedForSlot.length === 0}
						<p class="ols-empty qa-mono">No catalog items for this slot yet.</p>
					{/if}
					{#each ownedForSlot as entry (entry.id)}
						<article class="ols-item ols-item--owned">
							<div class="ols-item__meta">
								<p class="ols-item__label">{entry.label}</p>
								<p class="ols-item__status qa-mono">Owned</p>
							</div>
							<div class="ols-item__actions">
								{#if equippedId === entry.id}
									<button type="button" class="ols-btn ols-btn--ghost" onclick={unequipSlot}>
										Unequip
									</button>
								{:else}
									<button
										type="button"
										class="ols-btn ols-btn--equip"
										onclick={() => equipItem(entry.id)}
									>
										Equip
									</button>
								{/if}
							</div>
						</article>
					{/each}
					{#each lockedForSlot as entry (entry.id)}
						<article class="ols-item ols-item--locked" aria-label={`${entry.label} — locked`}>
							<div class="ols-item__meta">
								<p class="ols-item__label">{entry.label}</p>
								<p class="ols-item__status qa-mono">Locked · redeem in Quartermaster or earn via album</p>
							</div>
						</article>
					{/each}
				</div>
				<button
					type="button"
					class="ols-sync qa-mono"
					disabled={syncBusy || !playerEmailKey}
					onclick={() => void syncLoadout()}
				>
					{syncBusy ? 'SYNCING…' : 'SYNC LOADOUT'}
				</button>
			</div>
		</div>
	</div>
</section>

<style>
	.ols-root {
		color: var(--pd-text, #f4f4f5);
	}
	.ols-grid > :global(*) {
		min-width: 0;
	}
	.ols-portrait-panel,
	.ols-workshop-panel {
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		background: var(--pd-panel, #05050a);
		overflow: hidden;
	}
	/* Sprint 2.22 slice 6f — Armory Studio dossier hologram */
	.ols-dossier-panel {
		border: 1px solid color-mix(in srgb, var(--pd-accent-data, #14b8a6) 22%, var(--pd-line, rgba(255, 255, 255, 0.1)));
		background: transparent;
		overflow: visible;
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 8%, transparent),
			0 0 24px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 6%, transparent);
	}
	.ols-panel-head {
		margin: 0;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.14em;
		line-height: 1.35;
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 85%, #fff);
	}
	@media (min-width: 64rem) {
		.ols-panel-head {
			letter-spacing: 0.2em;
		}
	}
	.ols-portrait-body,
	.ols-workshop-body {
		padding: 1rem 1.1rem 1.15rem;
		min-width: 0;
	}
	.ols-dossier-body {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: 1.25rem 1.1rem 1.35rem;
		min-width: 0;
	}
	.ols-portrait-copy {
		margin: 0 0 1rem;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
	.ols-portrait-hint {
		margin: 0.75rem 0 0;
		font-size: 0.58rem;
		line-height: 1.5;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
	.ols-portrait-hint__code {
		color: var(--pd-text, #f4f4f5);
	}
	.ols-save-portrait {
		width: 100%;
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.24em;
		cursor: pointer;
		border: 1px solid color-mix(in srgb, var(--pd-accent-data, #14b8a6) 55%, transparent);
		border-radius: 0.2rem;
		color: #ecfeff;
		background: linear-gradient(
			165deg,
			color-mix(in srgb, var(--pd-accent-data, #14b8a6) 14%, transparent) 0%,
			rgba(0, 0, 0, 0.45) 100%
		);
		transition: box-shadow 0.15s ease, border-color 0.15s ease;
	}
	.ols-save-portrait:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 75%, transparent);
		box-shadow: 0 0 20px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 25%, transparent);
	}
	.ols-save-portrait:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.ols-preview-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		margin-bottom: 1rem;
	}
	.ols-preview-hint {
		margin: 0;
		max-width: 16rem;
		text-align: center;
		font-size: 0.58rem;
		line-height: 1.5;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
	.ols-slot-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.85rem;
	}
	.ols-slot-tab {
		flex: 1 1 auto;
		min-width: 5rem;
		padding: 0.55rem 0.75rem;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		cursor: pointer;
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		border-radius: 0.2rem;
		color: rgba(255, 255, 255, 0.45);
		background: transparent;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background 0.15s ease;
	}
	.ols-slot-tab:hover {
		color: rgba(236, 254, 255, 0.85);
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, var(--pd-line));
	}
	.ols-slot-tab--active {
		color: #ecfeff;
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 55%, var(--pd-line));
		background: linear-gradient(
			165deg,
			color-mix(in srgb, var(--pd-accent-data, #14b8a6) 12%, transparent) 0%,
			rgba(0, 0, 0, 0.35) 100%
		);
	}
	.ols-equipped {
		margin: 0 0 0.75rem;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
	.ols-equipped__value {
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 85%, #fff);
	}
	.ols-catalog {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.ols-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.65rem;
		padding: 0.7rem 0.85rem;
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		background: rgba(0, 0, 0, 0.35);
	}
	.ols-item--locked {
		opacity: 0.55;
		border-style: dashed;
	}
	.ols-item__meta {
		min-width: 0;
		flex: 1 1 auto;
	}
	.ols-item__label {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 800;
		letter-spacing: 0.03em;
	}
	.ols-item__status {
		margin: 0.25rem 0 0;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
	.ols-item--owned .ols-item__status {
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 80%, #fff);
	}
	.ols-item__actions {
		flex-shrink: 0;
	}
	.ols-btn {
		padding: 0.45rem 0.75rem;
		font-size: 0.58rem;
		font-weight: 900;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		cursor: pointer;
		border-radius: 0.15rem;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			color 0.15s ease;
	}
	.ols-btn--equip {
		border: 1px solid color-mix(in srgb, var(--pd-accent-data, #14b8a6) 55%, transparent);
		background: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 10%, transparent);
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 90%, #fff);
	}
	.ols-btn--equip:hover {
		background: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 18%, transparent);
	}
	.ols-btn--ghost {
		border: 1px solid var(--pd-line, rgba(255, 255, 255, 0.1));
		background: transparent;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
	.ols-btn--ghost:hover {
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 30%, var(--pd-line));
		color: var(--pd-text, #f4f4f5);
	}
	.ols-sync {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.24em;
		cursor: pointer;
		border: 1px solid color-mix(in srgb, var(--pd-accent-data, #14b8a6) 55%, transparent);
		border-radius: 0.2rem;
		color: #ecfeff;
		background: linear-gradient(
			165deg,
			color-mix(in srgb, var(--pd-accent-data, #14b8a6) 14%, transparent) 0%,
			rgba(0, 0, 0, 0.45) 100%
		);
		transition: box-shadow 0.15s ease, border-color 0.15s ease;
	}
	.ols-sync:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 75%, transparent);
		box-shadow: 0 0 20px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 25%, transparent);
	}
	.ols-sync:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.ols-empty {
		margin: 0;
		padding: 1rem;
		text-align: center;
		font-size: 0.65rem;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
		border: 1px dashed var(--pd-line, rgba(255, 255, 255, 0.1));
	}
	.ols-dossier-card {
		width: 100%;
		max-width: min(100%, clamp(20rem, 32vw, 23.75rem));
		min-height: 11rem;
		margin: 0 auto;
		overflow: visible;
		pointer-events: auto;
	}
	.ols-dossier-card :global(.hcs-wrapper) {
		width: 100%;
		max-width: 100%;
	}
	.ols-dossier-card :global(.hcs-card) {
		min-height: auto;
	}
	.ols-dossier-card :global(.pro-card-outer--dossier-preview) {
		margin-bottom: 0;
	}
	.ols-dossier-card :global(.hcs-content) {
		padding: clamp(8px, 1.5vw, 12px);
		align-items: stretch;
		justify-content: flex-start;
	}
	.ols-dossier-card :global(.pro-card-outer) {
		margin: 0 auto;
		width: 100%;
	}
</style>
