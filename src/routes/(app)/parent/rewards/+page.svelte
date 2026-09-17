<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { RewardsEngine } from './RewardsEngine.svelte.js';
    import RewardsHUD from './RewardsHUD.svelte';
    import RewardsArena from './RewardsArena.svelte';
    
    let engine = new RewardsEngine();

    onDestroy(() => {
        engine.cleanup();
    });
</script>

<svelte:head>
    <title>Rewards | Parent OS</title>
</svelte:head>

<div class="tw-h-[100dvh] tw-overflow-hidden tw-bg-[#0B0F19] tw-flex tw-flex-col tw-p-[clamp(16px,2vw,32px)] tw-gap-6">
    <RewardsHUD {engine} />
    <RewardsArena {engine} />
</div>
