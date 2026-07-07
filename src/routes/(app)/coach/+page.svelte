<script lang="ts">
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import WeatherHub from '$lib/components/coach/WeatherHub.svelte';
	import SquadMatrix from '$lib/components/coach/SquadMatrix.svelte';
	import WarRoomGrid from '$lib/components/coach/WarRoomGrid.svelte';
	import CheckrEmbed from '$lib/components/compliance/CheckrEmbed.svelte';
	import { deriveCoachClearanceStep } from '$lib/compliance/checkrCoachClearance.js';

	const role = $derived(authStore.role);

	// Epic 14: Clearance Protocol — gate the whole Coach OS behind BGC clearance.
	const clearanceRequired = $derived(role === 'coach' || role === 'recruiter');
	const isCleared = $derived(authStore.isCleared);
	const userEmail = $derived((authStore.user?.email || '').trim());

	const clearanceStep = $derived(
		deriveCoachClearanceStep(
			/** @type {import('$lib/types/backgroundCheck.js').ClearanceDoc|undefined} */ (
				authStore.userProfile?.clearance
			)
		)
	);
	
	const clearanceContext = $derived({
		uid: authStore.user?.uid || '',
		email: userEmail,
		getSessionTokenHeaders: async () => {
			const token = await authStore.user?.getIdToken();
			return { Authorization: `Bearer ${token}` };
		}
	});

	const myTeams = $derived.by(() => {
		if (!teamsStore.loaded) return [];
		if (role === 'super_admin' || role === 'global_admin') return teamsStore.teams.slice();
		if (!userEmail) return [];
		return teamsStore.getCoachTeams(userEmail);
	});

	const effectiveTeamId = $derived.by(() => {
		const pivot = workspaceContextStore.activeTeamId?.trim();
		if (pivot && myTeams.some((t) => t.id === pivot)) return pivot;
		return myTeams[0]?.id ?? '';
	});

	const activeTeamRow = $derived(myTeams.find((t) => t.id === effectiveTeamId) ?? null);
	const activeClubId = $derived(typeof activeTeamRow?.clubId === 'string' ? activeTeamRow.clubId : '');

	const clubNameDisplay = $derived.by(() => {
		if (!activeClubId) return 'YOUR CLUB';
		const n = teamsStore.clubs.find((c) => c.id === activeClubId)?.name;
		return typeof n === 'string' && n.trim() ? n.trim().toUpperCase() : 'YOUR CLUB';
	});

	const teamNameDisplay = $derived(
		typeof activeTeamRow?.name === 'string' && activeTeamRow.name.trim()
			? activeTeamRow.name.trim().toUpperCase()
			: 'SELECT TEAM',
	);

	const nexusBadgeLetter = $derived((clubNameDisplay.slice(0, 1) || 'A').toUpperCase());

	const fieldLat = $derived(activeTeamRow?.fieldLat ?? 41.633);
	const fieldLng = $derived(activeTeamRow?.fieldLng ?? -111.851);
	const weatherCoords = $derived(
		`LAT ${Math.abs(fieldLat).toFixed(3)}° ${fieldLat >= 0 ? 'N' : 'S'}  ·  LON ${Math.abs(fieldLng).toFixed(3)}° ${fieldLng >= 0 ? 'E' : 'W'}`,
	);

	let tickerNow = $state('--:--:--');
	$effect(() => {
		if (!browser) return;
		const tick = () => {
			const d = new Date();
			tickerNow = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});
</script>

<svelte:head>
	<title>Nexus Command · Coach OS</title>
</svelte:head>

<!-- ── Epic 14: Clearance Protocol — locked dashboard state ───────────────── -->
{#if clearanceRequired && !isCleared && !authStore.isLoading}
	<div class="clearance-gate" aria-live="assertive" role="alert">
		<!-- Ambient threat grid -->
		<div class="clearance-gate__grid" aria-hidden="true"></div>

		<!-- Pulsing shield icon -->
		<div class="clearance-gate__shield" aria-hidden="true">
			<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<path
					d="M32 4L8 14v18c0 14 10.5 25.5 24 28 13.5-2.5 24-14 24-28V14L32 4Z"
					stroke="var(--vanguard-red)"
					stroke-width="2.5"
					fill="rgba(255,0,60,0.08)"
				/>
				<line x1="32" y1="22" x2="32" y2="36" stroke="var(--vanguard-red)" stroke-width="3" stroke-linecap="round"/>
				<circle cx="32" cy="43" r="2.5" fill="var(--vanguard-red)"/>
			</svg>
		</div>

		<!-- Status text -->
		<div class="clearance-gate__status">CLEARANCE {clearanceStep.replace('_', ' ').toUpperCase()}</div>
		<h1 class="clearance-gate__title">ACCESS RESTRICTED</h1>
		
		<div class="tw-w-full tw-max-w-2xl tw-mx-auto tw-mt-8">
			{#if clearanceStep === 'not_started'}
				<CheckrEmbed context={clearanceContext} mode="invitation" />
			{:else}
				<CheckrEmbed context={clearanceContext} mode="reports" />
			{/if}
		</div>

		<!-- Diagnostic strip -->
		<div class="clearance-gate__diag tw-mt-8">
			<span>UID: {authStore.user?.uid?.slice(0, 12) ?? '—'}…</span>
			<span>CLUB: {authStore.tenantId || '—'}</span>
			<span>STATUS: BGC PENDING</span>
		</div>

		<!-- Contact CTA -->
		<a
			href="mailto:compliance@vanguard.app?subject=BGC%20Clearance%20Inquiry&body=UID%3A%20{authStore.user?.uid ?? ''}"
			class="clearance-gate__contact"
		>
			[ CONTACT COMPLIANCE OFFICER ]
		</a>
	</div>
{:else}

<!-- Vanguard root: deep void background, native page scrolling, no overflow traps. -->
<div class="coach-nexus-canvas tw-relative tw-flex tw-flex-col tw-h-[100dvh] tw-w-full tw-text-slate-200">
	<!-- Background ambient grid -->
	<div
		class="tw-pointer-events-none tw-fixed tw-inset-0 tw-z-0 tw-opacity-[0.08]"
		style="background-image: linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px); background-size: 44px 44px;"
		aria-hidden="true"
	></div>

	<!-- ── NEXUS COMMAND BANNER ─────────────────────────────────────────────── -->
	<header
		class="coach-os-z4-header nexus-banner tw-relative tw-z-10 tw-w-full tw-overflow-visible tw-rounded-t-none"
		aria-label="Nexus Command"
	>
		<div class="nexus-banner__media" aria-hidden="true">
			<div class="nexus-banner__grid"></div>
			<div class="nexus-banner__glow nexus-banner__glow--a"></div>
			<div class="nexus-banner__glow nexus-banner__glow--b"></div>
			<div class="nexus-banner__scanline"></div>
		</div>
		<div
			class="coach-os-z4-strip vanguard-surface tw-absolute tw-inset-x-4 tw-bottom-4 tw-z-20 tw-flex tw-flex-wrap tw-items-end bento-gap-md tw-px-5 tw-py-4 md:tw-inset-x-8 md:tw-bottom-6"
		>
			<div
				class="coach-os-badge tw-relative tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center md:tw-h-14 md:tw-w-14"
			>
				<span class="tw-font-mono tw-text-2xl tw-font-black tw-tracking-widest md:tw-text-3xl">{nexusBadgeLetter}</span>
			</div>
			<div class="tw-min-w-0 tw-flex-1">
				<h1 class="tw-m-0 tw-font-mono tw-text-lg tw-font-black tw-uppercase tw-tracking-[0.18em] tw-text-white md:tw-text-xl">
					Nexus Command
				</h1>
				<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-[0.22em] tw-text-[#14b8a6]/85 tw-uppercase">
					{clubNameDisplay} <span class="tw-text-slate-600">//</span> {teamNameDisplay}
				</p>
			</div>
			<div class="tw-flex tw-shrink-0 tw-flex-col tw-items-end tw-gap-1 tw-font-mono coach-os-uplink">
				<span class="tw-text-[9px] tw-font-semibold tw-uppercase tw-tracking-[0.05em] tw-text-[var(--text-muted)]">UPLINK</span>
				<span class="coach-os-uplink tw-text-2xl tw-font-black tw-tabular-nums">{tickerNow}</span>
			</div>
		</div>
	</header>

	<!-- ── BODY — 12-col asymmetric bento ───────────────────────────────────── -->
	<main
		class="coach-nexus-main tw-relative tw-z-10 tw-mx-auto tw-box-border tw-w-full tw-max-w-7xl tw-flex-1 tw-min-h-0 tw-overflow-y-auto"
		style="padding: var(--bento-pad-liquid); padding-bottom: calc(var(--bento-pad-liquid) + env(safe-area-inset-bottom, 0px));"
	>
		<div class="tw-grid tw-grid-cols-12 tw-gap-4" aria-label="Nexus Command workspace">
			<!-- Top Navigation Section (3-section grid) -->
			<div class="tw-col-span-12 tw-grid tw-grid-cols-3 tw-gap-4 tw-mb-2">
				<div class="vanguard-panel tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-[#14b8a6]">MISSION CONTROL</div>
				<div class="vanguard-panel tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-400">FACILITY OPS</div>
				<div class="vanguard-panel tw-text-center tw-p-3 tw-font-mono tw-font-bold tw-text-[10px] tw-uppercase tw-tracking-widest tw-text-slate-400">WEATHER HUB</div>
			</div>

			<!-- WarRoomGrid (8 cols) -->
			<div class="tw-col-span-12 lg:tw-col-span-8 tw-min-w-0">
				<WarRoomGrid />
			</div>

			<!-- WeatherHub (4 cols) -->
			<div class="tw-col-span-12 lg:tw-col-span-4 tw-min-w-0">
				<WeatherHub {fieldLat} {fieldLng} {weatherCoords} />
			</div>

			<!-- SquadMatrix (12 cols) -->
			<div class="tw-col-span-12 tw-min-w-0">
				<SquadMatrix teamId={effectiveTeamId} teams={myTeams} />
			</div>
		</div>
	</main>
</div>
{/if}

<style>
	.nexus-banner {
		aspect-ratio: 16 / 5;
		min-height: 180px;
		max-height: 320px;
		mask-image: linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%);
	}

	.nexus-banner__media {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: radial-gradient(ellipse at 30% 25%, rgba(20, 184, 166, 0.25) 0%, transparent 55%),
			radial-gradient(ellipse at 75% 60%, rgba(168, 85, 247, 0.22) 0%, transparent 55%),
			linear-gradient(135deg, #020617 0%, #020202 60%, #050511 100%);
	}

	.nexus-banner__grid {
		position: absolute;
		inset: 0;
		background-image: linear-gradient(rgba(20, 184, 166, 0.08) 1px, transparent 1px),
			linear-gradient(90deg, rgba(20, 184, 166, 0.08) 1px, transparent 1px);
		background-size: 36px 36px;
		mask-image: linear-gradient(to bottom, #000 0%, transparent 95%);
		-webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 95%);
	}

	.nexus-banner__glow {
		position: absolute;
		border-radius: 50%;
		filter: blur(48px);
		opacity: 0.7;
		pointer-events: none;
	}

	.nexus-banner__glow--a {
		top: -12%;
		left: 8%;
		width: 38%;
		height: 70%;
		background: radial-gradient(ellipse, rgba(20, 184, 166, 0.55), transparent 70%);
	}

	.nexus-banner__glow--b {
		bottom: -18%;
		right: 4%;
		width: 36%;
		height: 80%;
		background: radial-gradient(ellipse, rgba(168, 85, 247, 0.48), transparent 70%);
	}

	.nexus-banner__scanline {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 4px,
			rgba(20, 184, 166, 0.04) 4px,
			rgba(20, 184, 166, 0.04) 5px
		);
		mix-blend-mode: screen;
	}

	/* ── Epic 14: Clearance Gate ─────────────────────────────────────────────── */
	.clearance-gate {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: var(--vanguard-bg);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		gap: 1rem;
	}

	.clearance-gate__grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(to right, rgba(255, 0, 60, 0.04) 1px, transparent 1px),
			linear-gradient(to bottom, rgba(255, 0, 60, 0.04) 1px, transparent 1px);
		background-size: 4rem 4rem;
		pointer-events: none;
	}

	.clearance-gate__shield {
		width: 6rem;
		height: 6rem;
		animation: gate-shield-pulse 2.5s ease-in-out infinite;
		filter: drop-shadow(0 0 20px rgba(255, 0, 60, 0.5));
		position: relative;
		z-index: 1;
	}

	@keyframes gate-shield-pulse {
		0%, 100% { filter: drop-shadow(0 0 16px rgba(255, 0, 60, 0.4)); }
		50% { filter: drop-shadow(0 0 36px rgba(255, 0, 60, 0.8)); }
	}

	.clearance-gate__status {
		font-size: 0.6rem;
		letter-spacing: 0.2em;
		color: var(--vanguard-red);
		text-transform: uppercase;
		position: relative;
		z-index: 1;
	}

	.clearance-gate__title {
		margin: 0;
		font-size: clamp(1.5rem, 5vw, 2.5rem);
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #f3f4f6;
		text-transform: uppercase;
		position: relative;
		z-index: 1;
	}

	.clearance-gate__diag {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
		justify-content: center;
		font-size: 0.6rem;
		letter-spacing: 0.12em;
		color: #374151;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		border: 1px solid rgba(255, 0, 60, 0.15);
		background: rgba(255, 0, 60, 0.04);
		padding: 0.5rem 1.25rem;
		border-radius: 0.375rem;
		position: relative;
		z-index: 1;
	}

	.clearance-gate__contact {
		display: inline-block;
		margin-top: 0.5rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		color: var(--vanguard-red);
		border: 1px solid rgba(255, 0, 60, 0.3);
		padding: 0.5rem 1.25rem;
		border-radius: 0.375rem;
		text-decoration: none;
		transition: background 0.2s, box-shadow 0.2s;
		position: relative;
		z-index: 1;
	}

	.clearance-gate__contact:hover {
		background: rgba(255, 0, 60, 0.1);
		box-shadow: 0 0 15px rgba(255, 0, 60, 0.3);
	}
</style>
