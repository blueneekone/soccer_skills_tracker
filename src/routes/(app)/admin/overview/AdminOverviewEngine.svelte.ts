import { browser } from '$app/environment';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { hydrateAdminOverview } from '$lib/admin/overviewHydrate.js';
import {
	mountMauLineChart,
	mountRevenueDoughnutChart,
	mountSportBarChart,
	readOverviewCssVar,
} from '$lib/admin/overviewCharts.js';

/** Strike 16 — Tabbed command center (SOAR/SIEM-style statistical surfaces) */
export const TAB_IDS = ['executive', 'growth', 'security', 'platform'] as const;
export type TabId = typeof TAB_IDS[number];
export const TAB_LABELS = ['Executive', 'Growth', 'Security', 'Platform'] as const;

/** SOC-style ribbon — headline operational telemetry (representative / demo). */
export const SOC_RIBBON = [
	{ k: 'MTTR', v: '18m', s: 'Incidents · rolling 7d p50' },
	{ k: 'Playbooks', v: '2.4k', s: 'Automation runs · 24h' },
	{ k: 'Detections', v: '847/s', s: 'Rule evaluations · pipeline' },
	{ k: 'Ingest lag', v: '240ms', s: 'Audit + metrics · p95' },
] as const;

/** Growth / platform tiles (charts hydrate from Firestore aggregates). */
export const MOCK_KPI = /** @type {const} */ ({
	growth: { ltvCac: '4.2', churn: '1.2%', pipelineARR: '$1.8M', paybackMo: '14' },
	platform: { apiLatency: '42ms', uptime: '99.99%', dbReads: '1.2M', storage: '2.4 TB' },
});

export class AdminOverviewEngine {
	activeTab: 'executive' | 'growth' | 'security' | 'platform' = $state('executive');

	strike13Executive = $state([
		{ label: 'MRR', value: '$0', hint: 'Monthly recurring', band: 'info', delta: '+4.2%', deltaDir: 'up' },
		{ label: 'ARR', value: '$0', hint: 'Annual run rate', band: 'info', delta: '+11%', deltaDir: 'up' },
		{ label: 'Active Orgs', value: '0', hint: 'Tenant footprint', band: 'low', delta: '+6', deltaDir: 'up' },
		{ label: 'Total Players', value: '0', hint: 'Platform headcount', band: 'low', delta: '+2.1%', deltaDir: 'up' },
		{ label: 'WAU/MAU', value: '68%', hint: 'Weekly / monthly', band: 'ok', delta: '—', deltaDir: 'flat' },
		{ label: 'ARPU', value: '$299', hint: 'Blended ARPU', band: 'info', delta: '+$12', deltaDir: 'up' },
		{ label: 'Gross Retention', value: '98%', hint: 'Logo gross', band: 'ok', delta: '+0.4pp', deltaDir: 'up' },
		{ label: 'LTV', value: '$12k', hint: 'Cohort average', band: 'info', delta: '+3%', deltaDir: 'up' },
	]);

	strike13Security = $state([
		{ label: 'WAF Blocks', value: '1,402', hint: 'Edge policy · 24h', band: 'info', delta: '+112', deltaDir: 'up' },
		{ label: 'Failed Auth', value: '45', hint: 'Rolling 24h', band: 'med', delta: '−8%', deltaDir: 'down' },
		{ label: 'MFA Bypasses', value: '0', hint: 'Policy exceptions', band: 'ok', delta: '0', deltaDir: 'flat' },
		{ label: 'Vetting Pending', value: '14', hint: 'Background queue', band: 'med', delta: '+3', deltaDir: 'up' },
		{ label: 'Flagged Orgs', value: '2', hint: 'Compliance review', band: 'high', delta: '−1', deltaDir: 'down' },
		{ label: 'API Abuse', value: '12', hint: 'Throttle / WAF', band: 'med', delta: '+2', deltaDir: 'up' },
		{ label: 'Priv. Escalation', value: '0', hint: 'Elevation attempts', band: 'ok', delta: '0', deltaDir: 'flat' },
		{ label: 'Suspicious IPs', value: '4', hint: 'Threat intel feed', band: 'high', delta: '+1', deltaDir: 'up' },
	]);

	GROWTH_TILES = [
		{ label: 'LTV:CAC', value: MOCK_KPI.growth.ltvCac, hint: 'Blended cohort', band: 'ok', delta: '+0.3', deltaDir: 'up' },
		{ label: 'Churn', value: MOCK_KPI.growth.churn, hint: 'Logo + revenue', band: 'low', delta: '−0.1pp', deltaDir: 'down' },
		{ label: 'Pipeline ARR', value: MOCK_KPI.growth.pipelineARR, hint: 'Weighted forecast', band: 'info', delta: '+$180k', deltaDir: 'up' },
		{ label: 'CAC payback', value: `${MOCK_KPI.growth.paybackMo} mo`, hint: 'Months to recover', band: 'med', delta: '−1 mo', deltaDir: 'down' },
	];

