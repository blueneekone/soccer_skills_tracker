<script lang="ts">
    import { enhance } from '$app/forms';

    let { form } = $props();
    let isProcessing = $state(false);

    let cells = [
        { id: 'cell-alpha', status: 'active', load: '45%' },
        { id: 'cell-beta', status: 'active', load: '12%' },
        { id: 'cell-gamma', status: 'active', load: '89%' }
    ];

    let targetTenantId = $state('');
    let targetCellId = $state('');
</script>

<div class="tw-p-8 tw-bg-[#0a0a0a] tw-text-[#f8fafc] tw-min-h-[100dvh] tw-font-sans tw-rounded-none">
    <h1 class="tw-text-2xl tw-font-bold tw-text-[#14b8a6] tw-mb-6 tw-uppercase tw-tracking-wider">Cell Migrations Console</h1>

    <div class="tw-grid tw-grid-cols-12 tw-gap-4">
        <!-- Cells Grid -->
        <div class="tw-col-span-12 lg:tw-col-span-6 tw-border tw-border-[#334155] tw-bg-black tw-p-6 tw-rounded-none">
            <h2 class="tw-text-lg tw-font-bold tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-2">Active Tenant Cells</h2>
            <div class="tw-flex tw-flex-col tw-gap-3">
                {#each cells as cell}
                    <div class="tw-flex tw-justify-between tw-items-center tw-p-3 tw-bg-[#111] tw-border tw-border-[#334155] tw-rounded-none">
                        <span class="tw-font-mono tw-text-sm">{cell.id}</span>
                        <span class="tw-text-xs tw-uppercase tw-px-2 tw-py-1 {cell.status === 'active' ? 'tw-bg-[#14b8a6] tw-text-black' : 'tw-bg-amber-500 tw-text-black'} tw-font-bold">
                            {cell.status}
                        </span>
                        <span class="tw-font-mono tw-text-sm tw-text-slate-400">Load: {cell.load}</span>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Migrations and Metrics Grid -->
        <div class="tw-col-span-12 lg:tw-col-span-6 tw-border tw-border-[#334155] tw-bg-black tw-p-6 tw-rounded-none tw-flex tw-flex-col tw-gap-6">

            <div>
                <h2 class="tw-text-lg tw-font-bold tw-mb-4 tw-border-b tw-border-[#334155] tw-pb-2">Execute Migration (Dry-Run Mode)</h2>

                <form method="POST" action="?/migrateCell" class="tw-flex tw-flex-col tw-gap-4" use:enhance={() => {
                    isProcessing = true;
                    return async ({ update }) => {
                        await update();
                        isProcessing = false;
                    };
                }}>
                    <div class="tw-flex tw-gap-4">
                        <input
                            type="text"
                            name="tenantId"
                            placeholder="Tenant ID (e.g. club-123)"
                            bind:value={targetTenantId}
                            class="tw-flex-1 tw-bg-[#0a0a0a] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-text-white tw-px-3 tw-py-2 tw-text-sm tw-font-mono tw-rounded-none tw-outline-none"
                            required
                        />
                        <select
                            name="targetCell"
                            bind:value={targetCellId}
                            class="tw-flex-1 tw-bg-[#0a0a0a] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-text-white tw-px-3 tw-py-2 tw-text-sm tw-font-mono tw-rounded-none tw-outline-none"
                            required
                        >
                            <option value="" disabled>Select Target Cell</option>
                            {#each cells as cell}
                                <option value={cell.id}>{cell.id}</option>
                            {/each}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={isProcessing || !targetTenantId || !targetCellId}
                        class="tw-w-full tw-bg-amber-600 hover:tw-bg-amber-500 disabled:tw-bg-slate-700 tw-text-white tw-font-bold tw-py-3 tw-px-4 tw-rounded-none tw-transition-colors"
                    >
                        {isProcessing ? 'Processing Migration...' : 'Trigger Cell Cutover'}
                    </button>
                </form>

                {#if form}
                    <div class="tw-mt-6 tw-p-4 tw-border tw-rounded-none tw-font-mono tw-text-sm {form.success ? 'tw-bg-green-900 tw-text-green-200 tw-border-green-500' : 'tw-bg-red-900 tw-text-red-200 tw-border-red-500'}">
                        {#if form.success}
                            <div class="tw-font-bold tw-uppercase tw-mb-2">✔ Migration Successfully Handled</div>
                            <div class="tw-opacity-80">>{form.auditLog}</div>
                        {:else}
                            <div class="tw-font-bold tw-uppercase tw-mb-2">✖ Migration Failed</div>
                            <div class="tw-opacity-80">>{form.message}</div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
