<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { db } from '$lib/firebase.js';
	import { tick } from 'svelte';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { goto } from '$app/navigation';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import '$lib/styles/enterprise-console.css';

	// ─── Chart ──────────────────────────────────────────────────────────────────
	let loading = $state(true);
	let canvasEl = $state<HTMLCanvasElement | undefined>(undefined);
	let chart: any = null;

	// ─── Weather ─────────────────────────────────────────────────────────────────
	let weatherView = $state('LIVE');
	let weatherData = $state({ temp: '72°F', wind: '12 MPH', humidity: '45%', strikeRisk: 'SAFE' });
	let showLightningAlert = $state(false);
	$effect(() => { showLightningAlert = weatherData.strikeRisk === 'CRITICAL'; });

	// ─── Modals ───────────────────────────────────────────────────────────────────
	let showIngestionModal = $state(false);

	// ─── Player HUD Modal ────────────────────────────────────────────────────────
	type Player = {
		id: string; statsDocId: string; teamId: string;
		displayName: string; name: string; status: string;
		playerEmail: string; jersey: string; ageGroup: string;
		position: string; lastActiveLabel: string;
		attributes: { pow: number; agi: number; acc: number; pac: number; stm: number; comp: number } | null;
		compliance: string;
		homework: { assigned: number; completed: number; videosSubmitted: number };
		wellnessScore: number;
		source: 'coach';
	};
	let hudPlayer = $state<Player | null>(null);
	let hudActiveTab = $state<'STATS' | 'CONTACT'>('STATS');

	function openHUD(player: Player) { hudPlayer = player; hudActiveTab = 'STATS'; }
	function closeHUD() { hudPlayer = null; }

	function openContactDrawer(player: Player) {
		enterprisePlayerDrawer.open({
			id: player.id,
			statsDocId: player.statsDocId,
			teamId: player.teamId,
			displayName: player.displayName,
			playerEmail: player.playerEmail,
			jersey: player.jersey,
			ageGroup: player.ageGroup,
			position: player.position,
			status: player.status === 'ACTIVE' ? 'active' : 'pending',
			lastActiveLabel: player.lastActiveLabel,
			source: 'coach'
		});
	}

	// ─── Team ID ─────────────────────────────────────────────────────────────────
	const STATIC_TEAM_ID = 'L755D2';
	let teamIdCopied = $state(false);
	function copyTeamId() {
		if (!browser) return;
		navigator.clipboard.writeText(STATIC_TEAM_ID).then(() => {
			teamIdCopied = true;
			setTimeout(() => (teamIdCopied = false), 2000);
		});
	}

	// ─── Squad data ──────────────────────────────────────────────────────────────
	let rawSquadData = $state<Player[]>([
		{
			id: 'player-001', statsDocId: 'player-001',
			teamId: workspaceContextStore.activeTeamId ?? 'team-001',
			displayName: 'John Doe', name: 'John Doe', status: 'ACTIVE',
			playerEmail: 'john.doe@example.com', jersey: '10', ageGroup: 'U12',
			position: 'Midfielder', lastActiveLabel: 'Today',
			attributes: { pow: 88, agi: 75, acc: 82, pac: 79, stm: 91, comp: 85 },
			compliance: 'VPC PENDING',
			homework: { assigned: 3, completed: 1, videosSubmitted: 0 },
			wellnessScore: 72, source: 'coach'
		},
		{
			id: 'player-002', statsDocId: 'player-002',
			teamId: workspaceContextStore.activeTeamId ?? 'team-001',
			displayName: 'Alex Smith', name: 'Alex Smith', status: 'RECOVERY',
			playerEmail: 'alex.smith@example.com', jersey: '7', ageGroup: 'U12',
			position: 'Forward', lastActiveLabel: 'Yesterday',
			attributes: { pow: 65, agi: 80, acc: 70, pac: 68, stm: 60, comp: 72 },
			compliance: 'SAFESPORT',
			homework: { assigned: 3, completed: 3, videosSubmitted: 2 },
			wellnessScore: 45, source: 'coach'
		},
		{
			id: 'player-003', statsDocId: 'player-003',
			teamId: workspaceContextStore.activeTeamId ?? 'team-001',
			displayName: 'Mark Johnson', name: 'Mark Johnson', status: 'ACTIVE',
			playerEmail: 'mark.j@example.com', jersey: '4', ageGroup: 'U12',
			position: 'Defender', lastActiveLabel: 'Today',
			attributes: { pow: 92, agi: 88, acc: 90, pac: 85, stm: 95, comp: 89 },
			compliance: 'CLEARED',
			homework: { assigned: 3, completed: 2, videosSubmitted: 1 },
			wellnessScore: 88, source: 'coach'
		}
	]);
	let activeSquad = $derived(rawSquadData.filter(p => p.status !== 'INACTIVE'));

	// ─── Field Ops Events ─────────────────────────────────────────────────────────
	const upcomingEvents = [
		{ type: 'MATCH', label: 'vs Red Bulls U12', date: 'SAT JUL 26', time: '10:00 AM', venue: 'Riverside Park', status: 'CONFIRMED' },
		{ type: 'PRACTICE', label: 'Tactical Drill Block', date: 'TUE JUL 22', time: '5:30 PM', venue: 'Training Ground A', status: 'SCHEDULED' },
		{ type: 'PRACTICE', label: 'Conditioning + Film', date: 'THU JUL 24', time: '5:00 PM', venue: 'Training Ground A', status: 'SCHEDULED' },
		{ type: 'MATCH', label: 'vs Galaxy FC U12', date: 'SAT AUG 2', time: '9:00 AM', venue: 'Central Fields', status: 'PENDING' }
	];

	// ─── Hydration guard ──────────────────────────────────────────────────────────
	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated || !workspaceContextStore.activeTeamId) return;
		if (!db || !browser) return;
		loading = false;
	});

	// ─── Chart.js (memory-safe) ───────────────────────────────────────────────────
	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated || !workspaceContextStore.activeTeamId) return;
		if (!db || !browser || loading || !canvasEl) return;
		let destroyed = false;
		void (async () => {
			await tick();
			const mod = await import('chart.js/auto');
			if (destroyed) return;
			const Chart = mod.default || (mod as any).Chart;
			if (destroyed) return;
			const ctx = canvasEl!.getContext('2d');
			if (!ctx) return;
			chart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
					datasets: [{
						label: 'ACWR Load Spike',
						data: [0.8, 0.9, 0.85, 1.2, 1.5, 1.8, 1.1],
						borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)',
						borderWidth: 2, tension: 0.4, fill: true,
						pointBackgroundColor: '#f59e0b', pointRadius: 4, pointHoverRadius: 6
					}]
				},
				options: {
					responsive: true, maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
						tooltip: { backgroundColor: '#0f172a', titleColor: '#d4d4d8', bodyColor: '#fafafa', borderColor: '#334155', borderWidth: 1 }
					},
					scales: {
						x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a1a1aa', font: { family: 'monospace' } } },
						y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a1a1aa', font: { family: 'monospace' } } }
					}
				}
			});
		})();
		return () => { destroyed = true; chart?.destroy(); chart = null; };
	});

	// ─── SVG Radar chart geometry ─────────────────────────────────────────────────
	const RADAR_AXES = ['POW', 'AGI', 'ACC', 'PAC', 'STM', 'COMP'] as const;
	const CX = 120, CY = 120, R = 90;

	function radarPoint(idx: number, val: number, maxVal = 100) {
		const angle = (Math.PI * 2 * idx) / RADAR_AXES.length - Math.PI / 2;
		const r = (val / maxVal) * R;
		return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
	}

	function radarPolygon(attrs: Record<string, number>) {
		const vals = [attrs.pow, attrs.agi, attrs.acc, attrs.pac, attrs.stm, attrs.comp];
		return vals.map((v, i) => radarPoint(i, v)).map(p => `${p.x},${p.y}`).join(' ');
	}

	function radarLabel(idx: number) {
		const angle = (Math.PI * 2 * idx) / RADAR_AXES.length - Math.PI / 2;
		const r = R + 18;
		return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
	}

	function radarGrid(fraction: number) {
		return Array.from({ length: RADAR_AXES.length }, (_, i) => {
			const p = radarPoint(i, fraction * 100);
			return `${p.x},${p.y}`;
		}).join(' ');
	}

	function wellnessColor(score: number) {
		if (score >= 75) return '#14b8a6';
		if (score >= 50) return '#fbbf24';
		return '#ef4444';
	}
