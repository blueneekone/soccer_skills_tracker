<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';

	let scrolled = $state(false);
	let mobileOpen = $state(false);

	const currentPath = $derived(page.url.pathname);

	const links = [
		{ href: '/features', label: 'Features' },
		{ href: '/pricing', label: 'Pricing' },
		{ href: '/acquisition', label: 'Acquisition' },
		{ href: '/privacy', label: 'Privacy' },
	];

	$effect(() => {
		if (!browser) return;
		const handler = () => { scrolled = window.scrollY > 40; };
		window.addEventListener('scroll', handler, { passive: true });
		return () => window.removeEventListener('scroll', handler);
	});
</script>

<nav class="mn-root" class:mn-root--scrolled={scrolled} aria-label="Site navigation">
	<div class="mn-inner">
		<!-- Brand -->
		<a href="/" class="mn-brand" aria-label="SSTracker home">
			<svg class="mn-brand__hex" viewBox="0 0 28 32" fill="none" aria-hidden="true">
				<polygon points="14,1 27,8 27,24 14,31 1,24 1,8" stroke="#fbbf24" stroke-width="1.5" fill="color-mix(in srgb, #fbbf24 6%, transparent)"/>
				<polygon points="14,7 22,12 22,20 14,25 6,20 6,12" stroke="#334155" stroke-width="0.7" fill="color-mix(in srgb, #334155 20%, transparent)" opacity="0.8"/>
			</svg>
			<span class="mn-brand__text">SSTRACKER<span class="mn-brand__sub">CLUB OS</span></span>
		</a>

		<!-- Desktop links -->
		<div class="mn-links" role="list">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="mn-link"
					class:mn-link--active={currentPath === link.href}
				>
					{link.label}
				</a>
			{/each}
		</div>

		<!-- Desktop CTAs -->
		<div class="mn-ctas">
			<a href="/login" class="tw-vanguard-btn-secondary mn-cta-size">Sign In</a>
			<a href="/setup" class="tw-vanguard-btn-primary mn-cta-size">Start club →</a>
		</div>

		<!-- Mobile hamburger -->
		<button
			class="mn-hamburger"
			onclick={() => (mobileOpen = !mobileOpen)}
			aria-expanded={mobileOpen}
			aria-controls="mn-mobile-menu"
			aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
		>
			<span class="mn-hamburger__bar" class:mn-hamburger__bar--open={mobileOpen}></span>
			<span class="mn-hamburger__bar" class:mn-hamburger__bar--open={mobileOpen}></span>
			<span class="mn-hamburger__bar" class:mn-hamburger__bar--open={mobileOpen}></span>
		</button>
	</div>

	<!-- Mobile menu -->
	{#if mobileOpen}
		<div class="mn-mobile" id="mn-mobile-menu" role="menu">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="mn-mobile__link"
					class:mn-mobile__link--active={currentPath === link.href}
					onclick={() => (mobileOpen = false)}
					role="menuitem"
				>
					{link.label}
				</a>
			{/each}
			<div class="mn-mobile__sep" aria-hidden="true"></div>
			<a href="/login" class="mn-mobile__link" onclick={() => (mobileOpen = false)} role="menuitem">Sign In</a>
			<a href="/setup" class="mn-mobile__cta" onclick={() => (mobileOpen = false)} role="menuitem">Start club →</a>
		</div>
	{/if}
</nav>

<style>
	.mn-root {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		transition: background 0.3s, border-color 0.3s, backdrop-filter 0.3s;
		border-bottom: 1px solid transparent;
	}
	.mn-root--scrolled {
		background: rgba(1, 4, 9, 0.85);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	.mn-inner {
		max-width: 1180px;
		margin: 0 auto;
		padding: 0 1.5rem;
		height: 64px;
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	/* Brand */
	.mn-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		flex-shrink: 0;
	}
	.mn-brand__hex {
		width: 28px;
		height: 32px;
		filter: drop-shadow(0 0 6px color-mix(in srgb, #fbbf24 40%, transparent));
	}
	.mn-brand__text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		color: white;
		line-height: 1;
	}
	.mn-brand__sub {
		display: block;
		font-size: 0.45rem;
		font-weight: 500;
		letter-spacing: 0.25em;
		color: color-mix(in srgb, #94a3b8 80%, transparent);
		margin-top: 1px;
	}

	/* Desktop nav links */
	.mn-links {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
	}
	.mn-link {
		padding: 0.4rem 0.75rem;
		border-radius: 6px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
		transition: color 0.2s, background 0.2s;
	}
	.mn-link:hover, .mn-link--active {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
	}
	.mn-link--active { color: #fbbf24; }

	/* CTAs */
	.mn-ctas {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		flex-shrink: 0;
	}
	/* Compact size override for nav context */
	.mn-cta-size {
		font-size: 0.625rem;
		padding: 0 0.85rem;
		min-height: 34px;
	}

	/* Hamburger */
	.mn-hamburger {
		display: none;
		flex-direction: column;
		gap: 4px;
		padding: 6px;
		background: none;
		border: none;
		cursor: pointer;
		margin-left: auto;
		min-height: 44px;
		min-width: 44px;
		align-items: center;
		justify-content: center;
	}
	.mn-hamburger__bar {
		width: 20px;
		height: 1.5px;
		background: rgba(255, 255, 255, 0.55);
		border-radius: 2px;
		transition: transform 0.25s, opacity 0.25s, width 0.25s;
	}
	.mn-hamburger__bar--open:nth-child(1) { transform: translateY(5.5px) rotate(45deg); }
	.mn-hamburger__bar--open:nth-child(2) { opacity: 0; width: 0; }
	.mn-hamburger__bar--open:nth-child(3) { transform: translateY(-5.5px) rotate(-45deg); }

	/* Mobile menu */
	.mn-mobile {
		display: flex;
		flex-direction: column;
		padding: 0.75rem 1.5rem 1.25rem;
		background: rgba(1, 4, 9, 0.96);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		gap: 0.1rem;
	}
	.mn-mobile__link {
		padding: 0.65rem 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.5);
		text-decoration: none;
		min-height: 44px;
		display: flex;
		align-items: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: color 0.15s;
	}
	.mn-mobile__link:hover, .mn-mobile__link--active { color: white; }
	.mn-mobile__sep { margin: 0.5rem 0; height: 1px; background: rgba(255,255,255,0.06); }
	.mn-mobile__cta {
		margin-top: 0.5rem;
		padding: 0.8rem;
		border-radius: 4px;
		background: var(--vanguard-accent);
		border: 1px solid var(--vanguard-accent);
		font-family: var(--font-mono);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: rgb(2 6 23);
		text-decoration: none;
		text-align: center;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 150ms ease;
	}
	.mn-mobile__cta:hover {
		background: color-mix(in srgb, var(--vanguard-accent) 85%, white 15%);
	}

	@media (max-width: 768px) {
		.mn-links, .mn-ctas { display: none; }
		.mn-hamburger { display: flex; }
	}
</style>
