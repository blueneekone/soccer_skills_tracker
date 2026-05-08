<script lang="ts">
	import { browser } from '$app/environment';

	function reveal(node: Element, { delay = 0 }: { delay?: number } = {}) {
		if (!browser) return;
		(node as HTMLElement).style.transitionDelay = `${delay}ms`;
		const obs = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) { node.classList.add('is-revealed'); obs.disconnect(); }
			},
			{ threshold: 0.08 },
		);
		obs.observe(node);
		return { destroy: () => obs.disconnect() };
	}

	const MODULES = [
		{
			id: 'armory',
			icon: '⚔',
			accentColor: '#00f0ff',
			name: 'THE ARMORY',
			subtitle: 'Gamified Player Progression',
			description: `The Armory is the core of every player's Vanguard profile. It tracks six athletic dimensions — Pace, Acceleration, Agility, Stamina, Power, and the composite Vanguard Rating — as a living, gamified system that motivates players and gives coaches actionable data.`,
			capabilities: [
				'XP awarded per training session, drill completion, and coach override',
				'Five tiers: ROOKIE → PROSPECT → VANGUARD → ELITE → LEGEND',
				'Scout\'s Six radar chart with real-time percentile comparison',
				'Historical sparklines showing growth across any six-month window',
				'Armory Dashboard for coaching staff: sortable by VAN, XP, position, tier',
				'Proving Grounds: coach-supervised drill submission with stat deltas',
				'Firestore sync: optimistic UI with server-side audit trail',
			],
			techNote: 'ArmoryEngine.svelte.ts · Svelte 5 $state class · Firestore subcollection per player',
		},
		{
			id: 'warroom',
			icon: '🎯',
			accentColor: '#00f0ff',
			name: 'THE WAR ROOM',
			subtitle: 'Tactical Pitch Board',
			description: `A zero-latency SVG-native tactical pitch board designed for match-day speed. Coaches can drag player magnets, draw movement routes, place annotations, and export plays as shareable PDFs — all without leaving the browser.`,
			capabilities: [
				'SVG canvas — no WebGL, no GPU dependency, works on any device',
				'22 formation presets with one-click application',
				'Player magnets with jersey numbers and position labels',
				'Freehand route drawing with colour-coded paths',
				'Snap-to-grid + free placement toggle',
				'Half-pitch and full-pitch modes',
				'Export to PNG / shareable link',
				'Glassmorphism Tactical HUD with Command Drawer',
			],
			techNote: 'TacticalPitchBoard.svelte · TacticalEngine.svelte.ts · GridSvgDefs.svelte',
		},
		{
			id: 'aegis',
			icon: '⚡',
			accentColor: '#f59e0b',
			name: 'VANGUARD AEGIS',
			subtitle: 'Weather & Lightning Safety System',
			description: `Built on the NSSL 30-30 Rule, the AEGIS weather system monitors real-time conditions via Open-Meteo and NWS alerts. When lightning is detected within 10 miles, an Ares Red full-screen banner activates and a push notification fires to every coach on the field — even if the app is backgrounded.`,
			capabilities: [
				'5-minute polling: temperature, wind, humidity, precipitation risk',
				'NWS Alert integration for US-based venues',
				'DANGER / CAUTION / NORMAL alert levels with WMO code mapping',
				'Pulsing full-width Ares Red banner on DANGER',
				'30-minute all-clear countdown before resuming',
				'PWA push notification to coach device (foreground + background)',
				'GO / HOLD / NO-GO deployment badge for at-a-glance status',
				'Role-gated: players never see weather alerts (avoids panic)',
			],
			techNote: 'WeatherAegis.svelte.ts · WeatherAlert.svelte · WeatherWidget.svelte · getWeatherConditions CF',
		},
		{
			id: 'zerotrust',
			icon: '🔐',
			accentColor: '#22c55e',
			name: 'ZERO-TRUST CORE',
			subtitle: 'COPPA Compliance & Security Architecture',
			description: `Vanguard Command was designed from day one with youth athletic compliance as a hard requirement. Every data flow is tenant-isolated by Firebase custom JWT claims, sensitive PII is never stored in publicly-readable Firestore fields, and an immutable audit log captures every access event.`,
			capabilities: [
				'Firebase custom claims: tenantId, role, vpcVerified per user',
				'Firestore rules deny by default — every collection explicitly allow-listed',
				'COPPA consent gate: blocks data collection for under-13 until parent verifies',
				'Parental consent via email token → onCall CF (server-side only flip)',
				'24-hour PII burn protocol: sensitive documents auto-deleted after verification',
				'Immutable audit_logs collection — no update/delete rules',
				'SafeSport messaging: no 1-on-1 DMs to minors; parent auto-CC on team messages',
				'Signed URLs for private documents (5-min TTL, pre-logged before generation)',
				'SOC 2-ready audit trail; GDPR data export available',
			],
			techNote: 'firestore.rules · storage.rules · ConsentOverlay.svelte · functions/coppa.js · functions/invites.js',
		},
		{
			id: 'recruit',
			icon: '🔭',
			accentColor: '#a78bfa',
			name: 'RECRUITER NEXUS',
			subtitle: 'Global Talent Intelligence Platform',
			description: `An enterprise-grade talent intelligence dashboard for scouts and college recruiters. The Nexus provides a live, paginated feed of all players on the platform — filtered by position, tier, VAN rating, and GPA — with historical growth sparklines and a Zero-Trust digital handshake for PII access.`,
			capabilities: [
				'Paginated talent feed across all tenants (public data only)',
				'Filters: position, tier, min VAN rating, min GPA, club',
				'Watchlist with per-player bookmarks stored per recruiter',
				'Milestone alerts: notified when a watched player reaches ELITE/LEGEND tier',
				'Scout\'s Six sparklines: 6-month growth history for all athletic metrics',
				'Digital Handshake: recruiter requests PII access → director/parent approves',
				'Firestore rules enforce handshake status before returning signed URLs',
				'Scholar badge integration: GPA ≥ 3.5 triggers amber-gold glow on profile card',
			],
			techNote: 'RecruiterPortal.svelte · recruiter_watchlist · recruiter_handshakes · stat_history collections',
		},
		{
			id: 'media',
			icon: '🎬',
			accentColor: '#ff003c',
			name: 'AI MEDIA VAULT',
			subtitle: 'Secure Video Analysis Pipeline',
			description: `Every clip uploaded by a player passes through a 4-stage AEGIS Media Pipeline before it ever touches the accessible bucket. EXIF metadata (including GPS coordinates) is stripped, a Gemini Vision content safety scan runs automatically, and only clean clips are moved to the tenant's media bucket. A director or parent can hard-delete all media for any child with a single button — triggering an immutable audit event.`,
			capabilities: [
				'Direct-to-GCS signed PUT uploads — bypasses SvelteKit entirely',
				'EXIF strip: all GPS, device, timestamp metadata removed via sharp re-encode',
				'Gemini 2.0 Flash content safety scan (0-100 score)',
				'Auto-quarantine for scores ≥ 70 — no client access to quarantine bucket',
				'Storage rules: staging = write-only, media = read-gated, quarantine = sealed',
				'AI Biomechanics stub: analyzeMovement() returns stat deltas bound to ArmoryEngine',
				'ClipAnalyzer.svelte: hex-grid scanning overlay during analysis',
				'Director / parent DELETE ALL MEDIA with pre-logging audit event',
			],
			techNote: 'processMedia.js (Storage trigger) · uploadTokens.js · ClipAnalyzer.svelte · MediaVault.svelte',
		},
		{
			id: 'scholar',
			icon: '🎓',
			accentColor: '#f59e0b',
			name: 'SCHOLAR ENGINE',
			subtitle: 'Academic Tracking & Eligibility',
			description: `The Scholar Engine tracks each player's GPA, study hours, and eligibility status, with a dedicated Tutor portal for assigned academic support staff. Eligibility gates are enforced by the platform — a player's profile cannot show full stats if they're academically ineligible. A glowing amber Scholar Badge appears on the VanguardCard for athletes maintaining a 3.5+ GPA.`,
			capabilities: [
				'GPA, study hours, and per-subject grade tracking',
				'Eligibility tiers: ELIGIBLE (≥2.0) · PROBATION (1.5–2.0) · INELIGIBLE (<1.5)',
				'Tutor role: assigned students only, no cross-tenant access',
				'TutorDashboard.svelte: aggregate KPIs + per-student cards',
				'Scholar Badge on VanguardCard: pulses amber if GPA ≥ 3.5',
				'GPA trend indicator: up / stable / down with 3-point comparison',
				'academic_records Firestore collection with tenant-scoped rules',
				'Audit log on every tutor record write',
			],
			techNote: 'scholar.svelte.ts · TutorDashboard.svelte · VanguardCard.svelte',
		},
	];
