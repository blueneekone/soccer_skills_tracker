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




import { doc, setDoc } from 'firebase/firestore';

export class AdminOverviewEngine {
	maintenanceMode = $state(false);
	maintenanceBusy = $state(false);

	toggleMaintenance = async () => {
		const nextState = !this.maintenanceMode;
		if (nextState) {
			const ok = confirm("WARNING: You are about to enable GLOBAL PLATFORM LOCKOUT.\n\nAll non-admin users will be immediately ejected to the maintenance page. Do you wish to proceed?");
			if (!ok) return;
		}

		this.maintenanceBusy = true;
		try {
			await setDoc(doc(db, 'platform_settings', 'core'), { maintenance_mode: nextState }, { merge: true });
			this.maintenanceMode = nextState;
		} catch (e) {
			console.error('[overview] failed to toggle maintenance mode', e);
			alert('Failed to toggle maintenance mode.');
		} finally {
			this.maintenanceBusy = false;
		}
	}

	activeTab: 'executive' | 'growth' | 'security' | 'platform' = $state('executive');

	strike13Executive = $state([
		{ label: 'MRR', value: '$0', hint: 'Monthly recurring', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'ARR', value: '$0', hint: 'Annual run rate', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Active Orgs', value: '0', hint: 'Tenant footprint', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Total Players', value: '0', hint: 'Platform headcount', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'WAU/MAU', value: '0%', hint: 'Weekly / monthly', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'ARPU', value: '$0', hint: 'Blended ARPU', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Gross Retention', value: '0%', hint: 'Logo gross', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'LTV', value: '$0', hint: 'Cohort average', band: 'info', delta: '—', deltaDir: 'flat' },
	]);

	strike13Security = $state([
		{ label: 'WAF Blocks', value: '0', hint: 'Edge policy · 24h', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Failed Auth', value: '0', hint: 'Rolling 24h', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'MFA Bypasses', value: '0', hint: 'Policy exceptions', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Vetting Pending', value: '0', hint: 'Background queue', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Flagged Orgs', value: '0', hint: 'Compliance review', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'API Abuse', value: '0', hint: 'Throttle / WAF', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Priv. Escalation', value: '0', hint: 'Elevation attempts', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Suspicious IPs', value: '0', hint: 'Threat intel feed', band: 'info', delta: '—', deltaDir: 'flat' },
	]);

	GROWTH_TILES = $state([
		{ label: 'LTV:CAC', value: '0', hint: 'Blended cohort', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Churn', value: '0%', hint: 'Logo + revenue', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Pipeline ARR', value: '$0', hint: 'Weighted forecast', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'CAC payback', value: '0 mo', hint: 'Months to recover', band: 'info', delta: '—', deltaDir: 'flat' },
	]);

	PLATFORM_TILES = $state([
		{ label: 'API latency', value: '0ms', hint: 'p50 edge → API', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Uptime', value: '0%', hint: 'Trailing 30d SLO', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'DB reads', value: '0', hint: 'Firestore aggregate', band: 'info', delta: '—', deltaDir: 'flat' },
		{ label: 'Storage', value: '0 GB', hint: 'Object + media vault', band: 'info', delta: '—', deltaDir: 'flat' },
	]);

	socRibbon = $state([
		{ k: 'MTTR', v: '0m', s: 'Incidents · rolling 7d p50' },
		{ k: 'Playbooks', v: '0', s: 'Automation runs · 24h' },
		{ k: 'Detections', v: '0/s', s: 'Rule evaluations · pipeline' },
		{ k: 'Ingest lag', v: '0ms', s: 'Audit + metrics · p95' },
	]);

	mauSeries = $state<Array<{ label: string, value: number }>>([]);
	revenueByTier = $state<Array<{ label: string, value: number }>>([]);
	playersBySport = $state<Array<{ label: string, value: number }>>([]);

	liveFeed = $state<Array<{ id: string, action: string, targetEmail: string, details: string, createdAt: Date | null }>>([]);
	feedLoading = $state(false);
	feedErr = $state('');

	mauCanvasEl = $state<HTMLCanvasElement | undefined>(undefined);
	revenueCanvasEl = $state<HTMLCanvasElement | undefined>(undefined);
	sportCanvasEl = $state<HTMLCanvasElement | undefined>(undefined);
	
	executiveTotals = $state({
		mrr: 0,
		activeOrgs: 0,
		totalPlayers: 0,
		activeLicenses: 0,
		pendingVpc: 0,
		pastDueStripe: 0
	});

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
						this.revenueByTier = result.revenueByTier;
						this.playersBySport = result.playersBySport;
						this.liveFeed = result.liveFeed;
						this.feedErr = result.feedErr;

						if (result.executive) {
							this.strike13Executive[0].value = `$${result.executive.mrr}`;
							this.strike13Executive[1].value = `$${result.executive.arr}`;
							this.strike13Executive[2].value = `${result.executive.activeOrgs}`;
							this.strike13Executive[3].value = `${result.executive.totalPlayers}`;
							this.strike13Executive[4].value = `${result.executive.wauMau}%`;
							this.strike13Executive[5].value = `$${result.executive.arpu}`;
							this.strike13Executive[6].value = `${result.executive.grossRetention}%`;
							this.strike13Executive[7].value = `$${result.executive.ltv}`;
							
							this.executiveTotals = {
								mrr: result.executive.mrr || 0,
								activeOrgs: result.executive.activeOrgs || 0,
								totalPlayers: result.executive.totalPlayers || 0,
								// Map activeLicenses from arr if missing, or default 0. Assuming it will be added to the db.
								activeLicenses: (result.executive as any).activeLicenses || 0,
								pendingVpc: (result.executive as any).pendingVpc || 0,
								pastDueStripe: (result.executive as any).pastDueStripe || 0,
							};
						}

						if (result.security) {
							this.strike13Security[0].value = `${result.security.wafBlocks}`;
							this.strike13Security[1].value = `${result.security.failedAuth}`;
							this.strike13Security[2].value = `${result.security.mfaBypasses}`;
							this.strike13Security[3].value = `${result.security.vettingPending}`;
							this.strike13Security[4].value = `${result.security.flaggedOrgs}`;
							this.strike13Security[5].value = `${result.security.apiAbuse}`;
							this.strike13Security[6].value = `${result.security.privEscalation}`;
							this.strike13Security[7].value = `${result.security.suspiciousIps}`;
						}

						if (result.growth) {
							this.GROWTH_TILES[0].value = `${result.growth.ltvCac}`;
							this.GROWTH_TILES[1].value = `${result.growth.churn}%`;
							this.GROWTH_TILES[2].value = `$${result.growth.pipelineARR}`;
							this.GROWTH_TILES[3].value = `${result.growth.paybackMo} mo`;
						}

						if (result.platform) {
							this.PLATFORM_TILES[0].value = `${result.platform.apiLatency}ms`;
							this.PLATFORM_TILES[1].value = `${result.platform.uptime}%`;
							this.PLATFORM_TILES[2].value = `${result.platform.dbReads}`;
							this.PLATFORM_TILES[3].value = `${result.platform.storage} GB`;
						}

						if (result.socRibbon) {
							this.socRibbon[0].v = `${result.socRibbon.mttr}m`;
							this.socRibbon[1].v = `${result.socRibbon.playbooks}`;
							this.socRibbon[2].v = `${result.socRibbon.detections}/s`;
							this.socRibbon[3].v = `${result.socRibbon.ingestLag}ms`;
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

			
			return () => {};
		});
	}
}
