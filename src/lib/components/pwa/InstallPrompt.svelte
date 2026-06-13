<script lang="ts">
	/**
	 * InstallPrompt.svelte
	 * ────────────────────
	 * Svelte 5 PWA "Add to Home Screen" banner.
	 *
	 * Handles two separate installation pathways:
	 *
	 * Android / Chrome / Edge
	 * ────────────────────────
	 * Captures the native `beforeinstallprompt` event, suppresses the browser's
	 * default mini-infobar, and shows our Vanguard-branded banner instead.
	 * On user confirmation → calls `deferredPrompt.prompt()`.
	 *
	 * iOS Safari
	 * ──────────
	 * iOS does not fire `beforeinstallprompt`.  We detect:
	 *   - User agent is iPhone/iPad
	 *   - NOT in standalone mode (`window.navigator.standalone !== true`)
	 *   - Not previously dismissed (localStorage flag)
	 * Then show a "tap Share → Add to Home Screen" instruction card.
	 *
	 * Dismissed state is persisted in `localStorage` with a 30-day expiry
	 * so the banner doesn't nag on every visit.
	 */

	import { browser } from '$app/environment';

	// ── Constants ──────────────────────────────────────────────────────────────
	const DISMISSED_KEY = 'vg_pwa_dismissed_at';
	const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

	// ── State ──────────────────────────────────────────────────────────────────
	type Variant = 'android' | 'ios' | null;
	let variant = $state<Variant>(null);
	let visible = $state(false);

	// Android: hold a ref to the deferred prompt event
	let deferredPrompt = $state<(Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }) | null>(null);

	// ── Helpers ────────────────────────────────────────────────────────────────
	function isDismissed(): boolean {
		try {
			const raw = localStorage.getItem(DISMISSED_KEY);
			if (!raw) return false;
			return Date.now() - Number(raw) < DISMISS_TTL_MS;
		} catch {
			return false;
		}
	}

	function persist() {
		try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* */ }
	}

	function isIOS(): boolean {
		return /iphone|ipad|ipod/i.test(navigator.userAgent);
	}

	function isInStandaloneMode(): boolean {
		return (
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as Navigator & { standalone?: boolean }).standalone === true
		);
	}

	// ── Mount: register service worker + detect install eligibility ────────────
	$effect(() => {
		if (!browser) return;
		if (isDismissed() || isInStandaloneMode()) return;

		// SvelteKit auto-registers /service-worker.js at scope '/'.
		// No manual registration needed here — see src/service-worker.ts.

		// Android / Chrome / Edge path
		const handler = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e as typeof deferredPrompt;
			variant = 'android';
			visible = true;
		};
		window.addEventListener('beforeinstallprompt', handler);

		// iOS path — show if mobile Safari and not already installed
		if (isIOS() && !isInStandaloneMode()) {
			variant = 'ios';
			visible = true;
		}

		// Clean up on appinstalled (Android)
		window.addEventListener('appinstalled', () => {
			visible = false;
			deferredPrompt = null;
			persist();
		});

		return () => {
			window.removeEventListener('beforeinstallprompt', handler);
		};
	});

	// ── Actions ────────────────────────────────────────────────────────────────
	async function handleInstall() {
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') persist();
		deferredPrompt = null;
		visible = false;
	}

	function handleDismiss() {
		persist();
		visible = false;
	}
</script>

{#if visible}
	<div class="ip-banner" role="complementary" aria-label="Install SSTracker app">
		<!-- Left: icon + copy -->
		<div class="ip-left">
			<div class="ip-icon" aria-hidden="true">▼</div>
			<div class="ip-copy">
				<p class="ip-copy__title">INSTALL SSTRACKER</p>
				{#if variant === 'ios'}
					<p class="ip-copy__sub">
						Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> for offline access.
					</p>
				{:else}
					<p class="ip-copy__sub">Add to home screen for the full native experience.</p>
				{/if}
			</div>
		</div>

		<!-- Right: actions -->
		<div class="ip-actions">
			{#if variant === 'android'}
				<button class="ip-btn ip-btn--primary" onclick={handleInstall}>INSTALL</button>
			{/if}
			<button class="ip-btn ip-btn--ghost" onclick={handleDismiss} aria-label="Dismiss">✕</button>
		</div>
	</div>
{/if}

<style>
	.ip-banner {
		position: fixed;
		bottom: 4.5rem; /* sits above the ReportAnomaly button */
		left: 50%;
		transform: translateX(-50%);
		z-index: 8887;
		width: min(420px, calc(100vw - 2rem));
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(6, 8, 16, 0.97);
		border: 1px solid var(--vanguard-border);
		border-radius: var(--vanguard-radius-sm);
		box-shadow: var(--vanguard-elev-2);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		animation: ip-slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1);
	}

	@keyframes ip-slide-up {
		from { opacity: 0; transform: translateX(-50%) translateY(12px); }
		to   { opacity: 1; transform: translateX(-50%) translateY(0); }
	}

	.ip-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
		flex: 1;
	}

	.ip-icon {
		font-size: 0.9rem;
		color: rgba(20, 184, 166, 0.6);
		flex-shrink: 0;
	}

	.ip-copy { min-width: 0; }

	.ip-copy__title {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.14em;
		color: #ffffff;
	}

	.ip-copy__sub {
		margin: 0.2rem 0 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.58rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.4);
	}

	.ip-copy__sub strong { color: rgba(20, 184, 166, 0.75); font-weight: 700; }

	.ip-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.ip-btn {
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.ip-btn--primary {
		background: rgba(20, 184, 166, 0.12);
		border: 1px solid rgba(20, 184, 166, 0.45);
		color: #14b8a6;
	}

	.ip-btn--primary:hover {
		background: rgba(20, 184, 166, 0.2);
		box-shadow: 0 0 12px rgba(20, 184, 166, 0.2);
	}

	.ip-btn--ghost {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.35);
		padding: 0.35rem 0.5rem;
	}

	.ip-btn--ghost:hover {
		border-color: rgba(255, 77, 106, 0.35);
		color: rgba(255, 77, 106, 0.7);
	}
</style>
