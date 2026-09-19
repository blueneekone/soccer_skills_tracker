<script lang="ts">
    import type { RewardsEngine } from './RewardsEngine.svelte.js';
    import Icon from '$lib/components/ui/Icon.svelte';
    import type { IconName } from '$lib/icons/registry.js';
    
    let { engine }: { engine: RewardsEngine } = $props();
</script>

<div class="tw-bg-[#0f172a] tw-p-4 tw-rounded-[24px] tw-border tw-border-slate-800 tw-flex tw-items-center tw-justify-between">
    <div class="tw-flex tw-items-center tw-gap-3">
        <Icon name={"status.shield-check" as IconName} size={24} />
        <div>
            <h2 class="tw-text-[#fafafa] tw-font-bold tw-text-lg">Tremendous Rewards</h2>
            <p class="tw-text-[#A1A1AA] tw-text-sm">Manage API-driven rewards and milestones.</p>
        </div>
    </div>
    
    <div class="tw-flex tw-items-center tw-gap-4">
        <label class="tw-flex tw-items-center tw-gap-2 tw-cursor-pointer">
            <span class="tw-text-sm tw-text-[#fafafa] tw-font-mono tw-tracking-widest">AUTO-APPROVE REWARDS</span>
            <input 
                type="checkbox" 
                checked={engine.autoApprove}
                onchange={() => {
                    engine.toggleAutoApprove();
                }}
                disabled={engine.saving}
                class="tw-w-5 tw-h-5 tw-accent-[#fbbf24]"
            />
        </label>
        
        <button 
            type="button" 
            class="tw-bg-[#fbbf24] tw-text-[#000000] tw-font-bold tw-px-4 tw-py-2 tw-rounded-[24px] tw-text-sm hover:tw-shadow-[0_0_15px_rgba(251,191,36,0.3)] disabled:tw-opacity-50"
            disabled={engine.saving}
        >
            Manual Approval Queue
        </button>
    </div>
</div>
