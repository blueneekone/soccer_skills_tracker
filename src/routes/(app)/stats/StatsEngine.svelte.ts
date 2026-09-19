import { browser } from '$app/environment';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { getLevelProgressFromTotalXp } from '$lib/gamification/level.js';
import { deriveVanguardPrism } from '$lib/utils/vanguard-prism.js';
import { hasVanguardTelemetry } from '$lib/player/dashboard/vanguardProtocol.js';
import type { IconName } from '$lib/icons/registry.js';
import type { VanguardAxisId } from '$lib/player/dashboard/vanguardProtocol.js';

export interface BadgeDef {
	id: string;
	title: string;
	icon: IconName;
	unlocked: boolean;
	tier?: 'standard' | 'elite';
}

export function computeBadges(level: number, totalXp: number): BadgeDef[] {
	const lv = Math.max(1, Math.floor(level || 1));
	const xp = Math.max(0, Math.floor(totalXp || 0));
	return [
		{ id: 'streak', title: '100_DAY_STREAK', icon: 'game.flame', unlocked: lv >= 8 || xp >= 12000, tier: 'elite' },
		{ id: 'marksman', title: 'ELITE_MARKSMAN', icon: 'data.target', unlocked: lv >= 14 || xp >= 28000, tier: 'elite' },
		{ id: 'vector', title: 'VECTOR_ACE', icon: 'data.radar', unlocked: lv >= 6 || xp >= 9000, tier: 'standard' },
		{ id: 'iron', title: 'IRON_LUNGS', icon: 'env.wind', unlocked: lv >= 10 || xp >= 18000, tier: 'standard' },
		{ id: 'ghost', title: 'GHOST_PRESS', icon: 'game.ghost', unlocked: lv >= 18 || xp >= 42000, tier: 'elite' },
		{ id: 'crown', title: 'DYNASTY_MODE', icon: 'game.crown', unlocked: lv >= 22 || xp >= 55000, tier: 'elite' },
		{ id: 'sword', title: 'BLADE_RUNNER', icon: 'game.sword', unlocked: lv >= 16 || xp >= 38000, tier: 'standard' },
		{ id: 'lock', title: 'ZERO_DAY_PROTOCOL', icon: 'status.shield-check', unlocked: lv >= 12 || xp >= 24000, tier: 'standard' },
		{ id: 'flame', title: 'COMBUSTION_99', icon: 'game.flame', unlocked: lv >= 26 || xp >= 72000, tier: 'elite' },
		{ id: 'medal', title: 'ORBITAL_STRIKE', icon: 'game.medal', unlocked: lv >= 20 || xp >= 48000, tier: 'elite' },
		{ id: 'timer', title: 'CHRONO_LOCK', icon: 'sys.timer', unlocked: lv >= 24 || xp >= 62000, tier: 'standard' },
		{ id: 'code', title: 'OVERRIDE_KEY', icon: 'sys.key', unlocked: lv >= 30 || xp >= 95000, tier: 'elite' },
	];
}

export class StatsEngine {
	ChartCtor = $state<any>(null);
	chartOk = $state(false);
	workoutCanvas = $state<HTMLCanvasElement | undefined>(undefined);
	selectedVanguardAxis = $state<VanguardAxisId | null>(null);

	monthlyPerformance = $state<Array<{ month: string; xp: number }>>([]);
	dailyPerformance = $state<Array<{ day: string; xp: number }>>([]);
	weeklyPerformance = $state<Array<{ week: string; xp: number }>>([]);
	workoutViewMode = $state<'daily' | 'weekly' | 'monthly'>('monthly');

	dossierLevel = $state(1);
	dossierXp = $state(0);
	badges = $state<BadgeDef[]>(computeBadges(1, 0));
	playerStatsSnapshot = $state<Record<string, unknown> | null>(null);

	isPlayerRole = $derived(authStore.role === 'player');
	userUid = $derived(authStore.user?.uid ?? '');

