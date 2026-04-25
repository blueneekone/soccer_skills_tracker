<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	const STORAGE_KEY = 'pwa_install_banner_dismissed_v1';

	let visible = $state(false);

	function readStandalone() {
		if (typeof window === 'undefined' || !window.matchMedia) return true;
		const mq = window.matchMedia('(display-mode: standalone)').matches;
		const nav = /** @type {Navigator & { standalone?: boolean }} */ (window.navigator);
		const legacy = nav.standalone === true;
		return mq || legacy;
	}

	function detectIOS() {
		if (typeof navigator === 'undefined') return false;
		const ua = navigator.userAgent;
		if (/iPad|iPhone|iPod/.test(ua)) return true;
		return /Macintosh/.test(ua) && 'ontouchend' in document;
	}

	function dismiss() {
		visible = false;
		try {
			sessionStorage.setItem(STORAGE_KEY, '1');
		} catch {
			// ignore
		}
	}

	onMount(() => {
		if (!browser) return;
		try {
			if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
		} catch {
			// ignore
		}
		visible = detectIOS() && !readStandalone();
	});
</script>

{#if visible}
	<div
		class="pwa-boost tw-pointer-events-auto tw-fixed tw-inset-x-0 tw-bottom-0 tw-z-[200] tw-flex tw-justify-center tw-p-3 sm:tw-p-4"
		role="status"
		aria-live="polite"
	>
		<div
			class="tw-flex tw-w-full tw-max-w-lg tw-flex-col tw-gap-3 tw-rounded-lg tw-border tw-border-cyan-500/35 tw-bg-[#05050a] tw-px-4 tw-py-3 tw-text-cyan-200 tw-shadow-[0_0_24px_rgba(34,211,238,0.12)]"
		>
			<p
				class="tw-m-0 tw-text-center tw-font-mono tw-text-[0.7rem] tw-font-bold tw-uppercase tw-leading-snug tw-tracking-[0.12em] tw-text-cyan-100/90"
			>
				<span class="tw-block sm:tw-inline">To install Operative OS: Tap</span>
				<span
					class="tw-inline-flex tw-mx-1 tw-h-5 tw-w-5 tw-align-middle tw-items-center tw-justify-center tw-rounded tw-border tw-border-cyan-500/40 tw-bg-black/30 tw-text-cyan-300"
					aria-label="Share"
					title="Share"
				>
					<i class="ph ph-share-network tw-text-sm"></i>
				</span>
				<span class="tw-block sm:tw-inline"> and select <span class="tw-text-cyan-300">Add to Home Screen</span></span>
			</p>
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
	</div>
{/if}

<style>
	:global(i.ph) {
		font-size: 0.85rem;
		line-height: 1;
	}
</style>
