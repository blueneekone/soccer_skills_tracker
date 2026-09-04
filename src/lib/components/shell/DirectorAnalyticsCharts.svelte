<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';
	import { collection, doc, getDoc, getDocs, onSnapshot, query, where, getCountFromServer } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';
	import {
		enterpriseChartOptions,
		EC_ACCENT,
		EC_INK,
		EC_INK_LIGHT
	} from '$lib/charts/enterpriseChartTheme.js';

	const DATA_CYAN = '#14b8a6';
	const CYBER_YELLOW = '#daff0a';

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

	/** @type {{ labels: string[], values: number[], teamIds: string[] }} */
	let playersByTeam = $state({ labels: [], values: [], teamIds: [] });

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
		if (!browser || !isFirestoreReady()) return; // b815 guard
		let cancelled = false;
		(async () => {
			try {
				const teamsSnap = await getDocs(query(collection(db, 'teams'), where('clubId', '==', clubId)));
				if (cancelled) return;

				const teamTasks = teamsSnap.docs.map(async (d) => {
					const t = /** @type {Record<string, any>} */ (d.data());
					const name = typeof t.name === 'string' && t.name.trim() ? t.name.trim() : d.id;
					try {
						// Using a server-side count query instead of downloading documents
						const countSnap = await getCountFromServer(query(collection(db, 'player_lookup'), where('teamId', '==', d.id)));
						return { id: d.id, name, count: countSnap.data().count };
					} catch {
						return { id: d.id, name, count: 0 };
					}
				});

				const counts = await Promise.all(teamTasks);
				if (cancelled) return;

				const rows = counts.sort((a, b) => b.count - a.count).slice(0, 8);

				playersByTeam = {
					labels: rows.map((r) => r.name),
					values: rows.map((r) => r.count),
					teamIds: rows.map((r) => r.id),
				};
			} catch (e) {
				console.error('[DirectorAnalyticsCharts] Failed to load team stats', e);
				if (!cancelled) playersByTeam = { labels: ['Error loading data'], values: [0], teamIds: [] };
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!browser || !mounted || !seatCanvas || !clubId) return;
		// `destroyed` is set synchronously by the cleanup function so the async
		// IIFE can detect it and abort before creating an orphaned Chart instance.
		let destroyed = false;
		void (async () => {
			await tick();
			const mod = await import('chart.js');
			if (destroyed) return; // cleanup already fired — do not create the chart
			const { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip } = mod;
			Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip);
			if (seatChart) { seatChart.destroy(); seatChart = null; }
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
							borderColor: CYBER_YELLOW,
							backgroundColor: 'rgba(218, 255, 10, 0.14)',
							pointBackgroundColor: CYBER_YELLOW,
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
							footerFont: { weight: 600 },
							callbacks: {
								footer: () => `Utilization: ${utilPct}%`,
							},
						},
					},
				},
			});
		})();
		return () => {
			destroyed = true; // signal async IIFE to abort before chart construction
			seatChart?.destroy();
			seatChart = null;
		};
	});

	$effect(() => {
		if (!browser || !mounted || !clubCanvas) return;
		const labels = playersByTeam.labels;
		const values = playersByTeam.values;
		const teamIds = playersByTeam.teamIds;
		// Same `destroyed` guard as seatChart — prevents orphaned Chart.js instance
		// accumulation across client-side navigation.
		let destroyed = false;
		void (async () => {
			await tick();
			const mod = await import('chart.js');
			if (destroyed) return; // cleanup already fired — do not create the chart
			const { Chart, BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip } = mod;
			Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);
			if (clubChart) { clubChart.destroy(); clubChart = null; }
			const opts = enterpriseChartOptions(false);
			clubChart = new Chart(clubCanvas, {
				type: 'bar',
				data: {
					labels: labels.length ? labels : ['No Teams'],
					datasets: [
						{
							label: 'Active players',
							data: values.length ? values : [0],
							backgroundColor: 'rgba(20, 184, 166, 0.2)', // Data Cyan faint
							hoverBackgroundColor: DATA_CYAN,
							borderColor: DATA_CYAN,
							borderWidth: 1,
							borderRadius: 6,
						},
					],
				},
				options: {
					...opts,
					plugins: {
						...opts.plugins,
						legend: { display: false },
					},
					onClick: (e, elements) => {
						if (elements && elements.length > 0) {
							const idx = elements[0].index;
							const tId = teamIds[idx];
							if (tId) {
								window.location.href = `/director/team/${tId}/roster`;
							}
						}
					},
					scales: {
						x: {
							grid: { color: 'rgba(255,255,255,0.06)' },
							ticks: { color: '#a1a1aa', font: { size: 11, family: 'Geist Mono' } },
						},
						y: {
							beginAtZero: true,
							grid: { color: 'rgba(255,255,255,0.06)' },
							ticks: { color: '#a1a1aa', font: { size: 11, family: 'Geist Mono' } },
						},
					} as Record<string, unknown>,
				},
			});
		})();
		return () => {
			destroyed = true; // signal async IIFE to abort before chart construction
			clubChart?.destroy();
			clubChart = null;
		};
	});

	onMount(() => {
		mounted = true;
	});
</script>

{#if clubId}
	<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
		<div class="st-bento vanguard-card tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-5 tw-flex tw-flex-col tw-h-full">
			<h3 class="tw-text-sm tw-font-bold tw-text-slate-100 tw-mb-1" style="font-family: 'Geist Sans', sans-serif;">Platform seat utilization</h3>
			<p class="tw-text-xs tw-text-slate-400 tw-mb-4" style="font-family: 'Switzer', sans-serif;">Current allocated seats (active + reserved) against licensed capacity.</p>
			{#if clubInfinite}
				<p class="tw-text-sm tw-text-amber-500 tw-bg-amber-500/10 tw-border tw-border-amber-500/20 tw-p-3 tw-rounded-md">
					<strong class="tw-font-bold">Unlimited license (promo).</strong> Capacity is uncapped for this club.
				</p>
			{:else}
				<div class="tw-relative tw-flex-1 tw-min-h-[200px]">
					<canvas bind:this={seatCanvas} aria-label="Platform seat utilization chart"></canvas>
				</div>
			{/if}
		</div>
		<div class="st-bento vanguard-card tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-5 tw-flex tw-flex-col tw-h-full">
			<h3 class="tw-text-sm tw-font-bold tw-text-slate-100 tw-mb-1" style="font-family: 'Geist Sans', sans-serif;">Active players per team</h3>
			<p class="tw-text-xs tw-text-slate-400 tw-mb-4" style="font-family: 'Switzer', sans-serif;">Top teams by active roster size. Click a bar to view the roster logs.</p>
			<div class="tw-relative tw-flex-1 tw-min-h-[200px] tw-cursor-pointer">
				<canvas bind:this={clubCanvas} aria-label="Active players per team chart"></canvas>
			</div>
		</div>
	</div>
{/if}