	attrRadarValues = $derived(
		deriveVanguardPrism(
			this.playerStatsSnapshot,
			(authStore.userProfile?.armory?.stats ?? {}) as any
		)
	);
	telemetryReady = $derived(hasVanguardTelemetry(this.attrRadarValues));

	workoutChartInst: any = null;

	constructor() {
		$effect(() => {
			if (!browser || !this.userUid || !db || !authStore.isAuthenticated) return;

			const refPub = doc(db, 'public_player_profiles', this.userUid);
			const refPs = doc(db, 'player_stats', this.userUid);

			const unsubPub = onSnapshot(
				refPub,
				(snap) => {
					const profileXp = Math.max(
						0,
						Math.floor(
							Number(
								authStore.userProfile?.totalXp ??
									authStore.userProfile?.xp ??
									0
							)
						)
					);
					const lvFallback = getLevelProgressFromTotalXp(profileXp).level;

					if (!snap.exists()) {
						this.dossierLevel = lvFallback;
						this.dossierXp = profileXp;
						this.badges = computeBadges(lvFallback, profileXp);
						return;
					}

					const d = snap.data() || {};
					const lv = typeof d.current_level === 'number' && !Number.isNaN(d.current_level) ? Math.floor(d.current_level) : lvFallback;
					const tx = typeof d.total_xp === 'number' && !Number.isNaN(d.total_xp) ? Math.floor(d.total_xp) : profileXp;

					this.dossierLevel = lv;
					this.dossierXp = tx;
					this.badges = computeBadges(lv, tx);
				},
				(e) => { console.warn('[stats] public_player_profiles snapshot', e); }
			);

			const unsubPs = onSnapshot(
				refPs,
				(snap) => {
					const d = snap.exists() ? snap.data() || {} : {};
					this.playerStatsSnapshot = d as Record<string, unknown>;
					this.monthlyPerformance = this.parseMonthlyPerformance(d.monthly_performance);
					this.dailyPerformance = this.parseDailyPerformance(d.daily_performance);
					this.weeklyPerformance = this.parseWeeklyPerformance(d.weekly_performance);
				},
				(e) => { console.warn('[stats] player_stats snapshot', e); }
			);

			return () => { unsubPub(); unsubPs(); };
		});

		$effect(() => {
			if (!browser) return;
			(async () => {
				const mod = await import('chart.js');
				this.ChartCtor = mod.Chart;
				mod.Chart.register(...mod.registerables);
				this.chartOk = true;
			})();
		});

		$effect(() => {
			this.chartOk;
			this.workoutCanvas;
			this.ChartCtor;
			this.workoutViewMode;
			if (!this.chartOk || !this.ChartCtor || !this.workoutCanvas || !browser) return;

			if (this.workoutChartInst) {
				this.workoutChartInst.destroy();
				this.workoutChartInst = null;
			}

			const dsLabel =
				this.workoutViewMode === 'daily' ? 'DAILY_XP' :
				this.workoutViewMode === 'weekly' ? 'WEEKLY_XP' :
				'MONTHLY_XP';

			this.workoutChartInst = new this.ChartCtor(this.workoutCanvas, {
				type: 'line',
				data: {
					labels: [],
					datasets: [{
						label: dsLabel,
						data: [],
						borderColor: 'rgba(0, 255, 200, 0.92)',
						backgroundColor: 'rgba(20, 184, 166, 0.14)',
						fill: true,
						tension: 0.32,
						borderWidth: 2,
						pointBackgroundColor: 'rgba(52, 211, 153, 0.95)',
						pointBorderColor: 'rgba(0, 255, 200, 1)',
						pointRadius: 3,
					}],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					layout: { padding: { top: 12, bottom: 28, left: 16, right: 16 } },
					animation: { duration: 380 },
					plugins: {
						legend: {
							display: true,
							position: 'bottom',
							align: 'center',
							labels: { color: 'rgba(226, 232, 240, 0.85)', font: { family: 'ui-monospace, monospace', size: 10 }, boxWidth: 10, padding: 10 },
						},
						tooltip: {
							backgroundColor: 'rgba(0,0,0,0.9)',
							borderColor: 'rgba(255,255,255,0.12)',
							borderWidth: 1,
							titleFont: { family: 'ui-monospace, monospace' },
							bodyFont: { family: 'ui-monospace, monospace' },
						},
					},
					scales: {
						x: { ticks: { color: 'rgba(148, 163, 184, 0.95)', font: { family: 'ui-monospace, monospace', size: 9 } }, grid: { color: 'rgba(34, 211, 255, 0.12)' } },
						y: { beginAtZero: true, ticks: { color: 'rgba(148, 163, 184, 0.95)', font: { family: 'ui-monospace, monospace', size: 9 } }, grid: { color: 'rgba(0, 255, 200, 0.08)' } },
					},
				},
			});

			return () => {
				if (this.workoutChartInst) {
					this.workoutChartInst.destroy();
					this.workoutChartInst = null;
				}
			};
		});

		$effect(() => {
			this.workoutViewMode;
			this.monthlyPerformance;
			this.dailyPerformance;
			this.weeklyPerformance;
			if (!this.workoutChartInst || !browser) return;

			let labels: string[] = [];
			let data: number[] = [];
			let dsLabel = 'MONTHLY_XP';

			if (this.workoutViewMode === 'daily') {
				labels = this.dailyPerformance.map((r) => String(r.day ?? '').slice(5));
				data = this.dailyPerformance.map((r) => typeof r.xp === 'number' && !Number.isNaN(r.xp) ? r.xp : 0);
				dsLabel = 'DAILY_XP';
			} else if (this.workoutViewMode === 'weekly') {
				labels = this.weeklyPerformance.map((r) => String(r.week ?? '').slice(5));
				data = this.weeklyPerformance.map((r) => typeof r.xp === 'number' && !Number.isNaN(r.xp) ? r.xp : 0);
				dsLabel = 'WEEKLY_XP';
			} else {
				labels = this.monthlyPerformance.map((r) => String(r.month ?? ''));
				data = this.monthlyPerformance.map((r) => typeof r.xp === 'number' && !Number.isNaN(r.xp) ? r.xp : 0);
				dsLabel = 'MONTHLY_XP';
			}

			this.workoutChartInst.data.labels = labels;
			this.workoutChartInst.data.datasets[0].data = data;
			this.workoutChartInst.data.datasets[0].label = dsLabel;
			this.workoutChartInst.update('none');
			this.workoutChartInst.resize();
		});
	}

