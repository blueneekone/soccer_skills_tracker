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
	import type { LoadoutSlotId } from '$lib/gamification/loadoutSchema.js';
	import {
		OPERATIVE_AVATAR_VERSION,
		parseOperativeAvatar,
	} from '$lib/avatars/operativeAvatar.js';
	import {
		defaultOperativeLoadout,
		parseOperativeLoadout,
	} from '$lib/gamification/loadoutSchema.js';
	import Swal from 'sweetalert2';

	// ── Phase 3, Epic 6 — Trajectory Tracking ───────────────────────────────
	import { TrajectoryEngine } from '$lib/states/TrajectoryEngine.svelte.js';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';
	import GrowthVelocityHUD from '$lib/components/player/trajectory/GrowthVelocityHUD.svelte';
	import MemoryCapsuleArena from '$lib/components/player/trajectory/MemoryCapsuleArena.svelte';
	import MemoryCapsuleHUD from '$lib/components/player/trajectory/MemoryCapsuleHUD.svelte';
	import { onDestroy } from 'svelte';

	const trajectoryEngine = new TrajectoryEngine();

	/** Bauhaus vector portrait — persisted to Firestore `users/{email}.operativeAvatar`. */
	let operativeAvatar = $state({
		v: OPERATIVE_AVATAR_VERSION,
		seed: `v${OPERATIVE_AVATAR_VERSION}|22|55|38|71`,
	});

	/** @type {'quartermaster' | 'album' | 'studio' | 'ceremonies'} */
	let armoryWorkspace = $state('quartermaster');

	let operativeLoadout = $state(defaultOperativeLoadout());
	let ownedCosmetics = $state(/** @type {string[]} */ ([]));

	/** Phase 1: replace with Firestore / profile sticker ids when drops ship. */
	let ownedSeasonOneCardIds = $state(/** @type {Set<string>} */ (new Set()));

	let selectedAlbumSetId = $state(
		seasonOneSets[0]?.id ?? 'street_kings',
	);

	const armoryTabParam = $derived(page.url.searchParams.get('tab'));
	const studioSlotParam = $derived(page.url.searchParams.get('slot'));

	const studioInitialSlot = $derived.by((): LoadoutSlotId | undefined => {
		const raw = studioSlotParam?.trim();
		if (raw === 'border' || raw === 'badge' || raw === 'banner' || raw === 'title') return raw;
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
		const normalized =
			oa && typeof oa === 'object' ?
				JSON.stringify({
					v: /** @type {Record<string, unknown>} */ (oa).v,
					seed: typeof /** @type {Record<string, unknown>} */ (oa).seed === 'string' ?
						/** @type {Record<string, unknown>} */ (oa).seed
					:	'',
				})
			:	'{}';
		return `${emailKey}:${normalized}`;
	});

	let lastAvatarHydrateSig = '';
	let lastLoadoutHydrateSig = '';

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

		const av = parseOperativeAvatar(profile?.operativeAvatar);
		if (av) operativeAvatar = av;
	});

	$effect(() => {
		if (!browser || authStore.isLoading) return;
		void profileLoadoutHydrateSig;
		const emailKey = (authStore.user?.email || '').toLowerCase();
		if (!emailKey) {
			lastLoadoutHydrateSig = '';
			operativeLoadout = defaultOperativeLoadout();
			ownedCosmetics = [];
			return;
		}
		if (profileLoadoutHydrateSig === lastLoadoutHydrateSig) return;
		lastLoadoutHydrateSig = profileLoadoutHydrateSig;

		const parsedLoadout = parseOperativeLoadout(profile?.operativeLoadout);
		operativeLoadout = parsedLoadout ?? defaultOperativeLoadout();
		ownedCosmetics = Array.isArray(profile?.ownedCosmetics) ?
			profile.ownedCosmetics.filter((id) => typeof id === 'string')
		:	[];
	});

	const profileXp = $derived(Math.max(0, Math.floor(Number(profile?.totalXp ?? profile?.xp) || 0)));
	const totalXpHud = $derived(
		playerEngine.hydrated ? Math.max(playerEngine.totalXp, profileXp) : profileXp,
	);
	const operativeLevel = $derived(getLevelProgressFromTotalXp(totalXpHud).level);
	const rankLabel = $derived(getCurrentRank(totalXpHud).rank);

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
			void Swal.fire({
				text: 'You must be signed in to request deployment.',
				icon: 'error',
				background: '#05050a',
				color: '#e5e5e5',
			});
			return;
		}
		if (!clubId) {
			void Swal.fire({
				text: 'Missing club context. Complete team setup or contact Command.',
				icon: 'error',
				background: '#05050a',
				color: '#e5e5e5',
			});
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
			void Swal.fire({
				text: `DEPLOYMENT CONFIRMED: ${item.title} requested. Credits deducted.`,
				icon: 'success',
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 4500,
				timerProgressBar: true,
				background: '#05050a',
				color: '#e5e5e5',
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Deployment could not be completed.';
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
			armoryBusy = false;
		}
	}
</script>

<svelte:head>
	<title>Armory · Quartermaster &amp; Sticker Album · SSTRACKER</title>
</svelte:head>

<div class="qa-root pd-page-root player-dossier-root" data-region="quartermaster-armory">

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

	<header class="qa-strap" aria-label="Tactical credit balance">
		<div class="qa-strap__grid">
			<div class="qa-strap__id">
				<p class="qa-eyebrow">Quartermaster / SIEM store</p>
				<h1 class="qa-title">Armory</h1>
				<p class="qa-sub">
					Clearance <span class="qa-mono">LVL {String(operativeLevel).padStart(2, '0')}</span> · line items
					priced in <strong>Tactical Credits</strong>
				</p>
			</div>
			<div class="qa-strap__bal" role="status">
				<p class="qa-eyebrow">Tactical credit balance</p>
				<p class="qa-mono qa-balance" aria-live="polite">
					{Number(tacticalCredits).toLocaleString()} <span class="qa-balance__unit">TC</span>
				</p>
			</div>
		</div>
	</header>

	<nav class="qa-workspace qa-workspace--premium" aria-label="Armory workspace">
		<button
			type="button"
			class="qa-workspace__tab"
			class:qa-workspace__tab--active={armoryWorkspace === 'quartermaster'}
			onclick={() => (armoryWorkspace = 'quartermaster')}
			aria-pressed={armoryWorkspace === 'quartermaster'}
		>
			Quartermaster
		</button>
		<button
			type="button"
			class="qa-workspace__tab"
			class:qa-workspace__tab--active={armoryWorkspace === 'album'}
			onclick={() => (armoryWorkspace = 'album')}
			aria-pressed={armoryWorkspace === 'album'}
		>
			Sticker Album
		</button>
		<button
			type="button"
			class="qa-workspace__tab"
			class:qa-workspace__tab--active={armoryWorkspace === 'studio'}
			onclick={() => (armoryWorkspace = 'studio')}
			aria-pressed={armoryWorkspace === 'studio'}
		>
			Studio
		</button>
		<button
			type="button"
			class="qa-workspace__tab"
			class:qa-workspace__tab--active={armoryWorkspace === 'ceremonies'}
			onclick={() => (armoryWorkspace = 'ceremonies')}
			aria-pressed={armoryWorkspace === 'ceremonies'}
		>
			Ceremonies
		</button>
	</nav>

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
				<article class="qa-card pd-page-panel {qaCardSpanClass} tw-min-w-0">
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
						<span class="qa-eyebrow">List price</span>
						<span class="qa-mono"
							>{item.cost.toLocaleString()} <span class="qa-balance__unit">TC</span></span
						>
					</p>
					{#if tacticalCredits >= item.cost}
						<button
							type="button"
							class="qa-btn qa-btn--ready"
							disabled={armoryBusy}
							onclick={async () => {
								await requestDeployment(item);
							}}
						>
							REQUEST DEPLOYMENT
						</button>
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
				<p class="qa-empty qa-mono">
					No line items at your clearance. Increase Operative level to reveal SKUs.
				</p>
			{/each}
		</section>
	{:else if armoryWorkspace === 'studio'}
		<div class="pd-page-panel pd-content-wrap tw-min-w-0 tw-p-4 sm:tw-p-5">
		{#await import('$lib/components/player/OperativeLoadoutStudio.svelte') then { default: OperativeLoadoutStudio }}
			<OperativeLoadoutStudio
				bind:operativeAvatar
				bind:operativeLoadout
				bind:ownedCosmetics
				playerEmailKey={playerEmailKey}
				playerDisplayName={vaultDisplayName}
				{rankLabel}
				telemetryTotalXp={totalXpHud.toLocaleString()}
				initialSlot={studioInitialSlot}
			/>
		{:catch err}
			<p class="qa-empty qa-mono" role="alert">
				Studio unavailable — {err instanceof Error ? err.message : 'load failed'}
			</p>
		{/await}
		</div>
	{:else if armoryWorkspace === 'ceremonies'}
		<div class="pd-page-panel pd-content-wrap tw-min-w-0 tw-p-4 sm:tw-p-5">
		{#await import('$lib/components/player/OperativeCeremoniesPanel.svelte') then { default: OperativeCeremoniesPanel }}
			<OperativeCeremoniesPanel playerEmail={playerEmailKey} />
		{:catch err}
			<p class="qa-empty qa-mono" role="alert">
				Ceremonies unavailable — {err instanceof Error ? err.message : 'load failed'}
			</p>
		{/await}
		</div>
	{:else}
		<div class="pd-page-panel pd-content-wrap tw-min-w-0 tw-p-4 sm:tw-p-5">
		<ArmoryAlbumWorkspace bind:selectedAlbumSetId {ownedSeasonOneCardIds} />
		</div>
	{/if}
</div>

<style>
	/* Quartermaster — SIEM storefront (Path B) */
	.qa-root {
		--cyber: var(--pd-accent-data-bright, #00d4ff);
		--toxic: var(--pd-accent-data, #14b8a6);
		--border: var(--pd-line, rgba(255, 255, 255, 0.1));
		min-height: 0;
		box-sizing: border-box;
		color: var(--pd-text, #f4f4f5);
		background: var(--pd-bg, #000);
	}

	.qa-eyebrow {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(0, 212, 255, 0.55);
	}

	.qa-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
		font-feature-settings: 'tnum' 1;
	}

	.qa-workspace {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: clamp(1.1rem, 2.2vw, 1.5rem);
		padding: 0.35rem;
		border-radius: 0.35rem;
		border: 1px solid var(--border);
		background: rgba(5, 5, 10, 0.85);
		box-shadow: inset 0 0 0 1px rgba(0, 212, 255, 0.06);
	}

	.qa-workspace__tab {
		flex: 1 1 auto;
		min-width: 8rem;
		padding: 0.65rem 1rem;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		cursor: pointer;
		border: 1px solid transparent;
		border-radius: 0.2rem;
		color: rgba(255, 255, 255, 0.45);
		background: transparent;
		transition:
			color 0.2s ease,
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			background 0.2s ease;
	}

	.qa-workspace__tab:hover {
		color: rgba(236, 254, 255, 0.85);
		border-color: rgba(0, 212, 255, 0.25);
	}

	.qa-workspace__tab--active {
		color: #ecfeff;
		border-color: rgba(0, 212, 255, 0.45);
		background: linear-gradient(165deg, rgba(0, 212, 255, 0.12) 0%, rgba(0, 0, 0, 0.4) 100%);
		box-shadow:
			0 0 20px rgba(0, 212, 255, 0.15),
			inset 0 0 0 1px rgba(57, 255, 20, 0.12);
	}

	.qa-strap {
		margin-bottom: clamp(1.25rem, 2.5vw, 1.75rem);
		border: 1px solid var(--border);
		background: var(--pd-panel, #05050a);
	}

	.qa-strap__grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 1.25rem;
		align-items: end;
		padding: 1.1rem 1.25rem;
	}

	@media (max-width: 640px) {
		.qa-strap__grid {
			grid-template-columns: 1fr;
		}
	}

	.qa-title {
		margin: 0.2rem 0 0.35rem;
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #ecfeff;
	}

	.qa-sub {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.5);
		max-width: 40rem;
	}

	.qa-sub strong {
		color: rgba(0, 212, 255, 0.9);
		font-weight: 800;
	}

	.qa-strap__bal {
		text-align: right;
		min-width: 9rem;
	}

	.qa-balance {
		margin: 0.35rem 0 0;
		font-size: clamp(1.4rem, 3.5vw, 1.9rem);
		font-weight: 800;
		color: var(--cyber);
		text-shadow: 0 0 18px rgba(0, 212, 255, 0.45);
	}

	.qa-balance__unit {
		font-size: 0.75em;
		opacity: 0.8;
	}

	.qa-grid {
		align-items: stretch;
	}

	.qa-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 1.1rem 1.1rem 1.15rem;
		border: 1px solid var(--border);
	}

	.qa-card__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3.25rem;
		height: 3.25rem;
		margin-bottom: 0.75rem;
		border: 1px solid rgba(0, 212, 255, 0.28);
		background: #000;
		font-size: 1.5rem;
		color: var(--cyber);
	}

	.qa-pill {
		display: inline-block;
		align-self: flex-start;
		margin-bottom: 0.5rem;
		padding: 0.15rem 0.4rem;
		font-size: 0.58rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		border: 1px solid var(--border);
		color: rgba(255, 255, 255, 0.7);
	}

	.qa-pill--phys {
		border-color: rgba(57, 255, 20, 0.35);
		color: #86efac;
	}

	.qa-pill--dig {
		border-color: rgba(0, 212, 255, 0.35);
		color: #a5f3fc;
	}

	.qa-card__title {
		margin: 0 0 0.45rem;
		font-size: 0.95rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		line-height: 1.25;
	}

	.qa-card__desc {
		margin: 0 0 0.85rem;
		flex: 1 1 auto;
		font-size: 0.8rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.6);
	}

	.qa-card__cost {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin: 0 0 0.9rem;
		font-size: 1.05rem;
		font-weight: 800;
		color: #fff;
	}

	.qa-btn {
		width: 100%;
		margin-top: auto;
		padding: 0.7rem 0.75rem;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		cursor: pointer;
		border-radius: 0.15rem;
		transition: box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.15s ease;
	}

	.qa-btn--ready {
		border: 1px solid rgba(0, 212, 255, 0.6);
		background: #000;
		color: #ecfeff;
		box-shadow:
			0 0 0 1px rgba(57, 255, 20, 0.2),
			0 0 24px rgba(0, 212, 255, 0.35);
	}

	.qa-btn--ready:hover {
		border-color: var(--toxic);
		box-shadow:
			0 0 32px rgba(57, 255, 20, 0.45),
			0 0 18px rgba(0, 212, 255, 0.4);
	}

	.qa-btn--ready:active {
		transform: translateY(1px);
	}

	.qa-btn--locked {
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: #0a0a0a;
		color: rgba(255, 255, 255, 0.28);
		cursor: not-allowed;
		box-shadow: none;
	}

	.qa-empty {
		grid-column: 1 / -1;
		margin: 0;
		padding: 2rem 1rem;
		text-align: center;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.45);
		border: 1px dashed var(--border);
	}

	.qa-insufficient {
		margin-top: 0.65rem;
		align-items: flex-start;
	}

	.qa-insufficient__link {
		color: var(--pd-accent-data, #14b8a6);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