</script>

<svelte:head>
	<title>Daily Intel · Coach OS</title>
</svelte:head>

<!-- Viewport Lockdown -->
<div class="tw-h-[calc(100vh-theme(spacing.header))] tw-w-full tw-flex tw-flex-col tw-overflow-hidden tw-bg-[#020617] tw-text-[#fafafa]">

	<div class="tw-flex-1 tw-overflow-y-auto tw-scrollbar-hide tw-p-[clamp(16px,2vw,24px)] tw-flex tw-flex-col">

		<!-- Breadcrumb -->
		<header class="tw-py-3 tw-mb-4 tw-flex tw-justify-center tw-items-center">
			<div class="tw-text-xs tw-font-mono tw-tracking-widest tw-uppercase tw-text-[#d4d4d8]">
				COACH OS <span class="tw-text-[#a1a1aa] tw-mx-2">//</span>
				<span class="tw-text-[#14b8a6]">APEX COMMAND CENTER</span>
			</div>
		</header>

		{#if loading}
			<div class="tw-flex tw-items-center tw-justify-center tw-flex-1">
				<p class="tw-font-mono tw-text-[#14b8a6] tw-animate-pulse">VERIFYING HYDRATION LOCK...</p>
			</div>
		{:else}
			<main class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-12 tw-gap-[clamp(16px,2vw,24px)] tw-w-full tw-min-w-0">

				<!-- ═══ LEFT COLUMN  (8 cols) ═══ -->
				<div class="tw-col-span-1 lg:tw-col-span-8 tw-flex tw-flex-col tw-gap-[clamp(16px,2vw,24px)] tw-min-w-0">

					<!-- Squad Readiness Chart -->
					<section class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-6 tw-flex tw-flex-col tw-shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
						<h2 class="tw-font-sans tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-text-[#d4d4d8] tw-mb-5">SQUAD READINESS & ACWR</h2>
						<div style="width:100%; height:300px; flex-shrink:0; background:#020617; border:1px solid #334155; border-radius:12px; box-shadow:inset 0 2px 8px rgba(0,0,0,0.5); overflow:hidden;">
							<div style="position:relative; width:100%; height:100%; padding:16px; box-sizing:border-box;">
								<canvas bind:this={canvasEl} style="width:100% !important; height:100% !important;"></canvas>
							</div>
						</div>
						<button
							onclick={() => goto('/coach/forge')}
							class="tw-mt-5 tw-w-full tw-bg-gradient-to-b tw-from-[#fbbf24] tw-to-[#d97706] tw-text-black tw-font-mono tw-text-sm tw-font-bold tw-h-[44px] tw-px-6 tw-rounded-lg tw-flex tw-items-center tw-justify-center hover:tw-scale-[0.98] tw-shadow-[0_4px_14px_rgba(251,191,36,0.25)] hover:tw-shadow-[0_6px_20px_rgba(251,191,36,0.4)] tw-border tw-border-[#fcd34d] tw-tracking-widest tw-transition-all tw-duration-200"
						>[ DEPLOY ADJUSTED TRAINING INTENT ]</button>
					</section>

					<!-- SIEM Squad Matrix -->
					<section class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-6 tw-flex tw-flex-col tw-shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">

						<!-- Team ID Strip -->
						<div class="tw-mb-5 tw-p-4 tw-bg-[#020617] tw-rounded-xl tw-border tw-border-[#334155] tw-shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] tw-flex tw-items-center tw-justify-between">
							<div class="tw-flex tw-items-center tw-gap-3">
								<div class="tw-w-9 tw-h-9 tw-rounded-full tw-bg-[#14b8a6]/10 tw-flex tw-items-center tw-justify-center tw-border tw-border-[#14b8a6]/20 tw-shrink-0">
									<Icon name={"status.shield" as any} class="tw-text-[#14b8a6]" size={16} decorative={true} />
								</div>
								<div>
									<div class="tw-font-mono tw-text-[10px] tw-text-[#a1a1aa] tw-uppercase tw-tracking-widest">Team Registration Code</div>
									<div class="tw-font-mono tw-text-base tw-font-bold tw-text-[#14b8a6] tw-tracking-[0.2em]">{STATIC_TEAM_ID}</div>
								</div>
							</div>
							<button
								onclick={copyTeamId}
								style="background:linear-gradient(to bottom,#1e293b,#0f172a); border:1px solid #334155; color:{teamIdCopied ? '#14b8a6' : '#94a3b8'}; font-family:monospace; font-size:11px; font-weight:700; padding:8px 14px; border-radius:6px; cursor:pointer; transition:all 0.2s; letter-spacing:0.05em; white-space:nowrap;"
							>{teamIdCopied ? '✓ COPIED' : '[ COPY CODE ]'}</button>
						</div>

						<!-- Matrix Header -->
						<div class="tw-flex tw-justify-between tw-items-center tw-mb-4">
							<h2 class="tw-font-sans tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-text-[#d4d4d8]">SIEM SQUAD MATRIX</h2>
							<button
								onclick={() => showIngestionModal = true}
								style="background:linear-gradient(to bottom,#1e293b,#0f172a); border:1px solid #334155; color:#94a3b8; font-family:monospace; font-size:11px; font-weight:700; padding:6px 14px; border-radius:6px; cursor:pointer; transition:all 0.2s; letter-spacing:0.05em;"
							>[ IMPORT ROSTER ]</button>
						</div>

						<!-- Player table — row click = HUD modal -->
						<div class="tw-w-full tw-overflow-auto tw-scrollbar-hide tw-border tw-border-[#334155]/50 tw-rounded-lg tw-bg-[#020617]">
							<table class="tw-w-full tw-text-left tw-border-collapse">
								<thead>
									<tr class="tw-border-b tw-border-[#334155] tw-text-xs tw-font-mono tw-text-[#a1a1aa] tw-tracking-widest tw-uppercase">
										<th class="tw-p-4 tw-font-medium">Player</th>
										<th class="tw-p-4 tw-font-medium">Status</th>
										<th class="tw-p-4 tw-font-medium tw-text-right">POW</th>
										<th class="tw-p-4 tw-font-medium tw-text-right">AGI</th>
										<th class="tw-p-4 tw-font-medium tw-text-right">ACC</th>
										<th class="tw-p-4 tw-font-medium tw-text-right">PAC</th>
										<th class="tw-p-4 tw-font-medium tw-text-right">STM</th>
										<th class="tw-p-4 tw-font-medium tw-text-right">COMP</th>
										<th class="tw-p-4 tw-font-medium">Compliance</th>
										<th class="tw-p-4 tw-font-medium tw-text-center">Profile</th>
									</tr>
								</thead>
								<tbody class="tw-text-sm tw-font-mono tw-text-[#d4d4d8]">
									{#each activeSquad as player}
										<tr
											class="tw-border-b tw-border-[#334155]/50 tw-cursor-pointer hover:tw-bg-[#334155]/25 tw-transition-colors tw-duration-150 tw-group"
											onclick={() => openHUD(player)}
										>
											<td class="tw-p-4 tw-font-bold tw-text-[#fafafa]">
												<span class="tw-inline-flex tw-items-center tw-gap-2">
													<span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:#1e293b; border:1px solid #334155; font-size:9px; color:#a1a1aa; font-weight:700;">#{player.jersey}</span>
													{player.displayName}
												</span>
											</td>
											<td class="tw-p-4">
												{#if player.status === 'ACTIVE'}
													<span class="tw-inline-flex tw-px-2 tw-py-0.5 tw-rounded tw-text-[10px] tw-font-bold tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]/20">{player.status}</span>
												{:else}
													<span class="tw-inline-flex tw-px-2 tw-py-0.5 tw-rounded tw-text-[10px] tw-font-bold tw-bg-amber-500/10 tw-text-amber-400 tw-border tw-border-amber-500/20">{player.status}</span>
												{/if}
											</td>
											<td class="tw-p-4 tw-tabular-nums tw-text-right">{player.attributes?.pow ?? '—'}</td>
											<td class="tw-p-4 tw-tabular-nums tw-text-right">{player.attributes?.agi ?? '—'}</td>
											<td class="tw-p-4 tw-tabular-nums tw-text-right">{player.attributes?.acc ?? '—'}</td>
											<td class="tw-p-4 tw-tabular-nums tw-text-right">{player.attributes?.pac ?? '—'}</td>
											<td class="tw-p-4 tw-tabular-nums tw-text-right">{player.attributes?.stm ?? '—'}</td>
											<td class="tw-p-4 tw-tabular-nums tw-text-right">{player.attributes?.comp ?? '—'}</td>
											<td class="tw-p-4">
												{#if player.compliance === 'CLEARED' || player.compliance === 'SAFESPORT'}
													<span class="tw-inline-flex tw-px-2 tw-py-0.5 tw-rounded tw-text-[10px] tw-font-bold tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]/20">{player.compliance}</span>
												{:else}
													<span class="tw-inline-flex tw-px-2 tw-py-0.5 tw-rounded tw-text-[10px] tw-font-bold tw-bg-amber-500/10 tw-text-amber-400 tw-border tw-border-amber-500/20">{player.compliance}</span>
												{/if}
											</td>
											<!-- Secondary action: contact drawer -->
											<td class="tw-p-4 tw-text-center">
												<button
													onclick={(e) => { e.stopPropagation(); openContactDrawer(player); }}
													class="tw-opacity-0 group-hover:tw-opacity-100 tw-transition-opacity tw-duration-150 tw-p-1.5 tw-rounded tw-border tw-border-[#334155] tw-bg-[#1e293b] hover:tw-bg-[#334155] hover:tw-border-[#475569]"
													title="Open contact profile"
												>
													<Icon name={"action.user" as any} class="tw-text-[#64748b] hover:tw-text-[#94a3b8]" size={12} decorative={true} />
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</section>
				</div>

				<!-- ═══ RIGHT COLUMN  (4 cols) ═══ -->
				<div class="tw-col-span-1 lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-[clamp(16px,2vw,24px)] tw-min-w-0">

					<!-- 1. Ares Protocol Radar -->
					<section class="tw-bg-[#0f172a] tw-rounded-2xl tw-p-5 tw-flex tw-flex-col tw-transition-all tw-duration-300 {weatherData.strikeRisk === 'CRITICAL' ? 'tw-border tw-border-[#e11d48] tw-shadow-[0_0_20px_rgba(225,29,72,0.2)]' : weatherData.strikeRisk === 'ELEVATED' ? 'tw-border tw-border-[#f59e0b] tw-shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'tw-border tw-border-[#334155] tw-shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]'}">
						<div class="tw-flex tw-justify-between tw-items-center tw-mb-4">
							<h2 class="tw-font-sans tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-text-[#d4d4d8]">ARES PROTOCOL RADAR</h2>
							<div style="background:#020617; border:1px solid #334155; border-radius:999px; padding:3px; display:flex; gap:2px; box-shadow:inset 0 1px 3px rgba(0,0,0,0.6);">
								{#each ['LIVE', '7D', '10D'] as view}
									<button
										onclick={() => weatherView = view}
										style="padding:4px 10px; border-radius:999px; font-family:monospace; font-size:10px; font-weight:700; letter-spacing:0.05em; cursor:pointer; transition:all 0.15s; border:none; outline:none; {weatherView === view ? 'background:linear-gradient(to bottom,#475569,#1e293b); color:#fafafa; box-shadow:0 1px 4px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.08);' : 'background:transparent; color:#64748b;'}"
									>{view}</button>
								{/each}
							</div>
						</div>
						<div class="tw-grid tw-grid-cols-2 tw-gap-3 tw-mb-4">
							<div><div class="tw-font-mono tw-text-[10px] tw-text-[#a1a1aa] tw-uppercase tw-tracking-widest">Temp</div><div class="tw-font-mono tw-text-base tw-font-bold tw-text-[#fafafa]">{weatherData.temp}</div></div>
							<div><div class="tw-font-mono tw-text-[10px] tw-text-[#a1a1aa] tw-uppercase tw-tracking-widest">Wind</div><div class="tw-font-mono tw-text-base tw-font-bold tw-text-[#fafafa]">{weatherData.wind}</div></div>
							<div><div class="tw-font-mono tw-text-[10px] tw-text-[#a1a1aa] tw-uppercase tw-tracking-widest">Humidity</div><div class="tw-font-mono tw-text-base tw-font-bold tw-text-[#fafafa]">{weatherData.humidity}</div></div>
							<div><div class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-uppercase tw-tracking-widest">Strike Risk</div><div class="tw-font-mono tw-text-base tw-font-bold {weatherData.strikeRisk === 'CRITICAL' ? 'tw-text-[#e11d48] tw-animate-pulse' : weatherData.strikeRisk === 'ELEVATED' ? 'tw-text-[#f59e0b] tw-animate-pulse' : 'tw-text-[#14b8a6]'}">{weatherData.strikeRisk}</div></div>
						</div>
						<div class="tw-bg-[#020617] tw-rounded-xl tw-border tw-border-[#334155] tw-shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] tw-overflow-hidden tw-flex tw-items-center tw-justify-center" style="min-height:140px; position:relative;">
							{#if weatherView === 'LIVE'}
								<div style="position:absolute; inset:0; background-image:linear-gradient(rgba(20,184,166,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,0.07) 1px,transparent 1px); background-size:20px 20px;"></div>
								<div class="tw-relative tw-z-10 tw-text-center tw-p-4">
									<p class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-mb-1 tw-tracking-widest">TOMORROW.IO LINKAGE</p>
									<p class="tw-font-mono tw-text-xs tw-text-[#d4d4d8]">AWAITING LIGHTNING PROXIMITY PAYLOAD</p>
								</div>
							{:else}
								<div class="tw-flex tw-flex-row tw-gap-2 tw-p-3 tw-overflow-x-auto tw-scrollbar-hide tw-w-full">
									{#each (weatherView === '7D' ? [1,2,3,4,5,6,7] : [1,2,3,4,5,6,7,8,9,10]) as day}
										<div style="flex-shrink:0; display:flex; flex-direction:column; align-items:center; padding:10px 8px; background:#0f172a; border:1px solid #334155; border-radius:8px; min-width:56px;">
											<span style="font-family:monospace; font-size:9px; color:#64748b; margin-bottom:4px;">D{day}</span>
											<span style="font-family:monospace; font-size:13px; font-weight:700; color:#fafafa;">7{day}°</span>
											<span style="font-family:monospace; font-size:9px; color:#14b8a6; margin-top:2px;">0%</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
						{#if weatherData.strikeRisk === 'ELEVATED'}
							<div class="tw-mt-3 tw-p-2 tw-bg-[#f59e0b]/10 tw-border tw-border-[#f59e0b]/30 tw-rounded-lg tw-text-center">
								<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#f59e0b]">[ STORM PROXIMITY ALERT ]</span>
							</div>
						{:else if weatherData.strikeRisk === 'CRITICAL'}
							<div class="tw-mt-3 tw-p-2 tw-bg-[#e11d48]/10 tw-border tw-border-[#e11d48]/50 tw-rounded-lg tw-text-center">
								<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#e11d48] tw-animate-pulse">[ SHELTER SEEKING PROTOCOL INITIATED ]</span>
							</div>
						{/if}
					</section>

					<!-- 2. UPCOMING OPS (new) -->
					<section class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-5 tw-flex tw-flex-col tw-shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
						<div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
							<h2 class="tw-font-sans tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-text-[#d4d4d8]">FIELD OPS SCHEDULE</h2>
							<button
								onclick={() => goto('/coach/field-station')}
								class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] hover:tw-text-[#5eead4] tw-transition-colors tw-tracking-widest"
							>VIEW ALL →</button>
						</div>
						<div class="tw-flex tw-flex-col tw-gap-2">
							{#each upcomingEvents as ev}
								<div class="tw-flex tw-items-start tw-gap-3 tw-p-3 tw-bg-[#020617] tw-rounded-xl tw-border {ev.type === 'MATCH' ? 'tw-border-[#fbbf24]/30' : 'tw-border-[#334155]'} hover:tw-border-[#475569] tw-transition-colors tw-cursor-pointer tw-group">
									<!-- Type badge -->
									<div style="flex-shrink:0; width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; {ev.type === 'MATCH' ? 'background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.25);' : 'background:rgba(20,184,166,0.08); border:1px solid rgba(20,184,166,0.2);'}">
										<span style="font-family:monospace; font-size:8px; font-weight:700; letter-spacing:0.05em; {ev.type === 'MATCH' ? 'color:#fbbf24;' : 'color:#14b8a6;'}">{ev.type === 'MATCH' ? '⚽' : '📋'}</span>
									</div>
									<div class="tw-flex-1 tw-min-w-0">
										<div class="tw-flex tw-items-center tw-justify-between tw-mb-0.5">
											<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#fafafa] tw-truncate">{ev.label}</span>
											<span class="tw-font-mono tw-text-[9px] tw-font-bold tw-ml-2 tw-shrink-0 {ev.status === 'CONFIRMED' ? 'tw-text-[#14b8a6]' : ev.status === 'PENDING' ? 'tw-text-[#f59e0b]' : 'tw-text-[#64748b]'}">{ev.status}</span>
										</div>
										<div class="tw-font-mono tw-text-[10px] tw-text-[#a1a1aa]">{ev.date} · {ev.time}</div>
										<div class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-truncate">{ev.venue}</div>
									</div>
								</div>
							{/each}
						</div>
					</section>

					<!-- 3. Homework Intel -->
					<section class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-5 tw-flex tw-flex-col tw-shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
						<div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
							<h2 class="tw-font-sans tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-text-[#d4d4d8]">HOMEWORK INTEL</h2>
							<span class="tw-font-mono tw-text-[10px] tw-text-[#a1a1aa]">TODAY</span>
						</div>
						<div class="tw-flex tw-flex-col tw-gap-2">
							{#each activeSquad as player}
								{@const hw = player.homework}
								{@const pct = hw ? Math.round((hw.completed / hw.assigned) * 100) : 0}
								<div class="tw-bg-[#020617] tw-rounded-lg tw-border tw-border-[#334155]/70 tw-p-3 tw-flex tw-items-center tw-gap-3">
									<div style="width:26px; height:26px; border-radius:50%; background:#1e293b; border:1px solid #334155; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-family:monospace; font-size:9px; font-weight:700; color:#94a3b8;">#{player.jersey}</div>
									<div class="tw-flex-1 tw-min-w-0">
										<div class="tw-flex tw-justify-between tw-items-center tw-mb-1">
											<span class="tw-font-mono tw-text-xs tw-font-bold tw-text-[#d4d4d8] tw-truncate">{player.displayName}</span>
											<span class="tw-font-mono tw-text-[10px] tw-text-[#a1a1aa] tw-ml-2 tw-shrink-0">{hw?.completed ?? 0}/{hw?.assigned ?? 0}</span>
										</div>
										<div class="tw-w-full tw-bg-[#1e293b] tw-rounded-full" style="height:3px;">
											<div class="tw-rounded-full {pct === 100 ? 'tw-bg-[#14b8a6]' : pct > 50 ? 'tw-bg-[#fbbf24]' : 'tw-bg-[#ef4444]'}" style="height:3px; width:{pct}%; transition:width 0.4s ease;"></div>
										</div>
									</div>
									{#if hw && hw.videosSubmitted > 0}
										<div style="flex-shrink:0; background:rgba(20,184,166,0.1); border:1px solid rgba(20,184,166,0.25); border-radius:4px; padding:2px 6px; display:flex; align-items:center; gap:3px;">
											<span style="font-family:monospace; font-size:9px; font-weight:700; color:#14b8a6;">▶ {hw.videosSubmitted}</span>
										</div>
									{:else}
										<span style="flex-shrink:0; font-family:monospace; font-size:9px; color:#374151;">NO VIDEO</span>
									{/if}
								</div>
							{/each}
						</div>
						<div class="tw-mt-3 tw-pt-3 tw-border-t tw-border-[#334155]/50 tw-flex tw-justify-between">
							<span class="tw-font-mono tw-text-[10px] tw-text-[#a1a1aa]">
								{activeSquad.filter(p => p.homework?.completed === p.homework?.assigned).length}/{activeSquad.length} COMPLETE
							</span>
							<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6]">
								{activeSquad.reduce((s, p) => s + (p.homework?.videosSubmitted ?? 0), 0)} VIDEOS
							</span>
						</div>
					</section>

				</div>
			</main>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════════════════════ -->
	<!-- PLAYER HUD MODAL — gaming-style stats overlay                              -->
	<!-- ═══════════════════════════════════════════════════════════════════════════ -->
	{#if hudPlayer}
		<!-- Backdrop -->
		<div
			class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/75 tw-backdrop-blur-sm tw-p-4"
			onclick={closeHUD}
			role="dialog"
			aria-modal="true"
			aria-label="Player Stats HUD"
		>
			<!-- Modal panel — stop propagation so clicks inside don't close -->
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="tw-relative tw-w-full tw-max-w-2xl tw-bg-[#0a1628] tw-border tw-border-[#1e3a5f] tw-rounded-3xl tw-overflow-hidden tw-shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_0_1px_rgba(20,184,166,0.12),0_0_40px_rgba(20,184,166,0.05)]"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Scanline overlay for HUD feel -->
				<div style="position:absolute; inset:0; background:repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px); pointer-events:none; z-index:0; border-radius:inherit;"></div>
				<!-- Top accent bar -->
				<div style="position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg, transparent 0%, #14b8a6 30%, #fbbf24 70%, transparent 100%); z-index:1;"></div>

				<div class="tw-relative tw-z-10 tw-p-6">

					<!-- Header row -->
					<div class="tw-flex tw-items-start tw-justify-between tw-mb-5">
						<div class="tw-flex tw-items-center tw-gap-4">
							<!-- Jersey circle avatar -->
							<div style="width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg,#0f172a,#1e293b); border:2px solid #14b8a6; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px rgba(20,184,166,0.3); flex-shrink:0;">
								<span style="font-family:monospace; font-size:16px; font-weight:900; color:#14b8a6;">#{hudPlayer.jersey}</span>
							</div>
							<div>
								<div class="tw-font-sans tw-text-lg tw-font-bold tw-text-[#fafafa] tw-tracking-tight">{hudPlayer.displayName}</div>
								<div class="tw-flex tw-items-center tw-gap-2 tw-mt-0.5">
									<span class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6] tw-tracking-widest">{hudPlayer.position}</span>
									<span class="tw-text-[#334155]">·</span>
									<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b]">{hudPlayer.ageGroup}</span>
									<span class="tw-text-[#334155]">·</span>
									{#if hudPlayer.status === 'ACTIVE'}
										<span class="tw-inline-flex tw-px-2 tw-py-0.5 tw-rounded tw-text-[10px] tw-font-bold tw-bg-[#14b8a6]/10 tw-text-[#14b8a6] tw-border tw-border-[#14b8a6]/20">ACTIVE</span>
									{:else}
										<span class="tw-inline-flex tw-px-2 tw-py-0.5 tw-rounded tw-text-[10px] tw-font-bold tw-bg-amber-500/10 tw-text-amber-400 tw-border tw-border-amber-500/20">{hudPlayer.status}</span>
									{/if}
								</div>
							</div>
						</div>
						<button
							onclick={closeHUD}
							style="background:rgba(30,41,59,0.8); border:1px solid #334155; color:#64748b; padding:6px; border-radius:8px; cursor:pointer; transition:all 0.15s; line-height:1; flex-shrink:0;"
							aria-label="Close"
						>
							<Icon name="sys.close" size={16} decorative={true} />
						</button>
					</div>

					<!-- Tab Rail -->
					<div class="tw-flex tw-border-b tw-border-[#1e293b] tw-mb-4">
						<button
							onclick={(e) => { e.stopPropagation(); hudActiveTab = 'STATS'; }}
							class="tw-flex-1 tw-py-2 tw-text-center tw-font-sans tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-transition-colors"
							style="border-bottom: 2px solid {hudActiveTab === 'STATS' ? '#14b8a6' : 'transparent'}; color: {hudActiveTab === 'STATS' ? '#14b8a6' : '#64748b'};"
						>STATS</button>
						<button
							onclick={(e) => { e.stopPropagation(); hudActiveTab = 'CONTACT'; }}
							class="tw-flex-1 tw-py-2 tw-text-center tw-font-sans tw-text-xs tw-font-bold tw-tracking-widest tw-uppercase tw-transition-colors"
							style="border-bottom: 2px solid {hudActiveTab === 'CONTACT' ? '#14b8a6' : 'transparent'}; color: {hudActiveTab === 'CONTACT' ? '#14b8a6' : '#64748b'};"
						>CONTACT INFO</button>
					</div>

					{#if hudActiveTab === 'STATS'}
						<!-- Body: Radar + Stat bars side by side -->
						<div class="tw-grid tw-grid-cols-2 tw-gap-4 tw-mb-4">

							<!-- LEFT: SVG Radar chart -->
							<div class="tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-p-3">
								{#if hudPlayer.attributes}
									<svg width="240" height="240" viewBox="0 0 240 240" style="display:block;">
										<!-- Grid rings -->
										{#each [0.25, 0.5, 0.75, 1.0] as fraction}
											<polygon
												points={radarGrid(fraction)}
												fill="none"
												stroke="rgba(51,65,85,0.8)"
												style="stroke-width: 1px;"
											/>
										{/each}
										{#each RADAR_AXES as _, i}
											{@const outer = radarPoint(i, 100)}
											<line x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke="rgba(51,65,85,0.5)" style="stroke-width: 1px;" />
										{/each}
										<!-- Player stats polygon -->
										<polygon
											points={radarPolygon(hudPlayer.attributes)}
											fill="rgba(20,184,166,0.15)"
											stroke="#14b8a6"
											style="stroke-width: 2px;"
										/>
										<!-- Data points -->
										{#each RADAR_AXES as axis, i}
											{@const val = hudPlayer.attributes ? Object.values(hudPlayer.attributes)[i] : 0}
											{@const pt = radarPoint(i, val as number)}
											<circle cx={pt.x} cy={pt.y} r="4" fill="#14b8a6" stroke="#0a1628" style="stroke-width: 2px;" />
										{/each}
										<!-- Axis labels -->
										{#each RADAR_AXES as axis, i}
											{@const lbl = radarLabel(i)}
											<text
												x={lbl.x} y={lbl.y}
												text-anchor="middle" dominant-baseline="middle"
												font-family="monospace" font-size="9" font-weight="700"
												fill="#94a3b8" letter-spacing="1"
											>{axis}</text>
										{/each}
										<!-- Center dot -->
										<circle cx={CX} cy={CY} r="3" fill="#1e293b" stroke="#334155" style="stroke-width: 1px;" />
									</svg>
								{/if}
							</div>

							<!-- RIGHT: Individual stat bars + wellness -->
							<div class="tw-flex tw-flex-col tw-gap-2 tw-justify-center">
								{#if hudPlayer.attributes}
									{#each [['POW', hudPlayer.attributes.pow, '#ef4444'], ['AGI', hudPlayer.attributes.agi, '#14b8a6'], ['ACC', hudPlayer.attributes.acc, '#fbbf24'], ['PAC', hudPlayer.attributes.pac, '#8b5cf6'], ['STM', hudPlayer.attributes.stm, '#10b981'], ['COMP', hudPlayer.attributes.comp, '#f59e0b']] as [label, val, color]}
										<div>
											<div class="tw-flex tw-justify-between tw-items-center tw-mb-1">
												<span style="font-family:monospace; font-size:9px; font-weight:700; letter-spacing:0.1em; color:#64748b;">{label}</span>
												<span style="font-family:monospace; font-size:11px; font-weight:700; color:#fafafa;">{val}</span>
											</div>
											<div style="width:100%; background:#1e293b; border-radius:999px; height:5px; overflow:hidden;">
												<div style="width:{val}%; height:5px; border-radius:999px; background:{color}; box-shadow:0 0 6px {color}40; transition:width 0.5s ease;"></div>
											</div>
										</div>
									{/each}
								{/if}

								<!-- Wellness score -->
								<div class="tw-mt-1 tw-pt-2 tw-border-t tw-border-[#1e293b]">
									<div class="tw-flex tw-justify-between tw-items-center tw-mb-1">
										<span style="font-family:monospace; font-size:9px; font-weight:700; letter-spacing:0.1em; color:#64748b;">WELLNESS</span>
										<span style="font-family:monospace; font-size:11px; font-weight:700; color:{wellnessColor(hudPlayer.wellnessScore)};">{hudPlayer.wellnessScore}</span>
									</div>
									<div style="width:100%; background:#1e293b; border-radius:999px; height:5px; overflow:hidden;">
										<div style="width:{hudPlayer.wellnessScore}%; height:5px; border-radius:999px; background:{wellnessColor(hudPlayer.wellnessScore)}; box-shadow:0 0 6px {wellnessColor(hudPlayer.wellnessScore)}50; transition:width 0.5s ease;"></div>
									</div>
								</div>
							</div>
						</div>

						<!-- Homework + Compliance strip -->
						{#if hudPlayer.homework}
							{@const hw = hudPlayer.homework}
							{@const hwPct = Math.round((hw.completed / hw.assigned) * 100)}
							<div class="tw-grid tw-grid-cols-3 tw-gap-3 tw-mb-5">
								<div class="tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-rounded-xl tw-p-3 tw-text-center">
									<div class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-tracking-widest tw-mb-1">HOMEWORK</div>
									<div class="tw-font-mono tw-text-sm tw-font-bold tw-text-[#fafafa]">{hw.completed}/{hw.assigned}</div>
									<div class="tw-font-mono tw-text-[10px] {hwPct === 100 ? 'tw-text-[#14b8a6]' : hwPct > 50 ? 'tw-text-[#fbbf24]' : 'tw-text-[#ef4444]'}">{hwPct}%</div>
								</div>
								<div class="tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-rounded-xl tw-p-3 tw-text-center">
									<div class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-tracking-widest tw-mb-1">VIDEOS</div>
									<div class="tw-font-mono tw-text-sm tw-font-bold tw-text-[#fafafa]">{hw.videosSubmitted}</div>
									<div class="tw-font-mono tw-text-[10px] tw-text-[#14b8a6]">SUBMITTED</div>
								</div>
								<div class="tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-rounded-xl tw-p-3 tw-text-center">
									<div class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-tracking-widest tw-mb-1">COMPLIANCE</div>
									<div class="tw-font-mono tw-text-xs tw-font-bold {hudPlayer.compliance === 'CLEARED' || hudPlayer.compliance === 'SAFESPORT' ? 'tw-text-[#14b8a6]' : 'tw-text-[#f59e0b]'}">{hudPlayer.compliance}</div>
								</div>
							</div>
						{/if}
					{:else}
						<!-- CONTACT INFO TAB -->
						<div class="tw-flex tw-flex-col tw-gap-3 tw-mb-5 tw-bg-[#020617] tw-border tw-border-[#1e293b] tw-rounded-2xl tw-p-5">
							<div class="tw-flex tw-flex-col tw-gap-1 tw-pb-3 tw-border-b tw-border-[#1e293b]">
								<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-tracking-widest">EMAIL ADDRESS</span>
								<span class="tw-font-mono tw-text-sm tw-font-bold tw-text-[#fafafa]">{hudPlayer.playerEmail}</span>
							</div>
							<div class="tw-flex tw-flex-col tw-gap-1 tw-pb-3 tw-border-b tw-border-[#1e293b]">
								<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-tracking-widest">FULL NAME</span>
								<span class="tw-font-mono tw-text-sm tw-font-bold tw-text-[#fafafa]">{hudPlayer.name}</span>
							</div>
							<div class="tw-flex tw-gap-6 tw-pt-1">
								<div class="tw-flex tw-flex-col tw-gap-1">
									<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-tracking-widest">JERSEY</span>
									<span class="tw-font-mono tw-text-sm tw-font-bold tw-text-[#fafafa]">#{hudPlayer.jersey}</span>
								</div>
								<div class="tw-flex tw-flex-col tw-gap-1">
									<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-tracking-widest">POSITION</span>
									<span class="tw-font-mono tw-text-sm tw-font-bold tw-text-[#fafafa]">{hudPlayer.position}</span>
								</div>
								<div class="tw-flex tw-flex-col tw-gap-1">
									<span class="tw-font-mono tw-text-[10px] tw-text-[#64748b] tw-tracking-widest">AGE GROUP</span>
									<span class="tw-font-mono tw-text-sm tw-font-bold tw-text-[#fafafa]">{hudPlayer.ageGroup}</span>
								</div>
							</div>
						</div>
					{/if}

					<!-- Footer actions -->
					<div class="tw-flex tw-gap-3">
						<button
							onclick={(e) => { e.stopPropagation(); const p = hudPlayer; closeHUD(); if(p) goto(`/coach/logistics?tab=roster`); }}
							style="flex:1; background:linear-gradient(to bottom,#1e293b,#0f172a); border:1px solid #334155; color:#94a3b8; font-family:monospace; font-size:11px; font-weight:700; padding:10px; border-radius:8px; cursor:pointer; transition:all 0.15s; letter-spacing:0.05em; text-align:center;"
						>EDIT IN TEAM OPS →</button>
						<button
							onclick={(e) => { e.stopPropagation(); const p = hudPlayer; closeHUD(); if(p) goto(`/coach/forge?assignPlayer=${p.id}`); }}
							style="flex:1; background:linear-gradient(to bottom,#fbbf24,#d97706); border:1px solid #fcd34d; color:#000; font-family:monospace; font-size:11px; font-weight:700; padding:10px; border-radius:8px; cursor:pointer; transition:all 0.15s; letter-spacing:0.05em; text-align:center;"
						>ASSIGN TRAINING DRILL →</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- ═══ Roster Ingestion Modal ═══ -->
	{#if showIngestionModal}
		<div class="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/70 tw-backdrop-blur-sm tw-p-6">
			<div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-6 tw-w-full tw-max-w-lg tw-shadow-[0_10px_40px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.05)] tw-flex tw-flex-col">
				<div class="tw-flex tw-justify-between tw-items-center tw-mb-5">
					<h2 class="tw-font-sans tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-text-[#fafafa]">IMPORT ROSTER</h2>
					<button
						onclick={() => showIngestionModal = false}
						style="background:transparent; border:none; color:#64748b; cursor:pointer; padding:4px; border-radius:4px; transition:color 0.15s; line-height:1;"
						aria-label="Close"
					><Icon name="sys.close" size={18} decorative={true} /></button>
				</div>
				<input type="file" id="roster-upload" accept=".csv,.pdf" class="tw-hidden" />
				<label for="roster-upload" class="tw-bg-[#020617] tw-rounded-xl tw-border tw-border-dashed tw-border-[#334155] tw-p-8 tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center hover:tw-border-[#14b8a6] hover:tw-bg-[#0d1729] tw-transition-all tw-cursor-pointer tw-group">
					<div class="tw-w-14 tw-h-14 tw-rounded-full tw-bg-[#14b8a6]/10 tw-flex tw-items-center tw-justify-center tw-mb-4 group-hover:tw-scale-110 tw-transition-transform tw-border tw-border-[#14b8a6]/20">
						<Icon name={"env.file-upload" as any} class="tw-text-[#14b8a6]" size={22} decorative={true} />
					</div>
					<p class="tw-font-mono tw-text-sm tw-font-bold tw-text-[#fafafa] tw-mb-1">SECURE ROSTER DROPZONE</p>
					<p class="tw-font-mono tw-text-xs tw-text-[#64748b]">Drag & drop or <span class="tw-text-[#14b8a6]">click to browse</span> — CSV or PDF</p>
				</label>
				<div class="tw-mt-5 tw-flex tw-justify-end tw-gap-3">
					<button
						onclick={() => showIngestionModal = false}
						style="background:#1e293b; border:1px solid #475569; color:#cbd5e1; font-family:monospace; font-size:11px; font-weight:700; padding:9px 18px; border-radius:7px; cursor:pointer; transition:all 0.15s; letter-spacing:0.05em;"
					>CANCEL</button>
					<button
						onclick={() => showIngestionModal = false}
						style="background:linear-gradient(to bottom,#14b8a6,#0d9488); border:1px solid #0d9488; color:#000; font-family:monospace; font-size:11px; font-weight:700; padding:9px 18px; border-radius:7px; cursor:pointer; transition:all 0.15s; letter-spacing:0.05em;"
					>[ COMMIT ROSTER TO FIRESTORE ]</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- ═══ Lightning Alert ═══ -->
	{#if showLightningAlert}
		<div class="tw-fixed tw-bottom-6 tw-right-6 tw-z-[9999] tw-max-w-sm">
			<div style="background:#0f172a; border:1px solid #e11d48; border-radius:12px; box-shadow:0 0 24px rgba(225,29,72,0.3); padding:14px 16px; display:flex; align-items:flex-start; gap:12px;">
				<div style="width:36px; height:36px; border-radius:50%; background:rgba(225,29,72,0.15); border:1px solid rgba(225,29,72,0.4); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
					<Icon name={"status.warning" as any} class="tw-text-[#e11d48]" size={18} decorative={true} />
				</div>
				<div style="flex:1;">
					<div style="font-family:monospace; font-size:11px; color:#e11d48; font-weight:700; letter-spacing:0.08em; margin-bottom:4px;">ARES PROTOCOL BREACH</div>
					<div style="font-family:monospace; font-size:10px; color:#d4d4d8; line-height:1.5;">LIGHTNING PROXIMITY CRITICAL (3.2 MI). INITIATE IMMEDIATE SQUAD EVACUATION.</div>
				</div>
				<button
					onclick={() => showLightningAlert = false}
					style="background:none; border:none; color:#64748b; cursor:pointer; padding:0; flex-shrink:0; line-height:1;"
					aria-label="Close alert"
				><Icon name="sys.close" size={16} decorative={true} /></button>
			</div>
		</div>
	{/if}
</div>
