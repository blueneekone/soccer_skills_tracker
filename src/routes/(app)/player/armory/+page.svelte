<script>
	import { browser } from '$app/environment';
	import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { playerEngine } from '$lib/stores/playerEngine.svelte.js';
	import { getAvailableItems, processDeploymentRequest } from '$lib/gamification/armory.js';
	import { getCurrentRank, getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
	import {
		SEASON_ONE_ALBUM_CAP,
		formatVariantLabel,
		getSeasonOneCardsForSet,
		seasonOneSets,
	} from '$lib/gamification/seasonOneData.js';
	import StickerVariantShell from '$lib/components/gamification/StickerVariantShell.svelte';
	import ProPlayerCard from '$lib/components/stats/ProPlayerCard.svelte';
	import OperativePathway from '$lib/components/player/OperativePathway.svelte';
	import OperativeAvatar3D from '$lib/components/player/OperativeAvatar3D.svelte';
	import Swal from 'sweetalert2';

	/** Preset hex chips for the loadout glass studio (sync with OperativeAvatar3D defaults). */
	const AVATAR_SKIN_SWATCHES = /** @type {const} */ ([
		'#d2996c',
		'#f5cba7',
		'#c68642',
		'#8d5524',
		'#5c3d2e',
	]);
	const AVATAR_JERSEY_SWATCHES = /** @type {const} */ ([
		'#dc2626',
		'#2563eb',
		'#16a34a',
		'#ca8a04',
		'#9333ea',
		'#e5e7eb',
	]);
	const AVATAR_CLEAT_SWATCHES = /** @type {const} */ ([
		'#bef264',
		'#fbbf24',
		'#38bdf8',
		'#f472b6',
		'#a8a29e',
		'#1e293b',
	]);

	/**
	 * Loadout console — drives `OperativeAvatar3D` and persists to Firestore `users/{email}.avatarConfig`.
	 * @type {{ bodyType: 'alpha' | 'bravo'; skinTone: string; jerseyColor: string; cleatColor: string }}
	 */
	let avatar3dConfig = $state({
		bodyType: /** @type {'alpha' | 'bravo'} */ ('alpha'),
		skinTone: '#d2996c',
		jerseyColor: '#dc2626',
		cleatColor: '#bef264',
	});

	/** @type {'quartermaster' | 'album'} */
	let armoryWorkspace = $state('quartermaster');

	/** Phase 1: replace with Firestore / profile sticker ids when drops ship. */
	let ownedSeasonOneCardIds = $state(/** @type {Set<string>} */ (new Set()));

	let selectedAlbumSetId = $state(
		seasonOneSets[0]?.id ?? 'street_kings',
	);

	const selectedAlbumCards = $derived(getSeasonOneCardsForSet(selectedAlbumSetId));
	const selectedAlbumSetMeta = $derived(seasonOneSets.find((s) => s.id === selectedAlbumSetId));

	const seasonOneOwnedCount = $derived(ownedSeasonOneCardIds.size);

	const selectedSetOwnedCount = $derived(
		selectedAlbumCards.filter((c) => ownedSeasonOneCardIds.has(c.id)).length,
	);

	const profile = $derived(authStore.userProfile);

	/** Sync local studio state when the signed-in profile document supplies `avatarConfig`. */
	const profileAvatarHydrateSig = $derived.by(() => {
		const emailKey = (authStore.user?.email || '').toLowerCase();
		const ac = profile?.avatarConfig;
		const normalized =
			ac && typeof ac === 'object' ?
				JSON.stringify({
					bodyType: ac.bodyType === 'bravo' ? 'bravo' : 'alpha',
					skinTone: typeof ac.skinTone === 'string' ? ac.skinTone : '',
					jerseyColor: typeof ac.jerseyColor === 'string' ? ac.jerseyColor : '',
					cleatColor: typeof ac.cleatColor === 'string' ? ac.cleatColor : '',
				})
			:	'{}';
		return `${emailKey}:${normalized}`;
	});

	let lastAvatarHydrateSig = '';

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

		const ac = profile?.avatarConfig;
		avatar3dConfig = {
			bodyType: ac && typeof ac === 'object' && ac.bodyType === 'bravo' ? 'bravo' : 'alpha',
			skinTone:
				ac && typeof ac === 'object' && typeof ac.skinTone === 'string' ?
					ac.skinTone
				:	'#d2996c',
			jerseyColor:
				ac && typeof ac === 'object' && typeof ac.jerseyColor === 'string' ?
					ac.jerseyColor
				:	'#dc2626',
			cleatColor:
				ac && typeof ac === 'object' && typeof ac.cleatColor === 'string' ?
					ac.cleatColor
				:	'#bef264',
		};
	});

	let operativeAvatarSaveBusy = $state(false);

	/** Persist loadout to Firestore and mirror into {@link authStore}.userProfile.avatarConfig. */
	async function saveOperativeAvatarConfig() {
		if (operativeAvatarSaveBusy) return;
		const u = authStore.user;
		const prof = profile;
		const emailKey = (u?.email || '').toLowerCase();
		if (!u || !emailKey) {
			void Swal.fire({
				text: 'Sign in to update your operative.',
				icon: 'error',
				background: '#05050a',
				color: '#e5e5e5',
			});
			return;
		}

		operativeAvatarSaveBusy = true;
		try {
			const payload = {
				bodyType: avatar3dConfig.bodyType,
				skinTone: avatar3dConfig.skinTone,
				jerseyColor: avatar3dConfig.jerseyColor,
				cleatColor: avatar3dConfig.cleatColor,
			};
			await updateDoc(doc(db, 'users', emailKey), {
				avatarConfig: { ...payload, updatedAt: serverTimestamp() },
			});

			const merged = { ...(prof && typeof prof === 'object' ? prof : {}), avatarConfig: payload };
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
			operativeAvatarSaveBusy = false;
		}
	}

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

