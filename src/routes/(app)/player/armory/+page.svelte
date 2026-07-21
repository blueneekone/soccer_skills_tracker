<script lang="ts">
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { getFunctions as getFns, httpsCallable as httpsCall } from 'firebase/functions';
	import { browser } from '$app/environment';

	// Mock catalog
	const CATALOG = [
		{ id: 'M-HAIR-PLASMA-MOHAWK', name: 'Plasma Mohawk', cost: 500, type: 'head', isPremium: true },
		{ id: 'F-HAIR-PLASMA-MOHAWK', name: 'Plasma Mohawk', cost: 500, type: 'head', isPremium: true },
		{ id: 'GEAR-TORSO-CYBER', name: 'Cyber Torso', cost: 1200, type: 'torso', isPremium: true },
		{ id: 'GEAR-BOOTS-NEON', name: 'Neon Cleats', cost: 800, type: 'footwear', isPremium: true },
		{ id: 'DEFAULT-BASE', name: 'Standard Issue Base', cost: 0, type: 'base', isPremium: false },
	];

	let loading = $state(true);
	let gritXp = $state(0);
	let unlockedCosmetics = $state<string[]>([]);
	let equipped = $state<Record<string, string>>({
		base: 'DEFAULT-BASE',
		torso: '',
		footwear: '',
		head: '',
		expression: ''
	});

	let accentColor = $state('#14b8a6'); // Data Cyan
	let canvasRef: HTMLCanvasElement;

	const profile = $derived(authStore.userProfile);

	$effect(() => {
		if (!browser || authStore.isLoading || !authStore.user?.uid || !db) return;
		const uid = authStore.user.uid;
		const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
			loading = false;
			if (snap.exists()) {
				const d = snap.data();
				gritXp = d.xp || 0;
				unlockedCosmetics = d.unlocked_cosmetics || [];
				if (d.avatar_loadout) {
					equipped = { ...equipped, ...d.avatar_loadout };
				}
			}
		});
		return () => unsub();
	});

	// Avatar Rendering Engine
	$effect(() => {
		const ctx = canvasRef?.getContext('2d');
		if (!ctx) return;

		const currentEquipped = equipped;
		const currentAccent = accentColor;

		untrack(() => {
			let destroyed = false;

			// Clear Canvas (Void Contract >=40% black)
			ctx.fillStyle = '#020617';
			ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);

			// Render Background
			ctx.fillStyle = '#000000';
			ctx.fillRect(20, 20, canvasRef.width - 40, canvasRef.height - 40);

			// Universal Joint Map & Z-Index Layering
			// Order: Base Geometry -> Torso -> Footwear -> Head -> Expression
			const layers = [
				{ id: currentEquipped.base, type: 'base', yOffset: 100 },
				{ id: currentEquipped.torso, type: 'torso', yOffset: 150 },
				{ id: currentEquipped.footwear, type: 'footwear', yOffset: 300 },
				{ id: currentEquipped.head, type: 'head', yOffset: 50 },
				{ id: currentEquipped.expression, type: 'expression', yOffset: 50 }
			];

			layers.forEach(layer => {
				if (!layer.id) return;
				
				// Mock rendering a block for the layer to simulate the joints
				ctx.fillStyle = '#1e293b'; // Base gray for gear
				if (layer.type === 'base') ctx.fillStyle = '#334155';
				
				// Mock Universal Joint anchor positioning
				const width = layer.type === 'torso' ? 100 : (layer.type === 'head' ? 60 : 40);
				const height = layer.type === 'torso' ? 120 : 60;
				const xAnchor = (canvasRef.width / 2) - (width / 2);
				
				ctx.fillRect(xAnchor, layer.yOffset, width, height);

				// Apply Accent Color Engine to 'premium' gears
				const asset = CATALOG.find(a => a.id === layer.id);
				if (asset?.isPremium) {
					ctx.strokeStyle = currentAccent;
					ctx.lineWidth = 2;
					ctx.strokeRect(xAnchor, layer.yOffset, width, height);
					
					// Glowing piping
					ctx.shadowColor = currentAccent;
					ctx.shadowBlur = 10;
					ctx.strokeRect(xAnchor + 2, layer.yOffset + 2, width - 4, height - 4);
					ctx.shadowBlur = 0; // Reset
				}
			});

			return () => {
				destroyed = true;
				ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
			};
		});
	});

	async function unlockItem(assetId: string) {
		const fns = getFns();
		const unlockFn = httpsCall(fns, 'unlockAvatarComponent');
		try {
			await unlockFn({ assetId });
			// The onSnapshot will update the local unlocked state
		} catch (err) {
			console.error('Failed to unlock:', err);
		}
	}

	async function equipItem(item: any) {
		if (item.isPremium && !unlockedCosmetics.includes(item.id)) return;
		equipped = { ...equipped, [item.type]: item.id };
		
		const fns = getFns();
		const saveFn = httpsCall(fns, 'saveActiveLoadout');
		try {
			await saveFn({ loadout: equipped });
		} catch (err) {
			console.error('Failed to save loadout:', err);
		}
	}
