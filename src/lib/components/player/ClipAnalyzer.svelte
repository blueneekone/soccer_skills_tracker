<script lang="ts">
	/**
	 * ClipAnalyzer.svelte — AI Biomechanics Analysis Terminal
	 * ─────────────────────────────────────────────────────────
	 * "The Billion-Dollar Feature" — players upload a training clip and receive
	 * AI-driven Scout's Six stat feedback bound directly to their ArmoryEngine.
	 *
	 * FLOW
	 * ────
	 * 1. Player selects a clip (video) or photo.
	 * 2. Client calls `getUploadToken` CF → receives a pre-signed PUT URL.
	 * 3. File is uploaded directly to GCS (zero bytes touch SvelteKit).
	 * 4. Stark-tech ANALYZING overlay appears while:
	 *    a. Upload to GCS completes (XHR progress tracking).
	 *    b. `analyzeMovement()` stub runs with a 2-second simulation.
	 *    c. `processMedia` CF triggers in background (async).
	 * 5. Mock analysis result (e.g. "Knee drive optimal. PAC +2.") is shown.
	 * 6. Player confirms → `armory.updateStat()` writes the XP delta.
	 *
	 * The `analyzeMovement()` stub is designed so that a Python/Gemini
	 * Vision endpoint can be slotted in with no UI changes. It returns:
	 *   {
	 *     stat: 'PAC' | 'ACC' | 'AGI' | 'STM' | 'POW' | 'VAN',
	 *     delta: number,          — XP delta to award
	 *     statDelta: string,      — human-readable change ("+2 mph")
	 *     headline: string,       — e.g. "Knee drive optimal. PAC +2."
	 *     confidence: number,     — 0–100
	 *     feedbackPoints: string[], — bullet observations
	 *   }
	 */

	import { getFunctions, httpsCallable } from 'firebase/functions';
	import type { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';

	// ── Props ─────────────────────────────────────────────────────────────────

	interface Props {
		armory: ArmoryEngine;
		playerUid: string;
		targetStat?: 'PAC' | 'ACC' | 'AGI' | 'STM' | 'POW' | 'VAN';
		onClipReady?: (clipId: string, publicUrl: string) => void;
	}
	const { armory, playerUid, targetStat = 'PAC', onClipReady }: Props = $props();

	// ── Types ─────────────────────────────────────────────────────────────────

	type Phase =
		| 'idle'
		| 'selected'
		| 'uploading'
		| 'analyzing'
		| 'result'
		| 'confirming'
		| 'complete'
		| 'error';

	interface AnalysisResult {
		stat: string;
		delta: number;
		statDelta: string;
		headline: string;
		confidence: number;
		feedbackPoints: string[];
	}

	// ── State ─────────────────────────────────────────────────────────────────

	let phase = $state<Phase>('idle');
	let selectedFile = $state<File | null>(null);
	let uploadProgress = $state(0);
	let clipId = $state<string | null>(null);
	let publicUrl = $state<string | null>(null);
	let analysisResult = $state<AnalysisResult | null>(null);
	let errorMsg = $state('');
	let scanLine = $state(0);
	let scanInterval: ReturnType<typeof setInterval> | null = null;

	// ── Derived ───────────────────────────────────────────────────────────────

	const STAT_LABELS: Record<string, string> = {
		PAC: 'PACE',
		ACC: 'ACCELERATION',
		AGI: 'AGILITY',
		STM: 'STAMINA',
		POW: 'POWER',
		VAN: 'VANGUARD RATING',
	};

	const isVideo = $derived(selectedFile?.type.startsWith('video/') ?? false);
	const fileLabel = $derived(selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB)` : '');
	const targetStatLabel = $derived(STAT_LABELS[targetStat] ?? targetStat);

	const confidenceColor = $derived.by(() => {
		const c = analysisResult?.confidence ?? 0;
		if (c >= 85) return '#00f0ff';
		if (c >= 65) return '#f59e0b';
		return '#ff003c';
	});

	// ── File selection ────────────────────────────────────────────────────────

	function onFileChange(ev: Event): void {
		const input = ev.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		selectedFile = file;
		phase = 'selected';
		errorMsg = '';
		uploadProgress = 0;
		analysisResult = null;
	}

	function reset(): void {
		phase = 'idle';
		selectedFile = null;
		uploadProgress = 0;
		clipId = null;
		publicUrl = null;
		analysisResult = null;
		errorMsg = '';
		stopScan();
	}

	// ── Scan line animation ───────────────────────────────────────────────────

	function startScan(): void {
		stopScan();
		scanLine = 0;
		scanInterval = setInterval(() => {
			scanLine = (scanLine + 1.8) % 100;
		}, 30);
	}
	function stopScan(): void {
		if (scanInterval !== null) { clearInterval(scanInterval); scanInterval = null; }
	}

	// ── analyzeMovement stub ──────────────────────────────────────────────────
	// ────────────────────────────────────────────────────────────────────────
	// INTEGRATION POINT: Replace this stub with a real call to your
	// Python computer-vision endpoint or Gemini Video Intelligence API.
	//
	// Expected signature:
	//   analyzeMovement(videoUrl: string, stat: string) → Promise<AnalysisResult>
	//
	// Gemini integration example (server-side):
	//   const res = await ai.models.generateContent({
	//     model: 'gemini-2.0-flash',
	//     contents: [{ parts: [
	//       { fileData: { fileUri: videoUrl, mimeType: 'video/mp4' } },
	//       { text: `Analyse the athlete's ${stat} biomechanics.
	//               Rate improvement potential 0-100.
	//               Return JSON: { headline, feedbackPoints[], statDelta, delta, confidence }` }
	//     ]}]
	//   });
	// ────────────────────────────────────────────────────────────────────────
	async function analyzeMovement(videoUrl: string, stat: string): Promise<AnalysisResult> {
		// Simulate network latency and CV processing time
		await new Promise((r) => setTimeout(r, 2200 + Math.random() * 800));

		// Mock responses keyed by target stat
		const MOCK_RESPONSES: Record<string, AnalysisResult> = {
			PAC: {
				stat: 'PAC',
				delta: 120,
				statDelta: '+0.3 MPH',
				headline: 'Knee drive optimal. Stride cadence within elite range.',
				confidence: 87,
				feedbackPoints: [
					'Hip flexor engagement: 94% of optimal',
					'Ground contact time: 168ms (target ≤180ms)',
					'Arm swing symmetry: strong (Δ2°)',
					'Lean angle on acceleration: 12° — increase to 15° for max sprint output',
				],
			},
			ACC: {
				stat: 'ACC',
				delta: 100,
				statDelta: '-0.04s',
				headline: 'First-step explosive. Ankle dorsiflexion limiting factor.',
				confidence: 81,
				feedbackPoints: [
					'First-step time: 0.24s (elite: <0.22s)',
					'Knee bend on stance: 24° — target 28-30° for deeper power transfer',
					'Arm drive on burst: 82% optimal',
					'Dorsiflexion angle: 8° — mobility work recommended',
				],
			},
			AGI: {
				stat: 'AGI',
				delta: 90,
				statDelta: '-0.12s',
				headline: 'Change-of-direction mechanics efficient. Hip drop detected.',
				confidence: 79,
				feedbackPoints: [
					'Cut angle: 38° — acceptable for match-speed scenarios',
					'Hip drop on deceleration: reduce by ~6° to prevent ACL load',
					'Foot plant before cut: 0.08m outside center of mass — optimal',
					'Deceleration steps: 2 (elite: 1-2)',
				],
			},
			STM: {
				stat: 'STM',
				delta: 80,
				statDelta: '+1 Level',
				headline: 'Recovery rate strong. Work rate above position average.',
				confidence: 74,
				feedbackPoints: [
					'Clip shows sustained sprint effort across 4 repetitions',
					'Estimated VO2 proxy from movement density: above median',
					'Technique degradation between rep 1 and rep 4: minimal (−3%)',
					'Recommending interval volume increase in next training cycle',
				],
			},
			POW: {
				stat: 'POW',
				delta: 110,
				statDelta: '+1.2 in',
				headline: 'Hip extension generating above-average shot power.',
				confidence: 85,
				feedbackPoints: [
					'Plant foot position: 14cm behind ball — ideal',
					'Hip-to-shoulder rotation: 48° (target: 45-55°)',
					'Follow-through path: slightly across body — address for accuracy',
					'Estimated ball velocity based on foot contact speed: top-third for age group',
				],
			},
			VAN: {
				stat: 'VAN',
				delta: 200,
				statDelta: '+2 pts',
				headline: 'Exceptional overall movement quality detected.',
				confidence: 91,
				feedbackPoints: [
					'Multi-plane athleticism score: 88/100',
					'Tactical positioning awareness: above-average for role',
					'Physical readiness indicators: all green',
					'Vanguard composite score: upgraded',
				],
			},
		};

		return MOCK_RESPONSES[stat] ?? MOCK_RESPONSES['PAC'];
	}

	// ── Upload + analysis pipeline ────────────────────────────────────────────

	async function startAnalysis(): Promise<void> {
		if (!selectedFile) return;
		phase = 'uploading';
		errorMsg = '';
		startScan();

		try {
			// STEP 1: Get signed upload URL from Cloud Function
			const fns = getFunctions(undefined, 'us-central1');
			const getUploadTokenFn = httpsCallable<
				{ mimeType: string; fileName: string; targetStat: string },
				{ signedUrl: string; storagePath: string; clipId: string; expiresAt: string }
			>(fns, 'getUploadToken');

			const tokenRes = await getUploadTokenFn({
				mimeType: selectedFile.type,
				fileName: selectedFile.name,
				targetStat,
			});

			const { signedUrl, clipId: cId } = tokenRes.data;
			clipId = cId;

			// STEP 2: Upload directly to GCS via signed URL (XHR for progress)
			await new Promise<void>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.upload.onprogress = (ev) => {
					if (ev.lengthComputable) uploadProgress = Math.round((ev.loaded / ev.total) * 100);
				};
				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) resolve();
					else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
				};
				xhr.onerror = () => reject(new Error('Upload network error.'));
				xhr.open('PUT', signedUrl);
				xhr.setRequestHeader('Content-Type', selectedFile!.type);
				xhr.send(selectedFile);
			});

			uploadProgress = 100;
			phase = 'analyzing';

			// STEP 3: Run AI analysis (stub → real CV model)
			const result = await analyzeMovement(tokenRes.data.storagePath, targetStat);
			analysisResult = result;
			publicUrl = tokenRes.data.storagePath; // Will be updated by processMedia CF
			phase = 'result';
		} catch (err: unknown) {
			errorMsg = err instanceof Error ? err.message : 'Analysis failed.';
			phase = 'error';
			stopScan();
		}
	}

	async function confirmResult(): Promise<void> {
		if (!analysisResult) return;
		phase = 'confirming';
		try {
			// Award XP to ArmoryEngine
			armory.awardXP(analysisResult.delta, `AI Biomechanics: ${analysisResult.headline}`);
			// Notify parent
			if (clipId && publicUrl) onClipReady?.(clipId, publicUrl);
			phase = 'complete';
		} catch (err: unknown) {
			errorMsg = err instanceof Error ? err.message : 'Failed to apply result.';
			phase = 'error';
		}
	}
