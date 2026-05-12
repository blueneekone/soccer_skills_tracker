<script>
	import { browser } from '$app/environment';

	const STORAGE_KEY = 'pwa_install_banner_dismissed_v1';

	/** @type {boolean} */
	let runningStandalone = $state(true);
	/** @type {boolean} */
	let sessionDismissed = $state(false);
	/** 'ios' = manual (Safari), 'native' = deferred beforeinstallprompt */
	/** @type {'ios' | 'native' | null} */
	let installVariant = $state(null);
	/** @type {BeforeInstallPromptEvent | null} */
	let deferredInstall = $state(null);

	/**
	 * PWA is already open as installed / standalone: hide the prompt completely.
	 */
	function isRunningStandalonePwa() {
		if (typeof window === 'undefined') return true;
		try {
			if (window.matchMedia('(display-mode: standalone)').matches) return true;
		} catch {
			/* ignore */
		}
		const nav = window.navigator;
		if (nav && 'standalone' in nav && /** @type {Navigator & { standalone?: boolean }} */ (nav).standalone === true) {
			return true;
		}
		return false;
	}

	/**
	 * iOS Safari (or WebKit) — no reliable beforeinstallprompt; user must use Share → Add to Home Screen.
	 * Includes iPadOS desktop UA (Macintosh + touch).
	 */
	function isIOSUserAgent() {
		if (typeof navigator === 'undefined') return false;
		const ua = navigator.userAgent;
		if (/iPad|iPhone|iPod/.test(ua)) return true;
		return /Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document;
	}

	/**
	 * iOS PWA path: on iOS, not already in standalone (see Mission: !navigator.standalone pattern + display-mode).
	 */
	function shouldShowIOSManualPath() {
		if (!browser) return false;
		if (isRunningStandalonePwa()) return false;
		return isIOSUserAgent();
	}

	function readDismissed() {
		try {
			return sessionStorage.getItem(STORAGE_KEY) === '1';
		} catch {
			return false;
		}
	}

	function dismiss() {
		try {
			sessionStorage.setItem(STORAGE_KEY, '1');
		} catch {
			/* ignore */
		}
		sessionDismissed = true;
		installVariant = null;
	}

	/**
	 * @param {Event} e
	 */
	function onBeforeInstallPrompt(e) {
		e.preventDefault();
		// iOS: manual “Add to Home Screen” only; do not take over with native flow.
		if (shouldShowIOSManualPath()) return;
		const bip = /** @type {BeforeInstallPromptEvent} */ (e);
		deferredInstall = bip;
		installVariant = 'native';
	}

	async function runNativeInstall() {
		const ev = deferredInstall;
		if (!ev) return;
		try {
			await ev.prompt();
			await ev.userChoice;
		} catch {
			/* ignore */
		} finally {
			deferredInstall = null;
			dismiss();
		}
	}

	const showPrompt = $derived(
		!runningStandalone && !sessionDismissed && (installVariant === 'ios' || installVariant === 'native'),
	);

	$effect(() => {
		if (!browser) return;
		runningStandalone = isRunningStandalonePwa();
		sessionDismissed = readDismissed();

		if (runningStandalone || sessionDismissed) {
			return;
		}

		if (shouldShowIOSManualPath()) {
			installVariant = 'ios';
		}

		window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
		return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
	});
</script>

{#if showPrompt}
	<div
		class="pwa-boost tw-pointer-events-auto tw-fixed tw-inset-x-0 tw-bottom-0 tw-z-[200] tw-flex tw-justify-center tw-p-3 sm:tw-p-4"
		role="status"
		aria-live="polite"
	>
		{#if installVariant === 'ios'}
			<div
				class="tw-flex tw-w-full tw-max-w-lg tw-flex-col tw-gap-3 tw-rounded-lg tw-border-2 tw-border-cyan-400/45 tw-bg-[#05050a] tw-px-4 tw-py-4 tw-text-cyan-100 tw-shadow-[0_0_28px_rgba(0, 240, 255,0.16)]"
			>
				<p
					class="tw-m-0 tw-text-center tw-text-[0.8rem] tw-font-semibold tw-leading-relaxed tw-tracking-wide tw-text-cyan-50/95"
				>
					To install on iOS: Tap the Share button below, then select Add to Home Screen.
				</p>
				<div class="tw-flex tw-items-center tw-justify-center tw-gap-2" aria-hidden="true">
					<span
						class="tw-inline-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-rounded-md tw-border tw-border-cyan-500/50 tw-bg-black/50 tw-text-cyan-300"
					>
						<i class="ph ph-share-network tw-text-base"></i>
					</span>
					<span class="tw-text-[0.65rem] tw-font-mono tw-uppercase tw-tracking-widest tw-text-cyan-500/80"
						>Share</span
					>
					<span class="tw-text-cyan-600">→</span>
					<span
						class="tw-text-[0.65rem] tw-font-mono tw-font-bold tw-uppercase tw-tracking-wider tw-text-cyan-300"
						>Add to Home Screen</span
					>
				</div>
				<div class="tw-flex tw-justify-end">
					<button
						type="button"
						class="tw-min-h-10 tw-rounded tw-border tw-border-cyan-500/40 tw-bg-cyan-950/40 tw-px-4 tw-font-mono tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-cyan-300 tw-transition hover:tw-border-cyan-400/60 hover:tw-text-cyan-200"
						onclick={dismiss}
					>
						Dismiss
					</button>
				</div>
			</div>
		{:else if installVariant === 'native'}
			<div
				class="tw-flex tw-w-full tw-max-w-lg tw-flex-col tw-gap-3 tw-rounded-lg tw-border tw-border-cyan-500/40 tw-bg-[#05050a] tw-px-4 tw-py-3 tw-text-cyan-200 tw-shadow-[0_0_24px_rgba(0, 240, 255,0.12)]"
			>
				<p
					class="tw-m-0 tw-text-center tw-font-mono tw-text-[0.7rem] tw-font-bold tw-uppercase tw-tracking-[0.12em] tw-text-cyan-100/90"
				>
					Install SSTRACKER for faster access
				</p>
				<div class="tw-flex tw-flex-wrap tw-justify-end tw-gap-2">
					<button
						type="button"
						class="tw-min-h-11 tw-rounded tw-border-2 tw-border-cyan-400/60 tw-bg-cyan-500/10 tw-px-5 tw-font-mono tw-text-[0.7rem] tw-font-extrabold tw-uppercase tw-tracking-[0.2em] tw-text-cyan-200 tw-shadow-[0_0_18px_rgba(0, 240, 255,0.2)] tw-transition hover:tw-border-cyan-300 hover:tw-bg-cyan-500/20"
						onclick={runNativeInstall}
					>
						INSTALL APP
					</button>
					<button
						type="button"
						class="tw-min-h-11 tw-rounded tw-border tw-border-cyan-500/35 tw-bg-transparent tw-px-4 tw-font-mono tw-text-[0.65rem] tw-font-extrabold tw-uppercase tw-tracking-widest tw-text-cyan-400/80 tw-transition hover:tw-text-cyan-200"
						onclick={dismiss}
					>
						Not now
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	:global(i.ph) {
		font-size: 0.85rem;
		line-height: 1;
	}
</style>