	PLATFORM_TILES = [
		{ label: 'API latency', value: MOCK_KPI.platform.apiLatency, hint: 'p50 edge → API', band: 'ok', delta: '−4ms', deltaDir: 'down' },
		{ label: 'Uptime', value: MOCK_KPI.platform.uptime, hint: 'Trailing 30d SLO', band: 'ok', delta: '+0.01%', deltaDir: 'up' },
		{ label: 'DB reads', value: MOCK_KPI.platform.dbReads, hint: 'Firestore aggregate', band: 'info', delta: '+8%', deltaDir: 'up' },
		{ label: 'Storage', value: MOCK_KPI.platform.storage, hint: 'Object + media vault', band: 'low', delta: '+120 GB', deltaDir: 'up' },
	];

	mauSeries = $state<Array<{ label: string, value: number }>>([]);
	revenueByTier = $state<Array<{ label: string, value: number }>>([]);
	playersBySport = $state<Array<{ label: string, value: number }>>([]);

	mauSource: 'live' | 'mock' = $state('mock');
	revenueSource: 'live' | 'mock' = $state('mock');
	sportSource: 'live' | 'mock' = $state('mock');

	liveFeed = $state<Array<{ id: string, action: string, targetEmail: string, details: string, createdAt: Date | null }>>([]);
	feedLoading = $state(false);
	feedErr = $state('');

	mauCanvasEl = $state<HTMLCanvasElement | undefined>(undefined);
	revenueCanvasEl = $state<HTMLCanvasElement | undefined>(undefined);
	sportCanvasEl = $state<HTMLCanvasElement | undefined>(undefined);

	subscribe() {
		$effect.root(() => {
			$effect(() => {
				if (!browser) return;
				if (authStore.isLoading || !authStore.isAuthenticated) return;
				if (!authStore.user || !authStore.tenantId) return;

				let destroyed = false;
				this.feedLoading = true;
				this.feedErr = '';

				hydrateAdminOverview(db)
					.then((result) => {
						if (destroyed) return;
						this.mauSeries = result.mauSeries;
						this.mauSource = result.mauSource;
						this.revenueByTier = result.revenueByTier;
						this.revenueSource = result.revenueSource;
						this.playersBySport = result.playersBySport;
						this.sportSource = result.sportSource;
						this.liveFeed = result.liveFeed;
						this.feedErr = result.feedErr;
						if (result.executive) {
							this.strike13Executive[0].value = `$${result.executive.mrr}`;
							this.strike13Executive[1].value = `$${result.executive.arr}`;
							this.strike13Executive[3].value = `${result.executive.mauTotal}`;
						}
						this.feedLoading = false;
					})
					.catch((e) => {
						console.warn('[overview] hydrate failed', e);
						if (!destroyed) {
							this.feedErr = e instanceof Error ? e.message : 'Could not load overview data.';
							this.feedLoading = false;
						}
					});

				return () => {
					destroyed = true;
				};
			});

			$effect(() => {
				if (!browser || !this.mauCanvasEl) return;
				const target = this.mauCanvasEl;
				const series = this.mauSeries;
				let destroyed = false;
				let destroyChart: (() => void) | null = null;

				mountMauLineChart(target, series, readOverviewCssVar)
					.then((destroy) => {
						if (destroyed) {
							destroy();
							return;
						}
						destroyChart = destroy;
					})
					.catch((e) => console.warn('[overview] MAU chart init failed', e));

				return () => {
					destroyed = true;
					destroyChart?.();
					destroyChart = null;
				};
			});

			$effect(() => {
				if (!browser || !this.revenueCanvasEl) return;
				const target = this.revenueCanvasEl;
				const series = this.revenueByTier;
				let destroyed = false;
				let destroyChart: (() => void) | null = null;

				mountRevenueDoughnutChart(target, series, readOverviewCssVar)
					.then((destroy) => {
						if (destroyed) {
							destroy();
							return;
						}
						destroyChart = destroy;
					})
					.catch((e) => console.warn('[overview] Revenue chart init failed', e));

				return () => {
					destroyed = true;
					destroyChart?.();
					destroyChart = null;
				};
			});

			$effect(() => {
				if (!browser || !this.sportCanvasEl) return;
				const target = this.sportCanvasEl;
				const series = this.playersBySport;
				let destroyed = false;
				let destroyChart: (() => void) | null = null;

				mountSportBarChart(target, series, readOverviewCssVar)
					.then((destroy) => {
						if (destroyed) {
							destroy();
							return;
						}
						destroyChart = destroy;
					})
					.catch((e) => console.warn('[overview] Sport chart init failed', e));

				return () => {
					destroyed = true;
					destroyChart?.();
					destroyChart = null;
				};
			});
			return () => {};
		});
	}
}
