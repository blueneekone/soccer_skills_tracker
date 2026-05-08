<script lang="ts">
	/**
	 * Landing Page — Vanguard Command
	 * "The Operating System for Elite Human Performance"
	 *
	 * Pre-rendered (SSR) for maximum SEO. Auth redirect handled by layout.
	 * VanguardVFX (starfield) renders behind all sections via root layout.
	 */

	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	// ── Scroll-reveal action ──────────────────────────────────────────────────

	function reveal(node: Element, { delay = 0 }: { delay?: number } = {}) {
		if (!browser) return;
		(node as HTMLElement).style.transitionDelay = `${delay}ms`;
		const obs = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					node.classList.add('is-revealed');
					obs.disconnect();
				}
			},
			{ threshold: 0.12 },
		);
		obs.observe(node);
		return { destroy: () => obs.disconnect() };
	}

	// ── Prism animation state ─────────────────────────────────────────────────

	// Scout's Six mock data for the animated prism in the hero
	const PRISM_STATS = [
		{ label: 'PAC', value: 84, angle: 270 },
		{ label: 'ACC', value: 91, angle: 330 },
		{ label: 'AGI', value: 78, angle: 30 },
		{ label: 'STM', value: 88, angle: 90 },
		{ label: 'POW', value: 73, angle: 150 },
		{ label: 'VAN', value: 95, angle: 210 },
	];

	const SIZE = 240;
	const CENTER = SIZE / 2;
	const MAX_R = 96;

	function toXY(angle: number, radius: number) {
		const rad = ((angle - 90) * Math.PI) / 180;
		return {
			x: CENTER + radius * Math.cos(rad),
			y: CENTER + radius * Math.sin(rad),
		};
	}

	// Build SVG polygon points from stats
	const prismPoints = $derived(
		PRISM_STATS.map((s) => {
			const r = (s.value / 99) * MAX_R;
			return toXY(s.angle, r);
		})
			.map((p) => `${p.x},${p.y}`)
			.join(' '),
	);

	// Outer hex ring points (full)
	const hexPoints = $derived(
		PRISM_STATS.map((s) => toXY(s.angle, MAX_R))
			.map((p) => `${p.x},${p.y}`)
			.join(' '),
	);

	// ── Trust bar counter animation ───────────────────────────────────────────

	const METRICS = [
		{ value: 4200, label: 'ATHLETES DEPLOYED', suffix: '+' },
		{ value: 312, label: 'CLUBS ACTIVE', suffix: '' },
		{ value: 18, label: 'COUNTRIES', suffix: '' },
		{ value: 99.98, label: 'UPTIME', suffix: '%' },
	];

	let displayed = $state(METRICS.map(() => 0));

	onMount(() => {
		const duration = 1800;
		const start = performance.now();
		const tick = (now: number) => {
			const elapsed = now - start;
			const p = Math.min(elapsed / duration, 1);
			const ease = 1 - Math.pow(1 - p, 3);
			displayed = METRICS.map((m) => {
				const v = m.value * ease;
				return m.value < 100 ? Math.round(v * 100) / 100 : Math.round(v);
			});
			if (p < 1) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});

	// ── Feature pillars ───────────────────────────────────────────────────────

	const FEATURES = [
		{
			id: 'armory',
			icon: '⚔',
			accentColor: '#00f0ff',
			label: 'THE ARMORY',
			headline: 'Gamified player progression that scouts actually use.',
			body: 'Vanguard Rating, XP tiers, and the Scout\'s Six athletic index combine into one living profile. Every training session, every milestone — tracked, scored, and surfaced in real time.',
			stats: ['6 athletic metrics', 'XP tier system', 'Historical sparklines'],
			href: '/features#armory',
		},
		{
			id: 'warroom',
			icon: '🎯',
			accentColor: '#00f0ff',
			label: 'THE WAR ROOM',
			headline: 'Tactical drawing board with zero-latency Svelte canvas.',
			body: 'An SVG-native tactical pitch board with drag-and-drop player magnets, formation presets, and shareable play exports. Coaches draw at the speed of thought during half-time.',
			stats: ['SVG-native canvas', '22 formation presets', 'Shareable exports'],
			href: '/features#warroom',
		},
		{
			id: 'aegis',
			icon: '⚡',
			accentColor: '#f59e0b',
			label: 'VANGUARD AEGIS',
			headline: 'NSSL 30-30 lightning safety. Automatic. Role-gated.',
			body: 'Real-time weather polling via Open-Meteo and NWS alerts. DANGER state triggers a full-screen Ares Red banner, push notification to the coach\'s device, and a 30-minute all-clear countdown.',
			stats: ['5-min polling cycle', 'Push notifications', 'GO / HOLD / NO-GO'],
			href: '/features#aegis',
		},
		{
			id: 'zerotrust',
			icon: '🔐',
			accentColor: '#22c55e',
			label: 'ZERO-TRUST CORE',
			headline: 'Military-grade COPPA compliance. PII burn by design.',
			body: 'Custom JWT claims, tenant isolation, parental consent gates, 24-hour sensitive document burn protocol, and immutable audit trails. Not a checkbox — a forensic-grade compliance engine.',
			stats: ['COPPA compliant', '24h PII burn', 'Immutable audit log'],
			href: '/features#zerotrust',
		},
		{
			id: 'recruit',
			icon: '🔭',
			accentColor: '#a78bfa',
			label: 'RECRUITER NEXUS',
			headline: 'Global talent intelligence with digital handshake PII access.',
			body: 'Recruiters see a live talent feed, bookmark players, and track growth sparklines across all six metrics. PII is locked behind a digital handshake accepted by the parent or director — Zero-Trust all the way down.',
			stats: ['Paginated talent feed', 'Watchlist alerts', 'Digital Handshake'],
			href: '/features#recruit',
		},
		{
			id: 'media',
			icon: '🎬',
			accentColor: '#ff003c',
			label: 'AI MEDIA VAULT',
			headline: 'EXIF-stripped, content-scanned video analysis. On upload.',
			body: 'Players upload clips; the AEGIS pipeline strips GPS/EXIF metadata, runs a Gemini safety scan, and routes to the media vault. The AI Biomechanics stub is ready for a Python CV model — plug in, no UI changes needed.',
			stats: ['Auto EXIF strip', 'Gemini safety scan', 'Biomechanics hook'],
			href: '/features#media',
		},
	];

	// ── Social proof ──────────────────────────────────────────────────────────

	const TESTIMONIALS = [
		{
			quote:
				'We replaced three separate coaching tools with Vanguard Command. The War Room alone saves two hours of prep per match week.',
			name: 'Marcus J.',
			role: 'Head Coach · FC Meridian Academy',
			initials: 'MJ',
		},
		{
			quote:
				'The recruiter dashboard is unlike anything in youth soccer. I can track a player\'s Vanguard Rating growth over six months with two clicks.',
			name: 'Diane R.',
			role: 'D1 College Recruiter',
			initials: 'DR',
		},
		{
			quote:
				'As a director running 14 teams, the tenant isolation and audit logs mean I can sleep at night. Finally a platform that takes COPPA seriously.',
			name: 'Trevor S.',
			role: 'Club Director · Apex United',
			initials: 'TS',
		},
	];
</script>

<svelte:head>
	<title>Vanguard Command — The Operating System for Elite Human Performance</title>
	<meta
		name="description"
		content="Vanguard Command unifies player tracking, tactical intelligence, and recruiter analytics into one zero-trust platform built for elite youth soccer clubs."
	/>
	<meta property="og:title" content="Vanguard Command — Elite Soccer Performance Platform" />
	<meta
		property="og:description"
		content="Gamified XP, tactical War Room, NSSL weather safety, COPPA compliance, and AI media analysis. One platform. Zero compromises."
	/>
	<meta property="og:type" content="website" />
</svelte:head>

<!-- ═══════════════════════════════════════════════════════════════════════════
     SECTION 1 — HERO
═══════════════════════════════════════════════════════════════════════════ -->
<section class="hero" aria-labelledby="hero-headline">
	<!-- Radial glow backdrops -->
	<div class="hero__glow hero__glow--cyan" aria-hidden="true"></div>
	<div class="hero__glow hero__glow--purple" aria-hidden="true"></div>
	<div class="hero__glow hero__glow--red" aria-hidden="true"></div>

	<div class="hero__inner">
		<!-- Left: copy -->
		<div class="hero__copy">
			<!-- Version badge -->
			<div class="hero__badge" aria-label="Platform status">
				<span class="hero__badge-dot" aria-hidden="true"></span>
				VANGUARD COMMAND · ALPHA 1.0
			</div>

			<h1 class="hero__h1" id="hero-headline">
				The Operating System<br />
				for Elite<br />
				<span class="hero__h1-accent">Human Performance.</span>
			</h1>

			<p class="hero__sub">
				Unify player tracking, tactical intelligence, recruiter analytics, and compliance
				into one zero-trust platform — built for the next generation of competitive soccer.
			</p>

			<div class="hero__ctas">
				<a href="/setup" class="hero__cta hero__cta--primary">
					DEPLOY YOUR CLUB
					<span class="hero__cta-arrow" aria-hidden="true">→</span>
				</a>
				<a href="/features" class="hero__cta hero__cta--ghost">
					SEE THE PLATFORM
				</a>
			</div>

			<p class="hero__disclaimer">
				Free 30-day trial · No credit card required · COPPA compliant
			</p>
		</div>

		<!-- Right: animated VanguardPrism -->
		<div class="hero__prism-wrap" aria-label="Vanguard Rating visualization — animated radar chart">
			<svg
				class="hero__prism-svg"
				viewBox="0 0 {SIZE} {SIZE}"
				width={SIZE}
				height={SIZE}
				aria-hidden="true"
			>
				<defs>
					<!-- Cyan radial fill for the prism polygon -->
					<radialGradient id="prism-fill" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stop-color="rgba(0,240,255,0.35)" />
						<stop offset="100%" stop-color="rgba(0,240,255,0.04)" />
					</radialGradient>
					<!-- Outer ring gradient -->
					<radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
						<stop offset="80%" stop-color="transparent" />
						<stop offset="100%" stop-color="rgba(0,240,255,0.15)" />
					</radialGradient>
					<!-- Drop shadow for polygon -->
					<filter id="prism-glow" x="-30%" y="-30%" width="160%" height="160%">
						<feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
						<feColorMatrix in="blur" type="matrix"
							values="0 0 0 0 0  0 1 0 0 0.94  0 0 1 0 1  0 0 0 0.8 0"
							result="glow" />
						<feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
					</filter>
					<filter id="hex-glow">
						<feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
						<feColorMatrix in="blur" type="matrix"
							values="0 0 0 0 0  0 1 0 0 0.94  0 0 1 0 1  0 0 0 0.5 0"
							result="glow"/>
						<feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
					</filter>
				</defs>

				<!-- Background hex rings (decorative grid) -->
				{#each [0.25, 0.5, 0.75, 1.0] as frac}
					<polygon
						points={PRISM_STATS.map((s) => toXY(s.angle, MAX_R * frac)).map((p) => `${p.x},${p.y}`).join(' ')}
						fill="none"
						stroke="rgba(0,240,255,0.07)"
						stroke-width="1"
					/>
				{/each}

				<!-- Axis lines -->
				{#each PRISM_STATS as s}
					{@const outer = toXY(s.angle, MAX_R)}
					<line
						x1={CENTER} y1={CENTER}
						x2={outer.x} y2={outer.y}
						stroke="rgba(0,240,255,0.1)"
						stroke-width="0.75"
					/>
				{/each}

				<!-- Outer hex ring -->
				<polygon
					points={hexPoints}
					fill="url(#ring-glow)"
					stroke="rgba(0,240,255,0.22)"
					stroke-width="1.5"
					filter="url(#hex-glow)"
					class="prism-outer-ring"
				/>

				<!-- Stats polygon -->
				<polygon
					points={prismPoints}
					fill="url(#prism-fill)"
					stroke="#00f0ff"
					stroke-width="2"
					stroke-linejoin="round"
					filter="url(#prism-glow)"
					class="prism-polygon"
				/>

				<!-- Stat labels + dots -->
				{#each PRISM_STATS as s}
					{@const labelPos = toXY(s.angle, MAX_R + 20)}
					{@const dotPos = toXY(s.angle, (s.value / 99) * MAX_R)}
					<!-- dot on polygon vertex -->
					<circle cx={dotPos.x} cy={dotPos.y} r="3" fill="#00f0ff" opacity="0.9"/>
					<!-- label -->
					<text
						x={labelPos.x}
						y={labelPos.y + 4}
						text-anchor="middle"
						font-family="'JetBrains Mono', monospace"
						font-size="8"
						font-weight="700"
						fill="rgba(0,240,255,0.65)"
						letter-spacing="1"
					>{s.label}</text>
					<!-- value -->
					<text
						x={labelPos.x}
						y={labelPos.y + 13}
						text-anchor="middle"
						font-family="'JetBrains Mono', monospace"
						font-size="7"
						fill="rgba(255,255,255,0.4)"
					>{s.value}</text>
				{/each}

				<!-- Center VAN rating -->
				<circle cx={CENTER} cy={CENTER} r="22" fill="rgba(0,240,255,0.05)" stroke="rgba(0,240,255,0.15)" stroke-width="1"/>
				<text
					x={CENTER} y={CENTER - 5}
					text-anchor="middle"
					font-family="'JetBrains Mono', monospace"
					font-size="16"
					font-weight="900"
					fill="#00f0ff"
				>95</text>
				<text
					x={CENTER} y={CENTER + 8}
					text-anchor="middle"
					font-family="'JetBrains Mono', monospace"
					font-size="6"
					fill="rgba(0,240,255,0.5)"
					letter-spacing="1"
				>VAN</text>
			</svg>

			<!-- Floating stat chips around the prism -->
			<div class="hero__prism-chip hero__prism-chip--1">
				<span class="hero__chip-val">ELITE</span>
				<span class="hero__chip-label">TIER</span>
			</div>
			<div class="hero__prism-chip hero__prism-chip--2">
				<span class="hero__chip-val">4,200 XP</span>
				<span class="hero__chip-label">SEASON</span>
			</div>
			<div class="hero__prism-chip hero__prism-chip--3">
				<span class="hero__chip-val">+12%</span>
				<span class="hero__chip-label">PAC 6mo</span>
			</div>
		</div>
	</div>

	<!-- Scroll cue -->
	<div class="hero__scroll-cue" aria-hidden="true">
		<span class="hero__scroll-line"></span>
		<span class="hero__scroll-label">SCROLL</span>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     SECTION 2 — TRUST BAR
═══════════════════════════════════════════════════════════════════════════ -->
<section class="trust-bar" aria-label="Platform metrics">
	<div class="trust-bar__inner">
		{#each METRICS as metric, i}
			<div class="trust-bar__item">
				<span class="trust-bar__val" aria-live="polite">
					{metric.value < 100
						? displayed[i].toFixed(2)
						: displayed[i].toLocaleString()}{metric.suffix}
				</span>
				<span class="trust-bar__label">{metric.label}</span>
			</div>
			{#if i < METRICS.length - 1}
				<div class="trust-bar__sep" aria-hidden="true"></div>
			{/if}
		{/each}
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     SECTION 3 — FEATURE SHOWCASE
═══════════════════════════════════════════════════════════════════════════ -->
<section class="features" aria-labelledby="features-heading">
	<div class="features__inner">
		<div class="features__header" use:reveal>
			<span class="section-eyebrow">PLATFORM CAPABILITIES</span>
			<h2 class="features__h2" id="features-heading">
				One platform.<br />Zero compromises.
			</h2>
			<p class="features__sub">
				Every module is built for real-world club operations — not demos.
			</p>
		</div>

		<div class="features__grid">
			{#each FEATURES as feat, i}
				<article
					class="feat-card"
					use:reveal={{ delay: (i % 3) * 80 }}
					aria-labelledby="feat-{feat.id}-title"
					style:--accent={feat.accentColor}
				>
					<div class="feat-card__top">
						<span class="feat-card__icon" aria-hidden="true">{feat.icon}</span>
						<span class="feat-card__label">{feat.label}</span>
					</div>
					<h3 class="feat-card__headline" id="feat-{feat.id}-title">
						{feat.headline}
					</h3>
					<p class="feat-card__body">{feat.body}</p>
					<ul class="feat-card__stats" aria-label="Key capabilities">
						{#each feat.stats as stat}
							<li class="feat-card__stat">
								<span class="feat-card__stat-dot" aria-hidden="true"></span>
								{stat}
							</li>
						{/each}
					</ul>
					<a href={feat.href} class="feat-card__link">
						Explore {feat.label.split(' ').slice(-1)[0]} →
					</a>
				</article>
			{/each}
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     SECTION 4 — HOW IT WORKS
═══════════════════════════════════════════════════════════════════════════ -->
<section class="how-it-works" aria-labelledby="hiw-heading">
	<div class="hiw-inner">
		<div use:reveal>
			<span class="section-eyebrow">DEPLOYMENT PROTOCOL</span>
			<h2 class="hiw-h2" id="hiw-heading">Operational in 3 steps.</h2>
		</div>

		<div class="hiw-steps">
			<div class="hiw-step" use:reveal={{ delay: 0 }}>
				<div class="hiw-step__num" aria-hidden="true">01</div>
				<h3 class="hiw-step__title">DIRECTOR REGISTERS</h3>
				<p class="hiw-step__body">
					Club director creates an org, configures teams, and generates
					multi-use invite codes for coaches and players. Zero manual provisioning.
				</p>
			</div>
			<div class="hiw-connector" aria-hidden="true"></div>
			<div class="hiw-step" use:reveal={{ delay: 120 }}>
				<div class="hiw-step__num" aria-hidden="true">02</div>
				<h3 class="hiw-step__title">ROSTER INGESTED</h3>
				<p class="hiw-step__body">
					Upload a CSV, JSON, or PDF league roster. Vanguard ingests,
					creates player profiles, and distributes invite codes instantly.
				</p>
			</div>
			<div class="hiw-connector" aria-hidden="true"></div>
			<div class="hiw-step" use:reveal={{ delay: 240 }}>
				<div class="hiw-step__num" aria-hidden="true">03</div>
				<h3 class="hiw-step__title">PLATFORM ACTIVE</h3>
				<p class="hiw-step__body">
					Coaches run the War Room. Players earn XP. Parents stay looped in.
					Recruiters scout. The whole club operates from one command centre.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     SECTION 5 — TESTIMONIALS
═══════════════════════════════════════════════════════════════════════════ -->
<section class="testimonials" aria-labelledby="testimonials-heading">
	<div class="testimonials__inner">
		<div use:reveal>
			<span class="section-eyebrow">FIELD REPORTS</span>
			<h2 class="testimonials__h2" id="testimonials-heading">From the operators.</h2>
		</div>

		<div class="testimonials__grid">
			{#each TESTIMONIALS as t, i}
				<blockquote class="testimonial" use:reveal={{ delay: i * 100 }}>
					<p class="testimonial__quote">"{t.quote}"</p>
					<footer class="testimonial__footer">
						<div class="testimonial__avatar" aria-hidden="true">{t.initials}</div>
						<div>
							<p class="testimonial__name">{t.name}</p>
							<p class="testimonial__role">{t.role}</p>
						</div>
					</footer>
				</blockquote>
			{/each}
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     SECTION 6 — FINAL CTA
═══════════════════════════════════════════════════════════════════════════ -->
<section class="final-cta" aria-labelledby="cta-heading">
	<div class="final-cta__glow" aria-hidden="true"></div>
	<div class="final-cta__inner" use:reveal>
		<span class="section-eyebrow">DEPLOY NOW</span>
		<h2 class="final-cta__h2" id="cta-heading">
			Your club's command centre<br />is ready for deployment.
		</h2>
		<p class="final-cta__sub">
			30-day free trial. No card required. Migrate an existing roster in minutes with Universal CSV ingestion.
		</p>
		<div class="final-cta__actions">
			<a href="/setup" class="final-cta__btn">
				DEPLOY YOUR CLUB
				<span aria-hidden="true">→</span>
			</a>
			<a href="/pricing" class="final-cta__ghost">VIEW PRICING →</a>
		</div>
		<!-- Mini feature checklist -->
		<ul class="final-cta__checklist" aria-label="Included features">
			{#each ['Universal roster ingestion', 'Tactical War Room', 'Gamified XP system', 'COPPA & SafeSport compliant', 'AI media vault', 'Recruiter Nexus'] as item}
				<li class="final-cta__check">
					<span class="final-cta__check-icon" aria-hidden="true">✓</span>
					{item}
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	/* ── Global helpers ────────────────────────────────────────────────────── */
	:global(.is-revealed) {
		opacity: 1 !important;
		transform: none !important;
	}
	.section-eyebrow {
		display: inline-block;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: rgba(0, 240, 255, 0.6);
		margin-bottom: 0.85rem;
	}

	/* ────────────────────────────────────────────────────────────────────────
	   HERO
	──────────────────────────────────────────────────────────────────────── */
	.hero {
		position: relative;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		padding: 7rem 1.5rem 4rem;
	}

	/* Atmospheric glows */
	.hero__glow {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		filter: blur(120px);
	}
	.hero__glow--cyan {
		width: 600px;
		height: 400px;
		top: 10%;
		right: -5%;
		background: radial-gradient(ellipse, rgba(0, 240, 255, 0.12) 0%, transparent 70%);
		animation: glow-drift 8s ease-in-out infinite alternate;
	}
	.hero__glow--purple {
		width: 500px;
		height: 350px;
		bottom: 20%;
		left: -10%;
		background: radial-gradient(ellipse, rgba(139, 92, 246, 0.08) 0%, transparent 70%);
		animation: glow-drift 11s ease-in-out infinite alternate-reverse;
	}
	.hero__glow--red {
		width: 300px;
		height: 200px;
		top: 40%;
		left: 40%;
		background: radial-gradient(ellipse, rgba(255, 0, 60, 0.05) 0%, transparent 70%);
		animation: glow-drift 13s ease-in-out infinite alternate;
	}

	.hero__inner {
		position: relative;
		z-index: 1;
		max-width: 1180px;
		width: 100%;
		display: flex;
		align-items: center;
		gap: 4rem;
		flex-wrap: wrap;
	}

	/* Copy side */
	.hero__copy {
		flex: 1;
		min-width: 300px;
		max-width: 560px;
	}

	.hero__badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 4px 12px;
		border-radius: 20px;
		border: 1px solid rgba(0, 240, 255, 0.25);
		background: rgba(0, 240, 255, 0.04);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: rgba(0, 240, 255, 0.65);
		margin-bottom: 1.5rem;
	}
	.hero__badge-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #00f0ff;
		box-shadow: 0 0 6px rgba(0, 240, 255, 0.8);
		animation: hero-dot-pulse 2s ease-in-out infinite;
	}

	.hero__h1 {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(2rem, 5.5vw, 3.6rem);
		font-weight: 900;
		line-height: 1.08;
		letter-spacing: -0.02em;
		color: white;
		margin: 0 0 1.5rem;
	}
	.hero__h1-accent {
		background: linear-gradient(135deg, #00f0ff 0%, #8b5cf6 60%, #00f0ff 100%);
		background-size: 200% auto;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: gradient-flow 5s linear infinite;
	}

	.hero__sub {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(0.7rem, 1.8vw, 0.85rem);
		color: rgba(255, 255, 255, 0.45);
		line-height: 1.75;
		margin: 0 0 2rem;
		max-width: 440px;
	}

	.hero__ctas {
		display: flex;
		gap: 0.85rem;
		flex-wrap: wrap;
	}
	.hero__cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.85rem 1.5rem;
		border-radius: 10px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-decoration: none;
		min-height: 48px;
		transition: all 0.25s;
	}
	.hero__cta--primary {
		background: rgba(0, 240, 255, 0.1);
		border: 1px solid rgba(0, 240, 255, 0.55);
		color: #00f0ff;
		box-shadow: 0 0 24px rgba(0, 240, 255, 0.25), inset 0 0 20px rgba(0, 240, 255, 0.04);
	}
	.hero__cta--primary:hover {
		background: rgba(0, 240, 255, 0.18);
		box-shadow: 0 0 48px rgba(0, 240, 255, 0.45), inset 0 0 20px rgba(0, 240, 255, 0.08);
		transform: translateY(-2px);
	}
	.hero__cta-arrow { font-size: 0.9rem; }
	.hero__cta--ghost {
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.45);
	}
	.hero__cta--ghost:hover {
		border-color: rgba(255, 255, 255, 0.3);
		color: white;
		transform: translateY(-2px);
	}

	.hero__disclaimer {
		margin: 1rem 0 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.48rem;
		color: rgba(255, 255, 255, 0.2);
		letter-spacing: 0.08em;
	}

	/* Prism side */
	.hero__prism-wrap {
		position: relative;
		flex-shrink: 0;
	}
	.hero__prism-svg {
		display: block;
		filter: drop-shadow(0 0 40px rgba(0, 240, 255, 0.25));
		animation: prism-float 6s ease-in-out infinite;
	}
	.prism-polygon {
		animation: prism-pulse 3s ease-in-out infinite alternate;
	}
	.prism-outer-ring {
		animation: prism-spin 20s linear infinite;
		transform-origin: 50% 50%;
	}

	/* Floating chips */
	.hero__prism-chip {
		position: absolute;
		padding: 5px 11px;
		border-radius: 6px;
		background: rgba(1, 4, 9, 0.85);
		border: 1px solid rgba(0, 240, 255, 0.2);
		backdrop-filter: blur(8px);
		display: flex;
		flex-direction: column;
		align-items: center;
		font-family: 'JetBrains Mono', monospace;
		animation: chip-float 4s ease-in-out infinite;
	}
	.hero__prism-chip--1 { top: -8px; left: -40px; animation-delay: 0s; }
	.hero__prism-chip--2 { bottom: 10px; left: -50px; animation-delay: 1.3s; }
	.hero__prism-chip--3 { top: 60px; right: -50px; animation-delay: 0.7s; }
	.hero__chip-val {
		font-size: 0.7rem;
		font-weight: 900;
		color: #00f0ff;
	}
	.hero__chip-label {
		font-size: 0.4rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.1em;
	}

	/* Scroll cue */
	.hero__scroll-cue {
		position: absolute;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}
	.hero__scroll-line {
		width: 1px;
		height: 40px;
		background: linear-gradient(to bottom, rgba(0, 240, 255, 0.6), transparent);
		animation: scroll-line 2s ease-in-out infinite;
	}
	.hero__scroll-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.38rem;
		letter-spacing: 0.25em;
		color: rgba(0, 240, 255, 0.3);
	}

	/* ────────────────────────────────────────────────────────────────────────
	   TRUST BAR
	──────────────────────────────────────────────────────────────────────── */
	.trust-bar {
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(8px);
	}
	.trust-bar__inner {
		max-width: 1180px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		flex-wrap: wrap;
	}
	.trust-bar__item {
		flex: 1;
		min-width: 130px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 1.5rem;
	}
	.trust-bar__val {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(1.4rem, 3vw, 2rem);
		font-weight: 900;
		color: white;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		text-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
	}
	.trust-bar__label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.42rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.28);
	}
	.trust-bar__sep {
		width: 1px;
		height: 40px;
		background: rgba(255, 255, 255, 0.06);
	}

	/* ────────────────────────────────────────────────────────────────────────
	   FEATURE SHOWCASE
	──────────────────────────────────────────────────────────────────────── */
	.features {
		padding: 6rem 1.5rem;
	}
	.features__inner {
		max-width: 1180px;
		margin: 0 auto;
	}
	.features__header {
		margin-bottom: 3.5rem;
		opacity: 0;
		transform: translateY(24px);
		transition: opacity 0.7s ease, transform 0.7s ease;
	}
	.features__h2 {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(1.6rem, 4vw, 2.6rem);
		font-weight: 900;
		color: white;
		margin: 0 0 0.75rem;
		line-height: 1.15;
	}
	.features__sub {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.35);
		margin: 0;
	}

	.features__grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
	}

	/* Feature card */
	.feat-card {
		opacity: 0;
		transform: translateY(28px);
		transition: opacity 0.65s ease, transform 0.65s ease, border-color 0.25s, box-shadow 0.25s;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		background: rgba(255, 255, 255, 0.025);
		backdrop-filter: blur(12px);
		padding: 1.75rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		position: relative;
		overflow: hidden;
	}
	.feat-card::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at top left, color-mix(in srgb, var(--accent, #00f0ff) 8%, transparent), transparent 60%);
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.3s;
	}
	.feat-card:hover::before { opacity: 1; }
	.feat-card:hover {
		border-color: color-mix(in srgb, var(--accent, #00f0ff) 30%, transparent);
		box-shadow: 0 0 32px color-mix(in srgb, var(--accent, #00f0ff) 10%, transparent);
	}

	.feat-card__top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.feat-card__icon {
		font-size: 1.1rem;
		filter: grayscale(20%);
	}
	.feat-card__label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: color-mix(in srgb, var(--accent, #00f0ff) 70%, white);
	}

	.feat-card__headline {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
		font-weight: 800;
		color: white;
		margin: 0;
		line-height: 1.4;
	}

	.feat-card__body {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.38);
		margin: 0;
		line-height: 1.75;
		flex: 1;
	}

	.feat-card__stats {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.feat-card__stat {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.52rem;
		color: rgba(255, 255, 255, 0.35);
	}
	.feat-card__stat-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--accent, #00f0ff);
		flex-shrink: 0;
		opacity: 0.7;
	}

	.feat-card__link {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.52rem;
		font-weight: 700;
		color: color-mix(in srgb, var(--accent, #00f0ff) 60%, white);
		text-decoration: none;
		letter-spacing: 0.06em;
		margin-top: 0.25rem;
		transition: color 0.15s;
	}
	.feat-card__link:hover { color: var(--accent, #00f0ff); }

	/* ────────────────────────────────────────────────────────────────────────
	   HOW IT WORKS
	──────────────────────────────────────────────────────────────────────── */
	.how-it-works {
		padding: 5rem 1.5rem;
		background: rgba(0, 0, 0, 0.25);
		backdrop-filter: blur(8px);
		border-top: 1px solid rgba(255, 255, 255, 0.04);
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}
	.hiw-inner {
		max-width: 1180px;
		margin: 0 auto;
	}
	.hiw-h2 {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(1.5rem, 3.5vw, 2.2rem);
		font-weight: 900;
		color: white;
		margin: 0 0 3rem;
	}

	.hiw-steps {
		display: flex;
		align-items: flex-start;
		gap: 0;
		flex-wrap: wrap;
	}
	.hiw-step {
		flex: 1;
		min-width: 220px;
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 0.65s ease, transform 0.65s ease;
	}
	.hiw-step__num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 3rem;
		font-weight: 900;
		color: rgba(0, 240, 255, 0.1);
		line-height: 1;
		margin-bottom: 0.75rem;
	}
	.hiw-step__title {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.15em;
		color: white;
		margin: 0 0 0.5rem;
	}
	.hiw-step__body {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.35);
		line-height: 1.75;
		margin: 0;
		max-width: 260px;
	}
	.hiw-connector {
		width: 60px;
		height: 1px;
		background: linear-gradient(90deg, rgba(0, 240, 255, 0.4), rgba(0, 240, 255, 0.1));
		align-self: center;
		flex-shrink: 0;
		margin: 0 0.5rem;
	}

	/* ────────────────────────────────────────────────────────────────────────
	   TESTIMONIALS
	──────────────────────────────────────────────────────────────────────── */
	.testimonials {
		padding: 5rem 1.5rem;
	}
	.testimonials__inner { max-width: 1180px; margin: 0 auto; }
	.testimonials__h2 {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(1.5rem, 3.5vw, 2.2rem);
		font-weight: 900;
		color: white;
		margin: 0 0 2.5rem;
	}
	.testimonials__grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
	}

	.testimonial {
		opacity: 0;
		transform: translateY(20px);
		transition: opacity 0.65s ease, transform 0.65s ease;
		margin: 0;
		padding: 1.5rem;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		background: rgba(255, 255, 255, 0.02);
		backdrop-filter: blur(10px);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.testimonial:hover { border-color: rgba(0, 240, 255, 0.15); }

	.testimonial__quote {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.55);
		line-height: 1.75;
		margin: 0;
		flex: 1;
	}
	.testimonial__footer { display: flex; align-items: center; gap: 0.65rem; }
	.testimonial__avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(0, 240, 255, 0.08);
		border: 1px solid rgba(0, 240, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		font-weight: 800;
		color: rgba(0, 240, 255, 0.7);
		flex-shrink: 0;
	}
	.testimonial__name {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.58rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.7);
	}
	.testimonial__role {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.45rem;
		color: rgba(255, 255, 255, 0.25);
		letter-spacing: 0.06em;
	}

	/* ────────────────────────────────────────────────────────────────────────
	   FINAL CTA
	──────────────────────────────────────────────────────────────────────── */
	.final-cta {
		position: relative;
		padding: 6rem 1.5rem;
		border-top: 1px solid rgba(0, 240, 255, 0.08);
		overflow: hidden;
		text-align: center;
	}
	.final-cta__glow {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at center, rgba(0, 240, 255, 0.06) 0%, transparent 65%);
		pointer-events: none;
		animation: glow-drift 8s ease-in-out infinite alternate;
	}
	.final-cta__inner {
		position: relative;
		z-index: 1;
		max-width: 680px;
		margin: 0 auto;
		opacity: 0;
		transform: translateY(24px);
		transition: opacity 0.7s ease, transform 0.7s ease;
	}
	.final-cta__h2 {
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(1.5rem, 4vw, 2.6rem);
		font-weight: 900;
		color: white;
		margin: 0 0 1rem;
		line-height: 1.15;
	}
	.final-cta__sub {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.35);
		margin: 0 0 2.5rem;
		line-height: 1.7;
	}
	.final-cta__actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 2rem;
	}
	.final-cta__btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.9rem 2rem;
		border-radius: 10px;
		background: rgba(0, 240, 255, 0.1);
		border: 1px solid rgba(0, 240, 255, 0.55);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: #00f0ff;
		text-decoration: none;
		min-height: 52px;
		box-shadow: 0 0 32px rgba(0, 240, 255, 0.25);
		transition: all 0.25s;
	}
	.final-cta__btn:hover {
		background: rgba(0, 240, 255, 0.18);
		box-shadow: 0 0 60px rgba(0, 240, 255, 0.45);
		transform: translateY(-3px);
	}
	.final-cta__ghost {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.35);
		text-decoration: none;
		transition: color 0.2s;
	}
	.final-cta__ghost:hover { color: white; }

	.final-cta__checklist {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem 1.25rem;
	}
	.final-cta__check {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.52rem;
		color: rgba(255, 255, 255, 0.3);
	}
	.final-cta__check-icon {
		color: rgba(0, 240, 255, 0.55);
		font-size: 0.6rem;
	}

	/* ────────────────────────────────────────────────────────────────────────
	   ANIMATIONS
	──────────────────────────────────────────────────────────────────────── */
	@keyframes glow-drift {
		from { transform: translate(0, 0) scale(1); }
		to   { transform: translate(20px, -15px) scale(1.05); }
	}
	@keyframes hero-dot-pulse {
		0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(0,240,255,0.8); }
		50% { opacity: 0.4; box-shadow: 0 0 2px rgba(0,240,255,0.3); }
	}
	@keyframes gradient-flow {
		0% { background-position: 0% center; }
		100% { background-position: 200% center; }
	}
	@keyframes prism-float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-12px); }
	}
	@keyframes prism-pulse {
		from { opacity: 0.8; }
		to   { opacity: 1; filter: drop-shadow(0 0 8px rgba(0,240,255,0.5)); }
	}
	@keyframes prism-spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}
	@keyframes chip-float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}
	@keyframes scroll-line {
		0% { transform: scaleY(0); transform-origin: top; opacity: 1; }
		50% { transform: scaleY(1); transform-origin: top; opacity: 1; }
		100% { transform: scaleY(1); transform-origin: bottom; opacity: 0; }
	}

	/* ────────────────────────────────────────────────────────────────────────
	   RESPONSIVE
	──────────────────────────────────────────────────────────────────────── */
	@media (max-width: 1024px) {
		.features__grid { grid-template-columns: repeat(2, 1fr); }
		.testimonials__grid { grid-template-columns: repeat(2, 1fr); }
	}
	@media (max-width: 768px) {
		.hero__inner { gap: 2rem; }
		.hero__prism-chip { display: none; }
		.features__grid { grid-template-columns: 1fr; }
		.testimonials__grid { grid-template-columns: 1fr; }
		.trust-bar__sep { display: none; }
		.trust-bar__item { flex: 0 1 45%; }
		.hiw-connector { display: none; }
		.hiw-steps { flex-direction: column; gap: 2rem; }
		.hero__prism-svg { width: 180px; height: 180px; }
	}
</style>
