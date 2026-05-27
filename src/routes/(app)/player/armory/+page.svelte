<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { playerEngine } from '$lib/stores/playerEngine.svelte.js';
	import { getAvailableItems, processDeploymentRequest } from '$lib/gamification/armory.js';
	import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import {
		SEASON_ONE_ALBUM_CAP,
		seasonOneSets,
	} from '$lib/gamification/seasonOneData.js';
	import ArmoryAlbumWorkspace from '$lib/components/player/ArmoryAlbumWorkspace.svelte';
	import ArmoryCommandDeck from '$lib/components/player/ArmoryCommandDeck.svelte';
	import PlayerDiegeticOverlay from '$lib/components/player/PlayerDiegeticOverlay.svelte';
	import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
	import PlayerOsButton from '$lib/components/player/os/PlayerOsButton.svelte';
	import PlayerOsTabRail from '$lib/components/player/os/PlayerOsTabRail.svelte';
	import type { LoadoutSlotId } from '$lib/gamification/loadoutSchema.js';
	import {
		defaultOwnedPortraitParts,
		defaultPortraitV2,
		type PortraitPartSlot,
	} from '$lib/avatars/portraitV2Schema.js';
	import {
		readRepairOperativeAvatar,
		queuePortraitReadRepairWrite,
	} from '$lib/avatars/portraitReadRepair.js';
	import {
		defaultOperativeLoadout,
		parseOperativeLoadout,
	} from '$lib/gamification/loadoutSchema.js';
	import { grantPendingAlbumSetBonuses } from '$lib/gamification/albumSetBonuses.js';
	// ── Phase 3, Epic 6 — Trajectory Tracking ───────────────────────────────
	import { TrajectoryEngine } from '$lib/states/TrajectoryEngine.svelte.js';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
	import GrowthVelocityHUD from '$lib/components/player/trajectory/GrowthVelocityHUD.svelte';
	import MemoryCapsuleArena from '$lib/components/player/trajectory/MemoryCapsuleArena.svelte';
	import MemoryCapsuleHUD from '$lib/components/player/trajectory/MemoryCapsuleHUD.svelte';
	import { onDestroy } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { fetchClubDisplayName } from '$lib/player/fetchClubDisplayName.js';

	const trajectoryEngine = new TrajectoryEngine();

	/** Operative portrait — v1 Bauhaus seed or v2 layered parts; persisted to Firestore `users/{email}.operativeAvatar`. */
	let operativeAvatar = $state<unknown>(defaultPortraitV2());

	/** Catalog portrait part ids the player may equip in Studio (read-only hydrate; no Firestore write until save). */
	let ownedPortraitParts = $state(defaultOwnedPortraitParts());

	/** @type {'quartermaster' | 'album' | 'studio' | 'ceremonies'} */
	let armoryWorkspace = $state('quartermaster');

	let operativeLoadout = $state(defaultOperativeLoadout());
	let ownedCosmetics = $state(/** @type {string[]} */ ([]));

	let ownedSeasonOneCardIds = $state(/** @type {Set<string>} */ (new Set()));

	let selectedAlbumSetId = $state(
		seasonOneSets[0]?.id ?? 'street_kings',
	);

	const armoryTabParam = $derived(page.url.searchParams.get('tab'));
	const studioSlotParam = $derived(page.url.searchParams.get('slot'));
	const studioPartParam = $derived(page.url.searchParams.get('part'));

	const studioInitialSlot = $derived.by((): LoadoutSlotId | undefined => {
		const raw = studioSlotParam?.trim();
		if (raw === 'border' || raw === 'badge' || raw === 'banner' || raw === 'title') return raw;
		return undefined;
	});

	const studioInitialPart = $derived.by((): PortraitPartSlot | undefined => {
		const raw = studioPartParam?.trim();
		if (raw === 'face' || raw === 'hair' || raw === 'kit') return raw;
		return undefined;
	});

	$effect(() => {
		if (!browser) return;
		const tab = armoryTabParam;
		if (
			tab === 'quartermaster' ||
			tab === 'album' ||
			tab === 'studio' ||
			tab === 'ceremonies'
		) {
			armoryWorkspace = tab;
		}
	});

	const profile = $derived(authStore.userProfile);

	/** Sync local portrait state when the signed-in profile supplies `operativeAvatar`. */
	const profileAvatarHydrateSig = $derived.by(() => {
		const emailKey = (authStore.user?.email || '').toLowerCase();
		const oa = profile?.operativeAvatar;
		const opp = profile?.ownedPortraitParts;
		const normalized = oa && typeof oa === 'object' ? JSON.stringify(oa) : '{}';
		const oppNorm = Array.isArray(opp) ? JSON.stringify([...opp].sort()) : '[]';
		return `${emailKey}:${normalized}:${oppNorm}`;
	});

	let lastAvatarHydrateSig = '';
	let lastLoadoutHydrateSig = '';
	let lastPortraitRepairQueuedSig = '';

	/** Sync local portrait + loadout when signed-in profile changes. */
	const profileLoadoutHydrateSig = $derived.by(() => {
		const emailKey = (authStore.user?.email || '').toLowerCase();
		const ol = profile?.operativeLoadout;
		const oc = profile?.ownedCosmetics;
		const olNorm =
			ol && typeof ol === 'object' ?
				JSON.stringify({
					v: /** @type {Record<string, unknown>} */ (ol).v,
					equipped: /** @type {Record<string, unknown>} */ (ol).equipped ?? {},
				})
			:	'{}';
		const ocNorm = Array.isArray(oc) ? JSON.stringify([...oc].sort()) : '[]';
		return `${emailKey}:${olNorm}:${ocNorm}`;
	});

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		void profileAvatarHydrateSig;
		const emailKey = (authStore.user?.email || '').toLowerCase();
		if (!emailKey) {
			lastAvatarHydrateSig = '';
			return;
		}
		if (profileAvatarHydrateSig === lastAvatarHydrateSig) return;
		lastAvatarHydrateSig = profileAvatarHydrateSig;

		const { operativeAvatar: repairedAvatar, ownedPortraitParts: repairedOwned, didMigrate } =
			readRepairOperativeAvatar(profile?.operativeAvatar, profile?.ownedPortraitParts);
		operativeAvatar = repairedAvatar;
		ownedPortraitParts = repairedOwned.filter((id): id is string => typeof id === 'string');
		if (didMigrate) {
			const repairSig = `${emailKey}:${JSON.stringify(repairedAvatar)}`;
			if (lastPortraitRepairQueuedSig !== repairSig) {
				lastPortraitRepairQueuedSig = repairSig;
				void queuePortraitReadRepairWrite(emailKey, {
					operativeAvatar: repairedAvatar,
					ownedPortraitParts: ownedPortraitParts,
				});
			}
		}
	});

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		void profileLoadoutHydrateSig;
		const emailKey = (authStore.user?.email || '').toLowerCase();
		if (!emailKey) {
			lastLoadoutHydrateSig = '';
			operativeLoadout = defaultOperativeLoadout();
			ownedCosmetics = [];
			ownedPortraitParts = defaultOwnedPortraitParts();
			ownedSeasonOneCardIds = new Set();
			return;
		}
		if (profileLoadoutHydrateSig === lastLoadoutHydrateSig) return;
		lastLoadoutHydrateSig = profileLoadoutHydrateSig;

		const parsedLoadout = parseOperativeLoadout(profile?.operativeLoadout);
		operativeLoadout = parsedLoadout ?? defaultOperativeLoadout();
		ownedCosmetics = Array.isArray(profile?.ownedCosmetics) ?
			profile.ownedCosmetics.filter((id) => typeof id === 'string')
		:	[];
		const cardIds = Array.isArray(profile?.ownedSeasonOneCards) ?
			profile.ownedSeasonOneCards.filter((id): id is string => typeof id === 'string')
		:	[];
		ownedSeasonOneCardIds = new Set<string>(cardIds);
	});

	let albumGrantDebounce: ReturnType<typeof setTimeout> | undefined;
	let albumGrantBusy = false;

	/** Debounced server grant when a folder completes (3.4 — no client self-grant). */
	$effect(() => {
		if (!browser || authStore.isLoading) return;
		const emailKey = (authStore.user?.email || '').toLowerCase();
		if (!emailKey) return;

		const cardSig = [...ownedSeasonOneCardIds].sort().join(',');
		const cosmSig = [...ownedCosmetics].sort().join(',');
		void cardSig;
		void cosmSig;

		clearTimeout(albumGrantDebounce);
		albumGrantDebounce = setTimeout(() => {
			if (albumGrantBusy) return;
			albumGrantBusy = true;
			void grantPendingAlbumSetBonuses(ownedSeasonOneCardIds, ownedCosmetics)
				.catch((err) => {
					console.warn('[armory] album set bonus grant failed:', err);
				})
				.finally(() => {
					albumGrantBusy = false;
				});
		}, 600);

		return () => clearTimeout(albumGrantDebounce);
	});

	const profileXp = $derived(Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)));
	const totalXpHud = $derived(
		playerEngine.hydrated ? Math.max(playerEngine.totalXp, profileXp) : profileXp,
	);
	const operativeLevel = $derived(getLevelProgressFromTotalXp(totalXpHud).level);
	const rankLabel = $derived(getCurrentRank(totalXpHud).rank);
	let clubDisplayName = $state('');

	$effect(() => {
		if (!browser) return;
		let cancelled = false;
		(async () => {
			const name = await fetchClubDisplayName(db, profile);
			if (!cancelled) clubDisplayName = name;
		})();
		return () => {
			cancelled = true;
		};
	});


	const email = $derived((authStore.user?.email || '').toLowerCase());
	const playerEmailKey = $derived(email);
	const vaultDisplayName = $derived(
		(profile?.playerName && String(profile.playerName).trim()) ||
			email.split('@')[0] ||
			'Operative',
	);

	/**
	 * Tactical Credit balance (Path B). Prefer Firestore `users` profile; optional fallback if ever mirrored on the auth user object.
	 * @see $lib/gamification/armory.js — all catalog prices use the same unit.
	 */
	const tacticalCredits = $derived(
		Math.max(
			0,
			Math.floor(
				Number(
					profile?.tacticalCredits ??
						(authStore.user && typeof /** @type {Record<string, unknown>} */ (authStore.user).tacticalCredits ===
						'number' ?
							/** @type {Record<string, unknown>} */ (authStore.user).tacticalCredits :
							0),
				) || 0,
			),
		),
	);

	const lineItems = $derived(getAvailableItems(operativeLevel));

	const qaCardSpanClass = $derived(
		lineItems.length <= 2 ? 'bento-span-12' : 'bento-span-6',
	);

	let armoryBusy = $state(false);

	/** Diegetic overlay state (Wave E — replaces legacy deployment toasts). */
	let overlayOpen = $state(false);
	let overlayVariant = $state(/** @type {'success' | 'error' | 'confirm'} */ ('error'));
	let overlayTitle = $state('');
	let overlayMessage = $state('');
	let overlayAutoDismissMs = $state(0);

	const armoryTabs = [
		{ key: 'quartermaster', label: 'Quartermaster' },
		{ key: 'album', label: 'Sticker Album' },
		{ key: 'studio', label: 'Studio' },
		{ key: 'ceremonies', label: 'Ceremonies' },
	];

	function closeOverlay() {
		overlayOpen = false;
	}

	function showDiegeticError(title: string, message: string) {
		overlayVariant = 'error';
		overlayTitle = title;
		overlayMessage = message;
		overlayAutoDismissMs = 0;
		overlayOpen = true;
	}

	function showDiegeticSuccess(title: string, message: string, autoDismissMs = 4500) {
		overlayVariant = 'success';
		overlayTitle = title;
		overlayMessage = message;
		overlayAutoDismissMs = autoDismissMs;
		overlayOpen = true;
	}

	/** @param {string} key */
	function selectArmoryWorkspace(key: string) {
		if (
			key === 'quartermaster' ||
			key === 'album' ||
			key === 'studio' ||
			key === 'ceremonies'
		) {
			armoryWorkspace = key;
		}
	}

	$effect(() => {
		if (!browser) return;
		const u = authStore.user;
		if (authStore.role === 'player' && u?.uid) {
			playerEngine.attach(u.uid);
			return () => playerEngine.detach();
		}
		playerEngine.detach();
	});

	// ── Epic 6: connect TrajectoryEngine when player email resolves ──────────
	$effect(() => {
		if (!browser || authStore.isLoading) return;
		const emailKey = (authStore.user?.email ?? '').toLowerCase();
		if (!emailKey) return;
		try {
			trajectoryEngine.connect(emailKey);
		} catch (err) {
			trajectoryEngine.error = 'Trajectory data unavailable.';
			console.warn('[armory] TrajectoryEngine.connect failed:', err);
		}
	});

	onDestroy(() => trajectoryEngine.destroy());

	/**
	 * Quartermaster: deduct TC via {@link processDeploymentRequest}, then optimistically update local profile.
	 * @param {import('$lib/gamification/armory.js').QuartermasterItem} item
	 */
	async function requestDeployment(item) {
		if (armoryBusy) return;
		/** @type {import('firebase/auth').User | null} */
		const u = authStore.user;
		/** `users/{email}` profile — `clubId` is not on Firebase `User` in the client SDK. */
		const prof = profile;
		const clubId = typeof prof?.clubId === 'string' && prof.clubId.trim() ? prof.clubId.trim() : '';
		if (!u) {
			showDiegeticError('Sign-in required', 'You must be signed in to request deployment.');
			return;
		}
		if (!clubId) {
			showDiegeticError(
				'Missing club context',
				'Complete team setup or contact Command.',
			);
			return;
		}
		armoryBusy = true;
		try {
			await processDeploymentRequest(u, item, clubId);
			const after = authStore.userProfile;
			if (after) {
				const o = /** @type {Record<string, unknown> & { tacticalCredits?: number }} */ (after);
				const prev = Math.max(0, Math.floor(Number(o.tacticalCredits) || 0));
				authStore.setProfile({ ...o, tacticalCredits: Math.max(0, prev - item.cost) });
			}
			showDiegeticSuccess(
				'Deployment confirmed',
				`DEPLOYMENT CONFIRMED: ${item.title} requested. Credits deducted.`,
			);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Deployment could not be completed.';
			showDiegeticError('Deployment failed', msg);
		} finally {
			armoryBusy = false;
		}
	}