	parseMonthlyPerformance(mp: any) {
		return Array.isArray(mp)
			? mp.filter((row) => row && typeof row === 'object' && typeof row.month === 'string')
					.map((row) => ({ month: String(row.month ?? ''), xp: typeof row.xp === 'number' && !Number.isNaN(row.xp) ? Math.floor(row.xp) : 0 }))
			: [];
	}

	parseDailyPerformance(raw: any) {
		return Array.isArray(raw)
			? raw.filter((row) => row && typeof row === 'object' && typeof row.day === 'string')
					.map((row) => ({ day: String(row.day ?? ''), xp: typeof row.xp === 'number' && !Number.isNaN(row.xp) ? Math.floor(row.xp) : 0 }))
			: [];
	}

	parseWeeklyPerformance(raw: any) {
		return Array.isArray(raw)
			? raw.filter((row) => row && typeof row === 'object' && typeof row.week === 'string')
					.map((row) => ({ week: String(row.week ?? ''), xp: typeof row.xp === 'number' && !Number.isNaN(row.xp) ? Math.floor(row.xp) : 0 }))
			: [];
	}

	lockedLine(b: BadgeDef, i: number) {
		if (b.unlocked) return b.title;
		return i % 2 === 0 ? 'CLASSIFIED' : 'ENCRYPTED_DATA';
	}
}
