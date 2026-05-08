<script>
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
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
		if (!activeClubId) return 'AGGIES FC';
		const n = teamsStore.clubs.find((c) => c.id === activeClubId)?.name;
		return typeof n === 'string' && n.trim() ? n.trim().toUpperCase() : 'AGGIES FC';
	});

	const teamNameDisplay = $derived(
		typeof activeTeamRow?.name === 'string' && activeTeamRow.name.trim()
			? activeTeamRow.name.trim().toUpperCase()
			: 'U14 VARSITY',
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
			class="tw-absolute tw-inset-x-4 tw-bottom-4 tw-z-20 tw-flex tw-flex-wrap tw-items-end tw-gap-4 tw-rounded-2xl tw-border tw-border-[#00f0ff]/20 tw-bg-[#020202]/55 tw-px-5 tw-py-4 tw-backdrop-blur-md tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_30px_60px_rgba(0,0,0,0.5)] md:tw-inset-x-8 md:tw-bottom-6"
		>
			<div
				class="tw-relative tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-[#00f0ff]/40 tw-bg-[rgba(0,24,32,0.6)] tw-shadow-[0_0_18px_rgba(0,240,255,0.35)] md:tw-h-14 md:tw-w-14"
			>
				<span class="tw-font-mono tw-text-2xl tw-font-black tw-tracking-widest tw-text-[#00f0ff]">{nexusBadgeLetter}</span>
			</div>
			<div class="tw-min-w-0 tw-flex-1">
				<h1 class="tw-m-0 tw-font-mono tw-text-lg tw-font-black tw-uppercase tw-tracking-[0.18em] tw-text-white md:tw-text-xl">
					Nexus Command
				</h1>
				<p class="tw-mt-1 tw-font-mono tw-text-[10px] tw-tracking-[0.22em] tw-text-[#00f0ff]/85 tw-uppercase">
					{clubNameDisplay} <span class="tw-text-slate-600">//</span> {teamNameDisplay}
				</p>
			</div>
			<div class="tw-flex tw-shrink-0 tw-flex-col tw-items-end tw-gap-1 tw-font-mono">
				<span class="tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-[0.22em] tw-text-white/40">UPLINK</span>
				<span class="tw-text-sm tw-font-black tw-tabular-nums tw-text-[#00f0ff] tw-drop-shadow-[0_0_8px_rgba(0,240,255,0.55)]">{tickerNow}</span>
			</div>
		</div>
	</header>

	<!-- ── BODY ─────────────────────────────────────────────────────────────── -->
	<main class="tw-relative tw-z-10 tw-mx-auto tw-w-full tw-max-w-7xl tw-px-3 tw-pb-16 tw-pt-6 sm:tw-px-5">
		<!-- Media Hub trigger — floating pill button top-right -->
		<div class="tw-flex tw-justify-end tw-mb-4">
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

		<!-- Squad Readiness Matrix (mounted at top, primary content) -->
		<SquadTelemetryView />

		<!-- ── MISSION CONTROL GRID ──────────────────────────────────────────── -->
		<section class="tw-mt-6 tw-grid tw-grid-cols-1 tw-gap-4 lg:tw-grid-cols-3" aria-label="Mission Control">
			<!-- WAR ROOM — Holographic, pulsing cyan border, primary gateway -->
			<button
				type="button"
				class="war-room-card tw-group tw-relative tw-flex tw-min-h-[320px] tw-flex-col tw-justify-between tw-overflow-hidden tw-rounded-2xl tw-border-2 tw-border-[#00f0ff]/55 tw-bg-[#020202]/80 tw-p-6 tw-text-left tw-backdrop-blur-3xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),_0_0_40px_rgba(0,240,255,0.18)] tw-transition-transform hover:tw-scale-[1.01] active:tw-scale-[0.99] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-[#00f0ff] lg:tw-col-span-2"
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
					<rect x="2" y="2" width="96" height="52" fill="none" stroke="rgba(0,240,255,0.25)" stroke-width="0.3" />
					<line x1="50" y1="2" x2="50" y2="54" stroke="rgba(0,240,255,0.2)" stroke-width="0.3" />
					<circle cx="50" cy="28" r="6" fill="none" stroke="rgba(0,240,255,0.2)" stroke-width="0.3" />
					<rect x="2" y="18" width="10" height="20" fill="none" stroke="rgba(0,240,255,0.2)" stroke-width="0.3" />
					<rect x="88" y="18" width="10" height="20" fill="none" stroke="rgba(0,240,255,0.2)" stroke-width="0.3" />
					<path
						d="M 18 42 Q 40 18 60 28 T 88 12"
						fill="none"
						stroke="#00f0ff"
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
					class="tw-pointer-events-none tw-absolute tw-inset-0 tw-z-[1] tw-rounded-2xl tw-border tw-border-[#00f0ff]/50 tw-animate-[warRoomPulse_2.4s_ease-in-out_infinite]"
					aria-hidden="true"
				></span>

				<div class="tw-relative tw-z-10">
					<p class="tw-font-mono tw-text-[10px] tw-font-black tw-uppercase tw-tracking-[0.3em] tw-text-[#00f0ff]/90">
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
						<span class="tw-flex tw-items-center tw-gap-1.5 tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff]">
							<span class="tw-block tw-h-1.5 tw-w-1.5 tw-animate-pulse tw-rounded-full tw-bg-[#00f0ff] tw-shadow-[0_0_6px_rgba(0,240,255,0.9)]"></span>
							READY · HOT START
						</span>
					</div>
					<span
						class="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-[#00f0ff]/55 tw-bg-[#00f0ff]/10 tw-px-4 tw-py-2 tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-widest tw-text-[#00f0ff] tw-shadow-[0_0_20px_rgba(0,240,255,0.35)] group-hover:tw-shadow-[0_0_30px_rgba(0,240,255,0.55)]"
					>
						ENTER WAR ROOM
						<i class="ph ph-arrow-right" aria-hidden="true"></i>
					</span>
				</div>
			</button>

			<!-- FACILITY OPS & STAGING — glassmorphic, mono coordinates -->
			<article
				class="tw-relative tw-flex tw-min-h-[320px] tw-flex-col tw-overflow-hidden tw-rounded-2xl tw-border tw-border-white/10 tw-bg-[#020202]/80 tw-p-5 tw-backdrop-blur-3xl tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
				aria-label="Facility Ops & Staging"
			>
				<header class="tw-mb-4 tw-flex tw-items-center tw-gap-2 tw-border-b tw-border-white/10 tw-pb-3">
					<i class="ph ph-broadcast tw-text-base tw-text-[#00f0ff]" aria-hidden="true"></i>
					<h2 class="tw-m-0 tw-font-mono tw-text-xs tw-font-black tw-uppercase tw-tracking-[0.2em] tw-text-white">
						Facility Ops &amp; Staging
					</h2>
				</header>

				<dl class="tw-m-0 tw-flex tw-flex-col tw-gap-3 tw-font-mono tw-text-[11px]">
					<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3 tw-border-b tw-border-white/5 tw-pb-2">
						<dt class="tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">PITCH</dt>
						<dd class="tw-tabular-nums tw-text-[#00f0ff]/90">TURF 2 · LANE A</dd>
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
						<dd class="tw-tabular-nums tw-text-[#00f0ff]/90">ENCRYPTED · NEXUS-7</dd>
					</div>
					<div class="tw-flex tw-items-baseline tw-justify-between tw-gap-3">
						<dt class="tw-text-[9px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-white/35">EGRESS</dt>
						<dd class="tw-tabular-nums tw-text-slate-300">GATE 04</dd>
					</div>
				</dl>

				<div class="tw-mt-auto tw-flex tw-flex-wrap tw-gap-2 tw-pt-4">
					<a
						href="/coach/forge"
						class="tw-pointer-events-auto tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#00f0ff]/35 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff] tw-no-underline tw-backdrop-blur-3xl tw-transition-all hover:tw-border-[#00f0ff]/75 hover:tw-bg-[#00f0ff]/10"
					>
						<i class="ph ph-hammer" aria-hidden="true"></i> FORGE
					</a>
					<a
						href="/coach/match-day"
						class="tw-pointer-events-auto tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#00f0ff]/35 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff] tw-no-underline tw-backdrop-blur-3xl tw-transition-all hover:tw-border-[#00f0ff]/75 hover:tw-bg-[#00f0ff]/10"
					>
						<i class="ph ph-target" aria-hidden="true"></i> MATCH LOG
					</a>
					<a
						href="/coach/drills"
						class="tw-pointer-events-auto tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-[#00f0ff]/35 tw-bg-[#020202]/80 tw-px-3 tw-py-1.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#00f0ff] tw-no-underline tw-backdrop-blur-3xl tw-transition-all hover:tw-border-[#00f0ff]/75 hover:tw-bg-[#00f0ff]/10"
					>
						<i class="ph ph-list-checks" aria-hidden="true"></i> DRILLS
					</a>
				</div>
			</article>

		<!-- WEATHER MONITORING — AEGIS live widget (lg col 3) -->
		<!-- Kill switch: feature_weather_aegis_enabled (Remote Config) -->
		<div class="lg:tw-col-span-3">
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
		</section>
	</main>
</div>

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
		background: radial-gradient(ellipse at 30% 25%, rgba(0, 240, 255, 0.25) 0%, transparent 55%),
			radial-gradient(ellipse at 75% 60%, rgba(168, 85, 247, 0.22) 0%, transparent 55%),
			linear-gradient(135deg, #020617 0%, #020202 60%, #050511 100%);
	}

	.nexus-banner__grid {
		position: absolute;
		inset: 0;
		background-image: linear-gradient(rgba(0, 240, 255, 0.08) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0, 240, 255, 0.08) 1px, transparent 1px);
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
		background: radial-gradient(ellipse, rgba(0, 240, 255, 0.55), transparent 70%);
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
			rgba(0, 240, 255, 0.04) 4px,
			rgba(0, 240, 255, 0.04) 5px
		);
		mix-blend-mode: screen;
	}

	@keyframes warRoomPulse {
		0%, 100% {
			box-shadow: inset 0 0 0 1px rgba(0, 240, 255, 0.4), 0 0 30px rgba(0, 240, 255, 0.25);
			border-color: rgba(0, 240, 255, 0.55);
		}
		50% {
			box-shadow: inset 0 0 0 2px rgba(0, 240, 255, 0.85), 0 0 50px rgba(0, 240, 255, 0.55);
			border-color: rgba(0, 240, 255, 0.95);
		}
	}

	/* ── Media Hub trigger ───────────────────────────────────────────────────── */
	.media-hub-btn {
		display: inline-flex; align-items: center; gap: 0.5rem;
		padding: 0.5rem 1rem; min-height: 44px;
		background: rgba(0, 240, 255, 0.06);
		border: 1px solid rgba(0, 240, 255, 0.25);
		border-radius: 999px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em;
		color: rgba(0, 240, 255, 0.75);
		cursor: pointer; transition: all 0.2s;
	}
	.media-hub-btn:hover {
		background: rgba(0, 240, 255, 0.12);
		border-color: rgba(0, 240, 255, 0.5);
		box-shadow: 0 0 16px rgba(0, 240, 255, 0.12);
		color: #00f0ff;
	}
	.media-hub-btn__icon { font-size: 0.6rem; }
</style>