</script>

<svelte:head>
	<title>Armory · Quartermaster &amp; Sticker Album · SSTRACKER</title>
</svelte:head>

<div
	class="pd-page-root player-dossier-root player-hud-root tw-min-w-0 tw-overflow-x-hidden"
	data-region="quartermaster-armory"
>

	<!-- ── Phase 3, Epic 6 · Memory Capsule fixed overlay ──────────────────── -->
	{#if !trajectoryEngine.error && vanguardFlags.capsulesEnabled && trajectoryEngine.hasUnseenCapsule && trajectoryEngine.activeCapsule}
		<MemoryCapsuleHUD
			dossierMode={true}
			capsule={trajectoryEngine.activeCapsule}
			baselineDaysAgo={trajectoryEngine.baselineDaysAgo}
			onDismiss={() => {
				if (trajectoryEngine.activeCapsule) {
					void trajectoryEngine.acknowledgeCapsule(trajectoryEngine.activeCapsule.capsuleId);
				}
			}}
		/>
	{/if}

	<!-- ── Phase 3, Epic 6 · Growth Velocity Index bento cell ─────────────── -->
	{#if !trajectoryEngine.error && (vanguardFlags.gviEnabled || vanguardFlags.capsulesEnabled)}
		<section
			class="tw-mb-[clamp(1rem,2vw,1.35rem)]"
			aria-label="Growth Velocity Index"
		>
			<GrowthVelocityHUD
				dossierMode={true}
				gvi={trajectoryEngine.gvi}
				gviTier={trajectoryEngine.gviTier}
				gviLabel={trajectoryEngine.gviLabel}
				gviFormatted={trajectoryEngine.gviFormatted}
				currentMonthXp={trajectoryEngine.currentMonthXp}
				lastMonthXp={trajectoryEngine.lastMonthXp}
				monthsActive={trajectoryEngine.monthsActive}
				loading={trajectoryEngine.loading}
			/>
		</section>
	{/if}

	<!-- ── Phase 3, Epic 6 · Capsule Arena inline panel (when active) ──────── -->
	{#if !trajectoryEngine.error && vanguardFlags.capsulesEnabled && trajectoryEngine.hasUnseenCapsule && trajectoryEngine.activeCapsule}
		<section
			class="tw-mb-[clamp(1rem,2vw,1.35rem)]"
			aria-label="Time-Lapse Memory Capsule"
		>
			<MemoryCapsuleArena
				dossierMode={true}
				capsule={trajectoryEngine.activeCapsule}
				baselineDaysAgo={trajectoryEngine.baselineDaysAgo}
				capsuleHeadline={trajectoryEngine.capsuleHeadline}
			/>
		</section>
	{/if}

	<div class="pd-content-wrap pd-route-stack">
		<PlayerOsPageStrap
			eyebrow="Quartermaster / SIEM store"
			title="Armory"
			ariaLabel="Tactical credit balance"
		>
			{#snippet status()}
				<p class="pd-eyebrow">Tactical credit balance</p>
				<p class="pd-mono armory-balance" aria-live="polite">
					{Number(tacticalCredits).toLocaleString()}
					<span class="armory-balance__unit">TC</span>
				</p>
			{/snippet}
			{#snippet children()}
				<p class="armory-strap__sub">
					Clearance <span class="pd-mono">LVL {String(operativeLevel).padStart(2, '0')}</span> · line
					items priced in <strong>Tactical Credits</strong>
				</p>
			{/snippet}
		</PlayerOsPageStrap>

		<PlayerOsTabRail
			tabs={armoryTabs}
			active={armoryWorkspace}
			onSelect={selectArmoryWorkspace}
			ariaLabel="Armory workspace"
		/>

	<ArmoryCommandDeck
		{operativeAvatar}
		{operativeLoadout}
		{ownedCosmetics}
		{operativeLevel}
		{tacticalCredits}
		{rankLabel}
		albumOwnedCount={ownedSeasonOneCardIds.size}
		albumCap={SEASON_ONE_ALBUM_CAP}
		{lineItems}
	/>

	{#if armoryWorkspace === 'quartermaster'}
		<section
			id="quartermaster-grid"
			class="qa-grid bento-grid bento-grid--12col bento-grid--liquid"
			aria-label="Available armory line items"
		>
			{#each lineItems as item (item.id)}
				<article class="qa-card pd-os-deck {qaCardSpanClass} tw-min-w-0">
					<div class="qa-card__icon" aria-hidden="true">
						<Icon name={item.icon as IconName} />
					</div>
					<span
						class="qa-pill"
						class:qa-pill--phys={item.type === 'physical'}
						class:qa-pill--dig={item.type === 'digital'}
					>
						{item.type === 'physical' ? 'PHYSICAL' : 'DIGITAL'}
					</span>
					<h2 class="qa-card__title">{item.title}</h2>
					<p class="qa-card__desc">{item.description}</p>
					<p class="qa-card__cost">
						<span class="pd-eyebrow">List price</span>
						<span class="pd-mono"
							>{item.cost.toLocaleString()} <span class="armory-balance__unit">TC</span></span
						>
					</p>
					{#if tacticalCredits >= item.cost}
						<PlayerOsButton
							variant="primary"
							class="armory-deploy-btn"
							disabled={armoryBusy}
							onclick={async () => {
								await requestDeployment(item);
							}}
						>
							REQUEST DEPLOYMENT
						</PlayerOsButton>
					{:else}
						<div class="pd-empty-state pd-empty-state--compact qa-insufficient" role="status">
							<div class="pd-empty-state__copy">
								<p class="pd-empty-state__title">Insufficient TC</p>
								<p class="pd-empty-state__lede">
									Earn credits via
									<a href={resolve('/player/dashboard')} class="qa-insufficient__link">HQ missions</a>
									or
									<a href={resolve('/player/workout')} class="qa-insufficient__link">training sessions</a>.
								</p>
							</div>
						</div>
					{/if}
				</article>
			{:else}
				<p class="qa-empty pd-mono">
					No line items at your clearance. Increase Operative level to reveal SKUs.
				</p>
			{/each}
		</section>
	{:else if armoryWorkspace === 'studio'}
		<div class="pd-os-deck pd-content-wrap tw-min-w-0 tw-p-4 sm:tw-p-5">
		{#await import('$lib/components/player/OperativeLoadoutStudio.svelte') then { default: OperativeLoadoutStudio }}
			<OperativeLoadoutStudio
				bind:operativeAvatar
				bind:operativeLoadout
				bind:ownedCosmetics
				{ownedPortraitParts}
				playerEmailKey={playerEmailKey}
				playerDisplayName={vaultDisplayName}
				{rankLabel}
				{operativeLevel}
				clubName={clubDisplayName}
				telemetryTotalXp={totalXpHud.toLocaleString()}
				initialSlot={studioInitialSlot}
				initialPortraitPart={studioInitialPart}
			/>
		{:catch err}
			<p class="qa-empty pd-mono" role="alert">
				Studio unavailable — {err instanceof Error ? err.message : 'load failed'}
			</p>
		{/await}
		</div>
	{:else if armoryWorkspace === 'ceremonies'}
		<div class="pd-os-deck pd-content-wrap tw-min-w-0 tw-p-4 sm:tw-p-5">
		{#await import('$lib/components/player/OperativeCeremoniesPanel.svelte') then { default: OperativeCeremoniesPanel }}
			<OperativeCeremoniesPanel playerEmail={playerEmailKey} />
		{:catch err}
			<p class="qa-empty pd-mono" role="alert">
				Ceremonies unavailable — {err instanceof Error ? err.message : 'load failed'}
			</p>
		{/await}
		</div>
	{:else}
		<div class="pd-os-deck pd-content-wrap tw-min-w-0 tw-p-4 sm:tw-p-5">
		<ArmoryAlbumWorkspace bind:selectedAlbumSetId {ownedSeasonOneCardIds} />
		</div>
	{/if}
	</div>

	<PlayerDiegeticOverlay
		open={overlayOpen}
		variant={overlayVariant}
		title={overlayTitle}
		message={overlayMessage}
		autoDismissMs={overlayAutoDismissMs}
		onConfirm={closeOverlay}
		onCancel={closeOverlay}
	/>
</div>
