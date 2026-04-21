<script>
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
	import { enterpriseChartOptions, enterpriseRadialOptions } from '$lib/charts/enterpriseChartTheme.js';

	let { clubId = '' } = $props();

	let donutCanvas = $state(/** @type {HTMLCanvasElement | null} */ (null));
	let barCanvas = $state(/** @type {HTMLCanvasElement | null} */ (null));
	let mounted = $state(false);
	/** @type {any} */
	let donutChart = null;
	/** @type {any} */
	let barChart = null;

	let activeSeats = $state(0);
	let reservedSeats = $state(0);
	let seatsLimit = $state(0);
	let clubInfinite = $state(false);

	let passportCounts = $state({ verified: 0, pending: 0, expired: 0 });

	const INK = '#3f3f46';
	const INK_LIGHT = '#d4d4d8';
	const ACCENT = '#d97706';

	$effect(() => {
		if (!browser || !clubId) return;
		const unsubClub = onSnapshot(doc(db, 'clubs', clubId), (snap) => {
			clubInfinite = snap.exists() && snap.data()?.isInfinite === true;
		});
		const unsub = onSnapshot(
			doc(db, 'license_entitlements', clubId),
			(snap) => {
				if (!snap.exists()) {
					activeSeats = 0;
					reservedSeats = 0;
					seatsLimit = 0;
					return;
				}
				const d = snap.data();
				activeSeats = typeof d.active_seats === 'number' ? d.active_seats : 0;
				reservedSeats = typeof d.reserved_seats === 'number' ? d.reserved_seats : 0;
				seatsLimit = typeof d.seats_limit === 'number' ? d.seats_limit : 0;
			},
			() => {
				activeSeats = 0;
				reservedSeats = 0;
				seatsLimit = 0;
			},
		);
		return () => {
			unsub();
			unsubClub();
		};
	});

	$effect(() => {
		if (!browser || !clubId) return;
		let cancelled = false;
		(async () => {
			try {
				const [passSnap, userSnap] = await Promise.all([
					getDocs(collection(db, 'passports')),
					getDocs(collection(db, 'users')),
				]);
				if (cancelled) return;
				const clubUsers = {};
				userSnap.forEach((d) => {
					if (d.data().clubId === clubId) clubUsers[d.id] = true;
				});
				let verified = 0;
				let pending = 0;
				let expired = 0;
				passSnap.forEach((d) => {
					if (!clubUsers[d.id]) return;
					const st = d.data().clearanceStatus || 'CLEARED';
					if (st === 'CLEARED') verified++;
					else if (st === 'PENDING_SAFESPORT') pending++;
					else if (st === 'RED_CARD') expired++;
				});
				if (!cancelled) passportCounts = { verified, pending, expired };
			} catch (e) {
				console.error('[DirectorAnalyticsCharts] passports', e);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!browser || !mounted || !donutCanvas || clubInfinite) return;
		void (async () => {
			await tick();
			const mod = await import('chart.js');
			const { Chart, DoughnutController, ArcElement, Legend, Tooltip } = mod;
			Chart.register(DoughnutController, ArcElement, Legend, Tooltip);
			if (donutChart) donutChart.destroy();
			const avail = Math.max(0, seatsLimit - activeSeats - reservedSeats);
			const opts = enterpriseRadialOptions(false);
			donutChart = new Chart(donutCanvas, {
				type: 'doughnut',
				data: {
					labels: ['Active seats', 'Available seats'],
					datasets: [
						{
							data:
								seatsLimit > 0 ?
									[activeSeats, avail]
								:	[0, 1],
							backgroundColor: [INK, INK_LIGHT],
							borderWidth: 0,
						},
					],
				},
				options: {
					...opts,
					cutout: '62%',
				},
			});
		})();
		return () => {
			donutChart?.destroy();
			donutChart = null;
		};
	});

	$effect(() => {
		if (!browser || !mounted || !barCanvas) return;
		const { verified, pending, expired } = passportCounts;
		void (async () => {
			await tick();
			const mod = await import('chart.js');
			const {
				Chart,
				BarController,
				BarElement,
				CategoryScale,
				LinearScale,
				Legend,
				Tooltip,
			} = mod;
			Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);
			if (barChart) barChart.destroy();
			const opts = enterpriseChartOptions(false);
			barChart = new Chart(barCanvas, {
				type: 'bar',
				data: {
					labels: ['Verified', 'Pending', 'Expired'],
					datasets: [
						{
							label: 'Players',
							data: [verified, pending, expired],
							backgroundColor: [INK, INK_LIGHT, ACCENT],
							borderWidth: 0,
							borderRadius: 6,
						},
					],
				},
				options: {
					...opts,
					scales: {
						x: {
							beginAtZero: true,
							grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
							ticks: { color: '#a1a1aa', font: { size: 11 } },
						},
						y: {
							grid: { display: false },
							ticks: { color: '#52525b', font: { size: 11 } },
						},
					},
				},
			});
		})();
		return () => {
			barChart?.destroy();
			barChart = null;
		};
	});

	onMount(() => {
		mounted = true;
	});
</script>

{#if clubId}
	<div class="ec-dir-analytics">
		<div class="ec-dir-analytics__card">
			<h3 class="ec-dir-analytics__title">License utilization</h3>
			<p class="ec-dir-analytics__sub">Active roster seats vs. remaining capacity.</p>
			{#if clubInfinite}
				<p class="ec-dir-analytics__promo">
					<strong>Unlimited license (promo).</strong> No seat cap chart — Stripe and subscription read-only rules are
					bypassed for this club.
				</p>
			{:else}
				<div class="ec-dir-analytics__chart">
					<canvas bind:this={donutCanvas} aria-label="License utilization chart"></canvas>
				</div>
			{/if}
		</div>
		<div class="ec-dir-analytics__card">
			<h3 class="ec-dir-analytics__title">Platform compliance</h3>
			<p class="ec-dir-analytics__sub">Passport clearance mix for your club.</p>
			<div class="ec-dir-analytics__chart">
				<canvas bind:this={barCanvas} aria-label="Passport compliance chart"></canvas>
			</div>
		</div>
	</div>
{/if}

<style>
	.ec-dir-analytics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 14px;
		margin-bottom: 20px;
	}

	.ec-dir-analytics__card {
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #fafafa;
		padding: 14px 16px;
		box-sizing: border-box;
	}

	:global(html.dark) .ec-dir-analytics__card {
		border-color: rgba(255, 255, 255, 0.1);
		background: #0f0f11;
	}

	.ec-dir-analytics__title {
		margin: 0 0 4px;
		font-size: 14px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.ec-dir-analytics__sub {
		margin: 0 0 12px;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.ec-dir-analytics__chart {
		position: relative;
		height: 200px;
		max-width: 100%;
	}

	.ec-dir-analytics__promo {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: var(--text-secondary);
	}
</style>
