<script>
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
	import Swal from 'sweetalert2';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db, functions } from '$lib/firebase.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { httpsCallable } from 'firebase/functions';
	import SquadTelemetryView from '$lib/components/coach/SquadTelemetryView.svelte';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import CoachTeamXpVelocityChart from '$lib/components/shell/CoachTeamXpVelocityChart.svelte';
	import CoachSquadReadinessCard from '$lib/components/coach/CoachSquadReadinessCard.svelte';

	const claimCoachInvite = httpsCallable(functions, 'claimCoachInvite');

	let selectedTeamId = $state('');
	let coachInviteClaimTried = $state(false);
	let matchDayMode = $state(false);

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
			selectedTeam.clubId.trim()
		:	'',
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

	function enterMatchDay() {
		matchDayMode = true;
	}

	function exitMatchDay() {
		matchDayMode = false;
	}
</script>

<svelte:head>
	<title>Coach dashboard · SSTRACKER</title>
</svelte:head>

<div class="ec-page ec-coach st-pillar1 coach-dash-root">
	<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-0">
		{#if matchDayMode}
			<div
				class="tw-mb-4 tw-flex tw-flex-col tw-gap-3 tw-rounded-xl tw-border tw-border-cyan-500/25 tw-bg-slate-950/70 tw-p-4 tw-backdrop-blur-md sm:tw-flex-row sm:tw-items-center sm:tw-justify-between"
			>
				<div class="tw-min-w-0">
					<p class="dash-eyebrow tw-mb-1">Match day</p>
					<p class="tw-m-0 tw-text-sm tw-font-medium tw-tracking-tight tw-text-slate-200">
						Live telemetry and match logger are active. Stand down when the fixture is complete.
					</p>
				</div>
				<div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
					<a
						class="dash-link-tactical tw-inline-flex tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-slate-600 tw-bg-slate-900/80 tw-px-4 tw-py-2.5 tw-text-[0.65rem] tw-font-bold tw-uppercase tw-tracking-widest tw-text-slate-300 tw-transition-all tw-duration-300 hover:tw-border-cyan-500/40 hover:tw-text-cyan-200"
						href={resolve('/coach/tactical')}>Tactical canvas</a
					>
					<button
						type="button"
						class="tw-inline-flex tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-rose-500/35 tw-bg-rose-950/30 tw-px-4 tw-py-2.5 tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-rose-200 tw-transition-all tw-duration-300 hover:tw-border-rose-400/50"
						onclick={exitMatchDay}
					>
						End match day
					</button>
				</div>
			</div>
			<SquadTelemetryView teamId={selectedTeamId} teams={myTeams} showLiveTelemetry={true} />
		{:else}
			<header
				class="coach-dash-hero tw-mb-8 tw-flex tw-flex-col tw-gap-4 tw-border-b tw-border-slate-800/80 tw-pb-6 lg:tw-flex-row lg:tw-items-start lg:tw-justify-between"
			>
				<div class="tw-min-w-0">
					<p class="dash-eyebrow tw-mb-2">Command overview</p>
					<h1 class="dash-display tw-m-0">Coach dashboard</h1>
					<p class="tw-mt-2 tw-max-w-xl tw-text-sm tw-leading-relaxed tw-text-slate-400">
						{selectedTeam?.name || 'Select a workspace team'} · glass bento layout
					</p>
				</div>
				<div class="tw-flex tw-shrink-0 tw-flex-col tw-items-stretch tw-gap-2 sm:tw-items-end">
					<button
						type="button"
						class="match-day-cta tw-relative tw-overflow-hidden tw-rounded-xl tw-border tw-border-cyan-400/40 tw-bg-gradient-to-br tw-from-cyan-500/15 tw-via-slate-900/90 tw-to-slate-950 tw-px-6 tw-py-4 tw-text-left tw-shadow-[0_0_48px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] tw-transition-all tw-duration-300 hover:tw-border-cyan-300/55 hover:tw-shadow-[0_0_64px_rgba(34,211,238,0.35)] active:tw-scale-[0.99] sm:tw-min-w-[min(100%,22rem)] sm:tw-text-right"
						onclick={enterMatchDay}
					>
						<span
							class="tw-block tw-font-sans tw-text-[0.62rem] tw-font-black tw-uppercase tw-tracking-[0.35em] tw-text-cyan-100/95"
							>[ initiate match day mode ]</span
						>
						<span
							class="tw-mt-1 tw-block tw-font-sans tw-text-[0.65rem] tw-font-medium tw-tracking-wide tw-text-slate-400"
							>Telemetry · match logger</span
						>
					</button>
					<a
						class="tw-text-center tw-text-[0.6rem] tw-font-semibold tw-uppercase tw-tracking-widest tw-text-slate-500 tw-transition-colors hover:tw-text-cyan-400/90 sm:tw-text-right"
						href={resolve('/coach')}>Full squad roster &amp; signals →</a
					>
				</div>
			</header>

			<div
				class="tw-mb-10 tw-grid tw-grid-cols-1 tw-gap-6 lg:tw-grid-cols-3"
				aria-label="Coach dashboard bento"
			>
				<section
					class="coach-glass-card tw-min-h-0 lg:tw-col-start-1 lg:tw-row-start-1"
					aria-labelledby="dash-inbox-title"
				>
					<p id="dash-inbox-title" class="dash-card-eyebrow">Inbox</p>
					<h2 class="dash-card-title tw-sr-only">Action inbox</h2>
					<div class="dash-inbox-host">
						<ActionInbox teamId={selectedTeamId} />
					</div>
				</section>

				<section
					class="coach-glass-card coach-glass-card--wide tw-min-h-0 lg:tw-col-span-2 lg:tw-col-start-2 lg:tw-row-start-1"
					aria-labelledby="dash-analytics-title"
				>
					<p id="dash-analytics-title" class="dash-card-eyebrow">Analytics</p>
					<h2 class="dash-card-title">Team XP velocity</h2>
					<div class="coach-chart-shell tw-mt-3 tw-rounded-lg tw-border tw-border-slate-800 tw-bg-slate-900/80 tw-p-3 tw-backdrop-blur-md">
						<CoachTeamXpVelocityChart teamId={selectedTeamId} />
					</div>
				</section>

				<section
					class="coach-glass-card tw-min-h-0 lg:tw-col-start-3 lg:tw-row-start-2"
					aria-labelledby="dash-readiness-title"
				>
					<p id="dash-readiness-title" class="dash-card-eyebrow">Field status</p>
					<div class="tw-mt-1">
						<CoachSquadReadinessCard teamId={selectedTeamId} />
					</div>
				</section>
			</div>
		{/if}
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
	.coach-dash-root {
		padding: clamp(1rem, 2.5vw, 1.5rem) clamp(1rem, 3vw, 1.75rem) 0;
		box-sizing: border-box;
	}

	.coach-dash-hero {
		font-family: ui-sans-serif, system-ui, Inter, Segoe UI, Roboto, sans-serif;
	}

	.dash-eyebrow {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: rgb(148 163 184);
	}

	.dash-display {
		font-size: clamp(1.65rem, 4vw, 2.35rem);
		font-weight: 900;
		letter-spacing: -0.03em;
		color: rgb(248 250 252);
	}

	.dash-card-eyebrow {
		margin: 0 0 0.35rem;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: rgb(148 163 184);
	}

	.dash-card-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		color: rgb(241 245 249);
	}

	.coach-glass-card {
		border-radius: 1rem;
		border: 1px solid rgb(30 41 55);
		background: linear-gradient(
			155deg,
			rgb(15 23 42 / 0.55) 0%,
			rgb(2 6 23 / 0.72) 48%,
			rgb(15 23 42 / 0.45) 100%
		);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.04),
			0 0 0 1px rgb(34 211 238 / 0.04),
			0 18px 48px rgb(0 0 0 / 0.35);
		padding: clamp(1rem, 2.2vw, 1.25rem);
		transition:
			border-color 0.3s ease,
			box-shadow 0.3s ease;
	}

	.coach-glass-card:hover {
		border-color: rgb(34 211 238 / 0.3);
	}

	.dash-inbox-host :global(.ec-action-inbox) {
		margin-bottom: 0;
		border-radius: 0.65rem;
		border-color: rgb(51 65 85 / 0.85);
		background: rgb(15 23 42 / 0.55);
	}

	.dash-inbox-host :global(.ec-action-inbox__head) {
		color: rgb(148 163 184);
	}

	.dash-inbox-host :global(.ec-action-inbox__row) {
		border-color: rgb(51 65 85 / 0.75);
		background: rgb(2 6 23 / 0.55);
		color: rgb(241 245 249);
		transition:
			border-color 0.3s ease,
			background 0.3s ease;
	}

	.dash-inbox-host :global(.ec-action-inbox__row:hover) {
		border-color: rgb(34 211 238 / 0.28);
		background: rgb(15 23 42 / 0.75);
	}

	.dash-inbox-host :global(.ec-action-inbox__label) {
		color: rgb(248 250 252);
	}

	.dash-inbox-host :global(.ec-action-inbox__meta) {
		color: rgb(148 163 184);
	}

	.coach-chart-shell :global(.ec-coach-xp) {
		margin-bottom: 0;
		gap: 0.75rem;
	}

	.coach-chart-shell :global(.ec-coach-xp__card) {
		border-color: rgb(51 65 85 / 0.9);
		background: rgb(2 6 23 / 0.55);
	}

	.coach-chart-shell :global(.ec-coach-xp__title),
	.coach-chart-shell :global(.ec-coach-xp__sub) {
		color: rgb(203 213 225);
	}

	.coach-chart-shell :global(.ec-coach-xp__total) {
		color: rgb(34 211 238);
	}

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
