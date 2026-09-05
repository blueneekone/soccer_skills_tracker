<script lang="ts">
    import { enhance } from '$app/forms';

    let { form } = $props();

    let discrepancies = $state([
        { clubId: 'club-123', name: 'FC Elite', activeSeats: 45, stripeSeats: 40, status: 'discrepancy' },
        { clubId: 'club-456', name: 'Metro SC', activeSeats: 120, stripeSeats: 120, status: 'synced' },
        { clubId: 'club-789', name: 'Valley Rush', activeSeats: 60, stripeSeats: 0, status: 'missing_sub' }
    ]);

    let processingClub = $state<string | null>(null);

    // Reactively update the table if a mock sync succeeds
    $effect(() => {
        if (form?.success && form.syncedClubId) {
            discrepancies = discrepancies.map(d => {
                if (d.clubId === form.syncedClubId) {
                    return { ...d, stripeSeats: form.syncedSeats, status: 'synced' };
                }
                return d;
            });
        }
    });

</script>

<div class="tw-p-8 tw-bg-[#0a0a0a] tw-text-[#f8fafc] tw-min-h-[100dvh] tw-font-sans tw-rounded-none">
    <div class="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <h1 class="tw-text-2xl tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-wider">Stripe Entitlement Reconciliation</h1>
    </div>

    {#if form && form.message}
        <div class="tw-mb-6 tw-p-4 tw-border tw-rounded-none tw-font-mono tw-text-sm tw-bg-red-900 tw-text-red-200 tw-border-red-500">
            <div class="tw-font-bold tw-uppercase tw-mb-2">✖ Synchronization Failed</div>
            <div class="tw-opacity-80">>{form.message}</div>
        </div>
    {/if}

    {#if form && form.success}
        <div class="tw-mb-6 tw-p-4 tw-border tw-rounded-none tw-font-mono tw-text-sm tw-bg-green-900 tw-text-green-200 tw-border-green-500">
            <div class="tw-font-bold tw-uppercase tw-mb-2">✔ Synchronization Handled</div>
            <div class="tw-opacity-80">>{form.auditLog}</div>
        </div>
    {/if}

    <div class="tw-border tw-border-[#334155] tw-bg-black tw-rounded-none tw-overflow-hidden">
        <table class="tw-w-full tw-text-left">
            <thead class="tw-bg-[#111] tw-border-b tw-border-[#334155]">
                <tr>
                    <th class="tw-px-4 tw-py-3 tw-text-xs tw-uppercase tw-text-slate-400">Club ID</th>
                    <th class="tw-px-4 tw-py-3 tw-text-xs tw-uppercase tw-text-slate-400">Club Name</th>
                    <th class="tw-px-4 tw-py-3 tw-text-xs tw-uppercase tw-text-slate-400">Active Seats (DB)</th>
                    <th class="tw-px-4 tw-py-3 tw-text-xs tw-uppercase tw-text-slate-400">Stripe Meta Seats</th>
                    <th class="tw-px-4 tw-py-3 tw-text-xs tw-uppercase tw-text-slate-400">Status</th>
                    <th class="tw-px-4 tw-py-3 tw-text-xs tw-uppercase tw-text-slate-400 tw-text-right">Action</th>
                </tr>
            </thead>
            <tbody class="tw-divide-y tw-divide-[#334155]">
                {#each discrepancies as row}
                    <tr class="hover:tw-bg-[#111] tw-transition-colors">
                        <td class="tw-px-4 tw-py-4 tw-font-mono tw-text-sm">{row.clubId}</td>
                        <td class="tw-px-4 tw-py-4 tw-font-bold">{row.name}</td>
                        <td class="tw-px-4 tw-py-4 tw-font-mono">{row.activeSeats}</td>
                        <td class="tw-px-4 tw-py-4 tw-font-mono {row.activeSeats !== row.stripeSeats ? 'tw-text-red-500' : 'tw-text-green-500'}">
                            {row.stripeSeats}
                        </td>
                        <td class="tw-px-4 tw-py-4">
                            <span class="tw-text-xs tw-uppercase tw-px-2 tw-py-1 tw-font-bold
                                {row.status === 'synced' ? 'tw-bg-green-900 tw-text-green-300' :
                                 row.status === 'discrepancy' ? 'tw-bg-red-900 tw-text-red-300' :
                                 'tw-bg-amber-900 tw-text-amber-300'}">
                                {row.status.replace('_', ' ')}
                            </span>
                        </td>
                        <td class="tw-px-4 tw-py-4 tw-text-right">
                            <form method="POST" action="?/forceSync" use:enhance={() => {
                                processingClub = row.clubId;
                                return async ({ update }) => {
                                    await update();
                                    processingClub = null;
                                };
                            }}>
                                <input type="hidden" name="clubId" value={row.clubId} />
                                <input type="hidden" name="activeSeats" value={row.activeSeats} />
                                <button
                                    type="submit"
                                    disabled={row.status === 'synced' || processingClub === row.clubId}
                                    class="tw-bg-amber-600 hover:tw-bg-amber-500 disabled:tw-bg-slate-700 tw-text-white tw-font-bold tw-py-1 tw-px-3 tw-text-xs tw-rounded-none tw-transition-colors"
                                >
                                    {processingClub === row.clubId ? 'Syncing...' : 'Force Sync'}
                                </button>
                            </form>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
        {#if discrepancies.length === 0}
            <div class="tw-p-8 tw-text-center tw-text-slate-500 tw-font-mono">
                No discrepancies found. Ledgers are aligned.
            </div>
        {/if}
    </div>
</div>
