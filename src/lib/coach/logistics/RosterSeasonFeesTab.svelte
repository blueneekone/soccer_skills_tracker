<script lang="ts">
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, type Unsubscribe } from 'firebase/firestore';

	interface Props {
		teamId: string;
	}

	interface SeasonFeeRow {
		id: string;
		playerName: string;
		parentEmail: string;
		jersey: string;
		duesCents: number;
		paidCents: number;
		status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'SCHOLARSHIP';
		notes?: string;
	}

	let { teamId }: Props = $props();

	let rows = $state<SeasonFeeRow[]>([]);
	let loading = $state(true);
	let savingId = $state('');

	$effect(() => {
		if (!browser || !teamId || !db || !authStore.isAuthenticated) {
			loading = false;
			return;
		}

		loading = true;

		// Realtime listener on player_lookup for team
		const qLookup = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
		const unsubLookup: Unsubscribe = onSnapshot(
			qLookup,
			(lookupSnap) => {
				// Also listen to existing season_fees collection
				const qFees = query(collection(db, 'teams', teamId, 'season_fees'));
				const unsubFees: Unsubscribe = onSnapshot(qFees, (feeSnap) => {
					const feeMap = new Map<string, any>();
					feeSnap.forEach((fDoc) => feeMap.set(fDoc.id, fDoc.data()));

					const list: SeasonFeeRow[] = [];
					lookupSnap.forEach((docSnap) => {
						const d = docSnap.data() || {};
						const playerName = d.playerName || d.displayName || 'Athlete';
						const pEmail = Array.isArray(d.parentEmails) ? d.parentEmails[0] : (d.parentEmail || '');
						const jersey = d.jersey ? String(d.jersey) : '';
						const feeData = feeMap.get(docSnap.id) || {};

						list.push({
							id: docSnap.id,
							playerName,
							parentEmail: pEmail,
							jersey,
							duesCents: typeof feeData.duesCents === 'number' ? feeData.duesCents : 125000,
							paidCents: typeof feeData.paidCents === 'number' ? feeData.paidCents : (feeData.status === 'PAID' ? 125000 : 0),
							status: feeData.status || 'UNPAID',
							notes: feeData.notes || '',
						});
					});

					list.sort((a, b) => a.playerName.localeCompare(b.playerName));
					rows = list;
					loading = false;
				});

				return () => unsubFees();
			},
			(err) => {
				console.error('[RosterSeasonFeesTab] fetch error:', err);
				loading = false;
			}
		);

		return () => unsubLookup();
	});

	async function updateFeeStatus(row: SeasonFeeRow, newStatus: SeasonFeeRow['status']) {
		if (!teamId || !row.id || !db) return;
		savingId = row.id;
		try {
			const paidCents = newStatus === 'PAID' ? row.duesCents : newStatus === 'UNPAID' ? 0 : row.paidCents;
			await setDoc(
				doc(db, 'teams', teamId, 'season_fees', row.id),
				{
					playerName: row.playerName,
					parentEmail: row.parentEmail,
					duesCents: row.duesCents,
					paidCents,
					status: newStatus,
					updatedAt: serverTimestamp(),
					updatedBy: authStore.user?.email || authStore.uid,
				},
				{ merge: true }
			);
			row.status = newStatus;
			row.paidCents = paidCents;
		} catch (err) {
			console.error('[RosterSeasonFeesTab] update error:', err);
		} finally {
			savingId = '';
		}
	}
</script>

<div class="tw-flex tw-flex-col tw-gap-3 tw-mt-2">
	{#if loading}
		<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-animate-pulse">Loading season dues ledger…</p>
	{:else if rows.length === 0}
		<div class="tw-border tw-border-dashed tw-border-slate-800 tw-p-6 tw-text-center tw-bg-[#020617] tw-rounded">
			<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-m-0">No roster members found for season fees tracking.</p>
		</div>
	{:else}
		<div class="tw-overflow-x-auto tw-border tw-border-slate-800 tw-rounded">
			<table class="tw-w-full tw-text-left tw-border-collapse tw-font-mono tw-text-xs">
				<thead>
					<tr class="tw-bg-[#020617] tw-border-b tw-border-slate-800 tw-text-[#fbbf24]">
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">ATHLETE</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">GUARDIAN EMAIL</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">TOTAL DUES</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">PAID AMOUNT</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">BALANCE</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">STATUS</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider tw-text-right">QUICK UPDATE</th>
					</tr>
				</thead>
				<tbody class="tw-divide-y tw-divide-slate-800/80 tw-bg-[#0f172a]/60">
					{#each rows as row (row.id)}
						{@const balanceCents = Math.max(0, row.duesCents - row.paidCents)}
						<tr class="hover:tw-bg-[#0f172a] tw-transition-colors">
							<td class="tw-p-3 tw-text-white tw-font-bold">
								<span class="tw-text-[#daff0a] tw-mr-1.5">{row.jersey ? `#${row.jersey}` : '—'}</span>
								{row.playerName}
							</td>
							<td class="tw-p-3 tw-text-slate-300">
								{row.parentEmail || '—'}
							</td>
							<td class="tw-p-3 tw-text-white">
								${(row.duesCents / 100).toFixed(2)}
							</td>
							<td class="tw-p-3 tw-text-[#14b8a6]">
								${(row.paidCents / 100).toFixed(2)}
							</td>
							<td class="tw-p-3" class:tw-text-red-400={balanceCents > 0 && row.status !== 'SCHOLARSHIP'} class:tw-text-slate-500={balanceCents === 0}>
								{row.status === 'SCHOLARSHIP' ? '$0.00 (Exempt)' : `$${(balanceCents / 100).toFixed(2)}`}
							</td>
							<td class="tw-p-3">
								{#if row.status === 'PAID'}
									<span class="tw-bg-[#14b8a6]/20 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-px-2 tw-py-0.5 tw-rounded tw-font-bold tw-text-[10px]">
										✓ PAID IN FULL
									</span>
								{:else if row.status === 'PARTIAL'}
									<span class="tw-bg-amber-500/20 tw-border tw-border-amber-500 tw-text-amber-300 tw-px-2 tw-py-0.5 tw-rounded tw-font-bold tw-text-[10px]">
										⏳ PARTIAL
									</span>
								{:else if row.status === 'SCHOLARSHIP'}
									<span class="tw-bg-purple-500/20 tw-border tw-border-purple-500 tw-text-purple-300 tw-px-2 tw-py-0.5 tw-rounded tw-font-bold tw-text-[10px]">
										★ SCHOLARSHIP
									</span>
								{:else}
									<span class="tw-bg-red-500/20 tw-border tw-border-red-500 tw-text-red-400 tw-px-2 tw-py-0.5 tw-rounded tw-font-bold tw-text-[10px]">
										✕ UNPAID
									</span>
								{/if}
							</td>
							<td class="tw-p-3 tw-text-right">
								<select
									class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-slate-200 tw-px-2 tw-py-1 tw-rounded tw-text-[11px] focus:tw-border-[#fbbf24] focus:tw-outline-none"
									value={row.status}
									disabled={savingId === row.id}
									onchange={(e) => updateFeeStatus(row, (e.target as HTMLSelectElement).value as any)}
								>
									<option value="PAID">Paid in Full</option>
									<option value="PARTIAL">Partial Payment</option>
									<option value="UNPAID">Unpaid</option>
									<option value="SCHOLARSHIP">Scholarship / Exempt</option>
								</select>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
