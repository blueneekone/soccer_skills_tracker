<script lang="ts">
	import { browser } from '$app/environment';
	import { db, functions } from '$lib/firebase.js';
	import { collection, onSnapshot, query, doc } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';

	let {
		programId = '',
		programName = 'Tryouts',
		ageBands = [] as string[],
		clubId = '',
	} = $props();

	interface SessionRow {
		id: string;
		title: string;
		fieldLabel: string;
		startAt: string;
		ageBands: string[];
	}

	interface RegistrationRow {
		id: string;
		playerName: string;
		ageBand: string;
		guardianEmail: string;
		guardianName: string;
		pipelineStatus: string;
		assignedSessionId: string | null;
		sessionRsvpStatus: string | null;
		checkInStatus: string | null;
	}

	let sessions = $state<SessionRow[]>([]);
	let registrations = $state<RegistrationRow[]>([]);
	let loading = $state(true);
	let err = $state('');
	let ok = $state('');

	let sessionTitle = $state('');
	let fieldLabel = $state('');
	let startAt = $state('');
	let endAt = $state('');
	let sessionAgeBand = $state('');
	let assignSessionId = $state('');
	let assignAgeBand = $state('');
	let saving = $state(false);

	const upsertTryoutSession = httpsCallable(functions, 'upsertTryoutSession');
	const assignTryoutSession = httpsCallable(functions, 'assignTryoutSession');
	const checkInTryoutRegistration = httpsCallable(functions, 'checkInTryoutRegistration');
	const upsertTryoutPlan = httpsCallable(functions, 'upsertTryoutPlan');
	const setTryoutPipelineStatus = httpsCallable(functions, 'setTryoutPipelineStatus');
	const promoteTryoutToRoster = httpsCallable(functions, 'promoteTryoutToRoster');
	const mintMagicUplink = httpsCallable(functions, 'mintMagicUplink');

	let promoteTeamId = $state('');

	interface PlanStation {
		label: string;
		durationMin: string;
		evaluatorRole: string;
	}

	let planStations = $state<PlanStation[]>([
		{ label: 'Technical', durationMin: '15', evaluatorRole: 'Coach' },
		{ label: 'Small-sided', durationMin: '20', evaluatorRole: 'Coach' },
		{ label: 'Athletic', durationMin: '10', evaluatorRole: 'Evaluator' },
	]);

	$effect(() => {
		const pid = programId.trim();
		if (!pid || !browser) {
			sessions = [];
			registrations = [];
			loading = false;
			return;
		}
		loading = true;
		const sessQ = query(collection(db, 'tryout_programs', pid, 'sessions'));
		const regQ = query(collection(db, 'tryout_programs', pid, 'registrations'));
		const unsubS = onSnapshot(sessQ, (snap) => {
			sessions = snap.docs
				.map((d) => {
					const x = d.data();
					return {
						id: d.id,
						title: String(x.title || 'Session'),
						fieldLabel: String(x.fieldLabel || ''),
						startAt: String(x.startAt || ''),
						ageBands: Array.isArray(x.ageBands) ? x.ageBands.map(String) : [],
					};
				})
				.sort((a, b) => a.startAt.localeCompare(b.startAt));
			if (!assignSessionId && sessions.length) assignSessionId = sessions[0].id;
		});
		const unsubR = onSnapshot(regQ, (snap) => {
			registrations = snap.docs
				.map((d) => {
					const x = d.data();
					return {
						id: d.id,
						playerName: String(x.playerName || ''),
						ageBand: String(x.ageBand || ''),
						guardianEmail: String(x.guardianEmail || ''),
						guardianName: String(x.guardianName || ''),
						pipelineStatus: String(x.pipelineStatus || ''),
						assignedSessionId:
							typeof x.assignedSessionId === 'string' ? x.assignedSessionId : null,
						sessionRsvpStatus:
							typeof x.sessionRsvpStatus === 'string' ? x.sessionRsvpStatus : null,
						checkInStatus: typeof x.checkInStatus === 'string' ? x.checkInStatus : null,
					};
				})
				.sort((a, b) => a.playerName.localeCompare(b.playerName));
			loading = false;
		});
		return () => {
			unsubS();
			unsubR();
		};
	});

	$effect(() => {
		const pid = programId.trim();
		if (!pid || !browser) return;
		const ref = doc(db, 'tryout_programs', pid);
		const unsub = onSnapshot(ref, (snap) => {
			const plan = snap.data()?.evalPlan;
			const stations = plan?.stations;
			if (Array.isArray(stations) && stations.length) {
				planStations = stations.map((s: Record<string, unknown>) => ({
					label: String(s.label || ''),
					durationMin: String(s.durationMin ?? 10),
					evaluatorRole: String(s.evaluatorRole || 'Evaluator'),
				}));
			}
		});
		return () => unsub();
	});

	async function savePlan() {
		if (!programId.trim() || saving) return;
		err = '';
		ok = '';
		saving = true;
		try {
			await upsertTryoutPlan({
				programId: programId.trim(),
				stations: planStations.map((s) => ({
					label: s.label.trim(),
					durationMin: Number(s.durationMin) || 10,
					evaluatorRole: s.evaluatorRole.trim() || 'Evaluator',
				})),
			});
			ok = 'Tryout eval plan saved.';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save eval plan.';
		} finally {
			saving = false;
		}
	}

	function addStation() {
		if (planStations.length >= 12) return;
		planStations = [
			...planStations,
			{ label: `Station ${planStations.length + 1}`, durationMin: '10', evaluatorRole: 'Evaluator' },
		];
	}

	async function saveSession() {
		if (!programId.trim() || saving) return;
		err = '';
		ok = '';
		saving = true;
		try {
			const bands = sessionAgeBand.trim() ? [sessionAgeBand.trim()] : ageBands;
			await upsertTryoutSession({
				programId: programId.trim(),
				title: sessionTitle.trim() || `${programName} session`,
				fieldLabel: fieldLabel.trim(),
				startAt: startAt.trim(),
				...(endAt.trim() ? { endAt: endAt.trim() } : {}),
				...(bands.length ? { ageBands: bands } : {}),
			});
			ok = 'Tryout session scheduled.';
			sessionTitle = '';
			fieldLabel = '';
			startAt = '';
			endAt = '';
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not save session.';
		} finally {
			saving = false;
		}
	}

	async function assignByAgeBand() {
		if (!programId.trim() || !assignSessionId || !assignAgeBand.trim() || saving) return;
		err = '';
		ok = '';
		saving = true;
		try {
			const res = await assignTryoutSession({
				programId: programId.trim(),
				sessionId: assignSessionId,
				ageBand: assignAgeBand.trim(),
			});
			const data = res.data as { assignedCount?: number };
			ok = `Assigned ${data.assignedCount ?? 0} athletes to session.`;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not assign session.';
		} finally {
			saving = false;
		}
	}

	async function checkIn(registrationId: string, checkInStatus: string) {
		if (!programId.trim() || saving) return;
		err = '';
		ok = '';
		saving = true;
		try {
			await checkInTryoutRegistration({
				programId: programId.trim(),
				registrationId,
				checkInStatus,
			});
			ok = `Check-in recorded (${checkInStatus.replace('_', ' ')}).`;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Check-in failed.';
		} finally {
			saving = false;
		}
	}

	async function setPipeline(registrationId: string, pipelineStatus: string) {
		if (!programId.trim() || saving) return;
		err = '';
		ok = '';
		saving = true;
		try {
			await setTryoutPipelineStatus({ programId: programId.trim(), registrationId, pipelineStatus });
			ok = `Pipeline updated → ${pipelineStatus.replace('_', ' ')}.`;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Pipeline update failed.';
		} finally {
			saving = false;
		}
	}

	async function promoteToRoster(registrationId: string, guardianEmail: string, playerName: string) {
		if (!programId.trim() || !promoteTeamId.trim() || !clubId.trim() || saving) return;
		err = '';
		ok = '';
		saving = true;
		try {
			await promoteTryoutToRoster({
				programId: programId.trim(),
				registrationId,
				teamId: promoteTeamId.trim(),
			});
			await mintMagicUplink({
				targetEmail: guardianEmail,
				purpose: 'parent',
				role: 'parent',
				clubId: clubId.trim(),
				teamId: promoteTeamId.trim(),
				pendingRosterPlayerName: playerName,
			});
			ok = `Roster row created for ${playerName} — guardian invite sent.`;
		} catch (e) {
			err = e instanceof Error ? e.message : 'Roster promotion failed.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="tryout-sessions">
	<h4 class="tryout-sessions__title">Sessions &amp; gate check-in — {programName}</h4>

	<div class="tryout-sessions__grid">
		<label class="tryouts-field">
			<span class="tryouts-label">Session title</span>
			<input class="tryouts-input" type="text" bind:value={sessionTitle} placeholder="U12 Field 2 block" />
		</label>
		<label class="tryouts-field">
			<span class="tryouts-label">Field / facility</span>
			<input class="tryouts-input" type="text" bind:value={fieldLabel} placeholder="North complex — Field 2" />
		</label>
		<label class="tryouts-field">
			<span class="tryouts-label">Start (ISO datetime)</span>
			<input class="tryouts-input" type="datetime-local" bind:value={startAt} />
		</label>
		<label class="tryouts-field">
			<span class="tryouts-label">End (optional)</span>
			<input class="tryouts-input" type="datetime-local" bind:value={endAt} />
		</label>
		{#if ageBands.length}
			<label class="tryouts-field">
				<span class="tryouts-label">Age band filter (optional)</span>
				<select class="tryouts-input" bind:value={sessionAgeBand}>
					<option value="">All program bands</option>
					{#each ageBands as band (band)}
						<option value={band}>{band}</option>
					{/each}
				</select>
			</label>
		{/if}
	</div>

	<button
		type="button"
		class="tryouts-btn tryouts-btn--compact"
		disabled={!fieldLabel.trim() || !startAt.trim() || saving}
		onclick={() => void saveSession()}
	>
		{saving ? 'Saving…' : 'Add session block'}
	</button>

	{#if sessions.length}
		<div class="tryout-sessions__assign">
			<label class="tryouts-field">
				<span class="tryouts-label">Assign session</span>
				<select class="tryouts-input" bind:value={assignSessionId}>
					{#each sessions as s (s.id)}
						<option value={s.id}>{s.title} — {s.fieldLabel} ({s.startAt})</option>
					{/each}
				</select>
			</label>
			<label class="tryouts-field">
				<span class="tryouts-label">Age band to assign</span>
				<select class="tryouts-input" bind:value={assignAgeBand}>
					<option value="">Select band</option>
					{#each ageBands as band (band)}
						<option value={band}>{band}</option>
					{/each}
				</select>
			</label>
			<button
				type="button"
				class="tryouts-btn tryouts-btn--ghost tryouts-btn--compact"
				disabled={!assignSessionId || !assignAgeBand.trim() || saving}
				onclick={() => void assignByAgeBand()}
			>
				Assign athletes
			</button>
		</div>
	{/if}

	{#if err}<p class="tryouts-err" role="alert">{err}</p>{/if}
	{#if ok}<p class="tryouts-ok" role="status">{ok}</p>{/if}

	<div class="tryout-roster-promote">
		<label class="tryouts-field">
			<span class="tryouts-label">Team ID for roster offers</span>
			<input class="tryouts-input" type="text" bind:value={promoteTeamId} placeholder="team doc id" />
		</label>
	</div>

	{#if loading}
		<p class="tryouts-muted">Loading sessions…</p>
	{:else if registrations.length}
		<table class="tryout-checkin">
			<thead>
				<tr>
					<th>Athlete</th>
					<th>Band</th>
					<th>Pipeline</th>
					<th>Session RSVP</th>
					<th>Check-in</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each registrations as r (r.id)}
					<tr>
						<td>
							<strong>{r.playerName}</strong>
							<span class="tryout-checkin__sub">{r.guardianName}</span>
						</td>
						<td>{r.ageBand}</td>
						<td>{r.pipelineStatus.replace('_', ' ')}</td>
						<td>{r.sessionRsvpStatus ?? '—'}</td>
						<td class="tryout-checkin__actions">
							{#if r.checkInStatus}
								<span>{r.checkInStatus.replace('_', ' ')}</span>
							{:else}
								<button type="button" class="tryouts-btn tryouts-btn--ghost tryouts-btn--xs" disabled={saving} onclick={() => void checkIn(r.id, 'present')}>Present</button>
								<button type="button" class="tryouts-btn tryouts-btn--ghost tryouts-btn--xs" disabled={saving} onclick={() => void checkIn(r.id, 'late')}>Late</button>
								<button type="button" class="tryouts-btn tryouts-btn--ghost tryouts-btn--xs" disabled={saving} onclick={() => void checkIn(r.id, 'no_show')}>No-show</button>
							{/if}
						</td>
						<td class="tryout-checkin__actions">
							{#if r.pipelineStatus === 'evaluated' || r.pipelineStatus === 'callback'}
								<button type="button" class="tryouts-btn tryouts-btn--ghost tryouts-btn--xs" disabled={saving} onclick={() => void setPipeline(r.id, 'callback')}>Callback</button>
								<button type="button" class="tryouts-btn tryouts-btn--ghost tryouts-btn--xs" disabled={saving} onclick={() => void setPipeline(r.id, 'offered')}>Offer</button>
							{:else if r.pipelineStatus === 'accepted'}
								<button type="button" class="tryouts-btn tryouts-btn--ghost tryouts-btn--xs" disabled={saving || !promoteTeamId.trim()} onclick={() => void promoteToRoster(r.id, r.guardianEmail, r.playerName)}>Promote</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="tryouts-muted">No registrations yet.</p>
	{/if}

	<section class="tryout-plan">
		<h4 class="tryout-sessions__title">Eval station plan</h4>
		<p class="tryouts-muted">Rotation template for coaches — time boxes and evaluator roles.</p>
		{#each planStations as station, i (i)}
			<div class="tryout-plan__row">
				<input class="tryouts-input" type="text" bind:value={station.label} placeholder="Station label" />
				<input class="tryouts-input" type="number" min="5" max="60" bind:value={station.durationMin} placeholder="Min" />
				<input class="tryouts-input" type="text" bind:value={station.evaluatorRole} placeholder="Role" />
			</div>
		{/each}
		<div class="tryout-plan__actions">
			<button type="button" class="tryouts-btn tryouts-btn--ghost tryouts-btn--compact" onclick={addStation}>
				Add station
			</button>
			<button type="button" class="tryouts-btn tryouts-btn--compact" disabled={saving} onclick={() => void savePlan()}>
				{saving ? 'Saving…' : 'Save eval plan'}
			</button>
		</div>
	</section>
</div>

<style>
	.tryout-sessions {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #334155;
	}

	.tryout-sessions__title {
		margin: 0 0 0.65rem;
		font-size: 0.8125rem;
		font-weight: 800;
		color: #fbbf24;
	}

	.tryout-sessions__grid {
		display: grid;
		gap: 0.55rem;
		grid-template-columns: 1fr;
		margin-bottom: 0.55rem;
	}

	@media (min-width: 720px) {
		.tryout-sessions__grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.tryout-sessions__assign {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: flex-end;
		margin: 0.75rem 0;
	}

	.tryouts-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 10rem;
		flex: 1;
	}

	.tryouts-label {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
	}

	.tryouts-input {
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 0.45rem 0.55rem;
		background: #1e293b;
		color: #f8fafc;
		font: inherit;
		font-size: 0.8125rem;
	}

	.tryouts-btn {
		border: none;
		border-radius: 8px;
		padding: 0.45rem 0.85rem;
		font-size: 0.8125rem;
		font-weight: 700;
		background: #14b8a6;
		color: #0f172a;
		cursor: pointer;
	}

	.tryouts-btn--compact {
		margin-bottom: 0.5rem;
	}

	.tryouts-btn--ghost {
		background: transparent;
		border: 1px solid #334155;
		color: #e2e8f0;
	}

	.tryouts-btn--xs {
		padding: 0.2rem 0.45rem;
		font-size: 0.6875rem;
	}

	.tryouts-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tryouts-err {
		margin: 0 0 0.5rem;
		font-size: 0.8125rem;
		color: #f87171;
	}

	.tryouts-ok {
		margin: 0 0 0.5rem;
		font-size: 0.8125rem;
		color: #14b8a6;
	}

	.tryouts-muted {
		margin: 0;
		font-size: 0.8125rem;
		color: #64748b;
	}

	.tryout-checkin {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.tryout-checkin th,
	.tryout-checkin td {
		border: 1px solid #334155;
		padding: 0.35rem 0.45rem;
		text-align: left;
		vertical-align: top;
	}

	.tryout-checkin th {
		background: #1e293b;
		color: #94a3b8;
		font-size: 0.6875rem;
		text-transform: uppercase;
	}

	.tryout-checkin__sub {
		display: block;
		font-size: 0.6875rem;
		color: #64748b;
	}

	.tryout-checkin__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.tryout-plan {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid #334155;
	}

	.tryout-plan__row {
		display: grid;
		gap: 0.35rem;
		grid-template-columns: 1fr;
		margin-bottom: 0.45rem;
	}

	@media (min-width: 720px) {
		.tryout-plan__row {
			grid-template-columns: 2fr 1fr 1fr;
		}
	}

	.tryout-plan__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.35rem;
	}
</style>
