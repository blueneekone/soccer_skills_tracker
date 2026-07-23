<script lang="ts">
	import { browser } from '$app/environment';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';
	import { loadThirdPartyScript } from '$lib/stores/teenAdGuard.svelte.js';

	let { data } = $props();

	let clubName = $derived(data.clubName || '');
	let brandLogoUrl = $derived(data.brandLogoUrl || '');
	let clubSport = $derived(data.sport || 'generic');
	let brandPrimaryHex = $derived(data.brandPrimaryHex || '');
	let brandAccentHex = $derived(data.brandAccentHex || '');
	let metaPixelId = $derived(data.metaPixelId || '');
	let googleAnalyticsId = $derived(data.googleAnalyticsId || '');
	let athletes = $derived(data.athletes || []);

	/**
	 * @param {Record<string, unknown>} scores
	 */
	function topThreeTrials(scores) {
		if (!scores || typeof scores !== 'object') return [];
		const rows = Object.entries(scores).map(([skill, v]) => ({
			skill,
			value: String(v),
		}));
		return rows.slice(0, 3);
	}

	/**
	 * @param {string} s
	 */
	function sportKickerLabel(s) {
		const map = {
			soccer: 'Youth soccer',
			basketball: 'Youth basketball',
			baseball: 'Youth baseball',
			football: 'Youth football',
			volleyball: 'Youth volleyball',
			hockey: 'Youth hockey',
			lacrosse: 'Youth lacrosse',
			generic: 'Youth sports',
		};
		return map[/** @type {keyof typeof map} */ (s)] ?? map.generic;
	}

	$effect(() => () => {
		document.querySelectorAll('[data-club-landing-track]').forEach((n) => n.remove());
	});

	$effect(() => {
		if (!browser) return;
		const px = metaPixelId;
		const ga = googleAnalyticsId;
		document.querySelectorAll('[data-club-landing-track]').forEach((n) => n.remove());

		if (px) {
			const sdkScript = loadThirdPartyScript(
				'https://connect.facebook.net/en_US/fbevents.js',
				'fb-pixel',
			);
			if (sdkScript) {
				const s = document.createElement('script');
				s.setAttribute('data-club-landing-track', 'fb');
				s.textContent =
					`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
					`n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
					`n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];` +
					`}(window,document,'script','');` +
					`fbq('init','${px}');fbq('track','PageView');`;
				document.head.appendChild(s);
				const nos = document.createElement('noscript');
				nos.setAttribute('data-club-landing-track', 'fb-img');
				const img = document.createElement('img');
				img.height = 1;
				img.width = 1;
				img.style.display = 'none';
				img.alt = '';
				img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(px)}&ev=PageView&noscript=1`;
				nos.appendChild(img);
				document.head.appendChild(nos);
			}
		}
		if (ga) {
			const gtagScript = loadThirdPartyScript(
				`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`,
				'gtag',
			);
			if (gtagScript) {
				gtagScript.setAttribute('data-club-landing-track', 'ga');
				const s2 = document.createElement('script');
				s2.setAttribute('data-club-landing-track', 'ga-inline');
				s2.textContent =
					`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
					`gtag('js',new Date());gtag('config','${ga}');`;
				document.head.appendChild(s2);
			}
		}
	});
</script>

<svelte:head>
	<title>
		{clubName ? `${clubName} · Join` : 'Club · SSTRACKER'}
	</title>
	<meta name="robots" content="index,follow" />
</svelte:head>

<div
	class="clp-root"
	style={brandPrimaryHex && brandAccentHex ?
		`--clp-brand:${brandPrimaryHex};--clp-accent:${brandAccentHex};`
	:	''}
