<script>
	import { browser } from '$app/environment';
	import { collection, doc, getCountFromServer, getDoc, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import DirectorAnalyticsCharts from '$lib/components/shell/DirectorAnalyticsCharts.svelte';

	let { clubId = '' } = $props();

	let kpis = $state({
		teams: 0,
		pendingInvites: 0,
		activeSeats: 0,
		seatsLimit: 0
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
							where('status', '==', 'pending')
						)
					),
					getDoc(doc(db, 'license_entitlements', clubId))
				]);
				if (cancelled) return;
				const entitlement = entitlementsSnap.exists() ? entitlementsSnap.data() : {};
				kpis = {
					teams: teamsSnap.data().count,
					pendingInvites: invitesSnap.data().count,
					activeSeats: typeof entitlement.active_seats === 'number' ? entitlement.active_seats : 0,
					seatsLimit: typeof entitlement.seats_limit === 'number' ? entitlement.seats_limit : 0
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
</script>

<section class="tw-mb-8 tw-max-w-[min(100%,120rem)] tw-mx-auto" aria-labelledby="dir-os-heading">
	<div class="tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-4 tw-mb-6">
		<div>
			<h2
				id="dir-os-heading"
				class="tw-m-0 tw-text-2xl md:tw-text-3xl tw-font-black tw-tracking-tight"
				style="color: var(--text-primary);"
			>
				Command center
			</h2>
			<p class="tw-m-0 tw-mt-2 tw-text-sm md:tw-text-base tw-max-w-2xl" style="color: var(--text-secondary);">
				Executive overview focused on alerts, core KPIs, and club analytics.
			</p>
		</div>
	</div>

	<ActionInbox {clubId} />

	<DirectorAnalyticsCharts {clubId} />

	<div class="dir-kpi-grid">
		<article class="dir-kpi-card">
			<p class="dir-kpi-card__label">Teams</p>
			<p class="dir-kpi-card__value">{loadingKpis ? '...' : kpis.teams}</p>
		</article>
		<article class="dir-kpi-card">
			<p class="dir-kpi-card__label">Pending invites</p>
			<p class="dir-kpi-card__value">{loadingKpis ? '...' : kpis.pendingInvites}</p>
		</article>
		<article class="dir-kpi-card">
			<p class="dir-kpi-card__label">Seat utilization</p>
			<p class="dir-kpi-card__value">
				{loadingKpis ? '...' : `${kpis.activeSeats}/${kpis.seatsLimit || 0}`}
			</p>
		</article>
	</div>

</section>

<style>
	.dir-kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
		margin-bottom: 16px;
		align-items: stretch;
	}

	.dir-kpi-card {
		display: flex;
		flex-direction: column;
		height: 100%;
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #fafafa;
		padding: 1.25rem;
	}

	:global(html.dark) .dir-kpi-card {
		border-color: rgba(255, 255, 255, 0.1);
		background: #0f0f11;
	}

	.dir-kpi-card__label {
		margin: 0 0 0.35rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.dir-kpi-card__value {
		margin: 0;
		font-size: clamp(1.1rem, 3vw, 1.45rem);
		font-weight: 900;
		color: var(--text-primary);
	}
</style>