</script>

<div class="ca-root" class:ca-root--analyzing={phase === 'analyzing'}>
	<!-- ── ANALYZING OVERLAY ────────────────────────────────────────────────── -->
	{#if phase === 'uploading' || phase === 'analyzing'}
		<div class="ca-overlay" aria-live="polite" aria-label="Analysis in progress">
			<!-- Hex grid background -->
			<div class="ca-overlay__hexgrid" aria-hidden="true"></div>

			<!-- Horizontal scan line -->
			<div
				class="ca-overlay__scanline"
				style:top="{scanLine}%"
				aria-hidden="true"
			></div>

			<!-- Corner brackets (Stark-tech frame) -->
			<div class="ca-overlay__bracket ca-overlay__bracket--tl" aria-hidden="true"></div>
			<div class="ca-overlay__bracket ca-overlay__bracket--tr" aria-hidden="true"></div>
			<div class="ca-overlay__bracket ca-overlay__bracket--bl" aria-hidden="true"></div>
			<div class="ca-overlay__bracket ca-overlay__bracket--br" aria-hidden="true"></div>

			<div class="ca-overlay__content">
				{#if phase === 'uploading'}
					<div class="ca-overlay__phase-label">TRANSMITTING · {uploadProgress}%</div>
					<div class="ca-overlay__progress-bar-wrap" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
						<div class="ca-overlay__progress-bar" style:width="{uploadProgress}%"></div>
					</div>
					<p class="ca-overlay__stat-target">TARGET STAT: <strong>{targetStat} · {targetStatLabel}</strong></p>
				{:else}
					<div class="ca-overlay__phase-label">AEGIS BIOMECHANICS · ANALYZING</div>
					<div class="ca-overlay__dots">
						<span></span><span></span><span></span>
					</div>
					<p class="ca-overlay__stat-target">
						SCANNING {isVideo ? 'VIDEO FRAMES' : 'IMAGE'} FOR <strong>{targetStatLabel}</strong> INDICATORS
					</p>
					<div class="ca-overlay__grid-data" aria-hidden="true">
						<span>JOINT_TRACKING: ACTIVE</span>
						<span>STRIDE_ANALYSIS: RUNNING</span>
						<span>CONFIDENCE_CAL: {Math.floor(40 + scanLine * 0.55)}%</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- ── IDLE: DROP ZONE ──────────────────────────────────────────────────── -->
	{#if phase === 'idle' || phase === 'selected'}
		<div class="ca-drop-zone">
			<div class="ca-drop-zone__icon" aria-hidden="true">
				{#if isVideo}🎬{:else}📸{/if}
			</div>
			<h3 class="ca-drop-zone__title">
				{phase === 'idle' ? 'SUBMIT TRAINING CLIP' : fileLabel}
			</h3>
			<p class="ca-drop-zone__sub">
				{#if phase === 'idle'}
					Upload a video or photo for AI biomechanics analysis.
					Clips are automatically EXIF-stripped before processing.
				{:else}
					Ready to transmit for <strong>{targetStatLabel}</strong> analysis.
				{/if}
			</p>

			<div class="ca-target-row">
				<span class="ca-target-label">TARGET STAT</span>
				<span class="ca-target-chip">{targetStat} · {targetStatLabel}</span>
			</div>

			<label class="ca-file-btn" for="ca-file-input">
				{phase === 'idle' ? 'SELECT CLIP' : 'CHANGE CLIP'}
			</label>
			<input
				id="ca-file-input"
				type="file"
				accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"
				class="ca-file-input-hidden"
				onchange={onFileChange}
				aria-label="Select training clip"
			/>

			{#if phase === 'selected'}
				<button class="ca-analyze-btn" onclick={startAnalysis}>
					<span class="ca-analyze-btn__icon" aria-hidden="true">⚡</span>
					TRANSMIT & ANALYZE
				</button>
			{/if}
		</div>
	{/if}

	<!-- ── RESULT ────────────────────────────────────────────────────────────── -->
	{#if (phase === 'result' || phase === 'confirming') && analysisResult}
		<div class="ca-result">
			<div class="ca-result__header">
				<span class="ca-result__label">AEGIS ANALYSIS COMPLETE</span>
				<span class="ca-result__conf" style:color={confidenceColor}>
					{analysisResult.confidence}% CONFIDENCE
				</span>
			</div>

			<p class="ca-result__headline">
				<span class="ca-result__stat-chip">{analysisResult.stat}</span>
				{analysisResult.headline}
			</p>

			<div class="ca-result__delta">
				<span class="ca-result__delta-val">+{analysisResult.delta} XP</span>
				<span class="ca-result__delta-stat">{analysisResult.statDelta}</span>
			</div>

			<ul class="ca-result__bullets">
				{#each analysisResult.feedbackPoints as point}
					<li class="ca-result__bullet">
						<span class="ca-result__bullet-dot" aria-hidden="true">▸</span>
						{point}
					</li>
				{/each}
			</ul>

			<div class="ca-result__actions">
				<button class="ca-btn-ghost" onclick={reset}>DISCARD</button>
				<button class="ca-confirm-btn" onclick={confirmResult} disabled={phase === 'confirming'}>
					{phase === 'confirming' ? 'APPLYING…' : '✓ APPLY TO ARMORY'}
				</button>
			</div>
		</div>
	{/if}

	<!-- ── COMPLETE ──────────────────────────────────────────────────────────── -->
	{#if phase === 'complete'}
		<div class="ca-complete">
			<span class="ca-complete__icon" aria-hidden="true">✓</span>
			<h3 class="ca-complete__title">ARMORY UPDATED</h3>
			<p class="ca-complete__sub">+{analysisResult?.delta ?? 0} XP applied to {analysisResult?.stat} track.</p>
			<button class="ca-btn-ghost" onclick={reset}>ANALYZE ANOTHER CLIP</button>
		</div>
	{/if}

	<!-- ── ERROR ─────────────────────────────────────────────────────────────── -->
	{#if phase === 'error'}
		<div class="ca-error">
			<span class="ca-error__icon" aria-hidden="true">⚠</span>
			<p class="ca-error__msg">{errorMsg}</p>
			<button class="ca-btn-ghost" onclick={reset}>RETRY</button>
		</div>
	{/if}
</div>

<style>
	/* ── Root ────────────────────────────────────────────────────────────────── */
	.ca-root {
		position: relative;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(5, 8, 15, 0.9);
		backdrop-filter: blur(16px);
		font-family: 'JetBrains Mono', monospace;
		overflow: hidden;
		min-height: 280px;
		transition: border-color 0.3s;
	}
	.ca-root--analyzing {
		border-color: rgba(0, 240, 255, 0.35);
		box-shadow: 0 0 30px rgba(0, 240, 255, 0.12);
	}

	/* ── ANALYZING OVERLAY ──────────────────────────────────────────────────── */
	.ca-overlay {
		position: absolute;
		inset: 0;
		z-index: 50;
		background: rgba(1, 4, 9, 0.92);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Hex grid — pure CSS background pattern */
	.ca-overlay__hexgrid {
		position: absolute;
		inset: 0;
		background-image:
			radial-gradient(circle, rgba(0, 240, 255, 0.07) 1px, transparent 1px);
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
			rgba(0, 240, 255, 0.7) 30%,
			rgba(0, 240, 255, 1) 50%,
			rgba(0, 240, 255, 0.7) 70%,
			transparent 100%
		);
		filter: blur(1px);
		pointer-events: none;
		transition: top 0.016s linear;
	}

	/* Corner bracket decorations */
	.ca-overlay__bracket {
		position: absolute;
		width: 20px;
		height: 20px;
		border-color: rgba(0, 240, 255, 0.6);
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
		color: #00f0ff;
		animation: ca-blink 1.4s ease-in-out infinite;
	}

	.ca-overlay__progress-bar-wrap {
		width: 200px;
		height: 3px;
		background: rgba(0, 240, 255, 0.12);
		border-radius: 2px;
		overflow: hidden;
	}
	.ca-overlay__progress-bar {
		height: 100%;
		background: #00f0ff;
		border-radius: 2px;
		box-shadow: 0 0 8px #00f0ff;
		transition: width 0.25s ease-out;
	}

	.ca-overlay__stat-target {
		font-size: 0.55rem;
		color: rgba(255, 255, 255, 0.45);
		margin: 0;
		letter-spacing: 0.1em;
	}
	.ca-overlay__stat-target strong { color: rgba(0, 240, 255, 0.85); }

	.ca-overlay__dots {
		display: flex;
		gap: 6px;
	}
	.ca-overlay__dots span {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #00f0ff;
		animation: ca-dot 1.2s ease-in-out infinite;
	}
	.ca-overlay__dots span:nth-child(2) { animation-delay: 0.2s; }
	.ca-overlay__dots span:nth-child(3) { animation-delay: 0.4s; }

	.ca-overlay__grid-data {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 0.45rem;
		color: rgba(0, 240, 255, 0.4);
		letter-spacing: 0.1em;
	}

	/* ── Drop Zone ───────────────────────────────────────────────────────────── */
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
		color: white;
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
		background: rgba(0, 240, 255, 0.08);
		border: 1px solid rgba(0, 240, 255, 0.25);
		font-size: 0.52rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #00f0ff;
	}

	.ca-file-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.45rem 1.1rem;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		min-height: 36px;
		transition: color 0.2s, border-color 0.2s;
	}
	.ca-file-btn:hover { color: #00f0ff; border-color: rgba(0, 240, 255, 0.3); }
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
		border: 1px solid rgba(0, 240, 255, 0.5);
		background: rgba(0, 240, 255, 0.08);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: #00f0ff;
		cursor: pointer;
		transition: background 0.2s, box-shadow 0.2s;
		min-height: 44px;
		box-shadow: 0 0 14px rgba(0, 240, 255, 0.18);
	}
	.ca-analyze-btn:hover {
		background: rgba(0, 240, 255, 0.16);
		box-shadow: 0 0 28px rgba(0, 240, 255, 0.35);
	}
	.ca-analyze-btn__icon { font-size: 0.9rem; }

	/* ── Result ──────────────────────────────────────────────────────────────── */
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
		color: rgba(0, 240, 255, 0.6);
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
		color: white;
		line-height: 1.5;
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.ca-result__stat-chip {
		padding: 1px 7px;
		border-radius: 4px;
		background: rgba(0, 240, 255, 0.1);
		border: 1px solid rgba(0, 240, 255, 0.3);
		color: #00f0ff;
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
		background: rgba(0, 240, 255, 0.05);
		border: 1px solid rgba(0, 240, 255, 0.15);
	}
	.ca-result__delta-val {
		font-size: 1.35rem;
		font-weight: 900;
		color: #00f0ff;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 0 12px rgba(0, 240, 255, 0.6);
	}
	.ca-result__delta-stat {
		font-size: 0.75rem;
		font-weight: 700;
		color: rgba(0, 240, 255, 0.6);
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
	.ca-result__bullet-dot { color: rgba(0, 240, 255, 0.5); font-size: 0.55rem; flex-shrink: 0; }

	.ca-result__actions {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.25rem;
	}

	.ca-confirm-btn {
		flex: 2;
		padding: 0.6rem;
		border-radius: 7px;
		border: 1px solid rgba(0, 240, 255, 0.5);
		background: rgba(0, 240, 255, 0.08);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #00f0ff;
		cursor: pointer;
		min-height: 44px;
		transition: background 0.2s;
	}
	.ca-confirm-btn:hover:not(:disabled) { background: rgba(0, 240, 255, 0.16); }
	.ca-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	/* ── Complete ─────────────────────────────────────────────────────────────── */
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
		color: #00f0ff;
		filter: drop-shadow(0 0 12px rgba(0, 240, 255, 0.6));
	}
	.ca-complete__title {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		color: white;
	}
	.ca-complete__sub {
		margin: 0;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.4);
		letter-spacing: 0.06em;
	}

	/* ── Error ───────────────────────────────────────────────────────────────── */
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

	/* ── Shared ──────────────────────────────────────────────────────────────── */
	.ca-btn-ghost {
		flex: 1;
		padding: 0.5rem 0.9rem;
		border-radius: 7px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.03);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.35);
		cursor: pointer;
		min-height: 44px;
		transition: color 0.2s, border-color 0.2s;
	}
	.ca-btn-ghost:hover { color: rgba(0, 240, 255, 0.7); border-color: rgba(0, 240, 255, 0.25); }

	/* ── Keyframes ───────────────────────────────────────────────────────────── */
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
