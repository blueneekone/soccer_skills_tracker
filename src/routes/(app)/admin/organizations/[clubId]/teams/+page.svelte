<script>
	import { page } from '$app/state';
	import { db } from '$lib/firebase.js';
	import { doc, setDoc } from 'firebase/firestore';
	import { getContext } from 'svelte';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import '$lib/styles/enterprise-console.css';

	/**
	 * @type {{
	 *   clubDoc: Record<string, unknown> & { id: string } | null,
	 *   clubId: string,
	 *   clubLoading: boolean,
	 *   clubErr: string,
	 * }}
	 */
	const ctx = getContext('adminClubCtx');

	// ── Teams for this club (derived from global store) ─────────────────────────
	const clubTeams = $derived(
		teamsStore.teams.filter((t) => t.clubId === ctx.clubId),
	);

	// ── Add Team form ────────────────────────────────────────────────────────────
	let teamId = $state('');
	let teamName = $state('');
	let teamCoach = $state('');
	let teamSaving = $state(false);
	let teamAddErr = $state('');

	const addTeam = async () => {
		teamAddErr = '';
		if (!ctx.clubId) {
			teamAddErr = 'Organization context not loaded.';
			return;
		}
		if (!teamId.trim() || !teamName.trim()) {
			teamAddErr = 'Enter a Team ID and team name.';
			return;
		}
		const tid = `${ctx.clubId}_${teamId.trim()}`;
		teamSaving = true;
		try {
			await setDoc(doc(db, 'teams', tid), {
				clubId: ctx.clubId,
				name: teamName,
				coachEmail: teamCoach.trim().toLowerCase(),
				createdAt: new Date(),
			});
			if (teamCoach.trim()) {
				const coachEmail = teamCoach.trim().toLowerCase();
				await setDoc(
					doc(db, 'users', coachEmail),
					{ role: 'coach', clubId: ctx.clubId, teamId: tid },
					{ merge: true },
				);
				await setDoc(
					doc(db, 'coach_lookup', coachEmail),
					{ role: 'coach', clubId: ctx.clubId, teamId: tid },
					{ merge: true },
				);
			}
			await logSecurityEvent('CREATE_TEAM', tid, teamName);
			teamId = '';
			teamName = '';
			teamCoach = '';
			await teamsStore.load('super_admin', { scope: 'admin_full', routePath: page.url.pathname });
		} catch (e) {
			teamAddErr = e instanceof Error ? e.message : 'Could not create team.';
		} finally {
			teamSaving = false;
		}
	};
</script>

