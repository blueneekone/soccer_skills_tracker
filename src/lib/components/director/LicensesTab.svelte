<script lang="ts">
	/**
	 * LicensesTab — Director workspace.
	 * Houses all seat allocation and subscription-entitlement management that was
	 * previously bleeding into the Teams tab. Roster pages stay focused on PLAYERS.
	 */
	import { getContext } from 'svelte';
	import { db, functions } from '$lib/firebase.js';
	import { doc, onSnapshot } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { isSubscriptionReadOnly } from '$lib/auth/billing.js';
	import DirectorActiveSeasonPanel from '$lib/components/director/DirectorActiveSeasonPanel.svelte';
	import RegistrationRosterAssignPanel from '$lib/components/director/RegistrationRosterAssignPanel.svelte';

	let { clubId = '' } = $props();

	/** @type {() => void} */
	const openReadOnlyUpgrade = (getContext('openReadOnlyUpgrade') as (() => void) | undefined) ?? (() => {});

	const isReadOnly = $derived(
		isSubscriptionReadOnly(
			authStore.role,
			licenseEntitlementStore.clubIdResolved,
			licenseEntitlementStore.entitlement,
			{
				clubInfinite: licenseEntitlementStore.isInfiniteClub,
				billingModel: licenseEntitlementStore.billingModel,
			},
		),
	);

	const clubInfinite = $derived(licenseEntitlementStore.isInfiniteClub === true);

	const secureAllocateTeamSeats = httpsCallable(functions, 'secureAllocateTeamSeats');

	const clubTeams = $derived(teamsStore.teams.filter((t) => t.clubId === clubId));

	let masterSeatLimit = $state(0);
	/** @type {Record<string, number>} */
	let rosterCounts = $state({});
	/** @type {Record<string, { limit: number; active: number; set: boolean }>} */
	let teamEntLimits = $state({});
	/** @type {Record<string, boolean>} */
	let openSeatMgmt = $state({});
	/** @type {Record<string, number>} */
	let seatDraft = $state({});
	/** @type {string | null} */
	let seatBusy = $state(null);
	let seatFeedback = $state('');

	const allocatedSum = $derived.by(() => {
		let s = 0;
		for (const t of clubTeams) {
			const row = teamEntLimits[t.id];
			if (row?.set) s += row.limit;
		}
		return s;
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
				typeof d.seats_limit === 'number' && !Number.isNaN(d.seats_limit) ? d.seats_limit : 0;
		});
	});

	$effect(() => {
		if (!clubId) return;
		const teams = clubTeams;
		const unsubs = /** @type {Array<() => void>} */ ([]);
		for (const t of teams) {
			const tid = t.id;
			unsubs.push(
				onSnapshot(doc(db, 'rosters', tid), (snap) => {
					const n =
						snap.exists() && Array.isArray(snap.data().players)
							? snap.data().players.length
							: 0;
					rosterCounts = { ...rosterCounts, [tid]: n };
				}),
			);
			unsubs.push(
				onSnapshot(doc(db, 'team_entitlements', tid), (snap) => {
					if (!snap.exists()) {
						teamEntLimits = {
							...teamEntLimits,
							[tid]: { limit: 0, active: 0, set: false },
						};
						return;
					}
					const d = snap.data();
					const limit =
						typeof d.seats_limit === 'number' && !Number.isNaN(d.seats_limit)
							? d.seats_limit
							: 0;
					const active =
						typeof d.active_seats === 'number' && !Number.isNaN(d.active_seats)
							? d.active_seats
							: 0;
					teamEntLimits = {
						...teamEntLimits,
						[tid]: { limit, active, set: true },
					};
				}),
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
			const base = row?.set && row.limit > 0 ? row.limit : Math.max(rc, 1);
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
				e && typeof e === 'object' && 'message' in e
					? String(/** @type {{ message?: string }} */ (e).message)
					: String(e);
			seatFeedback = msg;
		} finally {
			seatBusy = null;
		}
	}
</script>

<div class="licenses-tab tw-space-y-6">
	<DirectorActiveSeasonPanel {clubId} />
	<RegistrationRosterAssignPanel {clubId} />
	<div class="card">
		<div class="card-header bg-blue-header">Club Master License</div>
		<div class="card-body">
			{#if clubInfinite}
				<p class="tw-m-0 tw-text-sm tt-muted">
					This organization has an <strong>unlimited / promotional</strong> license. No seat cap
					enforcement applies.
				</p>
			{:else}
				<p class="tw-m-0 tw-text-sm tt-muted">
					Master cap: <strong>{masterSeatLimit || '—'}</strong> seats. Pool remaining:
					<strong
						>{masterSeatLimit > 0 ? Math.max(0, masterSeatLimit - allocatedSum) : '—'}</strong
					>.
				</p>
			{/if}
		</div>
	</div>

	<div class="card">
		<div class="card-header bg-blue-header">Per-Team Seat Allocation</div>
		<div class="card-body">
			{#if seatFeedback}
				<p class="seat-feedback" role="status">{seatFeedback}</p>
			{/if}
			{#if clubTeams.length === 0}
				<p class="tw-m-0 tw-text-sm tt-muted">No teams yet. Create a team first.</p>
			{:else}
				<div class="ec-table-wrap">
					<table class="ec-table">
						<thead>
							<tr>
								<th>Team</th>
								<th>Roster</th>
								<th>Seat Usage</th>
								<th class="tt-actions-col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each clubTeams as t (t.id)}
								{@const tid = t.id}
								{@const rc = rosterCounts[tid] ?? 0}
								{@const row = teamEntLimits[tid]}
								{@const hasCap = row?.set === true && row.limit > 0}
								<tr>
									<td class="ec-table__strong">{t.name || tid}</td>
									<td>{rc}</td>
									<td>
										{#if hasCap}
											{rc} / {row.limit}
										{:else}
											{rc} · <span class="muted">no cap</span>
										{/if}
										<div class="team-seat-meter team-seat-meter--inline" aria-hidden="true">
											<div
												class="team-seat-meter__fill"
												style:width="{usagePct(tid)}%"
											></div>
										</div>
									</td>
									<td>
										<button
											type="button"
											class="team-seat-toggle"
											onclick={() => toggleSeatMgmt(tid)}
											aria-expanded={openSeatMgmt[tid] === true}
										>
											{openSeatMgmt[tid] ? 'Hide' : 'Manage Seats'}
										</button>
									</td>
								</tr>
								{#if openSeatMgmt[tid]}
									<tr class="ec-table__expand">
										<td colspan="4">
											<div class="team-seat-editor">
												<label
													class="tw-block tw-text-xs tw-font-bold tw-mb-1"
													for="seat-cap-{tid}">Seat cap for this team</label
												>
												<div class="team-seat-editor__controls">
													<input
														id="seat-cap-{tid}"
														type="range"
														min="1"
														max={Math.max(
															masterSeatLimit || 1,
															seatDraft[tid] ?? 1,
															rc || 1,
														)}
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
												<p class="tw-m-0 tw-mt-2 tw-text-xs tt-muted">
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
	.tt-muted { color: var(--text-secondary); }
	.tt-actions-col { width: 10rem; }

	.seat-feedback {
		margin: 0 0 12px;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--brand-primary, var(--aggie-blue));
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
