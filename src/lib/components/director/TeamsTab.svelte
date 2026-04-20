<script>
	import { getContext } from 'svelte';
	import { db, functions } from '$lib/firebase.js';
	import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { isSubscriptionReadOnly } from '$lib/auth/billing.js';

	let { clubId = '' } = $props();

	/** @type {() => void} */
	const openReadOnlyUpgrade = getContext('openReadOnlyUpgrade') || (() => {});

	/** @type {{ open?: (o: { title?: string; body?: string; meta?: string }) => void } | undefined} */
	const enterpriseDrawer = getContext('enterpriseDrawer');

	const isReadOnly = $derived(
		isSubscriptionReadOnly(
			authStore.role,
			licenseEntitlementStore.clubIdResolved,
			licenseEntitlementStore.entitlement
		)
	);

	const directorInviteCoach = httpsCallable(functions, 'directorInviteCoach');
	const secureAllocateTeamSeats = httpsCallable(functions, 'secureAllocateTeamSeats');

	let newTeamName = $state('');
	let newCoachEmail = $state('');
	let selectedTeamId = $state('');
	let inviteCoachEmail = $state('');
	let saving = $state(false);

	const clubTeams = $derived(teamsStore.teams.filter((t) => t.clubId === clubId));

	/** Master club license cap (read-only). */
	let masterSeatLimit = $state(0);
	/** Per-team roster sizes from rosters/{teamId}. */
	let rosterCounts = $state(/** @type {Record<string, number>} */ ({}));
	/** Per-team entitlement rows (team_entitlements/{teamId}). */
	let teamEntLimits = $state(
		/** @type {Record<string, { limit: number; active: number; set: boolean }>} */ ({})
	);
	let openSeatMgmt = $state(/** @type {Record<string, boolean>} */ ({}));
	let seatDraft = $state(/** @type {Record<string, number>} */ ({}));
	let seatBusy = $state(/** @type {string | null} */ (null));
	let seatFeedback = $state('');

	const allocatedSum = $derived.by(() => {
		let s = 0;
		for (const t of clubTeams) {
			const row = teamEntLimits[t.id];
			if (row?.set) s += row.limit;
		}
		return s;
	});

	/**
	 * @param {{ id: string; name?: string }} t
	 */
	function openTeamDrawer(t) {
		const tid = t.id;
		const rc = rosterCounts[tid] ?? 0;
		const row = teamEntLimits[tid];
		const hasCap = row?.set === true && row.limit > 0;
		const capLine = hasCap ? `${rc} / ${row.limit} seats` : `${rc} on roster (no per-team cap)`;
		enterpriseDrawer?.open?.({
			title: t.name || tid,
			meta: tid,
			body:
				`${capLine}\nClub pool: ${masterSeatLimit || '—'} · Allocated (all teams): ${allocatedSum}\n\nOpen “Seat management” on a row to edit caps.`,
		});
	}

	$effect(() => {
		if (clubTeams.length > 0 && !selectedTeamId) selectedTeamId = clubTeams[0].id;
	});

	$effect(() => {
		if (!clubId) return;
		return onSnapshot(doc(db, 'license_entitlements', clubId), (snap) => {
			if (!snap.exists()) {
				masterSeatLimit = 0;
				return;
			}
			const d = snap.data();
			masterSeatLimit =
				typeof d.seats_limit === 'number' && !Number.isNaN(d.seats_limit) ?
					d.seats_limit :
					0;
		});
	});

	$effect(() => {
		if (!clubId) return;
		const teams = clubTeams;
		const unsubs = [];
		for (const t of teams) {
			const tid = t.id;
			unsubs.push(
				onSnapshot(doc(db, 'rosters', tid), (snap) => {
					const n =
						snap.exists() && Array.isArray(snap.data().players) ?
							snap.data().players.length :
							0;
					rosterCounts = { ...rosterCounts, [tid]: n };
				})
			);
			unsubs.push(
				onSnapshot(doc(db, 'team_entitlements', tid), (snap) => {
					if (!snap.exists()) {
						teamEntLimits = {
							...teamEntLimits,
							[tid]: { limit: 0, active: 0, set: false }
						};
						return;
					}
					const d = snap.data();
					const limit =
						typeof d.seats_limit === 'number' && !Number.isNaN(d.seats_limit) ?
							d.seats_limit :
							0;
					const active =
						typeof d.active_seats === 'number' && !Number.isNaN(d.active_seats) ?
							d.active_seats :
							0;
					teamEntLimits = {
						...teamEntLimits,
						[tid]: { limit, active, set: true }
					};
				})
			);
		}
		return () => unsubs.forEach((u) => u());
	});

	/** @param {string} tid */
	function usagePct(tid) {
		const rc = rosterCounts[tid] ?? 0;
		const row = teamEntLimits[tid];
		const limit = row?.set ? row.limit : 0;
		if (!limit) return 0;
		return Math.min(100, (rc / limit) * 100);
	}

	/** @param {string} tid */
	function toggleSeatMgmt(tid) {
		const next = !openSeatMgmt[tid];
		openSeatMgmt = { ...openSeatMgmt, [tid]: next };
		if (next) {
			const row = teamEntLimits[tid];
			const rc = rosterCounts[tid] ?? 0;
			const base =
				row?.set && row.limit > 0 ? row.limit : Math.max(rc, 1);
			seatDraft = { ...seatDraft, [tid]: base };
		}
	}

	/** @param {string} tid */
	async function saveTeamSeats(tid) {
		if (isReadOnly) {
			openReadOnlyUpgrade();
			return;
		}
		const raw = seatDraft[tid];
		const v = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
		if (!Number.isFinite(v) || v < 1) {
			seatFeedback = 'Enter a positive seat cap.';
			return;
		}
		seatBusy = tid;
		seatFeedback = '';
		try {
			await secureAllocateTeamSeats({ teamId: tid, seatsLimit: Math.floor(v) });
			seatFeedback = 'Seat allocation saved.';
		} catch (e) {
			const msg =
				e && typeof e === 'object' && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message) :
					String(e);
			seatFeedback = msg;
		} finally {
			seatBusy = null;
		}
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
				createdAt: new Date()
			});
			let inviteMsg = '';
			if (newCoachEmail.trim()) {
				try {
					await directorInviteCoach({
						teamId,
						coachEmail: newCoachEmail.trim()
					});
					inviteMsg = ' Coach invite sent (reserved seat until they accept).';
				} catch (ie) {
					const m =
						ie && typeof ie === 'object' && 'message' in ie ?
							String(/** @type {{ message?: string }} */ (ie).message) :
							String(ie);
					inviteMsg =
						` Team was created, but the coach invite failed: ${m}`;
				}
			}
			alert(
				`Team “${newTeamName.trim()}” created.${inviteMsg}`
			);
			newTeamName = '';
			newCoachEmail = '';
			await teamsStore.load('director', { clubId });
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
				coachEmail: inviteCoachEmail.trim()
			});
			const inviteId =
				res.data && typeof res.data.inviteId === 'string' ?
					` (ref ${res.data.inviteId.slice(0, 12)}…)` :
					'';
			alert(
				`Invite recorded.${inviteId} The coach has 7 days to accept; a seat stays reserved until then.`
			);
			inviteCoachEmail = '';
		} catch (e) {
			const msg =
				e && typeof e === 'object' && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message) :
					String(e);
			alert(msg);
		} finally {
			saving = false;
		}
	};
