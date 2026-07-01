<script>
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { safeGetDate } from '$lib/utils/dates.js';
	import {
		enterpriseRadialOptions,
		EC_ACCENT,
		EC_INK,
		EC_INK_LIGHT,
	} from '$lib/charts/enterpriseChartTheme.js';
	import { getAttributeSchemaForSport } from '$lib/utils/sport-attributes.js';

	let { teamId = '' } = $props();

	let radarCanvasEl = $state(/** @type {HTMLCanvasElement | null} */ (null));
	let mounted = $state(false);
	/** @type {any} */
	let radarChart = null;
	let last7DayXpTotal = $state(0);

	/** @type {Array<{ label: string, heightPct: number, xp: number }>} */
	let velocityBars = $state([]);

	$effect(() => {
		if (!browser || !mounted || !radarCanvasEl || !teamId) return;
		let cancelled = false;

		void (async () => {
			try {
				const [repsSnap, teamSnap, statsSnap, lookupSnap] = await Promise.all([
					getDocs(query(collection(db, 'reps'), where('teamId', '==', teamId))),
					getDoc(doc(db, 'teams', teamId)),
					getDocs(query(collection(db, 'player_stats'), where('teamId', '==', teamId))),
					getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', teamId))),
				]);

				const dayKeys = getLast7DayKeys();
				/** @type {Record<string, number>} */
				const xpByDay = Object.fromEntries(dayKeys.map((k) => [k, 0]));
				repsSnap.forEach((row) => {
					const d = row.data();
					const key = toLocalDateKey(safeGetDate(d));
					if (!(key in xpByDay)) return;
					const mins = Number(d.minutes || 0);
					xpByDay[key] += Math.floor(mins * 2);
				});
				last7DayXpTotal = dayKeys.reduce((sum, k) => sum + xpByDay[k], 0);

				const maxDayXp = Math.max(1, ...dayKeys.map((k) => xpByDay[k]));
				velocityBars = dayKeys.map((k) => {
					const xp = xpByDay[k];
					const heightPct = Math.max(18, Math.round((xp / maxDayXp) * 92));
					const [y, m, day] = k.split('-').map(Number);
					const dt = new Date(y, m - 1, day);
					return { label: shortWeekLabel(dt), heightPct, xp };
				});

				const teamData = teamSnap.exists() ? teamSnap.data() : {};
				const sportHint =
					typeof teamData?.sport === 'string' ? teamData.sport
					: typeof teamData?.courtType === 'string' ? teamData.courtType
					: 'generic';
				const schema = getAttributeSchemaForSport(sportHint);

				/** @type {Set<string>} */
				const activeNames = new Set();
				lookupSnap.forEach((row) => {
					const d = row.data();
					const status = typeof d.status === 'string' ? d.status.toLowerCase() : '';
					const playerName = typeof d.playerName === 'string' ? d.playerName.trim() : '';
					if (status === 'active' && playerName) activeNames.add(playerName);
				});

				const rosterStats = [];
				statsSnap.forEach((row) => {
					const d = row.data();
					const playerName = typeof d.playerName === 'string' ? d.playerName.trim() : '';
					if (activeNames.size > 0 && playerName && !activeNames.has(playerName)) return;
					rosterStats.push(d);
				});

				/** @type {number[]} */
				const avgValues = [];
				for (const key of schema.keys) {
					let sum = 0;
					let samples = 0;
					for (const stat of rosterStats) {
						const flat = Number(stat?.[key]);
						if (Number.isFinite(flat)) {
							sum += flat;
							samples += 1;
							continue;
						}
						const skillVal = Number(stat?.skills?.[key]);
						if (Number.isFinite(skillVal)) {
							sum += skillVal;
							samples += 1;
						}
					}
					avgValues.push(samples > 0 ? Math.round(sum / samples) : 0);
				}

				if (cancelled) return;
				await tick();
				const mod = await import('chart.js');
				const {
					Chart,
					LineElement,
					PointElement,
					CategoryScale,
					LinearScale,
					Legend,
					Tooltip,
					Filler,
					RadarController,
					RadialLinearScale,
				} = mod;
				Chart.register(
					LineElement,
					PointElement,
					CategoryScale,
					LinearScale,
					Legend,
					Tooltip,
					Filler,
					RadarController,
					RadialLinearScale,
				);

				radarChart?.destroy();
				const radarOpts = enterpriseRadialOptions(false);
				radarChart = new Chart(radarCanvasEl, {
					type: 'radar',
					data: {
						labels: schema.labels,
						datasets: [
							{
								label: 'Team average attributes',
								data: avgValues,
								borderColor: EC_INK,
								backgroundColor: 'rgba(63, 63, 70, 0.16)',
								pointBackgroundColor: EC_ACCENT,
								pointBorderColor: '#ffffff',
								pointHoverBackgroundColor: EC_ACCENT,
							},
						],
					},
					options: {
						...radarOpts,
						scales: {
							r: {
								min: 0,
								max: 99,
								ticks: { display: false, stepSize: 20, color: EC_INK_LIGHT },
								angleLines: { color: 'rgba(0,0,0,0.06)' },
								grid: { color: 'rgba(0,0,0,0.06)' },
								pointLabels: { color: EC_INK, font: { size: 11, weight: '600' } },
							},
						},
					},
				});
			} catch (e) {
				console.error('[CoachTeamXpVelocityChart] chart load failed', e);
			}
		})();

		return () => {
			cancelled = true;
			radarChart?.destroy();
			radarChart = null;
		};
	});

	function getLast7DayKeys() {
		/** @type {string[]} */
		const keys = [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		for (let i = 6; i >= 0; i--) {
			const d = new Date(today);
			d.setDate(today.getDate() - i);
			keys.push(toLocalDateKey(d));
		}
		return keys;
	}

	/**
	 * @param {Date} d
	 */
	function toLocalDateKey(d) {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		const y = x.getFullYear();
		const m = String(x.getMonth() + 1).padStart(2, '0');
		const day = String(x.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	/**
	 * Single-letter weekday labels: M T W Th F S Su
	 * @param {Date} d
	 */
	function shortWeekLabel(d) {
		const dow = d.getDay();
		const labels = ['Su', 'M', 'T', 'W', 'Th', 'F', 'S'];
		return labels[dow];
	}

	$effect(() => {
		mounted = true;
	});
</script>

{#if teamId}
	<div class="ec-coach-xp">
		<div
			class="ec-coach-xp__card vanguard-card"
		>
			<h3 class="ec-coach-xp__title">Team XP velocity (last 7 days)</h3>
			<p class="ec-coach-xp__xp-total">
				{last7DayXpTotal.toLocaleString()} XP
			</p>
			<p class="ec-coach-xp__subtitle">Daily team XP (minutes × 2) · pure CSS bars</p>

			<div class="ec-coach-xp__bars">
				{#each velocityBars as bar, i (`${bar.label}-${i}-${bar.xp}`)}
					<div class="ec-coach-xp__bar-col">
						<div
							class="ec-coach-xp__bar-track"
						>
							<div
								class="w-[72%] max-w-[3rem] rounded-t-md bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-[0_0_18px_rgba(20, 184, 166,0.45)] transition-[height] duration-300"
								style="height: {bar.heightPct}%"
								title="{bar.xp} XP"
							></div>
						</div>
						<span class="ec-coach-xp__bar-label">{bar.label}</span>
					</div>
				{/each}
			</div>
		</div>

		<div
			class="ec-coach-xp__card vanguard-card"
		>
			<h3 class="ec-coach-xp__title">Team average attributes</h3>
			<p class="ec-coach-xp__subtitle">
				Average ratings from active roster `player_stats` for this team.
			</p>
			<div class="ec-coach-xp__chart ec-coach-xp__chart--radar flex-1">
				<canvas bind:this={radarCanvasEl} aria-label="Team average attributes radar chart"></canvas>
			</div>
		</div>
	</div>
{/if}

<style>
	.ec-coach-xp {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));
		gap: 14px;
		margin-bottom: 16px;
		align-items: stretch;
	}

	.ec-coach-xp__card {
		box-sizing: border-box;
		min-width: 0;
		padding: 1.5rem;
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
	}

	.ec-coach-xp__title {
		margin: 0 0 0.25rem;
		font-size: 0.875rem;
		font-weight: 700;
		color: #f3f4f6;
	}

	.ec-coach-xp__xp-total {
		margin: 0 0 0.25rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 1.5rem;
		font-weight: 900;
		letter-spacing: -0.02em;
		color: var(--vanguard-cyan);
		font-variant-numeric: tabular-nums;
	}

	.ec-coach-xp__subtitle {
		margin: 0 0 1.5rem;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.ec-coach-xp__bars {
		display: flex;
		min-height: 11rem;
		flex: 1;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.375rem;
		padding: 0 0.125rem;
	}

	.ec-coach-xp__bar-col {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.ec-coach-xp__bar-track {
		display: flex;
		height: 9rem;
		width: 100%;
		align-items: flex-end;
		justify-content: center;
		border-radius: 0.375rem 0.375rem 0 0;
		background: rgba(20, 184, 166, 0.04);
		box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.08);
	}

	.ec-coach-xp__bar-label {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.ec-coach-xp__chart {
		position: relative;
		flex: 1 1 auto;
		height: 220px;
		max-width: 100%;
	}

	.ec-coach-xp__chart--radar {
		height: 250px;
	}
</style>
