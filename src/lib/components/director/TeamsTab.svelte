<script>
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import { db, functions } from '$lib/firebase.js';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import { doc, setDoc, getDoc } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { isSubscriptionReadOnly } from '$lib/auth/billing.js';

	let { clubId = '' } = $props();

	/** @type {() => void} */
	const openReadOnlyUpgrade = getContext('openReadOnlyUpgrade') || (() => {});

	const isReadOnly = $derived(
		isSubscriptionReadOnly(
			authStore.role,
			licenseEntitlementStore.clubIdResolved,
			licenseEntitlementStore.entitlement,
			{ clubInfinite: licenseEntitlementStore.isInfiniteClub },
		),
	);

	const directorInviteCoach = httpsCallable(functions, 'directorInviteCoach');

	let newTeamName = $state('');
	let newCoachEmail = $state('');
	let selectedTeamId = $state('');
	let inviteCoachEmail = $state('');
	let saving = $state(false);

	const clubTeams = $derived(teamsStore.teams.filter((t) => t.clubId === clubId));

	$effect(() => {
		if (clubTeams.length > 0 && !selectedTeamId) selectedTeamId = clubTeams[0].id;
	});

	/**
	 * @param {{ id: string; name?: string }} t
	 */
	function openTeamDrawer(t) {
		enterprisePlayerDrawer.open({
			title: t.name || t.id,
			meta: t.id,
			body: `Team ID: ${t.id}\nClub: ${clubId || '—'}\n\nManage seat allocation under Licenses & Seats.`,
		});
	}

	const createTeam = async () => {
		if (isReadOnly) {
			openReadOnlyUpgrade();
			return;
		}
		if (!clubId) return alert('No club on your profile.');
		if (!newTeamName.trim()) return alert('Please enter a team name.');
		const slug = newTeamName.toLowerCase().replace(/[^a-z0-9]/g, '');
		const teamId = `${clubId}_${slug}`;
		saving = true;
		try {
			await setDoc(doc(db, 'teams', teamId), {
				clubId,
				name: newTeamName.trim(),
				createdAt: new Date(),
			});
			let inviteMsg = '';
			if (newCoachEmail.trim()) {
				try {
					await directorInviteCoach({
						teamId,
						coachEmail: newCoachEmail.trim(),
					});
					inviteMsg = ' Coach invite sent (reserved seat until they accept).';
				} catch (ie) {
					const m =
						ie && typeof ie === 'object' && 'message' in ie
							? String(/** @type {{ message?: string }} */ (ie).message)
							: String(ie);
					inviteMsg = ` Team was created, but the coach invite failed: ${m}`;
				}
			}
			alert(`Team \u201c${newTeamName.trim()}\u201d created.${inviteMsg}`);
			newTeamName = '';
			newCoachEmail = '';
			await teamsStore.load('director', {
				clubId,
				scope: 'club',
				routePath: page.url.pathname,
			});
		} catch (e) {
			alert('Error: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			saving = false;
		}
	};

	const inviteCoach = async () => {
		if (isReadOnly) {
			openReadOnlyUpgrade();
			return;
		}
		if (!selectedTeamId || !inviteCoachEmail.trim()) {
			return alert('Select a team and enter a coach email.');
		}
		saving = true;
		try {
			const teamSnap = await getDoc(doc(db, 'teams', selectedTeamId));
			if (!teamSnap.exists()) return alert('Team not found.');
			const tClubId = teamSnap.data().clubId;
			if (tClubId && clubId && tClubId !== clubId) {
				return alert('That team does not belong to your club.');
			}
			const res = await directorInviteCoach({
				teamId: selectedTeamId,
				coachEmail: inviteCoachEmail.trim(),
			});
			const inviteId =
				res.data && typeof res.data === 'object' && 'inviteId' in res.data && typeof res.data.inviteId === 'string'
					? ` (ref ${res.data.inviteId.slice(0, 12)}\u2026)`
					: '';
			alert(
				`Invite recorded.${inviteId} The coach has 7 days to accept; a seat stays reserved until then.`,
			);
			inviteCoachEmail = '';
		} catch (e) {
			const msg =
				e && typeof e === 'object' && 'message' in e
					? String(/** @type {{ message?: string }} */ (e).message)
					: String(e);
			alert(msg);
		} finally {
			saving = false;
		}
	};
</script>

<div class="teams-tab tw-space-y-6">
	<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
		<div class="card">
			<div class="card-header bg-blue-header">Create Team</div>
			<div class="card-body">
				<label class="tw-block tw-text-xs tw-font-bold tw-mb-1 tt-label-muted"
					>Team label (e.g. U12 Gold)</label
				>
				<input
					type="text"
					bind:value={newTeamName}
					placeholder="U12 Gold"
					class="w-100 m-0"
				/>
				<label class="tw-block tw-text-xs tw-font-bold tw-mt-3 tw-mb-1 tt-label-muted"
					>Optional — head coach email</label
				>
				<input
					type="email"
					bind:value={newCoachEmail}
					placeholder="coach@club.com"
					class="w-100 m-0"
				/>
				<button
					class="primary-btn btn-blue w-100 tw-mt-4"
					class:primary-btn--readonly={isReadOnly}
					onclick={createTeam}
					disabled={saving}
				>
					Create Team
				</button>
			</div>
		</div>

		<div class="card">
			<div class="card-header bg-orange-header">Invite Coach (Seat Reservation)</div>
			<div class="card-body">
				<p class="tw-m-0 tw-mb-3 tw-text-sm tt-muted">
					Sends a pending invite: one licensed seat moves into <strong>reserved</strong> until the
					coach accepts or the invite expires after 7 days.
				</p>
				<select bind:value={selectedTeamId} class="w-100">
					<option value="">Select a team…</option>
					{#each clubTeams as t (t.id)}
						<option value={t.id}>{t.name}</option>
					{/each}
				</select>
				<input
					type="email"
					bind:value={inviteCoachEmail}
					placeholder="Coach email"
					class="w-100"
				/>
				<button
					class="primary-btn btn-orange w-100 tw-mt-2"
					class:primary-btn--readonly={isReadOnly}
					onclick={inviteCoach}
					disabled={saving}
				>
					Send Coach Invite
				</button>
			</div>
		</div>
	</div>

	<div class="card team-list-card">
		<div class="card-header bg-blue-header">Teams</div>
		<div class="card-body">
			{#if clubTeams.length === 0}
				<p class="tw-m-0 tw-text-sm tt-muted">No teams yet.</p>
			{:else}
				<div class="ec-table-wrap">
					<table class="ec-table">
						<thead>
							<tr>
								<th>Team</th>
								<th>Team ID</th>
								<th class="tt-actions-col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each clubTeams as t (t.id)}
								<tr
									class="ec-table__row-click"
									onclick={() => openTeamDrawer(t)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											openTeamDrawer(t);
										}
									}}
									role="button"
									tabindex="0"
								>
									<td class="ec-table__strong">{t.name || t.id}</td>
									<td><code class="tt-code">{t.id}</code></td>
									<td>
										<a class="team-link" href="/admin/organizations/{clubId}/teams/{t.id}/roster">Open Roster</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="tw-m-0 tw-mt-3 tw-text-xs tt-muted">
					Seat caps, license allocations, and per-team subscription controls live in
					<strong>Licenses &amp; Seats</strong>.
				</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.tt-muted       { color: var(--text-secondary); }
	.tt-label-muted { color: var(--text-secondary); }
	.tt-actions-col { width: 11rem; }

	.tt-code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.04);
	}

	:global(html.dark) .tt-code {
		background: rgba(255, 255, 255, 0.06);
	}

	select,
	input {
		margin-bottom: 12px;
	}

	.team-list-card {
		margin-top: 0;
	}

	.team-link {
		font-weight: 600;
		font-size: 13px;
		color: var(--brand-primary, #2563eb);
		text-decoration: none;
	}

	.team-link:hover {
		text-decoration: underline;
	}

	:global(.primary-btn.primary-btn--readonly) {
		opacity: 0.72;
		filter: grayscale(0.12);
		cursor: not-allowed;
	}
</style>
