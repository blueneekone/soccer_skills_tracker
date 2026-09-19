<script lang="ts">
	import type { ClipAnalyzerEngine } from './ClipAnalyzerEngine.svelte.js';

	let { engine }: { engine: ClipAnalyzerEngine } = $props();
</script>

{#if engine.phase === 'uploading' || engine.phase === 'analyzing'}
	<div class="ca-overlay" aria-live="polite" aria-label="Analysis in progress">
		<div class="ca-overlay__hexgrid tw-font-mono" aria-hidden="true"></div>
		<div class="ca-overlay__scanline" style:top="{engine.scanLine}%" aria-hidden="true"></div>
		<div class="ca-overlay__bracket ca-overlay__bracket--tl" aria-hidden="true"></div>
		<div class="ca-overlay__bracket ca-overlay__bracket--tr" aria-hidden="true"></div>
		<div class="ca-overlay__bracket ca-overlay__bracket--bl" aria-hidden="true"></div>
		<div class="ca-overlay__bracket ca-overlay__bracket--br" aria-hidden="true"></div>

		<div class="ca-overlay__content">
			{#if engine.phase === 'uploading'}
				<div class="ca-overlay__phase-label">TRANSMITTING · {engine.uploadProgress}%</div>
				<div class="ca-overlay__progress-bar-wrap" role="progressbar" aria-valuenow={engine.uploadProgress} aria-valuemin={0} aria-valuemax={100}>
					<div class="ca-overlay__progress-bar" style:width="{engine.uploadProgress}%"></div>
				</div>
				<p class="ca-overlay__stat-target">TARGET STAT: <strong>{engine.targetStat} · {engine.targetStatLabel}</strong></p>
			{:else}
				<div class="ca-overlay__phase-label">PROCESSING · EXIF STRIP &amp; SAFETY SCAN</div>
				<div class="ca-overlay__dots">
					<span></span><span></span><span></span>
				</div>
				<p class="ca-overlay__stat-target">
					WAITING FOR <strong>{engine.targetStatLabel}</strong> CLIP TO CLEAR THE VAULT PIPELINE
				</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.ca-overlay {
		position: absolute;
		inset: 0;
		z-index: 50;
		background: rgba(1, 4, 9, 0.92);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ca-overlay__hexgrid {
		position: absolute;
		inset: 0;
		background-image: radial-gradient(circle, rgba(20, 184, 166, 0.07) 1px, transparent 1px);
		background-size: 28px 28px;
		opacity: 0.6;
		animation: ca-grid-fade 2s ease-in-out infinite alternate;
	}

	.ca-overlay__scanline {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(20, 184, 166, 0.7) 30%,
			rgba(20, 184, 166, 1) 50%,
			rgba(20, 184, 166, 0.7) 70%,
			transparent 100%
		);
		filter: blur(1px);
		pointer-events: none;
		transition: top 0.016s linear;
	}

	.ca-overlay__bracket {
		position: absolute;
		width: 20px;
		height: 20px;
		border-color: rgba(20, 184, 166, 0.6);
		border-style: solid;
	}
	.ca-overlay__bracket--tl { top: 12px; left: 12px; border-width: 2px 0 0 2px; }
	.ca-overlay__bracket--tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; }
	.ca-overlay__bracket--bl { bottom: 12px; left: 12px; border-width: 0 0 2px 2px; }
	.ca-overlay__bracket--br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; }

	.ca-overlay__content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
		padding: 1.5rem;
	}

	.ca-overlay__phase-label {
		font-size: 0.6rem;
		font-weight: 900;
		letter-spacing: 0.3em;
		color: #14b8a6;
		animation: ca-blink 1.4s ease-in-out infinite;
	}

	.ca-overlay__progress-bar-wrap {
		width: 200px;
		height: 3px;
		background: rgba(20, 184, 166, 0.12);
		border-radius: 2px;
		overflow: hidden;
	}
	.ca-overlay__progress-bar {
		height: 100%;
		background: #14b8a6;
		border-radius: 2px;
		box-shadow: 0 0 8px #14b8a6;
		transition: width 0.25s ease-out;
	}

	.ca-overlay__stat-target {
		font-size: 0.55rem;
		color: rgba(255, 255, 255, 0.45);
		margin: 0;
		letter-spacing: 0.1em;
	}
	.ca-overlay__stat-target strong { color: rgba(20, 184, 166, 0.85); }

	.ca-overlay__dots {
		display: flex;
		gap: 6px;
	}
	.ca-overlay__dots span {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #14b8a6;
		animation: ca-dot 1.2s ease-in-out infinite;
	}
	.ca-overlay__dots span:nth-child(2) { animation-delay: 0.2s; }
	.ca-overlay__dots span:nth-child(3) { animation-delay: 0.4s; }

	@keyframes ca-grid-fade {
		from { opacity: 0.4; }
		to   { opacity: 0.8; }
	}
	@keyframes ca-blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.35; }
	}
	@keyframes ca-dot {
		0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
		40% { transform: scale(1); opacity: 1; }
	}
</style>