</script>

<div class="teams-tab tw-space-y-6">
	<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
		<div class="card">
			<div class="card-header bg-blue-header">Create sub-team</div>
			<div class="card-body">
				<label class="tw-block tw-text-xs tw-font-bold tw-mb-1" style="color: var(--text-secondary);"
					>Team label (e.g. U12 Gold)</label
				>
				<input type="text" bind:value={newTeamName} placeholder="U12 Gold" class="w-100 m-0" />
				<label class="tw-block tw-text-xs tw-font-bold tw-mt-3 tw-mb-1" style="color: var(--text-secondary);"
					>Optional — head coach email</label
				>
				<input type="email" bind:value={newCoachEmail} placeholder="coach@club.com" class="w-100 m-0" />
				<button
					class="primary-btn btn-blue w-100 tw-mt-4"
					class:primary-btn--readonly={isReadOnly}
					onclick={createTeam}
					disabled={saving}
				>
					Create team
				</button>
			</div>
		</div>

		<div class="card">
			<div class="card-header bg-orange-header">Invite coach (seat reservation)</div>
			<div class="card-body">
				<p class="tw-m-0 tw-mb-3 tw-text-sm" style="color: var(--text-secondary);">
					Sends a pending invite: one licensed seat moves into <strong>reserved</strong> until the coach
					accepts or the invite expires after 7 days.
				</p>
				<select bind:value={selectedTeamId} class="w-100">
					<option value="">Select a team…</option>
					{#each clubTeams as t}
						<option value={t.id}>{t.name}</option>
					{/each}
				</select>
				<input type="email" bind:value={inviteCoachEmail} placeholder="Coach email" class="w-100" />
				<button
					class="primary-btn btn-orange w-100 tw-mt-2"
					class:primary-btn--readonly={isReadOnly}
					onclick={inviteCoach}
					disabled={saving}
				>
					Send coach invite
				</button>
			</div>
		</div>
	</div>

	<div class="card team-seat-card">
		<div class="card-header bg-blue-header">Teams & seat management</div>
		<div class="card-body">
			<p class="tw-m-0 tw-mb-4 tw-text-sm" style="color: var(--text-secondary);">
				Allocate sub-licenses per team. Total allocated caps must stay within the club master license
				({masterSeatLimit || '—'} seats). Pool remaining:
				<strong
					>{masterSeatLimit > 0 ? Math.max(0, masterSeatLimit - allocatedSum) : '—'}</strong
				>.
			</p>
			{#if seatFeedback}
				<p class="seat-feedback" role="status">{seatFeedback}</p>
			{/if}
			{#if clubTeams.length === 0}
				<p class="tw-m-0 tw-text-sm" style="color: var(--text-secondary);">No teams yet.</p>
			{:else}
				<div class="ec-table-wrap">
					<table class="ec-table">
						<thead>
							<tr>
								<th>Team</th>
								<th>Roster</th>
								<th>Seat usage</th>
								<th style="width: 9rem;">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each clubTeams as t (t.id)}
								{@const tid = t.id}
								{@const rc = rosterCounts[tid] ?? 0}
								{@const row = teamEntLimits[tid]}
								{@const hasCap = row?.set === true && row.limit > 0}
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
									<td class="ec-table__strong">{t.name || tid}</td>
									<td>{rc}</td>
									<td>
										{#if hasCap}
											{rc} / {row.limit}
										{:else}
											{rc} · <span class="muted">no cap</span>
										{/if}
										<div class="team-seat-meter team-seat-meter--inline" aria-hidden="true">
											<div class="team-seat-meter__fill" style:width="{usagePct(tid)}%"></div>
										</div>
									</td>
									<td>
										<button
											type="button"
											class="team-seat-toggle"
											onclick={(e) => {
												e.stopPropagation();
												toggleSeatMgmt(tid);
											}}
											aria-expanded={openSeatMgmt[tid] === true}
										>
											{openSeatMgmt[tid] ? 'Hide' : 'Seat management'}
										</button>
									</td>
								</tr>
								{#if openSeatMgmt[tid]}
									<tr class="ec-table__expand">
										<td colspan="4">
											<div class="team-seat-editor">
												<label class="tw-block tw-text-xs tw-font-bold tw-mb-1" for="seat-cap-{tid}"
													>Seat cap for this team</label
												>
												<div class="team-seat-editor__controls">
													<input
														id="seat-cap-{tid}"
														type="range"
														min="1"
														max={Math.max(masterSeatLimit || 1, seatDraft[tid] ?? 1, rc || 1)}
														value={seatDraft[tid] ?? Math.max(rc, 1)}
														oninput={(e) => {
															const n = parseInt(e.currentTarget.value, 10);
															seatDraft = { ...seatDraft, [tid]: n };
														}}
													/>
													<input
														type="number"
														min="1"
														class="team-seat-num"
														value={seatDraft[tid] ?? Math.max(rc, 1)}
														oninput={(e) => {
															const n = parseInt(e.currentTarget.value, 10);
															if (Number.isFinite(n)) {
																seatDraft = { ...seatDraft, [tid]: n };
															}
														}}
													/>
													<button
														type="button"
														class="primary-btn btn-blue team-seat-save"
														class:primary-btn--readonly={isReadOnly}
														disabled={seatBusy === tid}
														onclick={() => saveTeamSeats(tid)}
													>
														{seatBusy === tid ? 'Saving…' : 'Apply'}
													</button>
												</div>
												<p class="tw-m-0 tw-mt-2 tw-text-xs" style="color: var(--text-secondary);">
													Cannot set below current roster size ({rc}).
												</p>
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	select,
	input {
		margin-bottom: 12px;
	}

	.team-seat-card {
		margin-top: 0;
	}

	.seat-feedback {
		margin: 0 0 12px;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--brand-primary, var(--aggie-blue));
	}

	.team-seat-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: clamp(14px, 2vw, 20px);
	}

	.team-seat-row {
		border: 1px solid var(--glass-border);
		border-radius: 14px;
		padding: 12px 14px;
		background: var(--glass-bg);
	}

	.team-seat-row__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 8px;
	}

	.team-seat-row__name {
		font-weight: 800;
		font-size: 0.95rem;
	}

	.team-seat-toggle {
		font: inherit;
		font-weight: 700;
		font-size: 0.8rem;
		padding: 6px 10px;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--brand-primary, #0f172a) 28%, transparent);
		background: color-mix(in srgb, var(--brand-primary, #0f172a) 8%, transparent);
		color: var(--brand-primary, var(--aggie-blue));
		cursor: pointer;
	}

	.team-seat-meter {
		height: 8px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--brand-primary, #0f172a) 12%, rgba(255, 255, 255, 0.5));
		overflow: hidden;
		margin-bottom: 6px;
	}

	.team-seat-meter--inline {
		height: 4px;
		margin: 6px 0 0;
		max-width: 140px;
	}

	.team-seat-meter__fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--brand-primary, #0f172a) 85%, white),
			color-mix(in srgb, var(--brand-accent, #10b981) 70%, white)
		);
		box-shadow: 0 0 12px color-mix(in srgb, var(--brand-primary, #0f172a) 35%, transparent);
		transition: width 0.25s ease;
	}

	.team-seat-row__meta {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.team-seat-row__meta .muted {
		opacity: 0.85;
	}

	.team-seat-editor {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--glass-border);
	}

	.team-seat-editor__controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}

	.team-seat-editor__controls input[type='range'] {
		flex: 1;
		min-width: 120px;
		margin-bottom: 0;
	}

	.team-seat-num {
		width: 5rem;
		margin-bottom: 0;
	}

	.team-seat-save {
		margin-bottom: 0;
	}

	:global(.primary-btn.primary-btn--readonly) {
		opacity: 0.72;
		filter: grayscale(0.12);
		cursor: not-allowed;
	}
</style>
