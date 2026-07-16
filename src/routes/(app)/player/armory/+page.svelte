<script lang="ts">
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { getFunctions as getFns, httpsCallable as httpsCall } from 'firebase/functions';

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
		if (authStore.isLoading || !authStore.user?.uid) return;
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

<div class="armory-studio">
	<header class="armory__header">
		<h1 class="armory__title">Avatar Studio</h1>
		<div class="armory__economy">
			<span class="grit-label">Grit XP</span>
			<span class="grit-value">{gritXp.toLocaleString()}</span>
		</div>
	</header>

	<div class="bento-grid">
		<!-- Hero Canvas (bento-span-8) -->
		<section class="bento-card bento-span-8 armory__hero">
			<div class="canvas-wrapper">
				<canvas bind:this={canvasRef} width="400" height="500"></canvas>
			</div>
			<div class="color-engine">
				<p class="color-title">Accent Core</p>
				<button 
					class="color-btn cyan" 
					class:active={accentColor === '#14b8a6'} 
					onclick={() => accentColor = '#14b8a6'}
					aria-label="Data Cyan"
				></button>
				<button 
					class="color-btn amber" 
					class:active={accentColor === '#f59e0b'} 
					onclick={() => accentColor = '#f59e0b'}
					aria-label="Atompunk Amber"
				></button>
			</div>
		</section>

		<!-- Gear Unlocks (bento-span-4) -->
		<section class="bento-card bento-span-4 armory__gear">
			<h2 class="gear-title">Requisition Log</h2>
			<div class="gear-list">
				{#each CATALOG as item}
					{@const isUnlocked = !item.isPremium || unlockedCosmetics.includes(item.id)}
					{@const isEquipped = equipped[item.type] === item.id}
					
					<div class="gear-item" class:locked={!isUnlocked} class:equipped={isEquipped}>
						<div class="gear-info">
							<span class="gear-name">{item.name}</span>
							<span class="gear-type">{item.type}</span>
						</div>
						<div class="gear-actions">
							{#if isUnlocked}
								<button class="btn btn-equip" onclick={() => equipItem(item)}>
									{isEquipped ? 'Equipped' : 'Equip'}
								</button>
							{:else}
								<button class="btn btn-unlock" onclick={() => unlockItem(item.id)}>
									{item.cost} XP
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<style>
	.armory-studio {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		background: #000000;
		min-height: 100vh;
	}

	.armory__header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 16px;
	}

	.armory__title {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 1.5rem;
		text-transform: uppercase;
		color: #f8fafc;
		margin: 0;
	}

	.armory__economy {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.grit-label {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.75rem;
		color: #94a3b8;
		text-transform: uppercase;
	}

	.grit-value {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 1.25rem;
		color: #f59e0b; /* Atompunk Amber for currency */
		font-weight: 700;
	}

	.bento-grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 16px;
	}

	.bento-card {
		background: #020617;
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 24px;
	}

	.bento-span-8 { grid-column: span 8; }
	.bento-span-4 { grid-column: span 4; }

	.armory__hero {
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		min-height: 500px;
	}

	.canvas-wrapper {
		width: 400px;
		height: 500px;
		background: #000000; /* Void Contract */
		border-radius: 8px;
		box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
		overflow: hidden;
	}

	.color-engine {
		position: absolute;
		bottom: 24px;
		left: 24px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.color-title {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.75rem;
		color: #64748b;
		margin: 0;
	}

	.color-btn {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		transition: all 0.2s;
	}

	.color-btn.cyan { background: #14b8a6; }
	.color-btn.amber { background: #f59e0b; }

	.color-btn.active {
		border-color: #ffffff;
		box-shadow: 0 0 10px currentColor;
	}

	.gear-title {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 1rem;
		color: #cbd5e1;
		margin: 0 0 16px 0;
		text-transform: uppercase;
	}

	.gear-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.gear-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		background: #0f172a;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		transition: all 0.2s;
	}

	.gear-item.locked {
		opacity: 0.4;
		filter: grayscale(100%);
	}

	.gear-item.equipped {
		border-color: #14b8a6;
		background: rgba(20, 184, 166, 0.05);
	}

	.gear-info {
		display: flex;
		flex-direction: column;
	}

	.gear-name {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.875rem;
		color: #f8fafc;
	}

	.gear-type {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.65rem;
		color: #64748b;
		text-transform: uppercase;
	}

	.btn {
		font-family: var(--font-mono, 'Geist Mono', monospace);
		font-size: 0.75rem;
		padding: 6px 12px;
		border-radius: 4px;
		cursor: pointer;
		text-transform: uppercase;
		font-weight: bold;
		border: none;
	}

	.btn-unlock {
		background: #f59e0b;
		color: #000000;
	}

	.btn-equip {
		background: #334155;
		color: #f8fafc;
	}

	.gear-item.equipped .btn-equip {
		background: #14b8a6;
		color: #000000;
	}
</style>
