<script lang="ts">
	import { browser } from '$app/environment';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, type Unsubscribe } from 'firebase/firestore';

	interface Props {
		teamId: string;
	}

	interface TournamentFeeRow {
		id: string;
		tournamentName: string;
		playerName: string;
		parentEmail: string;
		feeCents: number;
		status: 'PAID' | 'DUE' | 'PENDING';
	}

	let { teamId }: Props = $props();

	let rows = $state<TournamentFeeRow[]>([]);
	let loading = $state(true);
	let savingId = $state('');

	$effect(() => {
		if (!browser || !teamId || !db || !authStore.isAuthenticated) {
			loading = false;
			return;
		}

		loading = true;

		// 1. Fetch team players
		const qLookup = query(collection(db, 'player_lookup'), where('teamId', '==', teamId));
		const unsubLookup: Unsubscribe = onSnapshot(
			qLookup,
			(lookupSnap) => {
				const qTourney = query(collection(db, 'teams', teamId, 'tournament_fees'));
				const unsubTourney: Unsubscribe = onSnapshot(qTourney, (tSnap) => {
					const tourneyMap = new Map<string, any>();
					tSnap.forEach((tDoc) => tourneyMap.set(tDoc.id, tDoc.data()));

					const list: TournamentFeeRow[] = [];
					lookupSnap.forEach((docSnap) => {
						const d = docSnap.data() || {};
						const playerName = d.playerName || d.displayName || 'Athlete';
						const pEmail = Array.isArray(d.parentEmails) ? d.parentEmails[0] : (d.parentEmail || '');
						const tData = tourneyMap.get(docSnap.id) || {};

						list.push({
							id: docSnap.id,
							tournamentName: tData.tournamentName || 'Spring State Showcase 2026',
							playerName,
							parentEmail: pEmail,
							feeCents: typeof tData.feeCents === 'number' ? tData.feeCents : 15000,
							status: tData.status || 'DUE',
						});
					});

					list.sort((a, b) => a.playerName.localeCompare(b.playerName));
					rows = list;
					loading = false;
				});

				return () => unsubTourney();
			},
			(err) => {
				console.error('[RosterTournamentFeesTab] fetch error:', err);
				loading = false;
			}
		);

		return () => unsubLookup();
	});

	async function updateTournamentStatus(row: TournamentFeeRow, newStatus: TournamentFeeRow['status']) {
		if (!teamId || !row.id || !db) return;
		savingId = row.id;
		try {
			await setDoc(
				doc(db, 'teams', teamId, 'tournament_fees', row.id),
				{
					tournamentName: row.tournamentName,
					playerName: row.playerName,
					parentEmail: row.parentEmail,
					feeCents: row.feeCents,
					status: newStatus,
					updatedAt: serverTimestamp(),
					updatedBy: authStore.user?.email || authStore.uid,
				},
				{ merge: true }
			);
			row.status = newStatus;
		} catch (err) {
			console.error('[RosterTournamentFeesTab] update error:', err);
		} finally {
			savingId = '';
		}
	}
</script>

<div class="tw-flex tw-flex-col tw-gap-3 tw-mt-2">
	{#if loading}
		<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-animate-pulse">Loading tournament fees ledger…</p>
	{:else if rows.length === 0}
		<div class="tw-border tw-border-dashed tw-border-slate-800 tw-p-6 tw-text-center tw-bg-[#020617] tw-rounded">
			<p class="tw-font-mono tw-text-xs tw-text-slate-400 tw-m-0">No athletes found for tournament fee tracking.</p>
		</div>
	{:else}
		<div class="tw-overflow-x-auto tw-border tw-border-slate-800 tw-rounded">
			<table class="tw-w-full tw-text-left tw-border-collapse tw-font-mono tw-text-xs">
				<thead>
					<tr class="tw-bg-[#020617] tw-border-b tw-border-slate-800 tw-text-[#daff0a]">
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">TOURNAMENT EVENT</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">ATHLETE</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">GUARDIAN EMAIL</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">EVENT FEE</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider">STATUS</th>
						<th class="tw-p-3 tw-font-bold tw-tracking-wider tw-text-right">UPDATE STATUS</th>
					</tr>
				</thead>
				<tbody class="tw-divide-y tw-divide-slate-800/80 tw-bg-[#0f172a]/60">
					{#each rows as row (row.id)}
						<tr class="hover:tw-bg-[#0f172a] tw-transition-colors">
							<td class="tw-p-3 tw-text-[#14b8a6] tw-font-bold">
								{row.tournamentName}
							</td>
							<td class="tw-p-3 tw-text-white tw-font-bold">
								{row.playerName}
							</td>
							<td class="tw-p-3 tw-text-slate-300">
								{row.parentEmail || '—'}
							</td>
							<td class="tw-p-3 tw-text-white">
								${(row.feeCents / 100).toFixed(2)}
							</td>
							<td class="tw-p-3">
								{#if row.status === 'PAID'}
									<span class="tw-bg-[#14b8a6]/20 tw-border tw-border-[#14b8a6] tw-text-[#14b8a6] tw-px-2 tw-py-0.5 tw-rounded tw-font-bold tw-text-[10px]">
										✓ PAID
									</span>
								{:else if row.status === 'PENDING'}
									<span class="tw-bg-amber-500/20 tw-border tw-border-amber-500 tw-text-amber-300 tw-px-2 tw-py-0.5 tw-rounded tw-font-bold tw-text-[10px]">
										⏳ PENDING
									</span>
								{:else}
									<span class="tw-bg-red-500/20 tw-border tw-border-red-500 tw-text-red-400 tw-px-2 tw-py-0.5 tw-rounded tw-font-bold tw-text-[10px]">
										✕ DUE
									</span>
								{/if}
							</td>
							<td class="tw-p-3 tw-text-right">
								<select
									class="tw-bg-[#020617] tw-border tw-border-slate-700 tw-text-slate-200 tw-px-2 tw-py-1 tw-rounded tw-text-[11px] focus:tw-border-[#daff0a] focus:tw-outline-none"
									value={row.status}
									disabled={savingId === row.id}
									onchange={(e) => updateTournamentStatus(row, (e.target as HTMLSelectElement).value as any)}
								>
									<option value="PAID">Paid</option>
									<option value="PENDING">Pending Transfer</option>
									<option value="DUE">Due / Unpaid</option>
								</select>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
