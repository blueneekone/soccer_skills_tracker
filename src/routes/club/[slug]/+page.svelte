<script>
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import LevelProgressRing from '$lib/components/LevelProgressRing.svelte';

	const getPublicClubLanding = httpsCallable(functions, 'getPublicClubLanding');

	let status = $state(/** @type {'loading' | 'ok' | 'missing'} */ ('loading'));
	let clubName = $state('');
	let brandLogoUrl = $state('');
	/** Canonical sport key from `clubs.sport` (public callable). */
	let clubSport = $state('generic');
	let brandPrimaryHex = $state('');
	let brandAccentHex = $state('');
	let metaPixelId = $state('');
	let googleAnalyticsId = $state('');
	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let athletes = $state([]);

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

	function sanitizePixelId(id) {
		const s = String(id || '').trim();
		return /^\d{10,20}$/.test(s) ? s : '';
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

	function sanitizeGaId(id) {
		const s = String(id || '').trim();
		if (/^G-[A-Z0-9]+$/i.test(s)) return s.toUpperCase();
		if (/^UA-\d+-\d+$/.test(s)) return s;
		return '';
	}

	$effect(() => {
		if (!browser) return;
		const slug = (page.params.slug || '').trim().toLowerCase();
		if (!slug) {
			status = 'missing';
			return;
		}
		let cancelled = false;
		status = 'loading';
		(async () => {
			try {
				const res = await getPublicClubLanding({ slug });
				/** @type {Record<string, unknown>} */
				const data = res.data || {};
				if (cancelled) return;
				if (data.ok !== true || data.notFound === true) {
					status = 'missing';
					return;
				}
				clubName = typeof data.clubName === 'string' ? data.clubName : '';
				clubSport = typeof data.sport === 'string' ? data.sport : 'generic';
				brandLogoUrl = typeof data.brandLogoUrl === 'string' ? data.brandLogoUrl : '';
				brandPrimaryHex =
					typeof data.brandPrimaryHex === 'string' ? data.brandPrimaryHex : '';
				brandAccentHex =
					typeof data.brandAccentHex === 'string' ? data.brandAccentHex : '';
				metaPixelId = sanitizePixelId(
					typeof data.metaPixelId === 'string' ? data.metaPixelId : '',
				);
				googleAnalyticsId = sanitizeGaId(
					typeof data.googleAnalyticsId === 'string' ? data.googleAnalyticsId : '',
				);
				const raw = data.athletes;
				athletes = Array.isArray(raw)
					? /** @type {typeof athletes} */ (raw.slice())
					: [];
				status = 'ok';
			} catch (e) {
				console.error(e);
				if (!cancelled) status = 'missing';
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	$effect(() => () => {
		document.querySelectorAll('[data-club-landing-track]').forEach((n) => n.remove());
	});

	$effect(() => {
		if (!browser || status !== 'ok') return;
		const px = metaPixelId;
		const ga = googleAnalyticsId;
		document.querySelectorAll('[data-club-landing-track]').forEach((n) => n.remove());
		if (px) {
			const s = document.createElement('script');
			s.setAttribute('data-club-landing-track', 'fb');
			s.textContent =
				`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
				`n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
				`n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
				`t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}` +
				`(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
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
		if (ga) {
			const s1 = document.createElement('script');
			s1.async = true;
			s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`;
			s1.setAttribute('data-club-landing-track', 'ga');
			document.head.appendChild(s1);
			const s2 = document.createElement('script');
			s2.setAttribute('data-club-landing-track', 'ga-inline');
			s2.textContent =
				`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
				`gtag('js',new Date());gtag('config','${ga}');`;
			document.head.appendChild(s2);
		}
	});
</script>

<svelte:head>
	<title>
		{status === 'ok' && clubName ? `${clubName} · Join` : 'Club · SSTRACKER'}
	</title>
	<meta name="robots" content="index,follow" />
</svelte:head>

<div
	class="clp-root"
	style={brandPrimaryHex && brandAccentHex ?
		`--clp-brand:${brandPrimaryHex};--clp-accent:${brandAccentHex};`
	:	''}
>
	{#if status === 'loading'}
		<section class="clp-panel">
			<p class="clp-muted">Loading…</p>
		</section>
	{:else if status === 'missing'}
		<section class="clp-panel">
			<h1 class="clp-h1">Club not found</h1>
			<p class="clp-lead">This public link is invalid or the club has not published a storefront yet.</p>
			<a class="clp-btn clp-btn--primary" href="/">Home</a>
		</section>
	{:else}
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
				<a class="clp-btn clp-btn--primary" href="/setup">Join club / Register</a>
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
								<ul>
									{#each topThreeTrials(/** @type {Record<string, unknown>} */ (row.verified_trial_scores || {})) as t}
										<li><span>{t.skill}</span> <strong>{t.value}</strong></li>
									{:else}
										<li class="clp-muted">—</li>
									{/each}
								</ul>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.clp-root {
		min-height: 100vh;
		box-sizing: border-box;
		padding: 24px 16px 48px;
		background: #fafafa;
		color: var(--text-primary, #0f172a);
	}

	:global(html.dark) .clp-root {
		background: #09090b;
		color: var(--text-primary, #fafafa);
	}

	.clp-panel {
		max-width: 960px;
		margin: 0 auto 12px;
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #ffffff;
		padding: 18px 16px;
		box-sizing: border-box;
	}

	:global(html.dark) .clp-panel {
		border-color: rgba(255, 255, 255, 0.1);
		background: #0f0f11;
	}

	.clp-hero {
		padding: 20px 18px;
	}

	.clp-brand {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		align-items: flex-start;
		margin-bottom: 16px;
	}

	.clp-kicker {
		margin: 0 0 4px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary, #64748b);
	}

	.clp-h1 {
		margin: 0 0 8px;
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.clp-h2 {
		margin: 0 0 6px;
		font-size: 13px;
		font-weight: 600;
	}

	.clp-lead {
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-secondary, #64748b);
		max-width: 52ch;
	}

	.clp-sub {
		margin: 0 0 14px;
	}

	.clp-cta-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.clp-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 10px 16px;
		border-radius: 10px;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
		border: 1px solid #e5e5e5;
		background: #ffffff;
		color: var(--text-primary, #0f172a);
	}

	:global(html.dark) .clp-btn {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
		color: #fafafa;
	}

	.clp-btn--primary {
		background: var(--clp-brand, var(--brand-primary, #f59e0b));
		border-color: color-mix(in srgb, var(--clp-brand, #f59e0b) 60%, #0f172a);
		color: #0f172a;
	}

	.clp-btn--ghost {
		background: transparent;
	}

	.clp-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
		gap: 12px;
	}

	.clp-card {
		position: relative;
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		padding: 14px;
		background: #fafafa;
		overflow: hidden;
	}

	:global(html.dark) .clp-card {
		border-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	.clp-card-watermark {
		position: absolute;
		right: 8px;
		bottom: 4px;
		opacity: 0.12;
		pointer-events: none;
	}

	.clp-card-top {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		align-items: flex-start;
		position: relative;
		z-index: 1;
	}

	.clp-name {
		margin: 0 0 4px;
		font-size: 15px;
		font-weight: 700;
	}

	.clp-meta {
		margin: 0;
		font-size: 11px;
		color: var(--text-secondary, #64748b);
	}

	.clp-ring {
		flex-shrink: 0;
	}

	.clp-trials {
		margin-top: 12px;
		position: relative;
		z-index: 1;
	}

	.clp-trials-label {
		margin: 0 0 6px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary, #64748b);
	}

	.clp-trials ul {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 12px;
	}

	.clp-trials li {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		padding: 2px 0;
	}

	.clp-muted {
		margin: 0;
		font-size: 12px;
		color: var(--text-secondary, #64748b);
	}
</style>