<div class="qa-root" data-region="quartermaster-armory">
	<section
		class="qa-pathway-shell tw-mb-[clamp(1rem,2vw,1.35rem)] tw-rounded-xl tw-border tw-border-cyan-500/15 tw-bg-[linear-gradient(165deg,rgba(0, 240, 255,0.06)_0%,rgba(5,5,10,0.92)_45%,rgba(0,0,0,0.55)_100%)] tw-p-4 tw-shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:tw-p-5"
		aria-labelledby="operative-pathway-heading"
	>
		<p
			id="operative-pathway-heading"
			class="qa-mono tw-mb-4 tw-text-center tw-text-[0.68rem] tw-font-black tw-tracking-[0.32em] tw-text-cyan-200/95"
		>
			[ MISSION REWARDS PATHWAY ]
		</p>
		<OperativePathway level={operativeLevel} />
	</section>

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

	<nav class="qa-workspace" aria-label="Armory workspace">
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
	</nav>

	{#if armoryWorkspace === 'quartermaster'}
		<section class="qa-grid" aria-label="Available armory line items">
			{#each lineItems as item (item.id)}
				<article class="qa-card">
					<div class="qa-card__icon" aria-hidden="true">
						<i class="ph {item.icon}"></i>
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
						<button type="button" class="qa-btn qa-btn--locked" disabled>INSUFFICIENT FUNDS</button>
					{/if}
				</article>
			{:else}
				<p class="qa-empty qa-mono">
					No line items at your clearance. Increase Operative level to reveal SKUs.
				</p>
			{/each}
		</section>
	{:else}
		<section class="album tw-space-y-6" aria-labelledby="album-season-heading">
			<!-- Liquid glass HUD -->
			<div
				class="tw-rounded-2xl tw-bg-slate-900/60 tw-backdrop-blur-md tw-border tw-border-white/5 tw-p-4 tw-shadow-[0_8px_40px_rgba(0,0,0,0.35)] sm:tw-p-5"
			>
				<div class="tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-4">
					<div>
						<p id="album-season-heading" class="qa-eyebrow tw-mb-1">Season 1 · Sticker album</p>
						<p class="tw-m-0 tw-font-black tw-text-xl tw-tracking-wide tw-text-slate-100 sm:tw-text-2xl">
							Completion:
							<span class="qa-mono tw-text-cyan-300">{seasonOneOwnedCount}</span>
							<span class="tw-text-slate-500 tw-font-bold"> / </span>
							<span class="qa-mono tw-text-slate-400">{SEASON_ONE_ALBUM_CAP}</span>
						</p>
						<p class="tw-m-0 tw-mt-2 tw-max-w-xl tw-text-sm tw-leading-relaxed tw-text-slate-400">
							Collect stickers from packs and events. Album cap grows across Season 1 drops — scaffold shows
							three founding sets.
						</p>
					</div>
					<div class="tw-min-w-[12rem] tw-flex-1 sm:tw-max-w-sm">
						<div class="tw-h-2 tw-overflow-hidden tw-rounded-full tw-bg-slate-800/80 tw-ring-1 tw-ring-white/10">
							<div
								class="tw-h-full tw-rounded-full tw-bg-gradient-to-r tw-from-cyan-400 tw-to-emerald-400 tw-transition-[width] tw-duration-500"
								style={`width: ${Math.min(100, (seasonOneOwnedCount / SEASON_ONE_ALBUM_CAP) * 100)}%`}
							></div>
						</div>
						<p class="qa-mono tw-mt-2 tw-text-right tw-text-[0.65rem] tw-text-slate-500">
							{Math.round(Math.min(100, (seasonOneOwnedCount / SEASON_ONE_ALBUM_CAP) * 100))}% vault sync
						</p>
					</div>
				</div>
			</div>

			<!-- Three.js operative preview + liquid glass swatches -->
			<div
				class="tw-rounded-2xl tw-bg-slate-900/60 tw-backdrop-blur-md tw-border tw-border-white/5 tw-overflow-hidden tw-shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
			>
				<p
					class="qa-mono tw-m-0 tw-border-b tw-border-white/5 tw-bg-black/30 tw-px-4 tw-py-3 tw-text-[0.65rem] tw-font-black tw-tracking-[0.2em] tw-text-cyan-200/90"
				>
					OPERATIVE LOADOUT · 3D PREVIEW
				</p>
				<div class="tw-space-y-6 tw-p-4 sm:tw-p-5">
					<div class="operative-console-frame" aria-label="Operative base mesh">
						<p class="qa-eyebrow tw-mb-3 tw-tracking-[0.28em]">OPERATIVE FRAME</p>
						<div class="bento-grid bento-grid--2col">
							<button
								type="button"
								class="operative-frame-toggle qa-mono tw-relative tw-w-full tw-overflow-hidden tw-rounded-2xl tw-border tw-py-7 tw-px-5 tw-text-center tw-text-[0.72rem] tw-font-black tw-tracking-[0.32em] tw-text-slate-100 tw-transition tw-duration-200 tw-backdrop-blur-md focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400 {avatar3dConfig.bodyType ===
								'alpha' ?
									'tw-border-cyan-400/70 tw-bg-[linear-gradient(165deg,rgba(0, 240, 255,0.22)_0%,rgba(15,23,42,0.75)_55%,rgba(0,0,0,0.65)_100%)] tw-shadow-[0_0_28px_rgba(0, 240, 255,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]'
								:	'tw-border-white/10 tw-bg-[linear-gradient(165deg,rgba(255,255,255,0.08)_0%,rgba(15,23,42,0.45)_50%,rgba(0,0,0,0.55)_100%)] hover:tw-border-white/25'}"
								aria-pressed={avatar3dConfig.bodyType === 'alpha'}
								onclick={() => {
									avatar3dConfig.bodyType = 'alpha';
								}}
							>
								<span class="tw-relative tw-z-[1]">TYPE ALPHA</span>
								<span
									class="tw-pointer-events-none tw-absolute tw-inset-0 tw-opacity-40 tw-bg-[radial-gradient(circle_at_30%_20%,rgba(0, 240, 255,0.35),transparent_55%)]"
									aria-hidden="true"
								></span>
							</button>
							<button
								type="button"
								class="operative-frame-toggle qa-mono tw-relative tw-w-full tw-overflow-hidden tw-rounded-2xl tw-border tw-py-7 tw-px-5 tw-text-center tw-text-[0.72rem] tw-font-black tw-tracking-[0.32em] tw-text-slate-100 tw-transition tw-duration-200 tw-backdrop-blur-md focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400 {avatar3dConfig.bodyType ===
								'bravo' ?
									'tw-border-cyan-400/70 tw-bg-[linear-gradient(165deg,rgba(0, 240, 255,0.22)_0%,rgba(15,23,42,0.75)_55%,rgba(0,0,0,0.65)_100%)] tw-shadow-[0_0_28px_rgba(0, 240, 255,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]'
								:	'tw-border-white/10 tw-bg-[linear-gradient(165deg,rgba(255,255,255,0.08)_0%,rgba(15,23,42,0.45)_50%,rgba(0,0,0,0.55)_100%)] hover:tw-border-white/25'}"
								aria-pressed={avatar3dConfig.bodyType === 'bravo'}
								onclick={() => {
									avatar3dConfig.bodyType = 'bravo';
								}}
							>
								<span class="tw-relative tw-z-[1]">TYPE BRAVO</span>
								<span
									class="tw-pointer-events-none tw-absolute tw-inset-0 tw-opacity-40 tw-bg-[radial-gradient(circle_at_70%_25%,rgba(167,139,250,0.3),transparent_50%)]"
									aria-hidden="true"
								></span>
							</button>
						</div>
					</div>

					<div
						class="tw-grid tw-items-stretch tw-gap-bento-md lg:tw-grid-cols-[minmax(0,1fr)_minmax(0,17.5rem)]"
					>
					<div class="tw-relative tw-min-h-[240px] tw-h-[min(48vw,320px)] lg:tw-min-h-[280px] lg:tw-h-[320px]">
						{#if browser}
							<OperativeAvatar3D
								config={avatar3dConfig}
								class="tw-h-full tw-border tw-border-white/10 tw-ring-1 tw-ring-cyan-500/10"
							/>
						{:else}
							<div
								class="tw-flex tw-h-full tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-dashed tw-border-white/12 tw-bg-slate-950/50 tw-text-center tw-text-sm tw-text-slate-500"
							>
								3D preview initializes on device…
							</div>
						{/if}
					</div>
					<div class="tw-flex tw-flex-col tw-justify-center tw-gap-6">
						<div>
							<p class="qa-eyebrow tw-mb-2">Skin tone</p>
							<div class="tw-flex tw-flex-wrap tw-gap-2">
								{#each AVATAR_SKIN_SWATCHES as hex (hex)}
									<button
										type="button"
										class="loadout-swatch tw-h-10 tw-w-10 tw-shrink-0 tw-rounded-full tw-border-2 tw-transition tw-duration-150 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400 {avatar3dConfig.skinTone ===
										hex ?
											'tw-border-cyan-400 tw-shadow-[0_0_14px_rgba(0, 240, 255,0.45)]'
										:	'tw-border-white/15 hover:tw-border-white/35'}"
										style={`background-color:${hex}`}
										aria-label={`Skin tone ${hex}`}
										aria-pressed={avatar3dConfig.skinTone === hex}
										onclick={() => {
											avatar3dConfig.skinTone = hex;
										}}
									></button>
								{/each}
							</div>
						</div>
						<div>
							<p class="qa-eyebrow tw-mb-2">Jersey</p>
							<div class="tw-flex tw-flex-wrap tw-gap-2">
								{#each AVATAR_JERSEY_SWATCHES as hex (hex)}
									<button
										type="button"
										class="loadout-swatch tw-h-10 tw-w-10 tw-shrink-0 tw-rounded-full tw-border-2 tw-transition tw-duration-150 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400 {avatar3dConfig.jerseyColor ===
										hex ?
											'tw-border-cyan-400 tw-shadow-[0_0_14px_rgba(0, 240, 255,0.45)]'
										:	'tw-border-white/15 hover:tw-border-white/35'}"
										style={`background-color:${hex}`}
										aria-label={`Jersey color ${hex}`}
										aria-pressed={avatar3dConfig.jerseyColor === hex}
										onclick={() => {
											avatar3dConfig.jerseyColor = hex;
										}}
									></button>
								{/each}
							</div>
						</div>
						<div>
							<p class="qa-eyebrow tw-mb-2">Cleats</p>
							<div class="tw-flex tw-flex-wrap tw-gap-2">
								{#each AVATAR_CLEAT_SWATCHES as hex (hex)}
									<button
										type="button"
										class="loadout-swatch tw-h-10 tw-w-10 tw-shrink-0 tw-rounded-full tw-border-2 tw-transition tw-duration-150 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400 {avatar3dConfig.cleatColor ===
										hex ?
											'tw-border-cyan-400 tw-shadow-[0_0_14px_rgba(0, 240, 255,0.45)]'
										:	'tw-border-white/15 hover:tw-border-white/35'}"
										style={`background-color:${hex}`}
										aria-label={`Cleat color ${hex}`}
										aria-pressed={avatar3dConfig.cleatColor === hex}
										onclick={() => {
											avatar3dConfig.cleatColor = hex;
										}}
									></button>
								{/each}
							</div>
						</div>
						<button
							type="button"
							class="qa-mono tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-border-emerald-400/45 tw-bg-[linear-gradient(165deg,rgba(52,211,153,0.18)_0%,rgba(6,78,59,0.35)_100%)] tw-py-4 tw-text-[0.68rem] tw-font-black tw-tracking-[0.28em] tw-text-emerald-50 tw-shadow-[0_0_24px_rgba(52,211,153,0.15)] tw-transition hover:tw-border-emerald-300/60 hover:tw-shadow-[0_0_32px_rgba(52,211,153,0.22)] disabled:tw-cursor-not-allowed disabled:tw-opacity-45"
							disabled={operativeAvatarSaveBusy || !playerEmailKey}
							onclick={() => void saveOperativeAvatarConfig()}
						>
							{operativeAvatarSaveBusy ? 'SYNCING…' : 'UPDATE OPERATIVE'}
						</button>
						<p class="qa-mono tw-m-0 tw-text-[0.58rem] tw-leading-relaxed tw-text-slate-500">
							Drag to orbit. Meshes load from <span class="tw-text-slate-400">/models/base_alpha.glb</span> and
							<span class="tw-text-slate-400">/models/base_bravo.glb</span>.
							<span class="tw-block tw-mt-1"
								>UPDATE OPERATIVE writes <span class="tw-text-slate-400">avatarConfig</span> on your Firestore user
								doc and updates <span class="tw-text-slate-400">authStore.userProfile</span>.</span
							>
						</p>
					</div>
					</div>
				</div>
			</div>

			<!-- Operative dossier (existing Pro card, glass shell) -->
			<div
				class="tw-rounded-2xl tw-bg-slate-900/60 tw-backdrop-blur-md tw-border tw-border-white/5 tw-overflow-hidden"
			>
				<p class="qa-mono tw-m-0 tw-border-b tw-border-white/5 tw-bg-black/30 tw-px-4 tw-py-3 tw-text-[0.65rem] tw-font-black tw-tracking-[0.2em] tw-text-cyan-200/90">
					OPERATIVE DOSSIER · FIELD CARD
				</p>
				<div class="tw-p-4">
					{#if playerEmailKey}
						<div class="album-dossier-card tw-max-w-md tw-mx-auto">
							<ProPlayerCard
								playerEmailKey={playerEmailKey}
								playerDisplayName={vaultDisplayName}
								operativeAvatar={profile?.operativeAvatar}
								rankLabel={rankLabel}
								telemetryTotalXp={totalXpHud.toLocaleString()}
								telemetryWorkouts=""
								telemetryJoinDate=""
							/>
						</div>
					{:else}
						<div
							class="tw-flex tw-min-h-[10rem] tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border tw-border-dashed tw-border-white/15 tw-bg-slate-950/50 tw-text-center tw-p-6"
						>
							<i class="ph ph-user-circle tw-text-4xl tw-text-slate-500" aria-hidden="true"></i>
							<p class="tw-m-0 tw-text-sm tw-font-bold tw-tracking-wide tw-text-slate-400">
								Sign in to bind your operative dossier card.
							</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Set folders (Monopoly Go–style stacks) -->
			<div>
				<p class="qa-eyebrow tw-mb-3">Sticker sets</p>
				<div class="bento-grid bento-grid--3col">
					{#each seasonOneSets as set (set.id)}
						{@const setCards = getSeasonOneCardsForSet(set.id)}
						{@const ownedHere = setCards.filter((c) => ownedSeasonOneCardIds.has(c.id)).length}
						<button
							type="button"
							class="album-folder tw-group tw-relative tw-flex tw-flex-col tw-items-stretch tw-rounded-2xl tw-border tw-bg-slate-900/60 tw-p-4 tw-text-left tw-backdrop-blur-md tw-transition tw-duration-200 focus:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-cyan-400/60 {selectedAlbumSetId ===
							set.id ?
								'tw-border-cyan-400/35 tw-ring-1 tw-ring-cyan-400/20 tw-shadow-[0_0_28px_rgba(0, 240, 255,0.12)]'
							:	'tw-border-white/5 hover:tw-border-white/15'}"
							onclick={() => (selectedAlbumSetId = set.id)}
							aria-pressed={selectedAlbumSetId === set.id}
						>
							<span class="album-folder__stack tw-mb-4 tw-self-center" aria-hidden="true">
								<span class="album-folder__sheet album-folder__sheet--back"></span>
								<span class="album-folder__sheet album-folder__sheet--mid"></span>
								<span class="album-folder__sheet album-folder__sheet--front"></span>
							</span>
							<span class="tw-font-black tw-text-base tw-tracking-wide tw-text-slate-100">{set.title}</span>
							<span class="tw-mt-1 tw-text-xs tw-leading-snug tw-text-slate-400">{set.tagline}</span>
							<span class="qa-mono tw-mt-3 tw-text-[0.7rem] tw-text-cyan-300/90">
								{ownedHere}
								<span class="tw-text-slate-600">/</span>
								{setCards.length}
								<span class="tw-text-slate-500"> in set</span>
							</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Active set slots -->
			<div
				class="tw-rounded-2xl tw-bg-slate-900/60 tw-backdrop-blur-md tw-border tw-border-white/5 tw-p-4 sm:tw-p-5"
			>
				<div class="tw-mb-5 tw-flex tw-flex-wrap tw-items-baseline tw-justify-between tw-gap-3">
					<div>
						<h2 class="tw-m-0 tw-text-lg tw-font-black tw-tracking-wide tw-text-white sm:tw-text-xl">
							{selectedAlbumSetMeta?.title ?? 'Set'}
						</h2>
						<p class="tw-m-0 tw-mt-1 tw-max-w-prose tw-text-sm tw-text-slate-400">
							{selectedAlbumSetMeta?.tagline ?? ''}
						</p>
					</div>
					<p class="qa-mono tw-m-0 tw-text-xs tw-text-slate-500">
						Set progress:
						<span class="tw-text-cyan-300">{selectedSetOwnedCount}</span>
						/{selectedAlbumCards.length}
					</p>
				</div>

				<div
					class="tw-grid tw-grid-cols-2 tw-gap-3 sm:tw-grid-cols-3 md:tw-grid-cols-4 lg:tw-grid-cols-5"
					aria-label="Sticker slots for selected set"
				>
					{#each selectedAlbumCards as card (card.id)}
						{@const rarityRing =
							card.rarity === 'Legendary' ?
								'tw-ring-2 tw-ring-amber-400/50 tw-shadow-[0_0_32px_rgba(251,191,36,0.25)]'
							: card.rarity === 'Epic' ?
								'tw-ring-2 tw-ring-fuchsia-500/35 tw-shadow-[0_0_28px_rgba(217,70,239,0.22)]'
							: card.rarity === 'Rare' ?
								'tw-ring-2 tw-ring-sky-400/40 tw-shadow-[0_0_24px_rgba(56,189,248,0.2)]'
							:	'tw-ring-1 tw-ring-slate-500/30'}
						{#if ownedSeasonOneCardIds.has(card.id)}
							<StickerVariantShell
								variant={card.variant}
								class="album-slot-card tw-rounded-xl tw-overflow-hidden tw-border tw-border-white/10 {rarityRing}"
							>
								{#snippet children()}
									<article
										class="tw-relative tw-flex tw-h-full tw-min-h-0 tw-flex-col tw-overflow-hidden tw-rounded-[inherit] tw-bg-slate-950/65"
									>
										<div class="tw-aspect-[280/380] tw-w-full tw-shrink-0 tw-overflow-hidden tw-bg-slate-900">
											<img
												src={card.imagePath}
												alt=""
												class="tw-h-full tw-w-full tw-object-cover"
												draggable="false"
											/>
										</div>
										<div class="tw-border-t tw-border-white/5 tw-bg-black/40 tw-p-2">
											<p class="tw-m-0 tw-truncate tw-text-xs tw-font-bold tw-text-slate-100">
												{card.name}
											</p>
											<p
												class="qa-mono tw-m-0 tw-mt-1 tw-text-[0.6rem] tw-uppercase tw-tracking-wider tw-text-cyan-300/85"
											>
												{card.rarity}
												<span class="tw-text-slate-500"> · </span>
												<span class="tw-text-emerald-300/90">{formatVariantLabel(card.variant)}</span>
											</p>
										</div>
									</article>
								{/snippet}
							</StickerVariantShell>
						{:else}
							<div
								class="album-slot-empty tw-flex tw-aspect-[280/380] tw-min-h-[8.5rem] tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-2 tw-border-dashed tw-border-slate-600/70 tw-bg-slate-950/80 tw-text-center tw-p-2"
								aria-label={`Locked slot · ${card.name} · ${formatVariantLabel(card.variant)}`}
							>
								<i class="ph ph-lock-key tw-text-2xl tw-text-slate-600" aria-hidden="true"></i>
								<p class="qa-mono tw-m-0 tw-text-[0.55rem] tw-font-bold tw-tracking-wider tw-text-slate-600">
									LOCKED
								</p>
								<p class="qa-mono tw-m-0 tw-max-w-full tw-px-1 tw-text-[0.5rem] tw-leading-tight tw-text-slate-500">
									{card.name}
									<span class="tw-text-slate-600"> · </span>
									{formatVariantLabel(card.variant)}
								</p>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		</section>
	{/if}
</div>

<style>
	/* Quartermaster — SIEM storefront (Path B) */
	.qa-root {
		--cyber: #00d4ff;
		--toxic: #39ff14;
		--border: rgba(255, 255, 255, 0.1);
		min-height: 0;
		box-sizing: border-box;
		padding: var(--bento-pad);
		color: #fafafa;
		background: #000;
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
		background: #05050a;
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
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr));
		gap: 1.1rem;
		align-items: stretch;
	}

	.qa-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 1.1rem 1.1rem 1.15rem;
		border: 1px solid var(--border);
		background: linear-gradient(165deg, #07070d 0%, #000 55%);
		box-shadow: inset 0 0 0 1px rgba(0, 212, 255, 0.08);
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

	/* ─── Sticker album · folder stack chrome ───────────────────────── */
	.album-folder__stack {
		position: relative;
		width: 6.5rem;
		height: 5rem;
	}

	.album-folder__sheet {
		position: absolute;
		left: 50%;
		width: 5.25rem;
		height: 4.25rem;
		border-radius: 0.55rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		transform: translateX(-50%);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	.album-folder__sheet--back {
		top: 0.35rem;
		background: linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.85) 100%);
		transform: translateX(-50%) rotate(-6deg);
		opacity: 0.65;
	}

	.album-folder__sheet--mid {
		top: 0.2rem;
		background: linear-gradient(145deg, rgba(51, 65, 85, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%);
		transform: translateX(-50%) rotate(3deg);
		opacity: 0.82;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
	}

	.album-folder__sheet--front {
		top: 0;
		background: linear-gradient(
			155deg,
			rgba(56, 189, 248, 0.12) 0%,
			rgba(15, 23, 42, 0.92) 48%,
			rgba(2, 6, 23, 0.95) 100%
		);
		transform: translateX(-50%) rotate(0deg);
		box-shadow:
			0 10px 28px rgba(0, 0, 0, 0.45),
			inset 0 0 0 1px rgba(0, 240, 255, 0.15);
	}

	.album-folder:hover .album-folder__sheet--front {
		box-shadow:
			0 12px 32px rgba(0, 0, 0, 0.5),
			0 0 24px rgba(0, 240, 255, 0.12),
			inset 0 0 0 1px rgba(0, 240, 255, 0.22);
	}

	.album-dossier-card :global(.pro-card-outer) {
		margin: 0 auto;
	}
</style>
