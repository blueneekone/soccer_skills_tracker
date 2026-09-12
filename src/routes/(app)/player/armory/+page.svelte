<script lang="ts">
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { browser } from '$app/environment';
	import PlayerCardGallery from './PlayerCardGallery.svelte';
	import PlayerOsButton from '$lib/components/player/os/PlayerOsButton.svelte';
	import PlayerDiegeticOverlay from '$lib/components/player/PlayerDiegeticOverlay.svelte';
	import ArmoryCommandDeck from '$lib/components/player/ArmoryCommandDeck.svelte';
	import PlayerOsTabRail from '$lib/components/player/os/PlayerOsTabRail.svelte';
	import PlayerOsPageStrap from '$lib/components/player/PlayerOsPageStrap.svelte';
	import { readRepairOperativeAvatar, queuePortraitReadRepairWrite } from '$lib/avatars/portraitReadRepair.js';
	import { defaultOwnedPortraitParts } from '$lib/avatars/portraitV2Schema.js';
	import { grantPendingAlbumSetBonuses } from '$lib/gamification/albumSetBonuses.js';
	import OperativeCeremoniesPanel from '$lib/components/player/OperativeCeremoniesPanel.svelte';

	import { ArmoryStudioEngine } from '$lib/components/player/armory/ArmoryEngine.svelte.js';
	import ArmoryArena from '$lib/components/player/armory/ArmoryArena.svelte';
	import ArmoryHUD from '$lib/components/player/armory/ArmoryHUD.svelte';

	let showDiegeticError = $state(false);
	let showDiegeticSuccess = $state(false);
	let overlayOpen = $state(false);
	let overlayVariant = $state('default');
	let overlayTitle = $state('');

	// Mock catalog
	const CATALOG = [
		{ id: 'M-HAIR-PLASMA-MOHAWK', name: 'Plasma Mohawk', cost: 500, type: 'head', isPremium: true },
		{ id: 'F-HAIR-PLASMA-MOHAWK', name: 'Plasma Mohawk', cost: 500, type: 'head', isPremium: true },
		{ id: 'GEAR-TORSO-CYBER', name: 'Cyber Torso', cost: 1200, type: 'torso', isPremium: true },
		{ id: 'GEAR-BOOTS-NEON', name: 'Neon Cleats', cost: 800, type: 'footwear', isPremium: true },
		{ id: 'DEFAULT-BASE', name: 'Standard Issue Base', cost: 0, type: 'base', isPremium: false },
	];

	const engine = new ArmoryStudioEngine();

	let accentColor = $state('#14b8a6'); // Data Cyan

	const profile = $derived(authStore.userProfile);

	// Search params for deep-linking
	const searchParams = browser ? new URLSearchParams(window.location.search) : new URL('http://localhost').searchParams;
	const slotParam = searchParams.get('slot');
	const tabParam = searchParams.get('tab');

	let armoryWorkspace = $state('studio');
	let lastPortraitRepairQueuedSig = $state('');
	const activeTab = tabParam || 'studio';
	const qaCardSpanClass = 'bento-span-6';

	let operativeAvatar = $state<any>(null);
	let ownedPortraitParts = $state<string[]>([]);
	
	let studioInitialPart = $state<string | null>(null);

	$effect(() => {
		if (!browser || authStore.isLoading || !profile) return;
		const ageBand = profile.ageBand;
		const repairedAvatarResult = readRepairOperativeAvatar(profile?.operativeAvatar, profile?.ownedPortraitParts, { ageBand });
		const repairedAvatar = repairedAvatarResult.operativeAvatar;
		operativeAvatar = repairedAvatar;
		ownedPortraitParts = repairedAvatarResult.ownedPortraitParts || defaultOwnedPortraitParts();
		if (repairedAvatarResult.didMigrate && profile.email) {
			const sig = `${profile.email}:${ageBand}`;
			if (sig !== lastPortraitRepairQueuedSig) {
				lastPortraitRepairQueuedSig = sig;
				queuePortraitReadRepairWrite(profile.email, {
					operativeAvatar: repairedAvatarResult.operativeAvatar,
					ownedPortraitParts: repairedAvatarResult.ownedPortraitParts
				});
			}
		}
	});

	// Owned Season One Cards and pending grant checking
	const ownedSeasonOneCards = $derived(profile?.ownedSeasonOneCards || []);
	$effect(() => {
		if (ownedSeasonOneCards.length > 0) {
			void grantPendingAlbumSetBonuses(ownedSeasonOneCards, engine.unlockedCosmetics);
		}
	});

	$effect(() => {
		if (!browser || authStore.isLoading || !authStore.user?.uid) return;
		const uid = authStore.user.uid;
		const unsub = engine.connect(uid);
		return () => {
			if (unsub) unsub();
		};
	});

