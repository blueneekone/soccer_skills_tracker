<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { untrack } from 'svelte';
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
	let dragRegId = $state<string | null>(null);
	let dropHighlightTeamId = $state<string | null>(null);

	const visibleRows = $derived(
		showAssigned ? registrations : registrations.filter((r) => !r.assignedTeamId),
	);

	const unassignedPool = $derived(registrations.filter((r) => !r.assignedTeamId));

	const teamNameById = $derived(
		Object.fromEntries(clubTeams.map((t) => [t.id, t.name || t.id])),
	);

	function rowsForTeam(teamId: string): RegRow[] {
		return registrations.filter((r) => r.assignedTeamId === teamId);
	}

	function isNameOnly(row: RegRow): boolean {
		return !row.playerEmail.trim();
	}

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

	async function assignRow(registrationId: string, teamId?: string) {
		if (!db || !authStore.isAuthenticated) return;
		const resolvedTeamId = (teamId ?? teamPick[registrationId])?.trim();
		if (!resolvedTeamId || savingId) return;
		const row = registrations.find((r) => r.id === registrationId);
		if (row && isNameOnly(row)) {
			err = 'Add email to assign — name-only registrants cannot be rostered.';
			return;
		}
		err = '';
		ok = '';
		savingId = registrationId;
		try {
			const res = await assignSeasonRegistrationToRoster({
				registrationId,
				teamId: resolvedTeamId,
			});
			const data = res.data as { playerName?: string; noop?: boolean };
			const label = teamNameById[resolvedTeamId] || resolvedTeamId;
			ok = data.noop
				? `${data.playerName ?? 'Athlete'} is already on ${label}.`
				: `Assigned ${data.playerName ?? 'athlete'} to ${label}.`;
			registrations = registrations.map((r) =>
				r.id === registrationId ? { ...r, assignedTeamId: resolvedTeamId } : r,
			);
			teamPick = { ...teamPick, [registrationId]: resolvedTeamId };
		} catch (e) {
			err = e instanceof Error ? e.message : 'Roster assignment failed.';
		} finally {
			savingId = null;
			dropHighlightTeamId = null;
			dragRegId = null;
		}
	}

	function onDragStart(registrationId: string, row: RegRow, e: DragEvent) {
		if (isNameOnly(row) || savingId) {
			e.preventDefault();
			return;
		}
		dragRegId = registrationId;
		e.dataTransfer?.setData('text/plain', registrationId);
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function onPoolDragOver(index: number, e: DragEvent) {
		if (!dragRegId) return;
		e.preventDefault();
		const fromIndex = registrations.findIndex((r) => r.id === dragRegId);
		if (fromIndex < 0 || fromIndex === index) return;
		registrations = moveRegInList(registrations, fromIndex, index);
	}

	function moveRegInList(list: RegRow[], fromIndex: number, toIndex: number): RegRow[] {
		if (fromIndex === toIndex) return list;
		const next = [...list];
		const [item] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, item);
		return next;
	}

	function onTeamDragOver(teamId: string, e: DragEvent) {
		if (!dragRegId) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropHighlightTeamId = teamId;
	}

	function onTeamDragLeave(teamId: string) {
		if (dropHighlightTeamId === teamId) dropHighlightTeamId = null;
	}

	function onTeamDrop(teamId: string, e: DragEvent) {
		e.preventDefault();
		const registrationId =
			e.dataTransfer?.getData('text/plain') || dragRegId || '';
		if (!registrationId) return;
		void assignRow(registrationId, teamId);
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
			Paid season registrants who are not yet on a squad. Drag onto a team roster slot or use
			the assign table below — writes <code>player_lookup</code> and links the athlete to the
			selected team roster.
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
			<div class="reg-roster-dnd" aria-label="Drag registrants onto team roster slots">
				<div class="reg-roster-dnd__pool">
					<h4 class="reg-roster-dnd__heading">Unassigned pool</h4>
					{#if unassignedPool.length === 0}
						<p class="reg-roster-panel__muted">All paid registrants are assigned.</p>
					{:else}
						<ul class="reg-roster-dnd__chips">
							{#each unassignedPool as r, index (r.id)}
								<li
									class="reg-roster-dnd__chip"
									class:reg-roster-dnd__chip--blocked={isNameOnly(r)}
									class:reg-roster-dnd__chip--dragging={dragRegId === r.id}
									draggable={!isNameOnly(r) && savingId !== r.id}
									ondragstart={(e) => onDragStart(r.id, r, e)}
									ondragend={() => {
										dragRegId = null;
										dropHighlightTeamId = null;
									}}
									ondragover={(e) => onPoolDragOver(index, e)}
									title={isNameOnly(r)
										? 'Add email to assign — name-only registrant'
										: `Drag ${r.playerName} onto a team`}
								>
									<span class="reg-roster-dnd__chip-name">{r.playerName}</span>
									{#if isNameOnly(r)}
										<span class="reg-roster-dnd__chip-hint">Add email to assign</span>
									{:else}
										<span class="reg-roster-dnd__chip-email">{r.playerEmail}</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div class="reg-roster-dnd__teams">
					{#each clubTeams as t (t.id)}
						<div
							class="reg-roster-dnd__slot"
							class:reg-roster-dnd__slot--highlight={dropHighlightTeamId === t.id}
							role="list"
							aria-label="Roster slot for {t.name || t.id}"
							ondragover={(e) => onTeamDragOver(t.id, e)}
							ondragleave={() => onTeamDragLeave(t.id)}
							ondrop={(e) => onTeamDrop(t.id, e)}
						>
							<h4 class="reg-roster-dnd__heading">{t.name || t.id}</h4>
							<ul class="reg-roster-dnd__assigned">
								{#each rowsForTeam(t.id) as r (r.id)}
									<li class="reg-roster-dnd__assigned-row">{r.playerName}</li>
								{/each}
								{#if rowsForTeam(t.id).length === 0}
									<li class="reg-roster-dnd__empty">Drop registrant here</li>
								{/if}
							</ul>
						</div>
					{/each}
				</div>
			</div>

			<label class="reg-roster-panel__toggle tw-mt-4">
				<input type="checkbox" bind:checked={showAssigned} />
				Show assign table (includes already assigned)
			</label>

			{#if showAssigned || visibleRows.length > 0}
				<div class="ec-table-wrap tw-mt-3">
					<table class="ec-table" aria-label="Paid registrants assign fallback">
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
									<td class="reg-roster-panel__mono">
										{#if isNameOnly(r)}
											<span class="reg-roster-dnd__chip-hint">Name-only — add email</span>
										{:else}
											{r.playerEmail}
										{/if}
									</td>
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
											disabled={isNameOnly(r)}
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
											class="btn-primary reg-roster-panel__assign"
											disabled={savingId === r.id || isNameOnly(r)}
											title={isNameOnly(r)
												? 'Add email to assign — name-only registrant'
												: undefined}
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
			{/if}

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

	.reg-roster-dnd {
		display: grid;
		grid-template-columns: minmax(220px, 1fr) minmax(0, 2fr);
		gap: 16px;
		align-items: start;
	}

	@media (max-width: 768px) {
		.reg-roster-dnd {
			grid-template-columns: 1fr;
		}
	}

	.reg-roster-dnd__heading {
		margin: 0 0 8px;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.reg-roster-dnd__pool {
		padding: 12px;
		border: 1px dashed #334155;
		border-radius: 8px;
		background: rgba(15, 23, 42, 0.35);
	}

	.reg-roster-dnd__chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.reg-roster-dnd__chip {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px 10px;
		border: 1px solid #475569;
		border-radius: 8px;
		background: #0f172a;
		cursor: grab;
	}

	.reg-roster-dnd__chip--blocked {
		opacity: 0.55;
		cursor: not-allowed;
		border-style: dotted;
	}

	.reg-roster-dnd__chip--dragging {
		opacity: 0.65;
		border-color: #fbbf24;
	}

	.reg-roster-dnd__chip-name {
		font-weight: 700;
		font-size: 0.88rem;
	}

	.reg-roster-dnd__chip-email {
		font-size: 0.72rem;
		font-family: ui-monospace, monospace;
		color: var(--text-secondary);
		word-break: break-all;
	}

	.reg-roster-dnd__chip-hint {
		font-size: 0.72rem;
		font-weight: 600;
		color: #f59e0b;
	}

	.reg-roster-dnd__teams {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 10px;
	}

	.reg-roster-dnd__slot {
		min-height: 120px;
		padding: 10px;
		border: 2px dashed #334155;
		border-radius: 8px;
		background: rgba(2, 6, 23, 0.45);
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.reg-roster-dnd__slot--highlight {
		border-color: #fbbf24;
		background: rgba(251, 191, 36, 0.08);
	}

	.reg-roster-dnd__assigned {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.reg-roster-dnd__assigned-row {
		font-size: 0.82rem;
		padding: 4px 6px;
		border-radius: 4px;
		background: rgba(51, 65, 85, 0.45);
	}

	.reg-roster-dnd__empty {
		font-size: 0.75rem;
		color: var(--text-secondary);
		font-style: italic;
	}
</style>
