<script lang="ts">
	import type { ClipAnalyzerEngine } from './ClipAnalyzerEngine.svelte.js';

	let { engine }: { engine: ClipAnalyzerEngine } = $props();
</script>

{#if engine.phase === 'idle' || engine.phase === 'selected'}
	<div class="ca-drop-zone">
		<div class="ca-drop-zone__icon" aria-hidden="true">
			{#if engine.isVideo}🎬{:else}📸{/if}
		</div>
		<h3 class="ca-drop-zone__title">
			{engine.phase === 'idle' ? 'SUBMIT TRAINING CLIP' : engine.fileLabel}
		</h3>
		<p class="ca-drop-zone__sub">
			{#if engine.phase === 'idle'}
				Upload a video or photo. Clips are EXIF-stripped and scanned before they appear in your vault.
			{:else}
				Ready to upload for <strong>{engine.targetStatLabel}</strong> tracking.
			{/if}
		</p>

		<div class="ca-target-row">
			<span class="ca-target-label">TARGET STAT</span>
			<span class="ca-target-chip">{engine.targetStat} · {engine.targetStatLabel}</span>
		</div>

		<label class="ca-file-btn" for="ca-file-input">
			{engine.phase === 'idle' ? 'SELECT CLIP' : 'CHANGE CLIP'}
		</label>
		<input
			id="ca-file-input"
			type="file"
			accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"
			class="ca-file-input-hidden tw-font-mono"
			onchange={(e) => engine.onFileChange(e)}
			aria-label="Select training clip"
		/>

		{#if engine.phase === 'selected'}
			<button class="ca-analyze-btn" onclick={() => void engine.startAnalysis()}>
				<span class="ca-analyze-btn__icon" aria-hidden="true">⚡</span>
				TRANSMIT CLIP
			</button>
		{/if}
	</div>
{/if}

{#if (engine.phase === 'result' || engine.phase === 'confirming') && engine.analysisResult}
	<div class="ca-result">
		<div class="ca-result__header">
			<span class="ca-result__label">AEGIS ANALYSIS COMPLETE</span>
			<span class="ca-result__conf" style:color={engine.confidenceColor}>
				{engine.analysisResult.confidence}% CONFIDENCE
			</span>
		</div>

		<p class="ca-result__headline">
			<span class="ca-result__stat-chip">{engine.analysisResult.stat}</span>
			{engine.analysisResult.headline}
		</p>

		<div class="ca-result__delta">
			<span class="ca-result__delta-val">+{engine.analysisResult.delta} XP</span>
			<span class="ca-result__delta-stat">{engine.analysisResult.statDelta}</span>
		</div>

		<ul class="ca-result__bullets">
			{#each engine.analysisResult.feedbackPoints as point}
				<li class="ca-result__bullet">
					<span class="ca-result__bullet-dot" aria-hidden="true">▸</span>
					{point}
				</li>
			{/each}
		</ul>

		<div class="ca-result__actions">
			<button class="ca-btn-ghost" onclick={() => engine.reset()}>DISCARD</button>
			{#if engine.analysisResult.delta > 0}
				<button class="ca-confirm-btn" onclick={() => void engine.confirmResult()} disabled={engine.phase === 'confirming'}>
					{engine.phase === 'confirming' ? 'APPLYING…' : '✓ APPLY TO ARMORY'}
				</button>
			{/if}
		</div>
	</div>
{/if}

{#if engine.phase === 'complete'}
	<div class="ca-complete">
		<span class="ca-complete__icon" aria-hidden="true">✓</span>
		{#if engine.analysisResult && engine.analysisResult.delta > 0}
			<h3 class="ca-complete__title">ARMORY UPDATED</h3>
			<p class="ca-complete__sub">
				+{engine.analysisResult.delta} XP applied to {engine.analysisResult.stat} track.
			</p>
		{:else}
			<h3 class="ca-complete__title">CLIP IN VAULT</h3>
			<p class="ca-complete__sub">
				Processing complete. View the clip below in your media vault. Stat analysis will appear here
				when the vision backend writes results to Firestore.
			</p>
		{/if}
		<button class="ca-btn-ghost" onclick={() => engine.reset()}>UPLOAD ANOTHER CLIP</button>
	</div>
{/if}

{#if engine.phase === 'error'}
	<div class="ca-error">
		<span class="ca-error__icon" aria-hidden="true">⚠</span>
		<p class="ca-error__msg">{engine.errorMsg}</p>
		<button class="ca-btn-ghost" onclick={() => engine.reset()}>RETRY</button>
	</div>
{/if}

<style>
	.ca-drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.65rem;
		padding: 2rem 1.5rem;
		text-align: center;
	}
	.ca-drop-zone__icon { font-size: 2rem; line-height: 1; }
	.ca-drop-zone__title {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #fafafa;
		word-break: break-all;
	}
	.ca-drop-zone__sub {
		margin: 0;
		font-size: 0.58rem;
		color: rgba(255, 255, 255, 0.35);
		max-width: 280px;
		line-height: 1.6;
	}

	.ca-target-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.25rem 0;
	}
	.ca-target-label {
		font-size: 0.48rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.3);
	}
	.ca-target-chip {
		padding: 2px 8px;
		border-radius: 4px;
		background: rgba(20, 184, 166, 0.08);
		border: 1px solid rgba(20, 184, 166, 0.25);
		font-size: 0.52rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #14b8a6;
	}

	.ca-file-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.45rem 1.1rem;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		font-family: 'Geist Mono', monospace;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		min-height: 36px;
		transition: color 0.2s, border-color 0.2s;
	}
	.ca-file-btn:hover { color: #14b8a6; border-color: rgba(20, 184, 166, 0.3); }
	.ca-file-input-hidden {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}

	.ca-analyze-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 1.4rem;
		border-radius: 8px;
		border: 1px solid rgba(20, 184, 166, 0.5);
		background: rgba(20, 184, 166, 0.08);
		font-family: 'Geist Mono', monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: #14b8a6;
		cursor: pointer;
		transition: background 0.2s, box-shadow 0.2s;
		min-height: 44px;
		box-shadow: 0 0 14px rgba(20, 184, 166, 0.18);
	}
	.ca-analyze-btn:hover {
		background: rgba(20, 184, 166, 0.16);
		box-shadow: 0 0 28px rgba(20, 184, 166, 0.35);
	}
	.ca-analyze-btn__icon { font-size: 0.9rem; }

	.ca-result {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
	}

	.ca-result__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.ca-result__label {
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(20, 184, 166, 0.6);
	}
	.ca-result__conf {
		font-size: 0.52rem;
		font-weight: 800;
		letter-spacing: 0.1em;
	}

	.ca-result__headline {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 700;
		color: #fafafa;
		line-height: 1.5;
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.ca-result__stat-chip {
		padding: 1px 7px;
		border-radius: 4px;
		background: rgba(20, 184, 166, 0.1);
		border: 1px solid rgba(20, 184, 166, 0.3);
		color: #14b8a6;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		flex-shrink: 0;
	}

	.ca-result__delta {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.65rem 0.9rem;
		border-radius: 8px;
		background: rgba(20, 184, 166, 0.05);
		border: 1px solid rgba(20, 184, 166, 0.15);
	}
	.ca-result__delta-val {
		font-size: 1.35rem;
		font-weight: 900;
		color: #14b8a6;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 0 12px rgba(20, 184, 166, 0.6);
	}
	.ca-result__delta-stat {
		font-size: 0.75rem;
		font-weight: 700;
		color: rgba(20, 184, 166, 0.6);
		letter-spacing: 0.06em;
	}

	.ca-result__bullets {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.ca-result__bullet {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		font-size: 0.6rem;
		color: rgba(226, 232, 240, 0.65);
		line-height: 1.5;
	}
	.ca-result__bullet-dot { color: rgba(20, 184, 166, 0.5); font-size: 0.55rem; flex-shrink: 0; }

	.ca-result__actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.25rem;
	}

	.ca-confirm-btn {
		flex: 2;
		padding: 0.6rem;
		border-radius: 7px;
		border: 1px solid rgba(20, 184, 166, 0.5);
		background: rgba(20, 184, 166, 0.08);
		font-family: 'Geist Mono', monospace;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #14b8a6;
		cursor: pointer;
		min-height: 44px;
		transition: background 0.2s;
	}
	.ca-confirm-btn:hover:not(:disabled) { background: rgba(20, 184, 166, 0.16); }
	.ca-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.ca-complete {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 2.5rem 1.5rem;
		text-align: center;
	}
	.ca-complete__icon {
		font-size: 2rem;
		color: #14b8a6;
		filter: drop-shadow(0 0 12px rgba(20, 184, 166, 0.6));
	}
	.ca-complete__title {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		color: #fafafa;
	}
	.ca-complete__sub {
		margin: 0;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.4);
		letter-spacing: 0.06em;
	}

	.ca-error {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 2rem 1.5rem;
		text-align: center;
	}
	.ca-error__icon { font-size: 1.5rem; color: #ff003c; }
	.ca-error__msg {
		font-size: 0.6rem;
		color: rgba(255, 80, 100, 0.8);
		margin: 0;
		max-width: 260px;
	}

	.ca-btn-ghost {
		flex: 1;
		padding: 0.5rem 0.9rem;
		border-radius: 7px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		font-family: 'Geist Mono', monospace;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.35);
		cursor: pointer;
		min-height: 44px;
		transition: color 0.2s, border-color 0.2s;
	}
	.ca-btn-ghost:hover { color: rgba(20, 184, 166, 0.7); border-color: rgba(20, 184, 166, 0.25); }
</style>