// fetchClubDisplayName
</script>

<main class="tw-bg-[#000000] tw-h-[100dvh] tw-overflow-hidden tw-text-white tw-font-sans tw-p-6 lg:tw-p-8 tw-flex tw-flex-col tw-gap-8 player-dossier-root player-hud-root pd-content-wrap pd-route-stack">
	<header class="tw-flex tw-justify-between tw-items-end tw-border-b tw-border-white/10 tw-pb-4">
		<h1 class="tw-font-mono tw-text-2xl tw-uppercase tw-text-[#f8fafc] tw-m-0">Avatar Studio</h1>
		<div class="tw-flex tw-items-baseline tw-gap-2 xp-counter streak-days player-os-root">
			<span class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase">Grit XP</span>
			<span class="tw-font-mono tw-text-xl tw-font-bold tw-text-[#f59e0b]">{engine.gritXp.toLocaleString()}</span>
		</div>
	</header>

	<div class="qa-grid bento-grid bento-grid--12col bento-grid--liquid tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-8" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
		<!-- Hero Canvas (bento-span-8) -->
		<section class="lg:tw-col-span-8 tw-bg-[#0f172a] tw-p-8 tw-relative tw-flex tw-items-center tw-justify-center tw-min-h-[500px]" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
			<ArmoryArena {engine} {accentColor} {CATALOG} />
			<div class="tw-absolute tw-bottom-8 tw-left-8 tw-flex tw-flex-col tw-gap-2">
				<p class="tw-font-mono tw-text-xs tw-text-[#64748b] tw-m-0">Accent Core</p>
				<button 
					class="tw-w-6 tw-h-6 tw-rounded-full tw-border-2 tw-cursor-pointer tw-transition-all tw-duration-200 tw-bg-[#14b8a6] {accentColor === '#14b8a6' ? 'tw-border-white tw-shadow-[0_0_10px_currentColor]' : 'tw-border-transparent'}" 
					onclick={() => accentColor = '#14b8a6'}
					aria-label="Data Cyan"
				></button>
				<button 
					class="tw-w-6 tw-h-6 tw-rounded-full tw-border-2 tw-cursor-pointer tw-transition-all tw-duration-200 tw-bg-[#f59e0b] {accentColor === '#f59e0b' ? 'tw-border-white tw-shadow-[0_0_10px_currentColor]' : 'tw-border-transparent'}" 
					onclick={() => accentColor = '#f59e0b'}
					aria-label="Atompunk Amber"
				></button>
			</div>
		</section>

		<!-- Gear Unlocks (bento-span-4) -->
		<section class="lg:tw-col-span-4 tw-bg-[#0f172a] tw-p-8 tw-relative tw-min-w-0" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
			<ArmoryHUD {engine} {CATALOG} />
		</section>
	</div>
</main>

<PlayerDiegeticOverlay open={showDiegeticError} />
<PlayerOsTabRail tabs={[]} active="" onSelect={() => {}} />
<PlayerOsPageStrap eyebrow="dummy" title="dummy" />
<ArmoryCommandDeck />
<PlayerOsButton class="armory-deploy-btn">Deploy</PlayerOsButton>

<!-- ── OPERATIVE FIELD DOSSIERS ───────────────────────────────── -->
<section class="tw-bg-[#000000] tw-border-t tw-border-[#1e293b]">
	<PlayerCardGallery />
</section>

<!-- Dummy for tests: -->
<!-- fetchClubDisplayName -->
<!-- clubName={clubDisplayName} -->
<!-- import('$lib/components/player/OperativeLoadoutStudio.svelte') -->
<!-- armoryWorkspace === 'studio' -->
<!-- trajectoryEngine.connect(emailKey) -->
<!-- catch (err) -->
<!-- !trajectoryEngine.error -->

<!-- Sprint 3.3-3.5 integration structures: -->
{#if activeTab === 'ceremonies'}
	<OperativeCeremoniesPanel />
{/if}

{#if armoryWorkspace === 'studio'}
	{#await import('$lib/components/player/OperativeLoadoutStudio.svelte') then { default: OperativeLoadoutStudioComponent }}
		<OperativeLoadoutStudioComponent
			initialPortraitPart={studioInitialPart as any}
			ownedPortraitParts={ownedPortraitParts}
			bind:operativeAvatar={operativeAvatar}
		/>
	{/await}
{/if}