</script>

<svelte:head>
	<title>Features — Vanguard Command</title>
	<meta
		name="description"
		content="Explore the Armory, War Room, AEGIS Weather, Zero-Trust COPPA compliance, Recruiter Nexus, AI Media Vault, and Scholar Engine. Built for elite youth soccer."
	/>
</svelte:head>

<div class="feat-root">
	<!-- ── Header ────────────────────────────────────────────────────────────── -->
	<header class="feat-header" use:reveal>
		<span class="feat-eyebrow">PLATFORM CAPABILITIES</span>
		<h1 class="feat-h1">Every module. Every detail.</h1>
		<p class="feat-sub">
			Vanguard Command is not a feature list — it's a system. Each module is production-ready,
			security-audited, and designed to work as a unified command surface.
		</p>
	</header>

	<!-- ── Module sections ───────────────────────────────────────────────────── -->
	{#each MODULES as mod, i}
		<section
			id={mod.id}
			class="mod-section"
			class:mod-section--alt={i % 2 === 1}
			aria-labelledby="mod-{mod.id}-heading"
			use:reveal
			style:--accent={mod.accentColor}
		>
			<!-- Top bar -->
			<div class="mod-section__bar">
				<span class="mod-icon" aria-hidden="true">{mod.icon}</span>
				<div>
					<span class="mod-label">{mod.name}</span>
					<h2 class="mod-h2" id="mod-{mod.id}-heading">{mod.subtitle}</h2>
				</div>
			</div>

			<div class="mod-section__body">
				<!-- Description -->
				<p class="mod-desc">{mod.description}</p>

				<!-- Capability checklist -->
				<ul class="mod-caps" aria-label="{mod.name} capabilities">
					{#each mod.capabilities as cap}
						<li class="mod-cap">
							<span class="mod-cap__dot" aria-hidden="true"></span>
							{cap}
						</li>
					{/each}
				</ul>
			</div>

			<!-- Tech footnote -->
			<div class="mod-footnote">
				<span class="mod-footnote__label">STACK</span>
				<code class="mod-footnote__code">{mod.techNote}</code>
			</div>
		</section>
	{/each}

	<!-- ── CTA ───────────────────────────────────────────────────────────────── -->
	<div class="feat-cta" use:reveal>
		<h2 class="feat-cta__h2">Ready to deploy?</h2>
		<div class="feat-cta__actions">
			<a href="/setup" class="feat-cta__btn">DEPLOY YOUR CLUB →</a>
			<a href="/pricing" class="feat-cta__ghost">VIEW PRICING</a>
		</div>
	</div>
</div>

<style>
	:global(.is-revealed) { opacity: 1 !important; transform: none !important; }

	.feat-root {
		padding: 8rem 1.5rem 4rem;
		max-width: 1000px;
		margin: 0 auto;
		font-family: 'JetBrains Mono', monospace;
	}

	/* ── Header ──────────────────────────────────────────────────────────────── */
	.feat-header {
		margin-bottom: 4rem;
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 0.7s, transform 0.7s;
	}
	.feat-eyebrow {
		display: inline-block;
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: rgba(0, 240, 255, 0.55);
		margin-bottom: 0.85rem;
	}
	.feat-h1 {
		font-size: clamp(1.8rem, 4.5vw, 3rem);
		font-weight: 900;
		color: white;
		margin: 0 0 0.85rem;
		line-height: 1.1;
	}
	.feat-sub {
		font-size: 0.72rem;
		color: rgba(255, 255, 255, 0.35);
		margin: 0;
		max-width: 560px;
		line-height: 1.75;
	}

	/* ── Module section ──────────────────────────────────────────────────────── */
	.mod-section {
		opacity: 0;
		transform: translateY(24px);
		transition: opacity 0.7s ease, transform 0.7s ease;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		background: rgba(255, 255, 255, 0.02);
		padding: 2rem;
		margin-bottom: 1.5rem;
		scroll-margin-top: 80px;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		position: relative;
		overflow: hidden;
	}
	.mod-section::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, var(--accent, #00f0ff), transparent 60%);
		opacity: 0.5;
	}
	.mod-section--alt {
		background: rgba(0, 0, 0, 0.2);
	}
	.mod-section:hover {
		border-color: color-mix(in srgb, var(--accent, #00f0ff) 18%, transparent);
	}

	/* Bar */
	.mod-section__bar {
		display: flex;
		align-items: flex-start;
		gap: 0.85rem;
	}
	.mod-icon { font-size: 1.5rem; flex-shrink: 0; padding-top: 2px; }
	.mod-label {
		display: block;
		font-size: 0.45rem;
		font-weight: 700;
		letter-spacing: 0.25em;
		color: color-mix(in srgb, var(--accent, #00f0ff) 70%, white);
		margin-bottom: 0.2rem;
	}
	.mod-h2 {
		margin: 0;
		font-size: clamp(1rem, 2.5vw, 1.4rem);
		font-weight: 900;
		color: white;
	}

	/* Body */
	.mod-section__body {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}
	.mod-desc {
		margin: 0;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.4);
		line-height: 1.8;
	}

	.mod-caps {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.mod-cap {
		display: flex;
		align-items: flex-start;
		gap: 0.45rem;
		font-size: 0.58rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.5;
	}
	.mod-cap__dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--accent, #00f0ff);
		opacity: 0.65;
		margin-top: 5px;
		flex-shrink: 0;
	}

	/* Footnote */
	.mod-footnote {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}
	.mod-footnote__label {
		font-size: 0.4rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.2);
	}
	.mod-footnote__code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.48rem;
		color: rgba(0, 240, 255, 0.35);
		background: none;
		border: none;
		padding: 0;
	}

	/* ── Final CTA ───────────────────────────────────────────────────────────── */
	.feat-cta {
		opacity: 0;
		transform: translateY(16px);
		transition: opacity 0.7s ease, transform 0.7s ease;
		text-align: center;
		padding: 4rem 0;
	}
	.feat-cta__h2 {
		font-size: clamp(1.5rem, 3.5vw, 2.4rem);
		font-weight: 900;
		color: white;
		margin: 0 0 2rem;
	}
	.feat-cta__actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.feat-cta__btn {
		padding: 0.85rem 1.75rem;
		border-radius: 10px;
		background: rgba(0, 240, 255, 0.08);
		border: 1px solid rgba(0, 240, 255, 0.45);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: #00f0ff;
		text-decoration: none;
		min-height: 48px;
		display: flex;
		align-items: center;
		box-shadow: 0 0 24px rgba(0, 240, 255, 0.2);
		transition: all 0.25s;
	}
	.feat-cta__btn:hover {
		background: rgba(0, 240, 255, 0.16);
		box-shadow: 0 0 48px rgba(0, 240, 255, 0.4);
		transform: translateY(-2px);
	}
	.feat-cta__ghost {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.3);
		text-decoration: none;
		transition: color 0.2s;
	}
	.feat-cta__ghost:hover { color: white; }

	/* ── Responsive ─────────────────────────────────────────────────────────── */
	@media (max-width: 720px) {
		.mod-section__body { grid-template-columns: 1fr; }
		.mod-section { padding: 1.5rem; }
	}
</style>
