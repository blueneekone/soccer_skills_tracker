<script>
	import { browser } from '$app/environment';

	/**
	 * Reusable "Focused Workspace" shell for full-bleed canvas tools (Strategy, Drill Designer).
	 * Provides:
	 *  - Dark #18181b wrapper (normal) / fixed inset-0 overlay (fullscreen)
	 *  - Floating pill toolbar anchored bottom-center
	 *  - Full-screen toggle button (top-right, glassmorphic)
	 *  - Escape key exits fullscreen (native document scroll preserved)
	 *
	 * Usage:
	 *   <FocusedWorkspaceWrapper>
	 *     {#snippet toolbar()}  ← pill toolbar content  {/snippet}
	 *     <!-- children = main canvas / pitch content -->
	 *   </FocusedWorkspaceWrapper>
	 *
	 * @type {{ children: import('svelte').Snippet, toolbar: import('svelte').Snippet, arena?: boolean }}
	 */
	let { children, toolbar, arena = false } = $props();

	let isFullscreen = $state(false);

	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
	}

	$effect(() => {
		if (!browser) return;
		/** @param {KeyboardEvent} e */
		function onKey(e) {
			if (e.key === 'Escape' && isFullscreen) {
				e.preventDefault();
				isFullscreen = false;
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<div
	class="fw-workspace"
	class:fw-workspace--fullscreen={isFullscreen}
	class:fw-workspace--arena={arena}
>
	<!-- Full-screen toggle: top-right glassmorphic button -->
	<button
		type="button"
		class="fw-fs-btn"
		class:fw-fs-btn--arena={arena}
		onclick={toggleFullscreen}
		aria-pressed={isFullscreen}
		aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
		title={isFullscreen ? 'Exit full screen (Esc)' : 'Enter full screen'}
	>
		<i class="ph {isFullscreen ? 'ph-corners-in' : 'ph-corners-out'}" aria-hidden="true"></i>
	</button>

	<!-- Main canvas content injected by parent -->
	<div class="fw-content">
		{@render children()}
	</div>

	<!-- Floating island toolbar — bottom-center pill, content from parent -->
	<div class="fw-island" class:fw-island--arena={arena} role="toolbar" aria-label="Workspace tools">
		{@render toolbar()}
	</div>
</div>

<style>
	.fw-workspace {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: clamp(360px, 52vh, 580px);
		background: #18181b;
		border-radius: 1.25rem;
		overflow: visible;
		padding: 1.25rem 1.25rem calc(1.25rem + 72px);
		box-sizing: border-box;
	}

	.fw-workspace--fullscreen {
		position: fixed;
		inset: 0;
		z-index: 100;
		border-radius: 1rem;
		min-height: unset;
		padding: 1.5rem 1.5rem calc(1.5rem + 80px);
	}

	/* Figma-grade tactical arena — edge-to-edge pitch shell */
	.fw-workspace--arena {
		border-radius: 1.5rem;
		min-height: min(100dvh, 100vh);
		padding: 0.25rem 0.25rem 5.75rem;
		background: linear-gradient(180deg, #020617 0%, #0f172a 55%, #020617 100%);
		overflow: visible;
	}

	.fw-workspace--arena.fw-workspace--fullscreen {
		min-height: 100dvh;
		padding: 0.35rem 0.35rem 5.75rem;
	}

	.fw-content {
		position: relative;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1 1 auto;
		min-height: 0;
	}

	/* ─── Full-screen toggle ──────────────────────────────────── */
	.fw-fs-btn {
		position: absolute;
		top: 0.875rem;
		right: 0.875rem;
		z-index: 40;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.1);
		color: #fafafa;
		cursor: pointer;
		-webkit-backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
		backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.fw-fs-btn:hover {
		background: rgba(255, 255, 255, 0.18);
		border-color: rgba(255, 255, 255, 0.38);
	}

	.fw-fs-btn i {
		font-size: 1.25rem;
		pointer-events: none;
	}

	.fw-fs-btn--arena {
		position: fixed;
		top: max(0.75rem, env(safe-area-inset-top, 0px));
		right: max(0.75rem, env(safe-area-inset-right, 0px));
		z-index: 120;
	}

	/* ─── Floating island toolbar ─────────────────────────────── */
	.fw-island {
		position: absolute;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 10px;
		background: #ffffff;
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 9999px;
		box-shadow:
			0 10px 25px -5px rgba(0, 0, 0, 0.35),
			0 4px 6px -2px rgba(0, 0, 0, 0.12),
			inset 0 1px 0 rgba(255, 255, 255, 0.8);
		max-width: calc(100% - 3rem);
		flex-shrink: 0;
		white-space: nowrap;
	}

	:global(html.dark) .fw-island {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.12);
		box-shadow:
			0 10px 25px -5px rgba(0, 0, 0, 0.6),
			0 4px 6px -2px rgba(0, 0, 0, 0.25);
	}

	.fw-island.fw-island--arena {
		position: fixed;
		bottom: max(2rem, env(safe-area-inset-bottom, 0px));
		left: 50%;
		right: auto;
		top: auto;
		transform: translateX(-50%);
		z-index: 110;
		padding: 0.65rem 1.5rem;
		max-width: calc(100vw - 1.5rem);
		background: rgba(15, 23, 42, 0.82);
		border: 1px solid var(--vanguard-border);
		border-radius: 9999px;
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		box-shadow: var(--vanguard-elev-2);
	}

	:global(html.dark) .fw-island--arena {
		background: rgba(15, 23, 42, 0.85);
		border-color: rgba(255, 255, 255, 0.1);
	}
</style>
