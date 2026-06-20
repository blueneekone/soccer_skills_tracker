<script>
	/**
	 * OfflineBanner — Phase 1, Epic 1.
	 *
	 * Reactive bottom-of-viewport bar that surfaces offline state from
	 * `syncStatus`. Syncing UI is intentionally hidden (local-only flush
	 * runs in the background without a pill).
	 *
	 * Mount once at the root of (app)/+layout.svelte.  The component
	 * calls `syncStatus.init()` itself on mount, so a single
	 * <OfflineBanner /> tag is enough for the entire app.
	 */

	import { onMount } from 'svelte';
	import { syncStatus } from '$lib/services/offlineSync.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	onMount(() => {
		syncStatus.init();
	});

	const mode = $derived(!syncStatus.isOnline ? 'offline' : 'hidden');
</script>

{#if mode !== 'hidden'}
	<div
		class="ob-root"
		class:ob-root--offline={mode === 'offline'}
		role="status"
		aria-live="polite"
	>
		<Icon name="net.offline" size={14} class="ob-icon" />
		<span class="ob-label">Working offline · Changes will sync when connected</span>
	</div>
{/if}

<style>
	.ob-root {
		position: fixed;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 300;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 8px 16px;
		border-radius: var(--vanguard-radius-sm, 12px);
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		backdrop-filter: blur(var(--vanguard-blur, 24px)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur, 24px)) saturate(180%);
		box-shadow: var(
			--vanguard-elev-2,
			0 8px 24px -8px rgba(0, 0, 0, 0.5)
		);
		pointer-events: none;
		animation: ob-fade-in 180ms ease-out;
	}

	.ob-root--offline {
		background: rgba(127, 29, 29, 0.78);
		color: #fee2e2;
		border: 1px solid rgba(248, 113, 113, 0.5);
	}

	.ob-icon {
		flex-shrink: 0;
		opacity: 0.9;
	}

	@keyframes ob-fade-in {
		from { opacity: 0; transform: translate(-50%, 4px); }
		to   { opacity: 1; transform: translate(-50%, 0); }
	}

	@media (max-width: 1023.98px) {
		.ob-root {
			bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 8px);
			z-index: 940;
		}
	}

	@media (max-width: 640px) {
		.ob-root {
			padding: 6px 12px;
			font-size: 0.75rem;
		}
	}
</style>
