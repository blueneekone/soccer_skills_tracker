<script>
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { collection, doc, getCountFromServer, getDoc, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import DirectorAnalyticsCharts from '$lib/components/shell/DirectorAnalyticsCharts.svelte';
	import VpcApprovalQueue from '$lib/components/director/os/VpcApprovalQueue.svelte';
	import RevenueLedgerModule from '$lib/components/director/os/RevenueLedgerModule.svelte';
	import EventReconciliationModule from '$lib/components/director/os/EventReconciliationModule.svelte';
	import HotelRebatePanel from '$lib/components/director/os/HotelRebatePanel.svelte';
	import CoachAccountabilityModule from '$lib/components/director/os/CoachAccountabilityModule.svelte';
	import PaymentRecoveryModule from '$lib/components/director/os/PaymentRecoveryModule.svelte';
	import WorkspaceSocShell from '$lib/components/workspace/WorkspaceSocShell.svelte';
	import WorkspaceSocMetricGrid from '$lib/components/workspace/WorkspaceSocMetricGrid.svelte';
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
		/** @type {'crit' | 'high' | 'med' | 'low' | 'ok' | 'info'} */
		let utilBand = 'info';
		if (cap <= 0) utilBand = 'info';
		else if (util >= 0.98) utilBand = 'high';
		else if (util >= 0.85) utilBand = 'med';
		else utilBand = 'ok';

		const inviteBand = kpis.pendingInvites > 5 ? 'med' : kpis.pendingInvites > 0 ? 'low' : 'ok';

		return [
			{
				label: 'Teams',
				value: L ? '…' : String(kpis.teams),
				hint: 'Program containers',
				band: /** @type {const} */ ('info'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'Pending invites',
				value: L ? '…' : String(kpis.pendingInvites),
				hint: 'Coach seats',
				band: inviteBand,
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'Active seats',
				value: L ? '…' : String(kpis.activeSeats),
				hint: 'Billing draw',
				band: /** @type {const} */ ('low'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'Seat cap',
				value: L ? '…' : cap ? String(cap) : '—',
				hint: 'License entitlement',
				band: /** @type {const} */ ('info'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'Utilization',
				value: L ? '…' : cap ? `${Math.round(util * 100)}%` : '—',
				hint: 'Active / cap',
				band: utilBand,
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
		];
	});
</script>

<section class="director-command-center" aria-labelledby="dir-os-heading">
	<WorkspaceSocShell
		eyebrow="Director workspace · club operations"
		title="Command center"
		lede="Firestore KPIs, compliance queues, and club-ops telemetry. Severity bands mirror risk — scroll for queues and charts."
		ribbon={ribbonRows}
		metaLine="Club scope · client"
	>
		<h2 id="dir-os-heading" class="tw-sr-only">Director command center</h2>
		<WorkspaceSocMetricGrid
			metrics={metrics}
			gridClass="bento-grid bento-grid--12col bento-grid--liquid director-cc-kpi-grid"
		/>

		<div class="bento-grid bento-grid--12col bento-grid--liquid tw-w-full tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-6 bento-mt-md">
			<!-- 8-Column Primary Canvas -->
			<div class="bento-span-8 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">
				<div class="director-cc-z2-panel wsd-surface-accent">
					<ActionInbox {clubId} />
				</div>

				<RevenueLedgerModule {clubId} />

				<PaymentRecoveryModule {clubId} />

				<EventReconciliationModule {clubId} />

				<DirectorAnalyticsCharts {clubId} />
			</div>

			<!-- 4-Column Sidecar -->
			<div class="bento-span-4 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">
				<div class="director-cc-compliance-band">
					<div class="director-cc-compliance-band__head">
						<Icon name="status.shield-check" />
						<span>Consent audit</span>
					</div>
					<VpcApprovalQueue {clubId} />
				</div>

				<HotelRebatePanel {clubId} />

				<CoachAccountabilityModule {clubId} />
			</div>
		</div>
	</WorkspaceSocShell>
</section>