>
	<header class="clp-hero clp-panel">
		<div class="clp-brand">
			<ClubLogoMark size="xl" logoUrl={brandLogoUrl} sport={clubSport} />
			<div>
				<p class="clp-kicker">{sportKickerLabel(clubSport)} · SSTRACKER</p>
				<h1 class="clp-h1">{clubName || 'Our club'}</h1>
				<p class="clp-lead">
					Train with purpose. Register to join sessions, track skills, and stay connected with your team.
				</p>
			</div>
		</div>
		<div class="clp-cta-row">
			<a class="clp-btn clp-btn--primary" style="background-color: #fbbf24; border-color: #f59e0b; color: #000;" href="/setup">Register for Tryouts</a>
			<a class="clp-btn clp-btn--ghost" href="/login">Sign in</a>
		</div>
	</header>

	{#if athletes.length > 0}
		<section class="clp-panel">
			<h2 class="clp-h2">Featured athletes</h2>
			<p class="clp-muted clp-sub">
				Coach-verified highlights from players who opted into public recruiting profiles (16+).
			</p>
			<div class="clp-grid">
				{#each athletes as row (row.id)}
					<div class="clp-card">
						<div class="clp-card-watermark" aria-hidden="true">
							<ClubLogoMark
								size="lg"
								logoUrl={typeof row.brandLogoUrl === 'string' ? row.brandLogoUrl : ''}
							/>
						</div>
						<div class="clp-card-top">
							<div>
								<h3 class="clp-name">{String(row.displayName ?? '—')}</h3>
								<p class="clp-meta">
									{String(row.ageGroup ?? '—')} · {String(row.position ?? '—')}
									{#if row.clubDisplayName}
										· {String(row.clubDisplayName)}
									{/if}
								</p>
							</div>
							<div class="clp-ring">
								<LevelProgressRing
									totalXp={typeof row.total_xp === 'number' ? row.total_xp : 0}
									level={typeof row.current_level === 'number' ? row.current_level : 1}
								/>
							</div>
						</div>
						<div class="clp-trials">
							<p class="clp-trials-label">Top verified trials</p>
							<div class="clp-trials-grid">
								{#each topThreeTrials(/** @type {Record<string, unknown>} */ (row.verified_trial_scores || {})) as trial}
									<div class="clp-trial-stat">
										<span class="clp-trial-val">{trial.value}</span>
										<span class="clp-trial-key">{trial.skill}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	/* ── Root/Theme ──────────────────────────────────────────────────────────── */
	.clp-root {
		min-height: 100vh;
		background: #000000;
		color: #e4e4e7;
		font-family: 'Inter', sans-serif;
		padding: 2rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		--clp-brand: #14b8a6;
		--clp-accent: #60a5fa;
	}

	.clp-panel {
		width: 100%;
		max-width: 800px;
	}

	.clp-muted {
		color: #a1a1aa;
		text-align: center;
		font-size: 0.95rem;
	}

	/* ── Typography ──────────────────────────────────────────────────────────── */
	.clp-kicker {
		margin: 0 0 0.5rem;
		font-family: 'Geist Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--clp-accent);
	}

	.clp-h1 {
		margin: 0 0 0.5rem;
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: #ffffff;
		line-height: 1.1;
	}

	.clp-h2 {
		margin: 0 0 0.25rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: #ffffff;
	}

	.clp-lead {
		margin: 0;
		font-size: 1rem;
		line-height: 1.5;
		color: #d4d4d8;
		max-width: 500px;
	}

	.clp-sub {
		margin: 0 0 1.5rem;
		font-size: 0.85rem;
	}

	/* ── Hero ────────────────────────────────────────────────────────────────── */
	.clp-hero {
		background: #09090b;
		border: 1px solid #27272a;
		border-radius: 16px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		position: relative;
		overflow: hidden;
	}

	.clp-hero::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: linear-gradient(to right, var(--clp-brand), var(--clp-accent));
	}

	.clp-brand {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.clp-cta-row {
		display: flex;
		gap: 1rem;
	}

	.clp-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 44px;
		padding: 0 1.5rem;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.clp-btn--primary {
		background: var(--clp-brand);
		color: #000;
		border: 1px solid transparent;
	}
	.clp-btn--primary:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.clp-btn--ghost {
		background: transparent;
		color: #e4e4e7;
		border: 1px solid #3f3f46;
	}
	.clp-btn--ghost:hover {
		background: #18181b;
		border-color: #52525b;
	}

	/* ── Grid & Cards ────────────────────────────────────────────────────────── */
	.clp-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.clp-card {
		background: #09090b;
		border: 1px solid #27272a;
		border-radius: 12px;
		padding: 1.25rem;
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.clp-card-watermark {
		position: absolute;
		bottom: -20px;
		right: -20px;
		opacity: 0.05;
		pointer-events: none;
		filter: grayscale(1);
	}

	.clp-card-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		position: relative;
		z-index: 1;
	}

	.clp-name {
		margin: 0 0 0.25rem;
		font-size: 1rem;
		font-weight: 700;
		color: #ffffff;
	}

	.clp-meta {
		margin: 0;
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	.clp-ring {
		flex-shrink: 0;
		background: #000000;
		border-radius: 50%;
		padding: 4px;
		border: 1px solid #27272a;
	}

	.clp-trials {
		background: #000000;
		border: 1px solid #27272a;
		border-radius: 8px;
		padding: 0.75rem;
		position: relative;
		z-index: 1;
	}

	.clp-trials-label {
		margin: 0 0 0.5rem;
		font-family: 'Geist Mono', monospace;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #52525b;
	}

	.clp-trials-grid {
		display: flex;
		gap: 1rem;
	}

	.clp-trial-stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.clp-trial-val {
		font-family: 'Geist Mono', monospace;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--clp-accent);
	}

	.clp-trial-key {
		font-size: 0.6rem;
		color: #71717a;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* ── Responsive ──────────────────────────────────────────────────────────── */
	@media (max-width: 600px) {
		.clp-brand {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}
		.clp-cta-row {
			flex-direction: column;
		}
	}
</style>
