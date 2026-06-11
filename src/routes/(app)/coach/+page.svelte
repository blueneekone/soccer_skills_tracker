<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import SquadTelemetryView from '$lib/components/coach/SquadTelemetryView.svelte';
	import MediaCenter from '$lib/components/media/MediaCenter.svelte';
	import WeatherAlert from '$lib/components/weather/WeatherAlert.svelte';
	import WeatherWidget from '$lib/components/weather/WeatherWidget.svelte';
	import { vanguardFlags } from '$lib/services/remoteConfig.svelte.js';

	let mediaOpen = $state(false);

	const role = $derived(authStore.role);

	// Epic 14: Clearance Protocol — gate the whole Coach OS behind BGC clearance.
	const clearanceRequired = $derived(role === 'coach' || role === 'recruiter');
	const isCleared = $derived(authStore.isCleared);
	const userEmail = $derived((authStore.user?.email || '').trim());

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

	// ── Weather Hub: AEGIS live data via WeatherWidget / WeatherAegis ────────
	// Default field coordinates — replaced by team's actual field location when available.
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

	function enterWarRoom() {
		void goto('/coach/tactical');
	}
</script>

<MediaCenter bind:open={mediaOpen} />

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
		<div class="clearance-gate__status">CLEARANCE PENDING</div>
		<h1 class="clearance-gate__title">ACCESS RESTRICTED</h1>
		<p class="clearance-gate__body">
			Access to Vanguard telemetry is restricted until SafeSport background verification is
			complete. Your compliance package has been submitted and is awaiting review. You will
			receive a notification when your clearance is confirmed.
		</p>

		<!-- Diagnostic strip -->
		<div class="clearance-gate__diag">
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

<!-- AEGIS Lightning Alert Banner — coaches/directors only, zero-height when inactive -->
<WeatherAlert />

