<script lang="ts">
	import type { ArmoryStudioEngine } from './ArmoryEngine.svelte.js';

	interface Props {
		engine: ArmoryStudioEngine;
		CATALOG: any[];
	}

	let { engine, CATALOG }: Props = $props();
</script>

<h2 class="tw-font-mono tw-text-base tw-text-[#cbd5e1] tw-m-0 tw-mb-4 tw-uppercase">Requisition Log</h2>
<div class="tw-flex tw-flex-col tw-gap-3">
	{#each CATALOG as item}
		{@const isUnlocked = !item.isPremium || engine.unlockedCosmetics.includes(item.id)}
		{@const isEquipped = engine.equipped[item.type] === item.id}
		
		<div class="tw-flex tw-justify-between tw-items-center tw-p-3 tw-bg-[#0f172a] tw-rounded-lg tw-border tw-border-white/5 tw-transition-all tw-duration-200 {(!isUnlocked) ? 'tw-opacity-40 tw-grayscale' : ''} {isEquipped ? 'tw-border-[#14b8a6] tw-bg-[#14b8a6]/5' : ''}">
			<div class="tw-flex tw-flex-col">
				<span class="tw-font-mono tw-text-sm tw-text-[#f8fafc]">{item.name}</span>
				<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-uppercase">{item.type}</span>
			</div>
			<div class="tw-flex tw-items-center">
				{#if isUnlocked}
					<button class="tw-font-mono tw-text-xs tw-px-3 tw-py-1.5 tw-rounded tw-cursor-pointer tw-uppercase tw-font-bold tw-border-none {isEquipped ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-[#334155] tw-text-[#f8fafc]'}" onclick={() => engine.equipItem(item)}>
						{isEquipped ? 'Equipped' : 'Equip'}
					</button>
				{:else}
					<button class="tw-font-mono tw-text-xs tw-px-3 tw-py-1.5 tw-rounded tw-cursor-pointer tw-uppercase tw-font-bold tw-border-none tw-bg-[#f59e0b] tw-text-black" onclick={() => engine.unlockItem(item.id)}>
						{item.cost} XP
					</button>
				{/if}
			</div>
		</div>
	{/each}
</div>
