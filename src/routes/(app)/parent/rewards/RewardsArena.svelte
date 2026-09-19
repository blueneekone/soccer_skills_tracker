<script lang="ts">
    import type { RewardsEngine } from './RewardsEngine.svelte.js';
    
    let { engine }: { engine: RewardsEngine } = $props();
</script>

<div class="tw-bg-[#0B0F19] tw-min-h-0 tw-flex-1 tw-p-[clamp(16px,2vw,32px)] tw-rounded-[24px]">
    {#if engine.error}
        <div class="tw-bg-[#f59e0b] tw-text-[#000000] tw-p-3 tw-mb-4 tw-rounded-md tw-font-mono tw-text-sm">
            {engine.error}
        </div>
    {/if}

    <div class="tw-mb-6">
        <label class="tw-block tw-text-[#A1A1AA] tw-text-xs tw-font-bold tw-uppercase tw-mb-2">Funding Source ID</label>
        <input 
            type="text" 
            bind:value={engine.fundingSourceId}
            placeholder="Enter payment method ID"
            class="tw-bg-[#0f172a] tw-text-[#fafafa] tw-border tw-border-slate-800 tw-p-2 tw-rounded-md tw-w-full md:tw-w-1/3 tw-font-mono"
        />
        <p class="tw-text-[#D4D4D8] tw-text-xs tw-mt-1">Parents must fund their own rewards.</p>
    </div>

    <!-- 12-column Bento Grid constraint implementation -->
    <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-12 tw-gap-[clamp(16px,2vw,24px)]">
        {#if engine.loading}
            <div class="tw-col-span-12 tw-text-[#fafafa] tw-font-mono tw-text-sm">Loading catalog...</div>
        {:else if engine.rewards.length === 0}
            <div class="tw-col-span-12 tw-text-[#A1A1AA] tw-font-mono tw-text-sm">No campaigns available.</div>
        {:else}
            {#each engine.rewards as reward (reward.id)}
                <div class="tw-col-span-1 md:tw-col-span-6 lg:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-rounded-[24px] tw-p-[clamp(16px,1.5vw,24px)] tw-flex tw-flex-col hover:tw-border-[#daff0a] hover:tw-shadow-[0_0_15px_rgba(218,255,10,0.15)] tw-transition-all">
                    <h3 class="tw-text-[#fafafa] tw-font-bold tw-text-lg">{reward.name}</h3>
                    <p class="tw-text-[#D4D4D8] tw-text-sm tw-mt-2 tw-flex-1">{reward.description || 'Digital Gift Card'}</p>
                    
                    <button 
                        type="button"
                        class="tw-mt-6 tw-bg-[#0f172a] tw-text-[#fafafa] tw-font-mono tw-text-xs tw-px-3 tw-py-2 tw-rounded-md hover:tw-bg-slate-700 disabled:tw-opacity-50"
                        disabled={engine.saving}
                        onclick={() => engine.issueReward(reward.id, 10, 'child_1', 'milestone_1')}
                    >
                        Issue $10 Reward
                    </button>
                </div>
            {/each}
        {/if}
    </div>
</div>
