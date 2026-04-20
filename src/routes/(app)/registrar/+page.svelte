<script>
	import { db, functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';
	import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';

	const transferPlayer = httpsCallable(functions, 'registrarTransferPlayer');
	const secureAddPlayer = httpsCallable(functions, 'secureAddPlayer');
	const secureRemovePlayer = httpsCallable(functions, 'secureRemovePlayer');

	const clubId = $derived(authStore.userProfile?.clubId || '');
	const clubTeams = $derived(
		clubId ? teamsStore.teams.filter((t) => t.clubId === clubId) : []
	);
	const allTeams = $derived(teamsStore.teams);
	const scopeTeams = $derived(
		authStore.role === 'super_admin' ? allTeams : clubTeams
	);

	let addName = $state('');
	let addEmail = $state('');
	let addTeamId = $state('');
	let rosterTeamId = $state('');
	let linkedRows = $state([]);
	let rosterNames = $state([]);
	let rosterLoading = $state(false);
	let xferEmail = $state('');
	let xferTeamId = $state('');
	let xferMsg = $state('');
	let xferErr = $state('');
	let xferBusy = $state(false);
	let addMsg = $state('');
	let addErr = $state('');
	let addBusy = $state(false);

	const xferTeamChoices = $derived(
		authStore.role === 'super_admin' ? allTeams : clubTeams
	);

	$effect(() => {
		if (!authStore.isAuthenticated) return;
		teamsStore.load(authStore.role, {
			clubId: authStore.userProfile?.clubId,
			coachEmail: authStore.user?.email
		});
	});

	$effect(() => {
		if (scopeTeams.length && !addTeamId) addTeamId = scopeTeams[0].id;
		if (scopeTeams.length && !rosterTeamId) rosterTeamId = scopeTeams[0].id;
	});

	async function loadRosterContext() {
		if (!rosterTeamId) return;
		rosterLoading = true;
		addErr = '';
		try {
			const [rosterSnap, linkSnap] = await Promise.all([
				getDoc(doc(db, 'rosters', rosterTeamId)),
				getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', rosterTeamId)))
			]);
			rosterNames = rosterSnap.exists() ? [...(rosterSnap.data().players || [])].sort() : [];
			linkedRows = [];
			linkSnap.forEach((d) =>
				linkedRows.push({ id: d.id, ...d.data() })
			);
			linkedRows.sort((a, b) => (a.playerName || '').localeCompare(b.playerName || ''));
		} catch (e) {
			console.error(e);
			addErr = 'Could not load roster.';
		} finally {
			rosterLoading = false;
		}
	}

	$effect(() => {
		if (rosterTeamId) loadRosterContext();
	});

	async function addPlayerInvite() {
		addErr = '';
		addMsg = '';
		const name = addName.trim().replace(/\s+/g, ' ');
		const email = addEmail.trim().toLowerCase();
		if (!name || !addTeamId) {
			addErr = 'Player name and team are required.';
			return;
		}
		addBusy = true;
		try {
			const res = await secureAddPlayer({
				teamId: addTeamId,
				playerName: name,
				...(email ? { playerEmail: email } : {})
			});
			const data = res.data;
			if (data?.duplicate) {
				addMsg = 'That player is already on this team roster.';
			} else {
				addMsg = email
					? 'Player added to roster and login invite saved.'
					: 'Player added to roster (no email invite).';
			}
			addName = '';
			addEmail = '';
			await loadRosterContext();
		} catch (e) {
			addErr = e instanceof Error ? e.message : 'Save failed.';
		} finally {
			addBusy = false;
		}
	}

	async function removeFromRoster(name) {
		if (!rosterTeamId || !confirm(`Remove ${name} from this roster view?`)) return;
		addErr = '';
		try {
			const normalized = name.trim().replace(/\s+/g, ' ');
			const res = await secureRemovePlayer({
				teamId: rosterTeamId,
				playerName: normalized
			});
			if (res.data?.notFound) {
				addErr =
					'That player was not on this roster. It may have been updated elsewhere.';
			}
			await loadRosterContext();
		} catch (e) {
			addErr = e instanceof Error ? e.message : 'Remove failed.';
		}
	}

	async function runTransfer() {
		xferErr = '';
		xferMsg = '';
		const pe = xferEmail.trim().toLowerCase();
		if (!pe || !xferTeamId) {
			xferErr = 'Player email and destination team are required.';
			return;
		}
		xferBusy = true;
		try {
			const res = await transferPlayer({ playerEmail: pe, targetTeamId: xferTeamId });
			const data = res.data;
			if (data?.noop) {
				xferMsg = 'Player already on that team.';
			} else {
				xferMsg = `Moved ${data?.playerName || pe} — rosters and records updated.`;
			}
			xferEmail = '';
			if (rosterTeamId) await loadRosterContext();
		} catch (e) {
			const err = /** @type {{ message?: string }} */ (e);
			xferErr = err?.message || 'Transfer failed.';
		} finally {
			xferBusy = false;
		}
	}
</script>

<div class="view-section">
	<h2 class="view-title">📋 Registrar console</h2>
	<p class="lead text-sm-sub">
		Manage roster names and login invites for your organization. Transfers between clubs require staff in
		the <strong>source</strong> or <strong>destination</strong> club (or a super admin). Removing a player
		from a roster clears matching invites for this team; it does not delete Firebase Auth accounts.
	</p>

	<div class="bento-section">
		<div class="card">
		<div class="card-header">Add player to team</div>
		<div class="card-body grid-form">
			<label class="field-label" for="add-team">Team</label>
			<select id="add-team" class="field-input" bind:value={addTeamId}>
				{#each scopeTeams as t}
					<option value={t.id}>{t.name || t.id}</option>
				{/each}
			</select>

			<label class="field-label" for="add-name">Player name (as on roster)</label>
			<input id="add-name" class="field-input" type="text" bind:value={addName} />

			<label class="field-label" for="add-email">Player / parent email (optional invite)</label>
			<input id="add-email" class="field-input" type="email" bind:value={addEmail} />

			{#if addErr}
				<div class="auth-error-msg" role="alert">{addErr}</div>
			{/if}
			{#if addMsg}
				<p class="ok-msg" role="status">{addMsg}</p>
			{/if}

			<button class="primary-btn btn-orange" type="button" onclick={addPlayerInvite} disabled={addBusy}>
				{addBusy ? 'Saving…' : 'Add to roster'}
			</button>
		</div>
		</div>

		<div class="card">
		<div class="card-header">Transfer / trade player</div>
		<div class="card-body grid-form">
			<p class="text-sm-sub">
				Uses the secure server function so rosters, invites, and player club assignment stay in sync.
				Super admins may select any destination team; club staff see teams in their organization only—use
				destination-club login for inbound moves.
			</p>

			<label class="field-label" for="xfer-email">Player login email</label>
			<input id="xfer-email" class="field-input" type="email" bind:value={xferEmail} />

			<label class="field-label" for="xfer-team">Destination team</label>
			<select id="xfer-team" class="field-input" bind:value={xferTeamId}>
				<option value="">Select team…</option>
				{#each xferTeamChoices as t}
					<option value={t.id}>{t.name || t.id} ({t.clubId})</option>
				{/each}
			</select>

			{#if xferErr}
				<div class="auth-error-msg" role="alert">{xferErr}</div>
			{/if}
			{#if xferMsg}
				<p class="ok-msg" role="status">{xferMsg}</p>
			{/if}

			<button class="primary-btn btn-orange" type="button" onclick={runTransfer} disabled={xferBusy}>
				{xferBusy ? 'Transferring…' : 'Run transfer'}
			</button>
		</div>
		</div>
	</div>

	<div class="card">
		<div class="card-header">Roster &amp; invites</div>
		<div class="card-body">
			<label class="field-label" for="roster-team">Team</label>
			<select id="roster-team" class="field-input" bind:value={rosterTeamId}>
				{#each scopeTeams as t}
					<option value={t.id}>{t.name || t.id}</option>
				{/each}
			</select>

			{#if rosterLoading}
				<p class="text-sm-sub">Loading…</p>
			{:else}
				<h3 class="subhead">Linked logins</h3>
				{#if linkedRows.length === 0}
					<p class="text-sm-sub">No email invites for this team.</p>
				{:else}
					<ul class="plain-list">
						{#each linkedRows as row}
							<li class="plain-li">
								<span><strong>{row.playerName}</strong> — {row.id}</span>
							</li>
						{/each}
					</ul>
				{/if}

				<h3 class="subhead">Roster names</h3>
				{#if rosterNames.length === 0}
					<p class="text-sm-sub">Empty roster.</p>
				{:else}
					<ul class="plain-list">
						{#each rosterNames as n}
							<li class="plain-li row-between">
								<span>{n}</span>
								<button type="button" class="danger-outline" onclick={() => removeFromRoster(n)}>
									Remove
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.lead {
		margin-bottom: clamp(16px, 3vw, 24px);
		max-width: 52rem;
	}

	.grid-form {
		display: flex;
		flex-direction: column;
		gap: clamp(10px, 2vw, 14px);
	}

	.field-label {
		font-weight: 800;
		font-size: 0.9rem;
	}

	.field-input {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 12px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		font: inherit;
		background: var(--glass-bg);
		color: inherit;
	}

	.subhead {
		font-size: 1rem;
		margin: 16px 0 8px;
	}

	.plain-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.plain-li {
		padding: 10px 12px;
		border-radius: 12px;
		border: 1px solid var(--glass-border);
	}

	.row-between {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.danger-outline {
		background: transparent;
		border: 1px solid var(--danger-red);
		color: var(--danger-red);
		font-weight: 700;
		padding: 6px 12px;
		border-radius: 12px;
		cursor: pointer;
		font: inherit;
	}

	.ok-msg {
		margin: 0;
		color: var(--success-green);
		font-weight: 700;
		font-size: 0.9rem;
	}
</style>
