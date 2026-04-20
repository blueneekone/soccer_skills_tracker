<script>
	import { browser } from '$app/environment';
	import { onMount, tick } from 'svelte';
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { safeGetDate } from '$lib/utils/dates.js';
	import { enterpriseChartOptions } from '$lib/charts/enterpriseChartTheme.js';

	let { teamId = '' } = $props();

	let canvasEl = $state(/** @type {HTMLCanvasElement | null} */ (null));
	let mounted = $state(false);
	/** @type {any} */
	let chart = null;

	const WEEKS = 8;
	const INK = '#3f3f46';
	const ACCENT = '#d97706';

	$effect(() => {
		if (!browser || !mounted || !canvasEl || !teamId) return;
		let cancelled = false;
		void (async () => {
			try {
				const snap = await getDocs(query(collection(db, 'reps'), where('teamId', '==', teamId)));
				const thisMonday = startOfWeekMonday(new Date());
				/** @type {string[]} */
				const weekKeys = [];
				/** @type {string[]} */
				const labels = [];
				for (let i = WEEKS - 1; i >= 0; i--) {
					const d = new Date(thisMonday);
					d.setDate(d.getDate() - i * 7);
					const key = d.toISOString().slice(0, 10);
					weekKeys.push(key);
					labels.push(
						d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
					);
				}
				const xpByWeek = Object.fromEntries(weekKeys.map((k) => [k, 0]));
				snap.forEach((d) => {
					const data = d.data();
					const dt = safeGetDate(data);
					const sw = startOfWeekMonday(dt);
					const key = sw.toISOString().slice(0, 10);
					if (key in xpByWeek) {
						const mins = Number(data.minutes || 0);
						xpByWeek[key] += Math.floor(mins * 2);
					}
				});
				if (cancelled) return;
				await tick();
				const mod = await import('chart.js');
				const {
					Chart,
					LineController,
					LineElement,
					PointElement,
					CategoryScale,
					LinearScale,
					Legend,
					Tooltip,
					Filler,
				} = mod;
				Chart.register(
					LineController,
					LineElement,
					PointElement,
					CategoryScale,
					LinearScale,
					Legend,
					Tooltip,
					Filler,
				);
				if (chart) chart.destroy();
				const opts = enterpriseChartOptions(false);
				chart = new Chart(canvasEl, {
					type: 'line',
					data: {
						labels,
						datasets: [
							{
								label: 'Team XP (weekly)',
								data: weekKeys.map((k) => xpByWeek[k]),
								borderColor: ACCENT,
								backgroundColor: 'rgba(217, 119, 6, 0.08)',
								fill: true,
								tension: 0.25,
								pointRadius: 3,
								pointBackgroundColor: INK,
							},
						],
					},
					options: {
						...opts,
						scales: {
							x: {
								grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
								ticks: { color: '#a1a1aa', font: { size: 10 } },
							},
							y: {
								beginAtZero: true,
								grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
								ticks: { color: '#a1a1aa', font: { size: 11 } },
							},
						},
					},
				});
			} catch (e) {
				console.error('[CoachTeamXpVelocityChart]', e);
			}
		})();
		return () => {
			cancelled = true;
			chart?.destroy();
			chart = null;
		};
	});

	/**
	 * Monday 00:00 local time for the week containing `d`.
	 * @param {Date} d
	 */
	function startOfWeekMonday(d) {
		const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
		const day = x.getDay();
		const diff = day === 0 ? -6 : 1 - day;
		x.setDate(x.getDate() + diff);
		x.setHours(0, 0, 0, 0);
		return x;
	}

	onMount(() => {
		mounted = true;
	});
</script>

{#if teamId}
	<div class="ec-coach-xp">
		<h3 class="ec-coach-xp__title">Team weekly XP velocity</h3>
		<p class="ec-coach-xp__sub">Aggregated training XP (minutes × 2) by week for this roster.</p>
		<div class="ec-coach-xp__chart">
			<canvas bind:this={canvasEl} aria-label="Team XP velocity chart"></canvas>
		</div>
	</div>
{/if}

<style>
	.ec-coach-xp {
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #fafafa;
		padding: 14px 16px 8px;
		margin-bottom: 16px;
		box-sizing: border-box;
	}

	:global(html.dark) .ec-coach-xp {
		border-color: rgba(255, 255, 255, 0.1);
		background: #0f0f11;
	}

	.ec-coach-xp__title {
		margin: 0 0 4px;
		font-size: 14px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.ec-coach-xp__sub {
		margin: 0 0 12px;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.ec-coach-xp__chart {
		position: relative;
		height: 220px;
		max-width: 100%;
	}
</style>
