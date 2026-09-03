<script>
	import { browser } from '$app/environment';
	import { collection, doc, getCountFromServer, getDoc, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import DirectorAnalyticsCharts from '$lib/components/shell/DirectorAnalyticsCharts.svelte';
	import VpcApprovalQueue from '$lib/components/director/os/VpcApprovalQueue.svelte';
	import RevenueLedgerModule from '$lib/components/director/os/RevenueLedgerModule.svelte';
	import EventReconciliationModule from '$lib/components/director/os/EventReconciliationModule.svelte';
	import HotelRebatePanel from '$lib/components/director/os/HotelRebatePanel.svelte';
	import CoachAccountabilityModule from '$lib/components/director/os/CoachAccountabilityModule.svelte';
	import PaymentRecoveryModule from '$lib/components/director/os/PaymentRecoveryModule.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { clubId = '' } = $props();

	let kpis = $state({
		teams: 0,
		pendingInvites: 0,
		activeSeats: 0,
		seatsLimit: 0,
	});
	let loadingKpis = $state(true);

	$effect(() => {
		if (!db || !authStore.isAuthenticated || !authStore.clubId) return;
		if (!browser || !clubId) {
			kpis = { teams: 0, pendingInvites: 0, activeSeats: 0, seatsLimit: 0 };
			loadingKpis = false;
			return;
		}
		let cancelled = false;
		loadingKpis = true;
		(async () => {
			try {
				const [teamsSnap, invitesSnap, entitlementsSnap] = await Promise.all([
					getCountFromServer(query(collection(db, 'teams'), where('clubId', '==', clubId))),
					getCountFromServer(
						query(
							collection(db, 'coach_invites'),
							where('clubId', '==', clubId),
							where('status', '==', 'pending'),
						),
					),
					getDoc(doc(db, 'license_entitlements', clubId)),
				]);
				if (cancelled) return;
				const entitlement = entitlementsSnap.exists() ? entitlementsSnap.data() : {};
				kpis = {
					teams: teamsSnap.data().count,
					pendingInvites: invitesSnap.data().count,
					activeSeats: typeof entitlement.active_seats === 'number' ? entitlement.active_seats : 0,
					seatsLimit: typeof entitlement.seats_limit === 'number' ? entitlement.seats_limit : 0,
				};
			} catch (e) {
				console.error('[DirectorCommandCenter] KPI load failed', e);
			} finally {
				if (!cancelled) loadingKpis = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	const ribbonRows = $derived.by(() => {
		const L = loadingKpis;
		const cap = kpis.seatsLimit;
		const pct =
			cap > 0 ? `${Math.min(100, Math.round((kpis.activeSeats / cap) * 100))}%` : '—';
		return [
			{
				k: 'Open invites',
				v: L ? '…' : String(kpis.pendingInvites),
				s: 'Coach seat pipeline',
			},
			{
				k: 'Teams',
				v: L ? '…' : String(kpis.teams),
				s: 'Containers in club',
			},
			{
				k: 'Seat draw',
				v: L ? '…' : pct,
				s: 'Utilization vs cap',
			},
			{
				k: 'Orchestration',
				v: L ? '…' : kpis.pendingInvites > 0 ? `${kpis.pendingInvites} pending` : 'Clear',
				s: 'Coach invites · inbox workflows',
			},
		];
	});

	const metrics = $derived.by(() => {
		const L = loadingKpis;
		const cap = kpis.seatsLimit;
		const util = cap > 0 ? kpis.activeSeats / cap : 0;
		let utilBand = 'info';
		if (cap <= 0) utilBand = 'info';
		else if (util >= 0.98) utilBand = 'high';
		else if (util >= 0.85) utilBand = 'med';
		else utilBand = 'ok';

		const inviteBand = kpis.pendingInvites > 5 ? 'med' : kpis.pendingInvites > 0 ? 'low' : 'ok';

		return [
			{ label: 'Teams', value: L ? '…' : String(kpis.teams), hint: 'Program containers', band: 'info' },
			{ label: 'Pending invites', value: L ? '…' : String(kpis.pendingInvites), hint: 'Coach seats', band: inviteBand },
			{ label: 'Active seats', value: L ? '…' : String(kpis.activeSeats), hint: 'Billing draw', band: 'low' },
			{ label: 'Seat cap', value: L ? '…' : cap ? String(cap) : '—', hint: 'License entitlement', band: 'info' },
			{ label: 'Utilization', value: L ? '…' : cap ? `${Math.round(util * 100)}%` : '—', hint: 'Active / cap', band: utilBand },
		];
	});
</script>

<section class="director-command-center tw-flex tw-flex-col tw-gap-6" aria-labelledby="dir-os-heading">
	<div class="tw-flex tw-flex-col tw-mb-2">
		<h2 id="dir-os-heading" class="tw-text-xl tw-font-bold tw-text-slate-50 tw-tracking-wide" style="font-family: 'Geist Sans', sans-serif;">
			Command Center
		</h2>
		<p class="tw-text-sm tw-text-slate-400 tw-mt-1" style="font-family: 'Switzer', sans-serif;">
			Firestore KPIs, compliance queues, and club-ops telemetry.
		</p>
	</div>

	<!-- KPIs Grid -->
	<div class="tw-grid tw-grid-cols-2 md:tw-grid-cols-5 tw-gap-4">
		{#each metrics as m}
			<div class="st-bento vanguard-card tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-4 tw-flex tw-flex-col tw-gap-1">
				<div class="tw-text-[0.65rem] tw-uppercase tw-tracking-widest tw-text-slate-500 tw-font-mono">{m.label}</div>
				<div class="tw-text-2xl tw-font-bold tw-text-slate-100" style="font-family: 'Geist Mono', monospace;">
					{m.value}
				</div>
				<div class="tw-text-xs tw-text-slate-500">{m.hint}</div>
			</div>
		{/each}
	</div>

	<!-- Main Canvas -->
	<div class="tw-w-full tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 tw-mt-2">
		<!-- 8-Column Primary Canvas -->
		<div class="lg:tw-col-span-8 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">
			<div class="st-bento tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-rounded-xl tw-overflow-hidden">
				<ActionInbox {clubId} />
			</div>
			<div class="st-bento tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-rounded-xl tw-overflow-hidden">
				<RevenueLedgerModule {clubId} />
			</div>
			<div class="st-bento tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-rounded-xl tw-overflow-hidden">
				<PaymentRecoveryModule {clubId} />
			</div>
			<div class="st-bento tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-rounded-xl tw-overflow-hidden">
				<EventReconciliationModule {clubId} />
			</div>
			
			<DirectorAnalyticsCharts {clubId} />
		</div>

		<!-- 4-Column Sidecar -->
		<div class="lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">
			<div class="st-bento tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-rounded-xl tw-overflow-hidden tw-p-5">
				<div class="tw-flex tw-items-center tw-gap-2 tw-text-[#f59e0b] tw-mb-4 tw-font-mono tw-text-xs tw-uppercase tw-tracking-widest">
					<Icon name="status.shield-check" />
					<span>Consent audit</span>
				</div>
				<VpcApprovalQueue {clubId} />
			</div>

			<div class="st-bento tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-rounded-xl tw-overflow-hidden">
				<HotelRebatePanel {clubId} />
			</div>

			<div class="st-bento tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-rounded-xl tw-overflow-hidden">
				<CoachAccountabilityModule {clubId} />
			</div>
		</div>
	</div>
</section>
