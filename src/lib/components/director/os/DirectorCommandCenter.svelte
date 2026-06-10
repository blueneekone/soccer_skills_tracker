<script>
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

<section class="tw-mb-8 tw-max-w-[min(100%,120rem)] tw-mx-auto" aria-labelledby="dir-os-heading">
	<WorkspaceSocShell
		eyebrow="Director workspace · club operations"
		title="Command center"
		lede="SOAR-style executive surface: invites, households, and analytics. Severity bands mirror risk — scroll for queues and charts."
		ribbon={ribbonRows}
		metaLine="Club scope · client"
	>
		<h2 id="dir-os-heading" class="tw-sr-only">Director command center</h2>
		<WorkspaceSocMetricGrid metrics={metrics} />

		<div class="wsd-surface-accent tw-overflow-hidden tw-rounded-xl">
			<ActionInbox {clubId} />
		</div>

		<div class="dcc-vpc-section">
			<div class="dcc-vpc-section__head">
				<Icon name="status.shield-check" />
				<span>Consent audit</span>
			</div>
			<VpcApprovalQueue {clubId} />
		</div>

		<RevenueLedgerModule {clubId} />

		<EventReconciliationModule {clubId} />

		<HotelRebatePanel {clubId} />

		<CoachAccountabilityModule {clubId} />

		<DirectorAnalyticsCharts {clubId} />
	</WorkspaceSocShell>
</section>

<style>
	.dcc-vpc-section {
		border: 1px solid rgba(245, 158, 11, 0.25);
		border-radius: 14px;
		background: rgba(245, 158, 11, 0.03);
		padding: 10px 12px;
		margin-bottom: 4px;
	}

	:global(html.dark) .dcc-vpc-section {
		border-color: rgba(245, 158, 11, 0.2);
		background: rgba(245, 158, 11, 0.05);
	}

	.dcc-vpc-section__head {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #b45309;
		margin-bottom: 8px;
	}

	:global(html.dark) .dcc-vpc-section__head {
		color: #fbbf24;
	}
</style>
