<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { applyLoginWaterfall } from '$lib/auth/loginRouting.js';
	import CheckrEmbed from './CheckrEmbed.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	export const ssr = false;

	// Phase 2, Epic 2 — Session L.  Once isCleared flips true, route back to
	// the role-appropriate home.  Hard-coding /coach breaks director/tutor
	// flows (now in scope); the login waterfall already handles every role.
	$effect(() => {
		if (authStore.isLoading) return;
		if (authStore.isCleared && browser) {
			const dest = untrack(() =>
				applyLoginWaterfall(authStore.role, authStore.userProfile),
			);
			untrack(() => goto(dest, { replaceState: true }));
		}
	});
</script>

<svelte:head>
	<title>Background Screening — SSTracker</title>
</svelte:head>

<div class="ct-root">
	<div class="ct-grid" aria-hidden="true"></div>

	<header class="ct-header">
		<div class="ct-shield" aria-hidden="true">
			<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path
					d="M32 4L8 14v18c0 14 11 26 24 28 13-2 24-14 24-28V14L32 4Z"
					stroke="currentColor"
					stroke-width="2.5"
					fill="none"
				/>
				<line x1="32" y1="22" x2="32" y2="34" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
				<circle cx="32" cy="41" r="2.5" fill="currentColor" />
			</svg>
		</div>
		<div class="ct-header__text">
			<div class="ct-badge">Coach clearance</div>
			<h1 class="ct-title">Background screening required</h1>
			<p class="ct-subtitle">
				Before you can access coaching tools, your club needs a completed background check
				and SafeSport-compliant clearance. Screening is handled securely by Checkr — your
				SSN and payment details never touch this platform.
			</p>
		</div>
	</header>

	<div class="ct-strip">
		<span>Signed in as {authStore.user?.email ?? '—'}</span>
		<span>Status: {(authStore.userProfile?.clearance?.status) ?? 'pending'}</span>
	</div>

	<div class="ct-embed-shell ct-embed-shell--light">
		<CheckrEmbed />
	</div>

	<div class="ct-zero-liability">
		<Icon name="sys.lock-simple" />
		<span>PII, SSN, and payment data are processed only inside Checkr's encrypted flow.</span>
	</div>
</div>

<style>
	.ct-root {
		min-height: 100dvh;
		background: var(--vanguard-bg, #010409);
		color: #e5e7eb;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem 4rem;
		gap: 1.5rem;
		position: relative;
		overflow: hidden;
	}

	.ct-grid {
		position: fixed;
		inset: 0;
		pointer-events: none;
		background-image:
			linear-gradient(rgba(255, 0, 60, 0.02) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 0, 60, 0.02) 1px, transparent 1px);
		background-size: 3rem 3rem;
		z-index: 0;
	}

	.ct-root > * {
		position: relative;
		z-index: 1;
	}

	.ct-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		text-align: center;
		max-width: 560px;
	}

	.ct-shield {
		width: 3.5rem;
		height: 3.5rem;
		color: var(--vanguard-red, #ff003c);
		opacity: 0.85;
	}

	.ct-badge {
		font-size: 0.6875rem;
		letter-spacing: 0.08em;
		font-weight: 600;
		color: rgba(229, 231, 235, 0.7);
		text-transform: uppercase;
	}

	.ct-title {
		margin: 0;
		font-size: clamp(1.35rem, 4vw, 1.75rem);
		font-weight: 700;
		color: #f3f4f6;
		letter-spacing: -0.01em;
	}

	.ct-subtitle {
		margin: 0;
		font-size: 0.9375rem;
		color: rgba(229, 231, 235, 0.65);
		line-height: 1.6;
	}

	.ct-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		justify-content: center;
		font-size: 0.8125rem;
		color: rgba(229, 231, 235, 0.45);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding: 0.5rem 1rem;
		width: 100%;
		max-width: 680px;
	}

	.ct-embed-shell {
		width: 100%;
		max-width: 760px;
	}

	.ct-embed-shell--light {
		background: #f8fafc;
		border-radius: 12px;
		padding: 1.25rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
	}

	.ct-zero-liability {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.75rem;
		color: rgba(229, 231, 235, 0.35);
		max-width: 560px;
		text-align: center;
		justify-content: center;
	}

	.ct-zero-liability :global(svg) {
		width: 0.85rem;
		height: 0.85rem;
		flex-shrink: 0;
	}
</style>
