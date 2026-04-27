<script>
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
	import Swal from 'sweetalert2';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db, functions } from '$lib/firebase.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { httpsCallable } from 'firebase/functions';
	import LiveTelemetrySection from '$lib/components/coach/LiveTelemetrySection.svelte';
	import MatchLogger from '$lib/components/coach/MatchLogger.svelte';
	import SquadTelemetryView from '$lib/components/coach/SquadTelemetryView.svelte';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';

	/**
	 * `MatchLogger` is imported at the route; it is mounted inside the LIVE TELEMETRY
	 * block via `LiveTelemetrySection` in `SquadTelemetryView` (immediately under the HUD).
	 */
	void [MatchLogger, LiveTelemetrySection];

	const claimCoachInvite = httpsCallable(functions, 'claimCoachInvite');

	let selectedTeamId = $state('');
	let coachInviteClaimTried = $state(false);

	const role = $derived(authStore.role);
	const userEmail = $derived(authStore.user?.email || '');
	const myTeams = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin') return teamsStore.teams.slice();
		if (!userEmail) return [];
		return teamsStore.getCoachTeams(userEmail);
	});

	const selectedTeam = $derived(myTeams.find((t) => t.id === selectedTeamId));
	/** @type {import('firebase/firestore').Unsubscribe | null} */
	let fulfillUnsub = null;
	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let pendingFulfillments = $state([]);
	let fulfillmentsLoading = $state(true);
	let fulfillmentsErr = $state('');
	/** @type {string} */
	let markingFulfilledId = $state('');

	const coachClubId = $derived(
		typeof selectedTeam?.clubId === 'string' && selectedTeam.clubId.trim() ?
			selectedTeam.clubId.trim() :
			'',
	);

	/**
	 * @param {unknown} r
	 * @returns {number}
	 */
	function requestedAtMs(r) {
		if (r && typeof (/** @type {{ toMillis?: () => number }} */ (r)).toMillis === 'function') {
			return /** @type {{ toMillis: () => number }} */ (r).toMillis();
		}
		if (r && typeof r === 'object' && r !== null && 'seconds' in r) {
			const s = Number(/** @type {{ seconds: number }} */ (r).seconds);
			if (Number.isFinite(s)) return s * 1000;
		}
		return 0;
	}

	$effect(() => {
		if (!browser) return;
		if (fulfillUnsub) {
			fulfillUnsub();
			fulfillUnsub = null;
		}
		if (!coachClubId) {
			pendingFulfillments = [];
			fulfillmentsErr = '';
			fulfillmentsLoading = false;
			return;
		}
		fulfillmentsLoading = true;
		fulfillmentsErr = '';
		const q = query(
			collection(db, 'organizations', coachClubId, 'fulfillments'),
			where('status', '==', 'pending'),
		);
		fulfillUnsub = onSnapshot(
			q,
			(snap) => {
				const rows = [];
				snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
				rows.sort((a, b) => requestedAtMs(b.requestedAt) - requestedAtMs(a.requestedAt));
				pendingFulfillments = /** @type {Array<Record<string, unknown> & { id: string }>} */ (rows);
				fulfillmentsLoading = false;
			},
			(e) => {
				console.error('[coach dashboard] fulfillments', e);
				fulfillmentsErr = e instanceof Error ? e.message : 'Could not load fulfillments.';
				fulfillmentsLoading = false;
			},
		);
		return () => {
			if (fulfillUnsub) {
				fulfillUnsub();
				fulfillUnsub = null;
			}
		};
	});

	/**
	 * @param {string} fulfillmentId
	 */
	async function markPhysicalFulfilled(fulfillmentId) {
		if (!coachClubId || markingFulfilledId) return;
		markingFulfilledId = fulfillmentId;
		try {
			await updateDoc(doc(db, 'organizations', coachClubId, 'fulfillments', fulfillmentId), {
				status: 'fulfilled',
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Update failed.';
			void Swal.fire({
				text: msg,
				icon: 'error',
				background: '#05050a',
				color: '#e5e5e5',
			});
		} finally {
			markingFulfilledId = '';
		}
	}

	$effect(() => {
		const teams = myTeams;
		if (teams.length === 0) return;

		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && teams.some((t) => t.id === pivot)) {
			if (selectedTeamId !== pivot) {
				selectedTeamId = pivot;
			}
			return;
		}

		const urlTeam = page.url.searchParams.get('teamId')?.trim();
		if (urlTeam && teams.some((t) => t.id === urlTeam)) {
			if (selectedTeamId !== urlTeam) {
				selectedTeamId = urlTeam;
				untrack(() => workspaceContextStore.setActiveTeamId(urlTeam));
			}
			return;
		}

		if (!selectedTeamId || !teams.some((t) => t.id === selectedTeamId)) {
			selectedTeamId = teams[0].id;
			untrack(() => workspaceContextStore.setActiveTeamId(teams[0].id));
		}
	});

	$effect(() => {
		if (role !== 'coach' || !userEmail || coachInviteClaimTried) return;
		coachInviteClaimTried = true;
		void claimCoachInvite({}).catch(() => {});
	});
</script>

<svelte:head>
	<title>Coach dashboard · SSTRACKER</title>
</svelte:head>

<div class="ec-page ec-coach st-pillar1">
	<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col">
		<!-- LIVE TELEMETRY: <LiveTelemetrySection> → <MatchLogger /> (roster + stat ingest) in SquadTelemetryView. -->
		<!-- Dispatch <IntelModal> + Strike 26: same view. -->
		<SquadTelemetryView teamId={selectedTeamId} teams={myTeams} />
	</div>

	<section
		class="qm-logistics"
		aria-labelledby="qm-logistics-title"
		data-region="quartermaster-coach-fulfillments"
	>
		<div class="qm-logistics__inner">
			<header class="qm-logistics__head">
				<p class="qm-logistics__eyebrow">Command · Armory</p>
				<h2 id="qm-logistics-title" class="qm-logistics__title">QUARTERMASTER LOGISTICS</h2>
				<p class="qm-logistics__sub">
					Pending Quartermaster requests for your organization. Physical kit rows can be closed when shipped or
					handed out.
				</p>
			</header>
			{#if fulfillmentsErr}
				<p class="qm-logistics__err" role="alert">{fulfillmentsErr}</p>
			{:else if !coachClubId}
				<p class="qm-logistics__empty">Select a team with a club assignment to view logistics.</p>
			{:else if fulfillmentsLoading}
				<p class="qm-logistics__muted">Loading requests…</p>
			{:else if pendingFulfillments.length === 0}
				<p class="qm-logistics__empty">No pending logistics requests.</p>
			{:else}
				<ul class="qm-logistics__list">
					{#each pendingFulfillments as row (row.id)}
						<li class="qm-logistics__row">
							<div class="qm-logistics__line">
								<span class="qm-logistics__label">Request</span>
								<p class="qm-logistics__copy">
									Operative
									<strong>{String(row.playerName || '—')}</strong>
									requested
									<strong>{String(row.itemTitle || row.itemId || 'item')}</strong>
									<span class="qm-logistics__type"
										>· {row.type === 'physical' ? 'PHYSICAL' : 'DIGITAL'}</span
									>
								</p>
							</div>
							{#if row.type === 'physical'}
								<button
									type="button"
									class="qm-logistics__btn"
									disabled={markingFulfilledId === row.id}
									onclick={() => void markPhysicalFulfilled(row.id)}
								>
									{markingFulfilledId === row.id ? 'UPDATING…' : 'MARK FULFILLED'}
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>
</div>

<style>
	.ec-coach.st-pillar1 {
		padding: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.qm-logistics {
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		background: #030306;
	}

	.qm-logistics__inner {
		box-sizing: border-box;
		max-width: 56rem;
		margin: 0 auto;
		padding: clamp(1rem, 2.5vw, 1.35rem) clamp(1rem, 3vw, 1.5rem) clamp(1.25rem, 3vw, 1.75rem);
	}

	.qm-logistics__eyebrow {
		margin: 0 0 0.2rem;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: rgba(0, 212, 255, 0.5);
	}

	.qm-logistics__head {
		margin-bottom: 1rem;
	}

	.qm-logistics__title {
		margin: 0 0 0.4rem;
		font-size: 0.95rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: #ecfeff;
	}

	.qm-logistics__sub {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.45);
		max-width: 42rem;
	}

	.qm-logistics__err {
		margin: 0;
		font-size: 0.8rem;
		color: #f87171;
	}

	.qm-logistics__muted,
	.qm-logistics__empty {
		margin: 0;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.38);
	}

	.qm-logistics__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.qm-logistics__row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 0.9rem;
		border: 1px solid rgba(0, 212, 255, 0.12);
		background: linear-gradient(160deg, rgba(7, 7, 12, 0.95) 0%, #000 100%);
		box-shadow: inset 0 0 0 1px rgba(57, 255, 20, 0.04);
	}

	.qm-logistics__line {
		flex: 1 1 14rem;
		min-width: 0;
	}

	.qm-logistics__label {
		display: block;
		margin-bottom: 0.2rem;
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.35);
	}

	.qm-logistics__copy {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.4;
		color: #e4e4e7;
	}

	.qm-logistics__copy strong {
		color: #a5f3fc;
		font-weight: 800;
	}

	.qm-logistics__type {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.4);
	}

	.qm-logistics__btn {
		flex-shrink: 0;
		padding: 0.45rem 0.7rem;
		font-size: 0.6rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		cursor: pointer;
		color: #86efac;
		border: 1px solid rgba(57, 255, 20, 0.45);
		background: #050508;
		border-radius: 0.1rem;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.qm-logistics__btn:hover:not(:disabled) {
		border-color: #86efac;
		box-shadow: 0 0 18px rgba(57, 255, 20, 0.25);
	}

	.qm-logistics__btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
