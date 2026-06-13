<script lang="ts">
	import { db, functions } from '$lib/firebase.js';
	import {
		collection,
		doc,
		getDoc,
		getDocs,
		query,
		where,
	} from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	let { clubId = '' } = $props();

	type RegRow = {
		id: string;
		playerEmail: string;
		playerName: string;
		paidAtMs: number | null;
		assignedTeamId: string | null;
	};

	const assignSeasonRegistrationToRoster = httpsCallable(
		functions,
		'assignSeasonRegistrationToRoster',
	);

	const clubTeams = $derived(teamsStore.teams.filter((t) => t.clubId === clubId));

	let seasonId = $state('');
	let loading = $state(false);
	let savingId = $state<string | null>(null);
	let err = $state('');
	let ok = $state('');
	let showAssigned = $state(false);
	let registrations = $state<RegRow[]>([]);
	/** @type {Record<string, string>} */
	let teamPick = $state({});

	const visibleRows = $derived(
		showAssigned ? registrations : registrations.filter((r) => !r.assignedTeamId),
	);

	const teamNameById = $derived(
		Object.fromEntries(clubTeams.map((t) => [t.id, t.name || t.id])),
	);

	$effect(() => {
		if (!clubId) {
			registrations = [];
			seasonId = '';
			return;
		}
		let cancelled = false;
		loading = true;
		err = '';
		void (async () => {
			try {
				const orgSnap = await getDoc(doc(db, 'organizations', clubId));
				const raw = orgSnap.exists()
					? (orgSnap.data().activeSeason as Record<string, unknown> | undefined)
					: undefined;
				const sid = typeof raw?.seasonId === 'string' ? raw.seasonId.trim() : '';
				if (cancelled) return;
				seasonId = sid;
				if (!sid) {
					registrations = [];
					return;
				}

				const rq = query(
					collection(db, 'season_registrations'),
					where('tenantId', '==', clubId),
					where('seasonId', '==', sid),
					where('paymentStatus', '==', 'paid'),
				);
				const snap = await getDocs(rq);
				if (cancelled) return;

				const rows: RegRow[] = await Promise.all(
					snap.docs.map(async (d) => {
						const data = d.data();
						const playerEmail =
							typeof data.playerEmail === 'string' ? data.playerEmail.trim() : '';
						const userSnap = playerEmail
							? await getDoc(doc(db, 'users', playerEmail))
							: null;
						const playerName =
							userSnap?.exists() && typeof userSnap.data()?.playerName === 'string'
								? (userSnap.data()!.playerName as string)
								: playerEmail.split('@')[0] || 'Athlete';
						return {
							id: d.id,
							playerEmail,
							playerName,
							paidAtMs: data.paidAt?.toMillis?.() ?? null,
							assignedTeamId:
								typeof data.assignedTeamId === 'string' ? data.assignedTeamId : null,
						};
					}),
				);

				rows.sort((a, b) => {
					if (!a.assignedTeamId && b.assignedTeamId) return -1;
					if (a.assignedTeamId && !b.assignedTeamId) return 1;
					return (b.paidAtMs ?? 0) - (a.paidAtMs ?? 0);
				});

				registrations = rows;
				const picks = { ...teamPick };
				for (const r of rows) {
					if (!picks[r.id] && clubTeams[0]?.id) {
						picks[r.id] = r.assignedTeamId || clubTeams[0].id;
					}
				}
				teamPick = picks;
			} catch (e) {
				if (!cancelled) {
					err = e instanceof Error ? e.message : 'Could not load paid registrations.';
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function assignRow(registrationId: string) {
		const teamId = teamPick[registrationId]?.trim();
		if (!teamId || savingId) return;
		err = '';
		ok = '';
		savingId = registrationId;
		try {
			const res = await assignSeasonRegistrationToRoster({ registrationId, teamId });
			const data = res.data as { playerName?: string; noop?: boolean };
			const label = teamNameById[teamId] || teamId;
			ok = data.noop
				? `${data.playerName ?? 'Athlete'} is already on ${label}.`
				: `Assigned ${data.playerName ?? 'athlete'} to ${label}.`;
			registrations = registrations.map((r) =>
				r.id === registrationId ? { ...r, assignedTeamId: teamId } : r,
			);
		} catch (e) {
			err = e instanceof Error ? e.message : 'Roster assignment failed.';
		} finally {
			savingId = null;
		}
	}

	function formatPaid(ms: number | null): string {
		if (!ms) return '—';
		return new Date(ms).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}
</script>

<section class="reg-roster-panel card" aria-labelledby="reg-roster-heading">
	<div class="card-header bg-blue-header">Registration → roster assign</div>
	<div class="card-body">
		<p id="reg-roster-heading" class="reg-roster-panel__lede">
			Paid season registrants who are not yet on a squad. Assigning writes
			<code>player_lookup</code> and links the athlete to the selected team roster.
		</p>

		{#if !seasonId && !loading}
			<p class="reg-roster-panel__muted">Configure an active season before assigning registrants.</p>
		{:else if loading}
			<p class="reg-roster-panel__muted">Loading paid registrations…</p>
		{:else if clubTeams.length === 0}
			<p class="reg-roster-panel__muted">Create a team first, then assign registrants.</p>
		{:else if registrations.length === 0}
			<p class="reg-roster-panel__muted">No paid registrations for season <strong>{seasonId}</strong>.</p>
		{:else}
			<label class="reg-roster-panel__toggle">
				<input type="checkbox" bind:checked={showAssigned} />
				Show already assigned
			</label>

			<div class="ec-table-wrap">
				<table class="ec-table" aria-label="Paid registrants">
					<thead>
						<tr>
							<th>Athlete</th>
							<th>Email</th>
							<th>Paid</th>
							<th>Assigned</th>
							<th>Team</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each visibleRows as r (r.id)}
							<tr>
								<td class="ec-table__strong">{r.playerName}</td>
								<td class="reg-roster-panel__mono">{r.playerEmail || '—'}</td>
								<td>{formatPaid(r.paidAtMs)}</td>
								<td>
									{#if r.assignedTeamId}
										{teamNameById[r.assignedTeamId] ?? r.assignedTeamId}
									{:else}
										<span class="reg-roster-panel__unassigned">Unassigned</span>
									{/if}
								</td>
								<td>
									<select
										class="reg-roster-panel__select"
										bind:value={teamPick[r.id]}
										aria-label="Team for {r.playerName}"
									>
										{#each clubTeams as t (t.id)}
											<option value={t.id}>{t.name || t.id}</option>
										{/each}
									</select>
								</td>
								<td>
									<button
										type="button"
										class="primary-btn btn-blue reg-roster-panel__assign"
										disabled={savingId === r.id}
										onclick={() => assignRow(r.id)}
									>
										{savingId === r.id ? 'Assigning…' : r.assignedTeamId ? 'Reassign' : 'Assign'}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if !showAssigned && visibleRows.length === 0}
				<p class="reg-roster-panel__muted tw-mt-3">All paid registrants are assigned.</p>
			{/if}
		{/if}

		{#if err}
			<p class="reg-roster-panel__err" role="alert">{err}</p>
		{/if}
		{#if ok}
			<p class="reg-roster-panel__ok" role="status">{ok}</p>
		{/if}
	</div>
</section>

<style>
	.reg-roster-panel__lede {
		margin: 0 0 12px;
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.reg-roster-panel__muted {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.reg-roster-panel__toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 12px;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.reg-roster-panel__mono {
		font-family: ui-monospace, monospace;
		font-size: 0.8rem;
		word-break: break-all;
	}

	.reg-roster-panel__unassigned {
		color: var(--brand-primary, #f59e0b);
		font-weight: 700;
		font-size: 0.85rem;
	}

	.reg-roster-panel__select {
		min-width: 10rem;
		max-width: 100%;
		font-size: 0.85rem;
	}

	.reg-roster-panel__assign {
		margin: 0;
		white-space: nowrap;
		font-size: 0.8rem;
		padding: 6px 12px;
	}

	.reg-roster-panel__err {
		margin: 12px 0 0;
		color: var(--danger-red, #b91c1c);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.reg-roster-panel__ok {
		margin: 12px 0 0;
		color: var(--brand-primary, #0f172a);
		font-size: 0.9rem;
		font-weight: 700;
	}
</style>