<!-- Vanguard root: deep void background, native page scrolling, no overflow traps. -->
<div class="tw-relative tw-min-h-screen tw-w-full tw-bg-[#020202] tw-text-slate-200">
	<!-- Background ambient grid (decorative only, pointer-events-none) -->
	<div
		class="tw-pointer-events-none tw-fixed tw-inset-0 tw-z-0 tw-opacity-[0.08]"
		style="background-image: linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px); background-size: 44px 44px;"
		aria-hidden="true"
	></div>

	<!-- ── NEXUS COMMAND BANNER ─────────────────────────────────────────────── -->
	<header
		class="nexus-banner tw-relative tw-z-10 tw-w-full tw-overflow-visible tw-rounded-t-none"
		aria-label="Nexus Command"
	>
		<!-- Banner backdrop: aspect-ratio drives height, mask-image fades into the page. -->
		<div class="nexus-banner__media" aria-hidden="true">
			<div class="nexus-banner__grid"></div>
			<div class="nexus-banner__glow nexus-banner__glow--a"></div>
			<div class="nexus-banner__glow nexus-banner__glow--b"></div>
			<div class="nexus-banner__scanline"></div>
		</div>
		<!-- Text overlay — deep backdrop-blur-md per Vanguard spec -->
		<div
			class="vanguard-surface tw-absolute tw-inset-x-4 tw-bottom-4 tw-z-20 tw-flex tw-flex-wrap tw-items-end bento-gap-md tw-px-5 tw-py-4 md:tw-inset-x-8 md:tw-bottom-6"
		>
			<div
				class="tw-relative tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-[#14b8a6]/40 tw-bg-[rgba(0,24,32,0.6)] tw-shadow-[0_0_18px_rgba(20, 184, 166,0.35)] md:tw-h-14 md:tw-w-14"
			>
				<span class="tw-font-mono tw-text-2xl tw-font-black tw-tracking-widest tw-text-[#14b8a6]">{nexusBadgeLetter}</span>
			</div>
			<div class="tw-min-w-0 tw-flex-1">
				<h1 class="tw-m-0 tw-font-mono tw-text-lg tw-font-black tw-uppercase tw-tracking-[0.18em] tw-text-white md:tw-text-xl">
					Nexus Command
				</h1>
				<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-[0.22em] tw-text-[#14b8a6]/85 tw-uppercase">
					{clubNameDisplay} <span class="tw-text-slate-600">//</span> {teamNameDisplay}
				</p>
			</div>
			<div class="tw-flex tw-shrink-0 tw-flex-col tw-items-end tw-gap-1 tw-font-mono">
				<span class="tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.22em] tw-text-white/40">UPLINK</span>
				<span class="tw-text-sm tw-font-black tw-tabular-nums tw-text-[#14b8a6] tw-drop-shadow-[0_0_8px_rgba(20, 184, 166,0.55)]">{tickerNow}</span>
			</div>
		</div>
	</header>

	<!-- ── BODY — Sprint 1.1: 12-col liquid bento (padding on wrapper, not shell canvas) -->
	<main
		class="coach-nexus-main tw-relative tw-z-10 tw-mx-auto tw-box-border tw-min-w-0 tw-w-full tw-max-w-7xl"
		style="padding: var(--bento-pad-liquid); padding-bottom: calc(var(--bento-pad-liquid) + env(safe-area-inset-bottom, 0px));"
	>
		<div
			class="bento-grid bento-grid--12col bento-grid--liquid tw-w-full"
			aria-label="Nexus Command workspace"
		>
			<div class="bento-span-12 tw-flex tw-justify-end">
				<button
					type="button"
					class="media-hub-btn"
					onclick={() => { mediaOpen = true; }}
					aria-label="Open Media Hub — news and podcasts"
				>
					<span class="media-hub-btn__icon" aria-hidden="true">▶</span>
					MEDIA HUB
				</button>
			</div>

			<div class="bento-span-12 tw-min-w-0">
				<SquadTelemetryView teamId={effectiveTeamId} teams={myTeams} />
			</div>

			<button
				type="button"
				class="war-room-card vanguard-surface--hero-liquid bento-span-8 bento-cell tw-group tw-relative tw-flex tw-min-h-[320px] tw-min-w-0 tw-flex-col tw-justify-between tw-overflow-hidden tw-rounded-vanguard tw-border-2 tw-border-[#14b8a6]/55 tw-p-6 tw-text-left tw-transition-transform hover:tw-scale-[1.01] active:tw-scale-[0.99] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#14b8a6]"
				aria-label="Enter War Room — tactical board"
				onclick={enterWarRoom}
			>
				<!-- Holographic field backdrop -->
				<svg
					class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-0 tw-h-full tw-w-full tw-opacity-40"
					viewBox="0 0 100 56"
					preserveAspectRatio="xMidYMid slice"
					aria-hidden="true"
				>
					<rect x="2" y="2" width="96" height="52" fill="none" stroke="rgba(20, 184, 166,0.25)" stroke-width="0.3" />
					<line x1="50" y1="2" x2="50" y2="54" stroke="rgba(20, 184, 166,0.2)" stroke-width="0.3" />
					<circle cx="50" cy="28" r="6" fill="none" stroke="rgba(20, 184, 166,0.2)" stroke-width="0.3" />
					<rect x="2" y="18" width="10" height="20" fill="none" stroke="rgba(20, 184, 166,0.2)" stroke-width="0.3" />
					<rect x="88" y="18" width="10" height="20" fill="none" stroke="rgba(20, 184, 166,0.2)" stroke-width="0.3" />
					<path
						d="M 18 42 Q 40 18 60 28 T 88 12"
						fill="none"
						stroke="#14b8a6"
						stroke-width="0.5"
						stroke-linecap="round"
						filter="url(#neonBloom)"
					/>
					<path
						d="M 14 30 Q 35 38 55 22 T 90 38"
						fill="none"
						stroke="#a855f7"
						stroke-width="0.45"
						stroke-linecap="round"
						filter="url(#neonBloom)"
					/>
				</svg>

				<!-- Pulsing border ring overlay -->
				<span
					class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-[1] tw-rounded-2xl tw-border tw-border-[#14b8a6]/50 tw-animate-[warRoomPulse_2.4s_ease-in-out_infinite]"
					aria-hidden="true"
				></span>

				<div class="tw-relative tw-z-10">
					<p class="tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.3em] tw-text-[#14b8a6]/90">
						PRIMARY GATEWAY
					</p>
					<h2 class="tw-mt-2 tw-font-mono tw-text-3xl tw-font-black tw-uppercase tw-tracking-[0.08em] tw-text-white md:tw-text-4xl">
						WAR ROOM
					</h2>
					<p class="tw-mt-2 tw-max-w-md tw-font-mono tw-text-xs tw-tracking-wide tw-text-slate-400">
						Tactical board · route ink · cartridge deploy. Live engine bound to roster telemetry.
					</p>
				</div>

				<div class="tw-relative tw-z-10 tw-flex tw-items-end tw-justify-between tw-gap-3">
					<div class="tw-flex tw-flex-col tw-gap-1 tw-font-mono">
						<span class="tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">ENGINE STATUS</span>
						<span class="tw-flex tw-items-center tw-gap-1.5 tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#14b8a6]">
							<span class="tw-block tw-h-1.5 tw-w-1.5 tw-animate-pulse tw-rounded-full tw-bg-[#14b8a6] tw-shadow-[0_0_6px_rgba(20, 184, 166,0.9)]"></span>
							READY · HOT START
						</span>
					</div>
					<span
						class="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-[#14b8a6]/55 tw-bg-[#14b8a6]/10 tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-widest tw-text-[#14b8a6] tw-shadow-[0_0_20px_rgba(20, 184, 166,0.35)] group-hover:tw-shadow-[0_0_30px_rgba(20, 184, 166,0.55)]"
					>
						ENTER WAR ROOM
						<Icon name="nav.arrow-right" />
					</span>
				</div>
			</button>

			<!-- FACILITY OPS & STAGING — secondary ops (4 cols @ 64rem+) -->
			<article
				class="vanguard-surface--liquid bento-span-4 bento-cell tw-relative tw-flex tw-min-h-[320px] tw-min-w-0 tw-flex-col tw-overflow-hidden tw-rounded-vanguard tw-border tw-border-white/10 tw-bg-[#020202]/80 tw-p-5"
				aria-label="Facility Ops & Staging"
			>
				<header class="bento-mb-md tw-flex tw-items-center tw-gap-2 tw-border-b tw-border-white/10 tw-pb-3">
					<Icon name="comm.broadcast" class="tw-text-base tw-text-[#14b8a6]" />
					<h2 class="tw-m-0 tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-white">
						Facility Ops &amp; Staging
					</h2>
				</header>

				<dl class="tw-m-0 tw-flex tw-flex-col tw-gap-3 tw-font-mono tw-text-[11px]">
					<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-white/5 tw-pb-2">
						<dt class="tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">PITCH</dt>
						<dd class="tw-tabular-nums tw-text-[#14b8a6]/90">{teamNameDisplay}</dd>
					</div>
					<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-white/5 tw-pb-2">
						<dt class="tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">COORDS</dt>
						<dd class="tw-tabular-nums tw-text-slate-300">{weatherCoords}</dd>
					</div>
					<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-white/5 tw-pb-2">
						<dt class="tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">ARSENAL</dt>
						<dd class="tw-tabular-nums tw-text-slate-300">FORGE · ONLINE</dd>
					</div>
					<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-white/5 tw-pb-2">
						<dt class="tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">COMMS</dt>
						<dd class="tw-tabular-nums tw-text-[#14b8a6]/90">TEAM OPS · LOGISTICS</dd>
					</div>
					<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3">
						<dt class="tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">EGRESS</dt>
						<dd class="tw-tabular-nums tw-text-slate-300">{effectiveTeamId ? 'ROSTER LINKED' : 'NO TEAM'}</dd>
					</div>
				</dl>

				<div class="tw-mt-auto tw-flex tw-flex-wrap tw-gap-2 tw-pt-4">
					<a
						href="/coach/forge"
						class="tw-pointer-events-auto tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#14b8a6]/35 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#14b8a6] tw-no-underline tw-backdrop-blur-3xl tw-transition-all hover:tw-border-[#14b8a6]/75 hover:tw-bg-[#14b8a6]/10"
					>
						<Icon name="sys.hammer" /> FORGE
					</a>
					<a
						href="/coach/match-day"
						class="tw-pointer-events-auto tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#14b8a6]/35 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#14b8a6] tw-no-underline tw-backdrop-blur-3xl tw-transition-all hover:tw-border-[#14b8a6]/75 hover:tw-bg-[#14b8a6]/10"
					>
						<Icon name="data.target" /> MATCH LOG
					</a>
					<a
						href="/coach/drills?view=schedule"
						class="tw-pointer-events-auto tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#14b8a6]/35 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#14b8a6] tw-no-underline tw-backdrop-blur-3xl tw-transition-all hover:tw-border-[#14b8a6]/75 hover:tw-bg-[#14b8a6]/10"
					>
						<Icon name="sys.calendar" /> BOOK PITCH
					</a>
					<a
						href="/coach/drills?view=schedule"
						class="tw-pointer-events-auto tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#14b8a6]/35 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#14b8a6] tw-no-underline tw-backdrop-blur-3xl tw-transition-all hover:tw-border-[#14b8a6]/75 hover:tw-bg-[#14b8a6]/10"
					>
						<Icon name="content.checks" /> FIELD STATION
					</a>
				</div>
			</article>

		<!-- WEATHER MONITORING — AEGIS live widget (full-width row) -->
		<!-- Kill switch: feature_weather_aegis_enabled (Remote Config) -->
		<div class="bento-span-12 tw-min-w-0">
			{#if vanguardFlags.weatherEnabled}
				<WeatherWidget lat={fieldLat} lng={fieldLng} coordsLabel={weatherCoords} />
			{:else}
				<div
					class="font-mono text-xs p-4 text-center"
					style="background: rgba(0,8,20,0.7); border: 1px solid rgba(0,255,255,0.1); border-radius:4px; color: rgba(0,255,255,0.3);"
				>
					⏸ AEGIS WEATHER MODULE OFFLINE<br/>
					<span style="font-size: 9px; opacity: 0.6;">Disabled by platform configuration. Contact your administrator.</span>
				</div>
			{/if}
		</div>
		</div>
	</main>
</div>

<!-- Close the {:else} from the clearance gate above -->
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

	@keyframes warRoomPulse {
		0%, 100% {
			box-shadow: inset 0 0 0 1px rgba(20, 184, 166, 0.4), 0 0 30px rgba(20, 184, 166, 0.25);
			border-color: rgba(20, 184, 166, 0.55);
		}
		50% {
			box-shadow: inset 0 0 0 2px rgba(20, 184, 166, 0.85), 0 0 50px rgba(20, 184, 166, 0.55);
			border-color: rgba(20, 184, 166, 0.95);
		}
	}

	/* ── Media Hub trigger ───────────────────────────────────────────────────── */
	.media-hub-btn {
		display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.5rem 1rem; min-height: 44px;
		background: rgba(20, 184, 166, 0.06);
		border: 1px solid rgba(20, 184, 166, 0.25);
		border-radius: 999px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em;
		color: rgba(20, 184, 166, 0.75);
		cursor: pointer; transition: all 0.2s;
	}
	.media-hub-btn:hover {
		background: rgba(20, 184, 166, 0.12);
		border-color: rgba(20, 184, 166, 0.5);
		box-shadow: 0 0 16px rgba(20, 184, 166, 0.12);
		color: #14b8a6;
	}
	.media-hub-btn__icon { font-size: 0.6rem; }

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

	.clearance-gate__body {
		margin: 0;
		max-width: 36rem;
		font-size: 0.875rem;
		color: #6b7280;
		line-height: 1.7;
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