<div class="teams-page">

	<!-- ── Page heading ────────────────────────────────────────────────────────── -->
	<div class="teams-page__header">
		<h2 class="teams-page__title">
			<i class="ph ph-users-three" aria-hidden="true"></i>
			Teams
		</h2>
		{#if !ctx.clubLoading && ctx.clubDoc}
			<p class="teams-page__sub">
				{clubTeams.length} team{clubTeams.length === 1 ? '' : 's'} in
				<strong>{ctx.clubDoc.name || ctx.clubId}</strong>
			</p>
		{/if}
	</div>

	<!-- ── Teams table ─────────────────────────────────────────────────────────── -->
	<div class="card">
		<div class="card-body teams-page__table-body">
			<div class="teams-page__table-wrap">
				<table class="admin-table teams-page__table">
					<thead>
						<tr>
							<th>Team Name</th>
							<th>Team ID</th>
							<th>Head Coach</th>
						</tr>
					</thead>
					<tbody>
						{#if clubTeams.length === 0}
							<tr>
								<td colspan="3" class="text-center">No teams for this organization yet.</td>
							</tr>
						{:else}
							{#each clubTeams as t (t.id)}
								<tr>
									<td class="teams-page__td-name">{t.name || '—'}</td>
									<td class="teams-page__td-id">{t.id}</td>
									<td class="teams-page__td-coach">{t.coachEmail || '—'}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- ── Add Team form ───────────────────────────────────────────────────────── -->
	<div class="card">
		<div class="card-header">
			<i class="ph ph-plus-circle" aria-hidden="true"></i> Add New Team
		</div>
		<div class="card-body">
			{#if ctx.clubLoading}
				<p class="text-sm-sub">Loading organization…</p>
			{:else if ctx.clubErr}
				<p class="teams-page__err" role="alert">{ctx.clubErr}</p>
			{:else}
				{#if teamAddErr}
					<p class="teams-page__flash teams-page__flash--err" role="alert">{teamAddErr}</p>
				{/if}
				<p class="text-sm-sub">
					Team will be registered under organization <code>{ctx.clubId}</code>.
					Final Team ID will be <code>{ctx.clubId}_{teamId.trim() || '…'}</code>.
				</p>
				<div class="teams-page__add-grid">
					<div class="teams-page__field">
						<label for="add-team-id">Team ID suffix <span class="teams-page__req">*</span></label>
						<input
							id="add-team-id"
							type="text"
							bind:value={teamId}
							placeholder="e.g. 15bew"
							disabled={teamSaving}
						/>
					</div>
					<div class="teams-page__field">
						<label for="add-team-name">Team Name <span class="teams-page__req">*</span></label>
						<input
							id="add-team-name"
							type="text"
							bind:value={teamName}
							placeholder="e.g. Aggie FC U15 Boys"
							disabled={teamSaving}
						/>
					</div>
					<div class="teams-page__field">
						<label for="add-team-coach">Head Coach Email</label>
						<input
							id="add-team-coach"
							type="email"
							bind:value={teamCoach}
							placeholder="coach@example.com"
							disabled={teamSaving}
						/>
					</div>
				</div>
				<button
					type="button"
					class="primary-btn btn-blue"
					onclick={addTeam}
					disabled={teamSaving}
				>
					{teamSaving ? 'Creating…' : '+ Add Team'}
				</button>
			{/if}
		</div>
	</div>

</div>

<style>
	.teams-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* ── Page header ────────────────────────────────────────────────── */
	.teams-page__header {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.teams-page__title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-primary);
	}

	.teams-page__sub {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	/* ── Full-bleed table ───────────────────────────────────────────── */
	.teams-page__table-body {
		padding: 0 !important;
	}

	.teams-page__table-wrap {
		width: 100%;
		overflow-x: auto;
	}

	.teams-page__table {
		width: 100%;
		min-width: 480px;
	}

	.teams-page__td-name {
		font-weight: 600;
		color: var(--text-primary);
	}

	.teams-page__td-id {
		font-family: ui-monospace, monospace;
		font-size: 0.78rem;
		color: var(--text-secondary);
	}

	.teams-page__td-coach {
		color: var(--text-secondary);
		font-size: 0.88rem;
	}

	/* ── Add team form ──────────────────────────────────────────────── */
	.teams-page__add-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 16px;
		margin-bottom: 16px;
	}

	.teams-page__field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.teams-page__field label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		margin: 0;
	}

	.teams-page__field input {
		margin: 0;
	}

	.teams-page__req {
		color: var(--danger-red, #b91c1c);
		margin-left: 2px;
	}

	/* ── Flash / errors ─────────────────────────────────────────────── */
	.teams-page__flash {
		margin: 0 0 12px;
		padding: 12px 14px;
		border-radius: 12px;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.teams-page__flash--err {
		background: rgba(185, 28, 28, 0.1);
		color: var(--danger-red, #991b1b);
		border: 1px solid rgba(185, 28, 28, 0.35);
	}

	:global(html.dark) .teams-page__flash--err {
		color: #fecaca;
		border-color: rgba(248, 113, 113, 0.35);
		background: rgba(127, 29, 29, 0.25);
	}

	.teams-page__err {
		padding: 12px;
		color: var(--danger-red, #b91c1c);
		font-size: 0.9rem;
		margin: 0;
	}
</style>
