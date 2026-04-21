<script>
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';
	import { collection, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import {
		enterpriseChartOptions,
		EC_ACCENT,
		EC_INK,
		EC_INK_LIGHT
	} from '$lib/charts/enterpriseChartTheme.js';

	let { clubId = '' } = $props();

	let seatCanvas = $state(/** @type {HTMLCanvasElement | null} */ (null));
	let clubCanvas = $state(/** @type {HTMLCanvasElement | null} */ (null));
	let mounted = $state(false);
	/** @type {any} */
	let seatChart = null;
	/** @type {any} */
	let clubChart = null;

	let activeSeats = $state(0);
	let reservedSeats = $state(0);
	let seatsLimit = $state(0);
	let clubInfinite = $state(false);

	/** @type {{ labels: string[], values: number[] }} */
	let playersByClub = $state({ labels: [], values: [] });

	$effect(() => {
		if (!browser || !clubId) return;
		const unsubClub = onSnapshot(doc(db, 'clubs', clubId), (snap) => {
			clubInfinite = snap.exists() && snap.data()?.isInfinite === true;
		});
		const unsubEnt = onSnapshot(doc(db, 'license_entitlements', clubId), (snap) => {
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
		});
		return () => {
			unsubClub();
			unsubEnt();
		};
	});

	$effect(() => {
		if (!browser) return;
		let cancelled = false;
		(async () => {
			try {
				const [clubsSnap, teamsSnap, lookupSnap] = await Promise.all([
					getDocs(collection(db, 'clubs')),
					getDocs(collection(db, 'teams')),
					getDocs(collection(db, 'player_lookup')),
				]);
				if (cancelled) return;

				/** @type {Record<string, string>} */
				const teamClub = {};
				teamsSnap.forEach((d) => {
					const t = d.data();
					if (typeof t.clubId === 'string' && t.clubId.trim()) {
						teamClub[d.id] = t.clubId.trim();
					}
				});

				/** @type {Record<string, string>} */
				const clubNameById = {};
				clubsSnap.forEach((d) => {
					const c = d.data();
					clubNameById[d.id] =
						typeof c.name === 'string' && c.name.trim() ? c.name.trim() : d.id;
				});

				/** @type {Record<string, number>} */
				const counts = {};
				lookupSnap.forEach((d) => {
					const row = d.data();
					const teamId = typeof row.teamId === 'string' ? row.teamId : '';
					const cid = teamClub[teamId] || clubId;
					if (!cid) return;
					counts[cid] = (counts[cid] || 0) + 1;
				});

				const rows = Object.entries(counts)
					.map(([id, count]) => ({ id, name: clubNameById[id] || id, count }))
					.sort((a, b) => b.count - a.count)
					.slice(0, 8);

				playersByClub = {
					labels: rows.map((r) => r.name),
					values: rows.map((r) => r.count),
				};
			} catch {
				// Fallback to current-club only count (strict role rules can block global reads).
				try {
					const lookupSnap = await getDocs(collection(db, 'player_lookup'));
					let n = 0;
					lookupSnap.forEach((d) => {
						const row = d.data();
						const teamId = typeof row.teamId === 'string' ? row.teamId : '';
						if (teamId.startsWith(`${clubId}_`)) n++;
					});
					if (!cancelled) {
						const cl = await getDoc(doc(db, 'clubs', clubId));
						const name =
							cl.exists() && typeof cl.data()?.name === 'string' ? cl.data().name : 'Current Club';
						playersByClub = { labels: [name], values: [n] };
					}
				} catch {
					if (!cancelled) playersByClub = { labels: ['Current Club'], values: [0] };
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!browser || !mounted || !seatCanvas || !clubId) return;
		void (async () => {
			await tick();
			const mod = await import('chart.js');
			const { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip } = mod;
			Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip);
			if (seatChart) seatChart.destroy();
			const opts = enterpriseChartOptions(false);
			const allocatedSeats = activeSeats + reservedSeats;
			const utilPct = seatsLimit > 0 ? Math.round((allocatedSeats / seatsLimit) * 100) : 0;
			seatChart = new Chart(seatCanvas, {
				type: 'line',
				data: {
					labels: ['Allocated seats (active + reserved)', 'Licensed capacity'],
					datasets: [
						{
							label: 'Seat count',
							data: [allocatedSeats, seatsLimit],
							borderColor: EC_ACCENT,
							backgroundColor: 'rgba(245, 158, 11, 0.14)',
							pointBackgroundColor: EC_INK,
							fill: true,
							tension: 0.25,
						},
					],
				},
				options: {
					...opts,
					plugins: {
						...opts.plugins,
						legend: { display: false },
						tooltip: {
							...opts.plugins.tooltip,
							footerColor: '#71717a',
							footerFont: { weight: '600' },
							callbacks: {
								footer: () => `Utilization: ${utilPct}%`,
							},
						},
					},
				},
			});
		})();
		return () => {
			seatChart?.destroy();
			seatChart = null;
		};
	});

	$effect(() => {
		if (!browser || !mounted || !clubCanvas) return;
		const labels = playersByClub.labels;
		const values = playersByClub.values;
		void (async () => {
			await tick();
			const mod = await import('chart.js');
			const { Chart, BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip } = mod;
			Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);
			if (clubChart) clubChart.destroy();
			const opts = enterpriseChartOptions(false);
			clubChart = new Chart(clubCanvas, {
				type: 'bar',
				data: {
					labels: labels.length ? labels : ['Current Club'],
					datasets: [
						{
							label: 'Active players',
							data: values.length ? values : [0],
							backgroundColor: EC_INK,
							hoverBackgroundColor: EC_ACCENT,
							borderRadius: 6,
							borderWidth: 0,
						},
					],
				},
				options: {
					...opts,
					plugins: {
						...opts.plugins,
						legend: { display: false },
					},
					scales: {
						x: {
							grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
							ticks: { color: EC_INK_LIGHT, font: { size: 11 } },
						},
						y: {
							beginAtZero: true,
							grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
							ticks: { color: EC_INK_LIGHT, font: { size: 11 } },
						},
					},
				},
			});
		})();
		return () => {
			clubChart?.destroy();
			clubChart = null;
		};
	});

	onMount(() => {
		mounted = true;
	});
</script>

{#if clubId}
	<div class="ec-dir-analytics">
		<div class="ec-dir-analytics__card">
			<h3 class="ec-dir-analytics__title">Platform seat utilization</h3>
			<p class="ec-dir-analytics__sub">Current allocated seats (active + reserved) against licensed capacity.</p>
			{#if clubInfinite}
				<p class="ec-dir-analytics__promo">
					<strong>Unlimited license (promo).</strong> Capacity is uncapped for this club.
				</p>
			{:else}
				<div class="ec-dir-analytics__chart">
					<canvas bind:this={seatCanvas} aria-label="Platform seat utilization chart"></canvas>
				</div>
			{/if}
		</div>
		<div class="ec-dir-analytics__card">
			<h3 class="ec-dir-analytics__title">Active players per club</h3>
			<p class="ec-dir-analytics__sub">Top clubs by active roster size (player lookup records).</p>
			<div class="ec-dir-analytics__chart">
				<canvas bind:this={clubCanvas} aria-label="Active players per club chart"></canvas>
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
		align-items: stretch;
	}

	.ec-dir-analytics__card {
		display: flex;
		flex-direction: column;
		height: 100%;
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #ffffff;
		padding: 1.25rem;
		box-sizing: border-box;
	}

	:global(html.dark) .ec-dir-analytics__card {
		border-color: rgba(255, 255, 255, 0.1);
		background: #0f172a;
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
		flex: 1 1 auto;
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
