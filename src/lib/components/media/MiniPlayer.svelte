<script lang="ts">
	/**
	 * MiniPlayer.svelte — Global Persistent Audio Player
	 * ────────────────────────────────────────────────────
	 * Mounted in (app)/+layout.svelte. Floats above all content while a podcast
	 * episode is active. Survives route changes — the coach can navigate the
	 * tactical board while listening to a coaching podcast.
	 *
	 * Binds bidirectionally to the `integrations` singleton:
	 *   • Reads:  nowPlaying, isPlaying, volume
	 *   • Writes: currentTime, duration, isPlaying (via audio element events)
	 */

	import { browser } from '$app/environment';
	import { integrations } from '$lib/services/integrations.svelte.js';

	// ── Internal refs ──────────────────────────────────────────────────────────
	let audioEl = $state<HTMLAudioElement | null>(null);
	let seekDragging = $state(false);

	// ── Sync isPlaying → audio element ────────────────────────────────────────
	$effect(() => {
		if (!audioEl || !browser) return;
		if (integrations.isPlaying) {
			audioEl.play().catch(() => {
				integrations.isPlaying = false;
			});
		} else {
			audioEl.pause();
		}
	});

	// ── Sync volume ────────────────────────────────────────────────────────────
	$effect(() => {
		if (audioEl) audioEl.volume = integrations.volume;
	});

	// ── Sync seek (service → audio) ────────────────────────────────────────────
	// Only update audio position when not dragging and when the service value
	// differs significantly (avoids feedback loop with timeupdate handler).
	$effect(() => {
		const t = integrations.currentTime;
		if (!audioEl || seekDragging) return;
		if (Math.abs(audioEl.currentTime - t) > 1.5) {
			audioEl.currentTime = t;
		}
	});

	// ── Audio element event handlers ───────────────────────────────────────────
	function onTimeUpdate() {
		if (!audioEl || seekDragging) return;
		integrations.currentTime = audioEl.currentTime;
	}
	function onDurationChange() {
		if (audioEl) integrations.duration = audioEl.duration || 0;
	}
	function onEnded() {
		integrations.isPlaying = false;
		integrations.currentTime = 0;
	}
	function onError() {
		integrations.playerError = 'Playback error. The episode may be unavailable.';
		integrations.isPlaying = false;
	}

	// ── Progress bar interactions ─────────────────────────────────────────────
	function onSeekInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const fraction = parseFloat(input.value) / 1000;
		integrations.currentTime = fraction * integrations.duration;
		if (audioEl) audioEl.currentTime = integrations.currentTime;
	}

	// ── Utilities ─────────────────────────────────────────────────────────────
	function fmtTime(secs: number): string {
		if (!isFinite(secs) || secs < 0) return '0:00';
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	const progressVal = $derived(
		integrations.duration > 0
			? Math.round((integrations.currentTime / integrations.duration) * 1000)
			: 0,
	);
</script>

{#if integrations.hasActiveSession && integrations.nowPlaying}
	{@const { episode, podcast } = integrations.nowPlaying}

	<!-- Hidden <audio> element — the actual playback engine -->
	<audio
		bind:this={audioEl}
		src={episode.audioUrl}
		ontimeupdate={onTimeUpdate}
		ondurationchange={onDurationChange}
		onended={onEnded}
		onerror={onError}
		preload="metadata"
	></audio>

	<!-- Mini Player Bar -->
	<div class="mp-root" role="region" aria-label="Now playing: {episode.title}">
		<!-- Left: cover + track info -->
		<div class="mp-track">
			{#if podcast.coverUrl}
				<img
					class="mp-cover"
					src={podcast.coverUrl}
					alt=""
					aria-hidden="true"
					loading="lazy"
					referrerpolicy="no-referrer"
				/>
			{:else}
				<div class="mp-cover mp-cover--ph" aria-hidden="true">▶</div>
			{/if}
			<div class="mp-track-info">
				<span class="mp-ep-title">{episode.title}</span>
				<span class="mp-pod-name">{podcast.name}</span>
			</div>
		</div>

		<!-- Centre: controls + progress -->
		<div class="mp-controls">
			<div class="mp-buttons">
				<button
					class="mp-btn"
					onclick={() => integrations.skipBack(15)}
					aria-label="Back 15 seconds"
					title="−15s"
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<polyline points="1 4 1 10 7 10"></polyline>
						<path d="M3.51 15a9 9 0 1 0 .49-3.5"></path>
						<text x="9" y="15" font-size="6" fill="currentColor" stroke="none">15</text>
					</svg>
				</button>

				<button
					class="mp-btn mp-btn--play"
					onclick={() => integrations.togglePlay()}
					aria-label={integrations.isPlaying ? 'Pause' : 'Play'}
				>
					{#if integrations.isPlaying}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
							<rect x="6" y="4" width="4" height="16"></rect>
							<rect x="14" y="4" width="4" height="16"></rect>
						</svg>
					{:else}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
							<polygon points="5 3 19 12 5 21 5 3"></polygon>
						</svg>
					{/if}
				</button>

				<button
					class="mp-btn"
					onclick={() => integrations.skipForward(30)}
					aria-label="Forward 30 seconds"
					title="+30s"
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
						<polyline points="23 4 23 10 17 10"></polyline>
						<path d="M20.49 15a9 9 0 1 1-.49-3.5"></path>
						<text x="8" y="15" font-size="6" fill="currentColor" stroke="none">30</text>
					</svg>
				</button>
			</div>

			<!-- Progress bar -->
			<div class="mp-progress-row">
				<span class="mp-time">{fmtTime(integrations.currentTime)}</span>
				<input
					class="mp-seek"
					type="range"
					min="0" max="1000"
					value={progressVal}
					oninput={onSeekInput}
					onmousedown={() => { seekDragging = true; }}
					onmouseup={() => { seekDragging = false; }}
					ontouchstart={() => { seekDragging = true; }}
					ontouchend={() => { seekDragging = false; }}
					aria-label="Seek"
					style:--prog="{progressVal / 10}%"
				/>
				<span class="mp-time">{fmtTime(integrations.duration)}</span>
			</div>
		</div>

		<!-- Right: volume + close -->
		<div class="mp-right">
			<label class="mp-vol-label" aria-label="Volume">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
					{#if integrations.volume > 0}
						<path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" fill="none"></path>
					{/if}
				</svg>
				<input
					class="mp-vol"
					type="range"
					min="0" max="1" step="0.05"
					bind:value={integrations.volume}
					aria-label="Volume"
				/>
			</label>
			<button
				class="mp-btn mp-btn--stop"
				onclick={() => integrations.stop()}
				aria-label="Stop and close player"
				title="Stop"
			>✕</button>
		</div>
	</div>

	{#if integrations.playerError}
		<div class="mp-err" role="alert">{integrations.playerError}</div>
	{/if}
{/if}

<style>
	.mp-root {
		position: fixed; bottom: 0; left: 0; right: 0; z-index: 1050;
		display: flex; align-items: center; gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: rgba(4, 4, 12, 0.97);
		border-top: 1px solid rgba(0, 240, 255, 0.15);
		box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		font-family: 'JetBrains Mono', monospace;
		animation: mpRise 0.25s cubic-bezier(0.22, 1, 0.36, 1);
		min-height: 64px;
	}

	/* ── Track info ─────────────────────────────────────────────────────────── */
	.mp-track {
		display: flex; align-items: center; gap: 0.6rem;
		min-width: 0; width: 200px; flex-shrink: 0;
	}
	.mp-cover {
		width: 38px; height: 38px; border-radius: 4px; object-fit: cover;
		flex-shrink: 0;
		filter: grayscale(40%) sepia(15%);
	}
	.mp-cover--ph {
		display: flex; align-items: center; justify-content: center;
		background: rgba(0, 240, 255, 0.08);
		color: rgba(0, 240, 255, 0.4); font-size: 0.9rem;
	}
	.mp-track-info { min-width: 0; }
	.mp-ep-title {
		display: block; font-size: 0.65rem; font-weight: 700;
		color: rgba(255, 255, 255, 0.8);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.mp-pod-name {
		display: block; font-size: 0.55rem;
		color: rgba(0, 240, 255, 0.55);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}

	/* ── Controls ───────────────────────────────────────────────────────────── */
	.mp-controls { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; align-items: center; }

	.mp-buttons { display: flex; align-items: center; gap: 0.25rem; }
	.mp-btn {
		width: 32px; height: 32px; min-width: 44px; min-height: 44px;
		display: flex; align-items: center; justify-content: center;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 50%;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer; transition: all 0.15s;
	}
	.mp-btn:hover { border-color: rgba(0, 240, 255, 0.3); color: #00f0ff; }
	.mp-btn--play {
		background: rgba(0, 240, 255, 0.1);
		border-color: rgba(0, 240, 255, 0.3);
		color: #00f0ff;
		width: 36px; height: 36px;
	}
	.mp-btn--play:hover {
		background: rgba(0, 240, 255, 0.2);
		box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
	}
	.mp-btn--stop { border-color: rgba(255, 50, 80, 0.2); color: rgba(255, 50, 80, 0.5); }
	.mp-btn--stop:hover { border-color: rgba(255, 50, 80, 0.5); color: rgba(255, 50, 80, 0.9); }

	/* ── Progress ────────────────────────────────────────────────────────────── */
	.mp-progress-row {
		width: 100%; display: flex; align-items: center; gap: 0.4rem;
	}
	.mp-time { font-size: 0.55rem; color: rgba(255, 255, 255, 0.3); flex-shrink: 0; }

	.mp-seek {
		flex: 1; height: 3px;
		-webkit-appearance: none; appearance: none;
		background: linear-gradient(
			to right,
			rgba(0, 240, 255, 0.7) var(--prog, 0%),
			rgba(255, 255, 255, 0.1) var(--prog, 0%)
		);
		border-radius: 2px; outline: none; cursor: pointer;
	}
	.mp-seek::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px; height: 12px;
		border-radius: 50%;
		background: #00f0ff;
		box-shadow: 0 0 6px rgba(0, 240, 255, 0.6);
	}

	/* ── Right side ─────────────────────────────────────────────────────────── */
	.mp-right { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }

	.mp-vol-label {
		display: flex; align-items: center; gap: 0.35rem;
		color: rgba(255, 255, 255, 0.3);
	}
	.mp-vol {
		width: 60px; height: 3px;
		-webkit-appearance: none; appearance: none;
		background: rgba(255, 255, 255, 0.12); border-radius: 2px;
		outline: none; cursor: pointer;
	}
	.mp-vol::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 10px; height: 10px; border-radius: 50%;
		background: rgba(255, 255, 255, 0.5);
	}

	/* ── Error banner ────────────────────────────────────────────────────────── */
	.mp-err {
		position: fixed; bottom: 68px; left: 50%; transform: translateX(-50%);
		z-index: 1051; padding: 0.4rem 1rem;
		background: rgba(255, 50, 80, 0.12);
		border: 1px solid rgba(255, 50, 80, 0.3);
		border-radius: 6px; font-size: 0.65rem;
		color: rgba(255, 50, 80, 0.85); font-family: 'JetBrains Mono', monospace;
		white-space: nowrap;
	}

	@keyframes mpRise { from { transform: translateY(100%); } to { transform: translateY(0); } }

	/* ── Responsive ─────────────────────────────────────────────────────────── */
	@media (max-width: 500px) {
		.mp-track { width: 140px; }
		.mp-vol-label { display: none; }
	}
</style>
