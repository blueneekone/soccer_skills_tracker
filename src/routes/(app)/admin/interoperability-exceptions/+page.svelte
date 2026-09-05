<script lang="ts">
    import { onMount } from 'svelte';
    import { getFirestore, collection, query, limit, getDocs, writeBatch, doc } from 'firebase/firestore';
    import { getFunctions, httpsCallable } from 'firebase/functions';

    // Real exceptions from Firestore
    let exceptions: any[] = [];
    let loading = true;

    onMount(async () => {
        try {
            const db = getFirestore();
            const q = query(collection(db, 'roster_ingestion_exceptions'), limit(500));
            const snapshot = await getDocs(q);
            exceptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), corrected: '' }));
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    });

    let replaying = false;
    let replayResult = '';

    async function replayRows() {
        console.log('replayRows called');
        replaying = true;
        replayResult = '';

        const toProcess = exceptions.filter(e => e.corrected !== '');

        if (toProcess.length > 500) {
             replayResult = 'Error: Batch exceeds 500 transaction cap limit.';
             replaying = false;
             return;
        }

        try {
            const db = getFirestore();
            const batch = writeBatch(db);
            const functions = getFunctions();
            // Assuming there's a callable to process the corrected data
            // Alternatively, write corrected data to another queue
            for(const item of toProcess) {
                const ref = doc(db, 'roster_ingestion_exceptions', item.id);
                batch.delete(ref); // Remove from exception queue once we start processing.
                // Depending on actual requirements we might push it to an intake parser or re-write it somewhere else
            }
            await batch.commit();

            const intakeParser = httpsCallable(functions, 'replayIngestionRow');
            await Promise.all(toProcess.map(item => intakeParser({ id: item.id, corrected: item.corrected, type: item.type, data: item.data })));

            exceptions = exceptions.filter(e => e.corrected === '');
            replayResult = `Successfully replayed ${toProcess.length} rows in a single batch.`;
        } catch(e: any) {
             replayResult = `Error: ${e.message}`;
        }
        replaying = false;
    }
</script>

<div class="tw-p-8 tw-bg-[#0a0a0a] tw-text-[#f8fafc] tw-min-h-[100dvh] tw-font-sans tw-rounded-none">
    <div class="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <div>
            <h1 class="tw-text-2xl tw-font-bold tw-text-[#14b8a6] tw-uppercase tw-tracking-wider">Vampire Importer Exception Queue</h1>
            <p class="tw-text-sm tw-text-slate-400 tw-font-mono">Listening on /roster_ingestion_exceptions/</p>
        </div>
        <button
            onclick={replayRows}
            disabled={replaying || exceptions.every(e => !e.corrected) || exceptions.length === 0}
            class="tw-bg-[#14b8a6] hover:tw-bg-teal-400 disabled:tw-bg-slate-700 tw-text-black disabled:tw-text-slate-400 tw-font-bold tw-py-2 tw-px-6 tw-rounded-none tw-transition-colors"
        >
            {replaying ? 'Executing Batch...' : 'Replay Corrected Rows'}
        </button>
    </div>

    {#if replayResult}
        <div class="tw-mb-6 tw-p-4 tw-border tw-rounded-none tw-font-mono tw-text-sm {replayResult.includes('Error') ? 'tw-bg-red-900 tw-text-red-200 tw-border-red-500' : 'tw-bg-green-900 tw-text-green-200 tw-border-green-500'}">
            {replayResult}
        </div>
    {/if}

    <div class="tw-border tw-border-[#334155] tw-bg-black tw-rounded-none tw-overflow-hidden">
        {#if loading}
            <div class="tw-p-8 tw-text-center tw-text-slate-500 tw-font-mono tw-uppercase tw-tracking-widest">
                Loading exceptions...
            </div>
        {:else}
        <table class="tw-w-full tw-text-left">
            <thead class="tw-bg-[#111] tw-border-b tw-border-[#334155]">
                <tr>
                    <th class="tw-px-4 tw-py-3 tw-text-xs tw-uppercase tw-text-slate-400">Exception ID</th>
                    <th class="tw-px-4 tw-py-3 tw-text-xs tw-uppercase tw-text-slate-400">Error Type</th>
                    <th class="tw-px-4 tw-py-3 tw-text-xs tw-uppercase tw-text-slate-400">Raw Data</th>
                    <th class="tw-px-4 tw-py-3 tw-text-xs tw-uppercase tw-text-slate-400">Correction</th>
                </tr>
            </thead>
            <tbody class="tw-divide-y tw-divide-[#334155]">
                {#each exceptions as row (row.id)}
                    <tr class="hover:tw-bg-[#111] tw-transition-colors">
                        <td class="tw-px-4 tw-py-4">
                            <div class="tw-font-mono tw-text-sm">{row.id}</div>
                            <div class="tw-text-xs tw-text-slate-500 tw-font-mono">Row {row.row || 'N/A'} in {row.file || 'unknown'}</div>
                        </td>
                        <td class="tw-px-4 tw-py-4">
                            <span class="tw-text-xs tw-uppercase tw-px-2 tw-py-1 tw-font-bold tw-bg-red-900 tw-text-red-300">
                                {row.type}
                            </span>
                        </td>
                        <td class="tw-px-4 tw-py-4 tw-font-mono tw-text-red-400">{row.data}</td>
                        <td class="tw-px-4 tw-py-4">
                            <input
                                type="text"
                                bind:value={row.corrected}
                                placeholder="Enter correction..."
                                class="tw-w-full tw-bg-[#0a0a0a] tw-border tw-border-[#334155] focus:tw-border-[#14b8a6] tw-text-white tw-px-3 tw-py-2 tw-text-sm tw-font-mono tw-rounded-none tw-outline-none"
                            />
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
        {#if exceptions.length === 0}
            <div class="tw-p-8 tw-text-center tw-text-slate-500 tw-font-mono tw-uppercase tw-tracking-widest">
                Queue Empty. No exceptions detected.
            </div>
        {/if}
        {/if}
    </div>
</div>
