<script lang="ts">
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import HologramCardShell from '$lib/components/player/HologramCardShell.svelte';
	import OperativePortraitPartPicker from '$lib/components/player/OperativePortraitPartPicker.svelte';
	import OperativeLoadoutPreview from '$lib/components/player/OperativeLoadoutPreview.svelte';
	import OperativeIdCardFrame from '$lib/components/stats/OperativeIdCardFrame.svelte';
	import { syncOperativeIdentityToFirestore } from '$lib/player/syncOperativeIdentity.js';
	import { composeOperativePortrait } from '$lib/gamification/renderOperativeLoadout.js';
	import {
		PORTRAIT_PART_SLOTS,
		BODY_SCALE_CHIP_LABELS,
		parseOperativePortrait,
		resolveBodyScaleFromAgeBand,
		type PortraitPartSlot,
	} from '$lib/avatars/portraitV2Schema.js';
	import {
		resolveOperativeCardMetadata,
	} from '$lib/gamification/cardCollectibleMetadata.js';
	import {
		LOADOUT_SLOTS,
		OPERATIVE_LOADOUT_VERSION,
		canEquipItem,
		defaultOperativeLoadout,
		getLoadoutCatalog,
		getOwnedCatalogForSlot,
		type LoadoutSlotId,
		type OperativeLoadoutV1,
	} from '$lib/gamification/loadoutSchema.js';
	import Swal from 'sweetalert2';

	type UnifiedTab = PortraitPartSlot | LoadoutSlotId;

	const UNIFIED_TABS: UnifiedTab[] = [...PORTRAIT_PART_SLOTS, ...LOADOUT_SLOTS];

	const TAB_LABELS: Record<UnifiedTab, string> = {
		face: 'Face',
		hair: 'Hair',
		kit: 'Kit',
		border: 'Border',
		badge: 'Badge',
		banner: 'Banner',
		title: 'Title',
	};

	function isPortraitTab(tab: UnifiedTab): tab is PortraitPartSlot {
		return (PORTRAIT_PART_SLOTS as readonly string[]).includes(tab);
	}

	let {
		operativeAvatar = $bindable(undefined),
		operativeLoadout = $bindable(defaultOperativeLoadout()),
		ownedCosmetics = $bindable(/** @type {string[]} */ ([])),
		ownedPortraitParts = /** @type {string[]} */ ([]),
		ownedSeasonOneCards = /** @type {string[]} */ ([]),
		playerEmailKey = '',
		playerDisplayName = 'Operative',
		rankLabel = 'Recruit',
		clubName = '',
		operativeLevel = 1,
		telemetryTotalXp = '',
		initialSlot = undefined,
		initialPortraitPart = undefined,
	}: {
		operativeAvatar?: unknown;
		operativeLoadout?: OperativeLoadoutV1;
		ownedCosmetics?: string[];
		ownedPortraitParts?: string[];
		ownedSeasonOneCards?: string[];
		playerEmailKey?: string;
		playerDisplayName?: string;
		rankLabel?: string;
		clubName?: string;
		operativeLevel?: number;
		telemetryTotalXp?: string;
		initialSlot?: LoadoutSlotId;
		initialPortraitPart?: PortraitPartSlot;
	} = $props();

	let selectedTab = $state<UnifiedTab>('face');
	let portraitSlot = $state<PortraitPartSlot>('face');
	let identitySyncBusy = $state(false);

	$effect(() => {
		if (initialPortraitPart && isPortraitTab(initialPortraitPart)) {
			selectedTab = initialPortraitPart;
			portraitSlot = initialPortraitPart;
		} else if (initialSlot && (LOADOUT_SLOTS as readonly string[]).includes(initialSlot)) {
			selectedTab = initialSlot;
		}
	});

	$effect(() => {
		if (isPortraitTab(selectedTab)) {
			portraitSlot = selectedTab;
		}
	});

	const portraitTabActive = $derived(isPortraitTab(selectedTab));
	const activeLoadoutSlot = $derived(
		portraitTabActive ? 'border' : (selectedTab as LoadoutSlotId),
	);

	const catalog = $derived(getLoadoutCatalog());
	const ownedSet = $derived(new Set(ownedCosmetics));
	const ownedForSlot = $derived(
		portraitTabActive ?
			[]
		:	getOwnedCatalogForSlot(activeLoadoutSlot, ownedCosmetics, catalog),
	);
	const lockedForSlot = $derived(
		portraitTabActive ?
			[]
		:	catalog.filter((entry) => entry.slot === activeLoadoutSlot && !ownedSet.has(entry.id)),
	);
	const equippedId = $derived(
		portraitTabActive ? null : (operativeLoadout.equipped[activeLoadoutSlot] ?? null),
	);
	const equippedLabel = $derived.by(() => {
		if (portraitTabActive) return 'Portrait parts';
		if (!equippedId) return 'None equipped';
		return catalog.find((row) => row.id === equippedId)?.label ?? equippedId;
	});
	const dossierPortraitLayers = $derived(
		composeOperativePortrait({
			operativeAvatar,
			loadout: operativeLoadout,
			size: 96,
			ownedIds: ownedCosmetics,
		}),
	);

	const profileBodyScale = $derived.by(() => {
		const prof = authStore.userProfile;
		const ageBand =
			prof && typeof prof === 'object' && typeof prof.ageBand === 'string' ?
				prof.ageBand
			:	undefined;
		const parsed = parseOperativePortrait(operativeAvatar);
		if (parsed?.v === 2 && parsed.bodyScale) return parsed.bodyScale;
		return resolveBodyScaleFromAgeBand(ageBand);
	});

	const bodyScaleChipLabel = $derived(BODY_SCALE_CHIP_LABELS[profileBodyScale]);

	const dossierCardMetadata = $derived(
		resolveOperativeCardMetadata({
			operativeLoadout,
			ownedSeasonOneCards,
			rankName: rankLabel,
			emailKey: playerEmailKey,
		}),
	);

	function selectUnifiedTab(tab: UnifiedTab) {
		selectedTab = tab;
		if (isPortraitTab(tab)) portraitSlot = tab;
	}

	function equipItem(itemId: string) {
		if (portraitTabActive) return;
		if (!canEquipItem(activeLoadoutSlot, itemId, ownedCosmetics, catalog)) return;
		operativeLoadout = {
			v: OPERATIVE_LOADOUT_VERSION,
			equipped: { ...operativeLoadout.equipped, [activeLoadoutSlot]: itemId },
		};
	}

	function unequipSlot() {
		if (portraitTabActive) return;
		operativeLoadout = {
			v: OPERATIVE_LOADOUT_VERSION,
			equipped: { ...operativeLoadout.equipped, [activeLoadoutSlot]: null },
		};
	}

	async function syncIdentity() {
		if (identitySyncBusy) return;
		const emailKey = playerEmailKey.trim().toLowerCase();
		if (!emailKey) {
			void Swal.fire({
				text: 'Sign in to sync your identity.',
				icon: 'error',
				background: '#05050a',
				color: '#e5e5e5',
			});
			return;
		}
		if (operativeAvatar == null) {
			void Swal.fire({
				text: 'Invalid portrait configuration — select catalog parts before saving.',
				icon: 'error',
				background: '#05050a',
				color: '#e5e5e5',
			});
			return;
		}

		identitySyncBusy = true;
		try {
			const prof = authStore.userProfile;
			const profileOwned = Array.isArray(prof?.ownedPortraitParts) ?
				prof.ownedPortraitParts.filter((id): id is string => typeof id === 'string')
			:	undefined;

			await syncOperativeIdentityToFirestore({
				db,
				emailKey,
				operativeAvatar,
				operativeLoadout,
				ownedPortraitParts,
				profileOwnedPortraitParts: profileOwned,
				setProfile: (merged) => authStore.setProfile(merged),
				userProfile:
					prof && typeof prof === 'object' ?
						/** @type {Record<string, unknown>} */ (prof)
					:	null,
			});

			void Swal.fire({
				text: 'Identity synced to Command.',
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
			const msg = e instanceof Error ? e.message : 'Could not sync identity.';
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
			identitySyncBusy = false;
		}
	}
</script>

<section class="ols-root player-dossier-root" aria-label="Operative loadout studio">
	<div class="ols-grid bento-grid bento-grid--12col bento-grid--liquid">
		{#if playerEmailKey}
			<div class="ols-dossier-panel bento-span-12 tw-min-w-0">
				<p class="ols-panel-head qa-mono">DOSSIER CARD PREVIEW</p>
				<p class="ols-body-scale-chip qa-mono" aria-label="Operative body scale">{bodyScaleChipLabel}</p>
				<div class="ols-dossier-body">
					<div class="ols-dossier-stack">
						<div class="ols-dossier-card">
							<HologramCardShell
								accent="var(--pd-accent-data, #14b8a6)"
								ariaLabel="Operative dossier card"
							>
								<OperativeIdCardFrame
									variant="holo"
									portraitSvg={dossierPortraitLayers.portraitSvg}
									borderSvg={dossierPortraitLayers.borderSvg}
									bannerSvg={dossierPortraitLayers.bannerSvg}
									frameClass={dossierPortraitLayers.frameClass}
									displayName={playerDisplayName}
									clubName={clubName || undefined}
									rankName={rankLabel}
									{operativeLevel}
									cardMetadata={dossierCardMetadata}
								/>
							</HologramCardShell>
						</div>
						<div class="ols-ring-token" aria-hidden="true">
							<OperativeLoadoutPreview
								{operativeAvatar}
								{operativeLoadout}
								{ownedCosmetics}
								size={72}
								class="ols-ring-token__preview"
							/>
							<p class="ols-ring-token__caption qa-mono">HQ ring token</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="ols-picker-panel bento-span-12 tw-min-w-0">
			<p class="ols-panel-head qa-mono">IDENTITY PARTS · UNIFIED PICKER</p>
			<div class="ols-picker-body">
				<p class="ols-picker-copy">
					Equip portrait layers and digital loadout slots from one catalog — live dossier preview
					updates as you pick. Catalog ids only, no photo upload.
				</p>

				<div class="ols-unified-tabs" role="tablist" aria-label="Identity part and loadout slots">
					{#each UNIFIED_TABS as tab (tab)}
						<button
							type="button"
							class="ols-unified-tab"
							class:ols-unified-tab--active={selectedTab === tab}
							role="tab"
							aria-selected={selectedTab === tab}
							onclick={() => selectUnifiedTab(tab)}
						>
							{TAB_LABELS[tab]}
						</button>
					{/each}
				</div>

				{#if portraitTabActive && operativeAvatar != null}
					<OperativePortraitPartPicker
						bind:operativeAvatar
						bind:selectedSlot={portraitSlot}
						bodyScale={profileBodyScale}
						{ownedPortraitParts}
						hideTabRail={true}
						disabled={identitySyncBusy}
					/>
				{:else if !portraitTabActive}
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
									<p class="ols-item__status qa-mono">
										Locked · redeem in Quartermaster or earn via album
									</p>
								</div>
							</article>
						{/each}
					</div>
				{/if}

				<button
					type="button"
					class="ols-sync-identity qa-mono"
					disabled={identitySyncBusy || !playerEmailKey || operativeAvatar == null}
					onclick={() => void syncIdentity()}
				>
					{identitySyncBusy ? 'SYNCING…' : 'SYNC IDENTITY'}
				</button>
				<p class="ols-sync-hint qa-mono">
					Writes <span class="ols-sync-hint__code">operativeAvatar</span> +
					<span class="ols-sync-hint__code">operativeLoadout</span> to Firestore and unlocks the HQ
					profile gate when complete.
				</p>
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
	.ols-picker-panel {
		border: 1px solid color-mix(in srgb, var(--pd-accent-data, #14b8a6) 22%, var(--pd-line, rgba(255, 255, 255, 0.1)));
		background: transparent;
		overflow: visible;
		box-shadow:
			inset 0 0 0 1px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 8%, transparent),
			0 0 24px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 6%, transparent);
	}
	.ols-dossier-panel {
		/* Sprint 2.22 slice 6f — Armory Studio dossier hologram */
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
	.ols-body-scale-chip {
		display: inline-block;
		margin: 0.65rem 1rem 0;
		padding: 0.35rem 0.65rem;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 90%, #fff);
		border: 1px solid color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, var(--pd-line));
		border-radius: 999px;
		background: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 8%, transparent);
	}
	@media (min-width: 64rem) {
		.ols-panel-head {
			letter-spacing: 0.2em;
		}
	}
	.ols-picker-body {
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
	.ols-dossier-stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		width: 100%;
		max-width: min(100%, clamp(20rem, 32vw, 23.75rem));
	}
	.ols-picker-copy {
		margin: 0 0 1rem;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
	.ols-sync-hint {
		margin: 0.75rem 0 0;
		font-size: 0.58rem;
		line-height: 1.5;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.5));
	}
	.ols-sync-hint__code {
		color: var(--pd-text, #f4f4f5);
	}
	.ols-unified-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.85rem;
	}
	.ols-unified-tab {
		flex: 1 1 auto;
		min-width: 4.5rem;
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
	.ols-unified-tab:hover {
		color: rgba(236, 254, 255, 0.85);
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 35%, var(--pd-line));
	}
	.ols-unified-tab--active {
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
	.ols-sync-identity {
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
	.ols-sync-identity:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--pd-accent-data, #14b8a6) 75%, transparent);
		box-shadow: 0 0 20px color-mix(in srgb, var(--pd-accent-data, #14b8a6) 25%, transparent);
	}
	.ols-sync-identity:disabled {
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
		min-height: 14rem;
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
	.ols-dossier-card :global(.hcs-content) {
		padding: clamp(8px, 1.5vw, 12px);
		align-items: center;
		justify-content: center;
		width: fit-content;
		max-width: 100%;
		margin-inline: auto;
		background: transparent;
	}
	.ols-dossier-card :global(.oicf-root--holo) {
		width: 100%;
		max-width: min(168px, 100%);
	}
	.ols-ring-token {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		max-width: 5.5rem;
		opacity: 0.72;
	}
	.ols-ring-token :global(.ols-ring-token__preview) {
		width: 4.5rem;
		height: 4.5rem;
		max-width: 88px;
		max-height: 88px;
	}
	.ols-ring-token__caption {
		margin: 0;
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		text-align: center;
		color: var(--pd-text-muted, rgba(255, 255, 255, 0.45));
	}
</style>