</script>

<main class="tw-bg-[#000000] tw-min-h-screen tw-text-white tw-font-sans tw-p-6 lg:tw-p-8 tw-flex tw-flex-col tw-gap-8">
	<header class="tw-flex tw-justify-between tw-items-end tw-border-b tw-border-white/10 tw-pb-4">
		<h1 class="tw-font-mono tw-text-2xl tw-uppercase tw-text-[#f8fafc] tw-m-0">Avatar Studio</h1>
		<div class="tw-flex tw-items-baseline tw-gap-2">
			<span class="tw-font-mono tw-text-xs tw-text-[#94a3b8] tw-uppercase">Grit XP</span>
			<span class="tw-font-mono tw-text-xl tw-font-bold tw-text-[#f59e0b]">{gritXp.toLocaleString()}</span>
		</div>
	</header>

	<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-8" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));">
		<!-- Hero Canvas (bento-span-8) -->
		<section class="lg:tw-col-span-8 tw-bg-[#0f172a] tw-p-8 tw-relative tw-flex tw-items-center tw-justify-center tw-min-h-[500px]" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
			<div class="tw-w-[400px] tw-h-[500px] tw-bg-[#000000] tw-rounded-lg tw-shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] tw-overflow-hidden">
				<canvas bind:this={canvasRef} width="400" height="500"></canvas>
			</div>
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
			<h2 class="tw-font-mono tw-text-base tw-text-[#cbd5e1] tw-m-0 tw-mb-4 tw-uppercase">Requisition Log</h2>
			<div class="tw-flex tw-flex-col tw-gap-3">
				{#each CATALOG as item}
					{@const isUnlocked = !item.isPremium || unlockedCosmetics.includes(item.id)}
					{@const isEquipped = equipped[item.type] === item.id}
					
					<div class="tw-flex tw-justify-between tw-items-center tw-p-3 tw-bg-[#0f172a] tw-rounded-lg tw-border tw-border-white/5 tw-transition-all tw-duration-200 {(!isUnlocked) ? 'tw-opacity-40 tw-grayscale' : ''} {isEquipped ? 'tw-border-[#14b8a6] tw-bg-[#14b8a6]/5' : ''}">
						<div class="tw-flex tw-flex-col">
							<span class="tw-font-mono tw-text-sm tw-text-[#f8fafc]">{item.name}</span>
							<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-uppercase">{item.type}</span>
						</div>
						<div class="tw-flex tw-items-center">
							{#if isUnlocked}
								<button class="tw-font-mono tw-text-xs tw-px-3 tw-py-1.5 tw-rounded tw-cursor-pointer tw-uppercase tw-font-bold tw-border-none {isEquipped ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-[#334155] tw-text-[#f8fafc]'}" onclick={() => equipItem(item)}>
									{isEquipped ? 'Equipped' : 'Equip'}
								</button>
							{:else}
								<button class="tw-font-mono tw-text-xs tw-px-3 tw-py-1.5 tw-rounded tw-cursor-pointer tw-uppercase tw-font-bold tw-border-none tw-bg-[#f59e0b] tw-text-black" onclick={() => unlockItem(item.id)}>
									{item.cost} XP
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>
	</div>
</main>
