<script>
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { auth, db, functions } from '$lib/firebase.js';
	import FocusedWorkspaceWrapper from './FocusedWorkspaceWrapper.svelte';
	import IntelModal from '$lib/components/ui/IntelModal.svelte';

	const TACTICAL_INTEL = {
		title: 'TACTICAL BUILDER',
		instructions: [
			'1. Drag and drop players/cones onto the pitch.',
			'2. Draw movement vectors to design drills.',
			'3. Save your schematic to deploy to the team.',
		],
	};
	import { httpsCallable } from 'firebase/functions';
	import {
		addDoc,
		collection,
		doc,
		getDoc,
		getDocs,
		orderBy,
		query,
		serverTimestamp,
	} from 'firebase/firestore';

	let { teamId = '' } = $props();

	let canvas;
	let ctx;
	let isDrawing = $state(false);
	let currentTool = $state('pen');
	let currentColor = $state('#0f172a');
	let whiteboard = $state(false);

	/** @type {Array<Record<string, unknown>>} */
	let strokes = $state([]);
	/** @type {{ type: string, tool: string, color: string, points: { nx: number, ny: number }[] } | null} */
	let activePath = null;

	let tacticName = $state('');
	let selectedTacticId = $state('');
	/** Set after a successful Load — matches Firestore doc the AI callable reads. */
	let loadedTacticId = $state('');

	const analyzeTacticWithAI = httpsCallable(functions, 'analyzeTacticWithAI');

	let aiBusy = $state(false);
	let aiError = $state('');
	let aiAnalysis = $state('');
	let aiInsightsOpen = $state(false);
	let aiModelLabel = $state('');
	/** @type {Array<{ id: string, name: string, updatedAt: import('firebase/firestore').Timestamp | null }>} */
	let tacticsList = $state([]);
	let libraryLoading = $state(false);
	let libraryError = $state('');
	let saveBusy = $state(false);

	const resize = () => {
		if (!canvas?.parentElement?.offsetWidth) return;
		const cont = canvas.parentElement;
		canvas.width = cont.offsetWidth;
		canvas.height = cont.offsetHeight || cont.offsetWidth * 0.75;
		redrawAll();
	};

	function toNorm(x, y) {
		if (!canvas?.width) return { nx: 0, ny: 0 };
		return { nx: x / canvas.width, ny: y / canvas.height };
	}

	function redrawAll() {
		if (!ctx || !canvas) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const w = canvas.width;
		const h = canvas.height;
		for (const raw of strokes) {
			const s = /** @type {Record<string, unknown>} */ (raw);
			const color = typeof s.color === 'string' ? s.color : '#0f172a';
			ctx.strokeStyle = color;
			ctx.fillStyle = color;
			ctx.lineWidth = 4;
			ctx.lineCap = 'round';
			if (s.type === 'path') {
				const pts = /** @type {{ nx: number, ny: number }[] | undefined} */ (
					s.points
				);
				if (!pts || pts.length < 2) continue;
				ctx.beginPath();
				ctx.moveTo(pts[0].nx * w, pts[0].ny * h);
				for (let i = 1; i < pts.length; i++) {
					ctx.lineTo(pts[i].nx * w, pts[i].ny * h);
				}
				ctx.stroke();
			} else if (s.type === 'x') {
				const nx = typeof s.nx === 'number' ? s.nx : 0;
				const ny = typeof s.ny === 'number' ? s.ny : 0;
				ctx.font = 'bold 24px Inter';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText('X', nx * w, ny * h);
			} else if (s.type === 'o') {
				const nx = typeof s.nx === 'number' ? s.nx : 0;
				const ny = typeof s.ny === 'number' ? s.ny : 0;
				ctx.beginPath();
				ctx.arc(nx * w, ny * h, 12, 0, 2 * Math.PI);
				ctx.stroke();
			}
		}
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		resize();
		window.addEventListener('resize', resize);
		setTimeout(resize, 300);
		return () => window.removeEventListener('resize', resize);
	});

	const getPos = (e) => {
		const rect = canvas.getBoundingClientRect();
		return {
			x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
			y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top,
		};
	};

	const startDraw = (e) => {
		if (!canvas || !ctx) return;
		const pos = getPos(e);
		ctx.strokeStyle = currentColor;
		ctx.fillStyle = currentColor;
		ctx.lineWidth = 4;
		ctx.lineCap = 'round';
		if (currentTool === 'pen' || currentTool === 'arrow') {
			isDrawing = true;
			activePath = {
				type: 'path',
				tool: currentTool,
				color: currentColor,
				points: [toNorm(pos.x, pos.y)],
			};
			ctx.beginPath();
			ctx.moveTo(pos.x, pos.y);
		} else if (currentTool === 'X') {
			ctx.font = 'bold 24px Inter';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('X', pos.x, pos.y);
			strokes = [
				...strokes,
				{ type: 'x', color: currentColor, ...toNorm(pos.x, pos.y) },
			];
		} else if (currentTool === 'O') {
			ctx.beginPath();
			ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI);
			ctx.stroke();
			strokes = [
				...strokes,
				{ type: 'o', color: currentColor, ...toNorm(pos.x, pos.y) },
			];
		}
	};

	const draw = (e) => {
		if (!isDrawing || !activePath) return;
		e.preventDefault();
		const pos = getPos(e);
		activePath.points.push(toNorm(pos.x, pos.y));
		ctx.lineTo(pos.x, pos.y);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(pos.x, pos.y);
	};

	const endDraw = () => {
		if (isDrawing && activePath && activePath.points.length >= 2) {
			strokes = [...strokes, activePath];
		}
		isDrawing = false;
		activePath = null;
	};

	function clearBoard() {
		strokes = [];
		loadedTacticId = '';
		if (ctx && canvas) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}

	$effect(() => {
		if (loadedTacticId && selectedTacticId !== loadedTacticId) {
			loadedTacticId = '';
		}
	});

	const canAnalyzeTactic = $derived(
		Boolean(teamId && loadedTacticId && !aiBusy),
	);

	async function runAiAnalysis() {
		if (!teamId || !loadedTacticId || aiBusy) return;
		aiBusy = true;
		aiError = '';
		aiAnalysis = '';
		aiModelLabel = '';
		try {
			const res = await analyzeTacticWithAI({
				teamId,
				tacticId: loadedTacticId,
			});
			const data = /** @type {{ analysis?: string, model?: string }} */ (res.data);
			const text = typeof data?.analysis === 'string' ? data.analysis.trim() : '';
			if (text) {
				aiAnalysis = text;
				aiModelLabel = typeof data?.model === 'string' ? data.model : '';
				aiInsightsOpen = true;
			} else {
				aiError = 'The AI returned no analysis. Try again.';
				aiInsightsOpen = true;
			}
		} catch (err) {
			const msg =
				err && typeof err === 'object' && 'message' in err ?
					String(err.message) :
					'Analysis failed.';
			aiError = msg;
			aiInsightsOpen = true;
		} finally {
			aiBusy = false;
		}
	}

	function dismissAiInsights() {
		aiInsightsOpen = false;
		aiAnalysis = '';
		aiError = '';
		aiModelLabel = '';
	}

	async function refreshTacticsList() {
		if (!teamId) {
			tacticsList = [];
			return;
		}
		libraryLoading = true;
		libraryError = '';
		try {
			const q = query(
				collection(db, 'teams', teamId, 'tactics'),
				orderBy('updatedAt', 'desc'),
			);
			const snap = await getDocs(q);
			tacticsList = snap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					name: typeof data.name === 'string' ? data.name : 'Untitled',
					updatedAt: data.updatedAt || null,
				};
			});
		} catch (err) {
			console.error(err);
			libraryError = err?.message || 'Could not load tactics.';
			tacticsList = [];
		} finally {
			libraryLoading = false;
		}
	}

	$effect(() => {
		const tid = teamId;
		if (!tid) {
			tacticsList = [];
			return;
		}
		refreshTacticsList();
	});

	async function saveTactic() {
		const uid = auth.currentUser?.uid;
		if (!teamId) {
			libraryError = 'Select a team first.';
			return;
		}
		if (!uid) {
			libraryError = 'Sign in to save tactics.';
			return;
		}
		const name = tacticName.trim();
		if (!name) {
			libraryError = 'Enter a name for this tactic.';
			return;
		}
		saveBusy = true;
		libraryError = '';
		try {
			const canvasState = {
				v: 1,
				whiteboard,
				strokes,
			};
			await addDoc(collection(db, 'teams', teamId, 'tactics'), {
				name,
				canvasState,
				createdBy: uid,
				updatedAt: serverTimestamp(),
			});
			tacticName = '';
			await refreshTacticsList();
		} catch (err) {
			console.error(err);
			libraryError = err?.message || 'Save failed.';
		} finally {
			saveBusy = false;
		}
	}

	async function loadTactic() {
		if (!teamId || !selectedTacticId) {
			libraryError = 'Choose a saved tactic.';
			return;
		}
		libraryError = '';
		try {
			const ref = doc(db, 'teams', teamId, 'tactics', selectedTacticId);
			const snap = await getDoc(ref);
			if (!snap.exists()) {
				libraryError = 'Tactic not found.';
				return;
			}
			const data = snap.data();
			const raw = data.canvasState;
			let parsed = raw;
			if (typeof raw === 'string') {
				try {
					parsed = JSON.parse(raw);
				} catch {
					libraryError = 'Invalid saved canvas data.';
					return;
				}
			}
			if (!parsed || typeof parsed !== 'object') {
				libraryError = 'Invalid saved canvas data.';
				return;
			}
			const wb = parsed.whiteboard === true;
			const nextStrokes = Array.isArray(parsed.strokes) ? parsed.strokes : [];
			whiteboard = wb;
			strokes = nextStrokes;
			loadedTacticId = selectedTacticId;
			await tick();
			resize();
		} catch (err) {
			console.error(err);
			libraryError = err?.message || 'Load failed.';
		}
	}

	function formatUpdated(ts) {
		if (!ts || typeof ts.toDate !== 'function') return '';
		try {
			return ts.toDate().toLocaleString();
		} catch {
			return '';
		}
	}

</script>

<div class="strategy-tab">
	<div class="bento-section strategy-bento">
		<div class="card strategy-library">
			<div class="card-header strategy-card-head">Tactics library</div>
			<div class="card-body strategy-library-body">
				{#if !teamId}
					<p class="strategy-hint">Select a team from the coach header to use tactics.</p>
				{:else}
					<label class="strategy-label" for="strategy-tactic-name">Tactic name</label>
					<input
						id="strategy-tactic-name"
						class="strategy-input"
						type="text"
						bind:value={tacticName}
						placeholder='e.g. "High press 4-3-3"'
						maxlength="200"
					/>

					<div class="strategy-actions">
						<button
							type="button"
							class="secondary-btn strategy-btn"
							disabled={saveBusy}
							onclick={saveTactic}
						>
							{saveBusy ? 'Saving…' : 'Save tactic'}
						</button>
						<button type="button" class="secondary-btn strategy-btn" onclick={clearBoard}>
							Clear board
						</button>
					</div>

					<label class="strategy-label" for="strategy-tactic-select">Load tactic</label>
					<div class="strategy-load-row">
						<select
							id="strategy-tactic-select"
							class="strategy-select"
							bind:value={selectedTacticId}
						>
							<option value="">— Choose —</option>
							{#each tacticsList as t (t.id)}
								<option value={t.id}>
									{t.name}{formatUpdated(t.updatedAt) ? ` · ${formatUpdated(t.updatedAt)}` : ''}
								</option>
							{/each}
						</select>
						<button type="button" class="secondary-btn strategy-btn" onclick={loadTactic}>
							Load
						</button>
					</div>

					<div class="strategy-ai-trigger">
						<button
							type="button"
							class="primary-btn strategy-ai-analyze-btn"
							disabled={!canAnalyzeTactic}
							onclick={runAiAnalysis}
							aria-busy={aiBusy}
						>
							Analyze tactic
						</button>
						<p class="strategy-ai-trigger-hint">
							{#if !loadedTacticId}
								Load a saved tactic to analyze the board stored in your library (the AI
								reads the saved version).
							{:else}
								Analyzes the saved tactic linked to this canvas. Save again if you changed
								the board.
							{/if}
						</p>
					</div>

					{#if libraryLoading}
						<p class="strategy-hint">Loading library…</p>
					{/if}
					{#if libraryError}
						<p class="strategy-error" role="alert">{libraryError}</p>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Dark workspace — managed by FocusedWorkspaceWrapper (fullscreen, escape, island) -->
		<FocusedWorkspaceWrapper>
			{#snippet toolbar()}
				<span class="strategy-island-intel">
					<IntelModal title={TACTICAL_INTEL.title} instructions={TACTICAL_INTEL.instructions} />
				</span>
				<div class="strategy-island-sep" aria-hidden="true"></div>
				<button
					type="button"
					class="strategy-island-btn"
					class:strategy-island-btn--active={currentTool === 'pen'}
					onclick={() => (currentTool = 'pen')}
					title="Pen"
					aria-label="Pen"
					aria-pressed={currentTool === 'pen'}
				>
					<i class="ph ph-pencil-simple" aria-hidden="true"></i>
				</button>
				<button
					type="button"
					class="strategy-island-btn"
					class:strategy-island-btn--active={currentTool === 'arrow'}
					onclick={() => (currentTool = 'arrow')}
					title="Arrow"
					aria-label="Arrow"
					aria-pressed={currentTool === 'arrow'}
				>
					<i class="ph ph-arrow-up-right" aria-hidden="true"></i>
				</button>
				<button
					type="button"
					class="strategy-island-btn"
					class:strategy-island-btn--active={currentTool === 'X'}
					onclick={() => (currentTool = 'X')}
					title="X Player"
					aria-label="X player marker"
					aria-pressed={currentTool === 'X'}
				>
					<i class="ph ph-x" aria-hidden="true"></i>
				</button>
				<button
					type="button"
					class="strategy-island-btn"
					class:strategy-island-btn--active={currentTool === 'O'}
					onclick={() => (currentTool = 'O')}
					title="O Player"
					aria-label="O player marker"
					aria-pressed={currentTool === 'O'}
				>
					<i class="ph ph-circle" aria-hidden="true"></i>
				</button>
				<div class="strategy-island-sep" aria-hidden="true"></div>
				<label class="strategy-island-color" title="Stroke colour" aria-label="Stroke colour">
					<span
						class="strategy-island-color-swatch"
						style="background: {currentColor};"
						aria-hidden="true"
					></span>
					<input type="color" bind:value={currentColor} />
				</label>
				<div class="strategy-island-sep" aria-hidden="true"></div>
				<button
					type="button"
					class="strategy-island-btn"
					class:strategy-island-btn--active={whiteboard}
					onclick={() => (whiteboard = !whiteboard)}
					title="Whiteboard mode"
					aria-label="Toggle whiteboard mode"
					aria-pressed={whiteboard}
				>
					<i class="ph ph-eraser" aria-hidden="true"></i>
				</button>
			{/snippet}

			<!-- Pitch centered inside the dark workspace -->
			<div class="strategy-pitch-area">
				<div class="strategy-canvas-wrap" class:strategy-canvas-wrap--wb={whiteboard}>
					<div
						class="strategy-pitch-bg pitch-lines"
						class:strategy-pitch-bg--wb={whiteboard}
					></div>
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_mouse_events_have_key_events -->
					<canvas
						bind:this={canvas}
						class="strategy-canvas"
						onmousedown={startDraw}
						onmouseup={endDraw}
						onmousemove={draw}
						onmouseout={endDraw}
						ontouchstart={startDraw}
						ontouchend={endDraw}
						ontouchmove={draw}
						aria-label="Strategy board canvas"
					></canvas>
					{#if aiBusy}
						<div class="strategy-ai-overlay" aria-live="polite" aria-busy="true">
							<div class="strategy-ai-overlay-glass">
								<div class="strategy-ai-spinner" aria-hidden="true"></div>
								<p class="strategy-ai-overlay-title">Tactical engine</p>
								<p class="strategy-ai-overlay-sub">Processing spatial layout…</p>
								<div class="strategy-ai-skeleton" aria-hidden="true">
									<div class="strategy-ai-skel-line"></div>
									<div class="strategy-ai-skel-line strategy-ai-skel-line--mid"></div>
									<div class="strategy-ai-skel-line strategy-ai-skel-line--short"></div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</FocusedWorkspaceWrapper>
	</div>

	{#if aiInsightsOpen && (aiAnalysis || aiError)}
		<div class="bento-section strategy-ai-bento">
			<div class="card strategy-ai-insights">
				<div class="strategy-ai-insights-head">
					<div>
						<h3 class="strategy-ai-insights-title">AI insights</h3>
						{#if aiModelLabel}
							<p class="strategy-ai-insights-meta">{aiModelLabel}</p>
						{/if}
					</div>
					<button
						type="button"
						class="secondary-btn strategy-ai-dismiss"
						onclick={dismissAiInsights}
					>
						Clear analysis
					</button>
				</div>
				<div class="card-body strategy-ai-insights-body">
					{#if aiError}
						<p class="strategy-ai-insights-error" role="alert">{aiError}</p>
					{:else}
						<div class="strategy-ai-prose">{aiAnalysis}</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.strategy-tab {
		padding: clamp(8px, 2vw, 16px) 0;
		width: 100%;
		box-sizing: border-box;
	}

	.strategy-bento {
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
		gap: clamp(16px, 3vw, 24px);
		margin-bottom: clamp(16px, 3vw, 24px);
	}

	.strategy-library {
		margin-bottom: 0;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
	}

	.strategy-card-head {
		padding-bottom: clamp(12px, 2vw, 16px);
		margin-bottom: clamp(12px, 2vw, 16px);
	}

	.strategy-library-body {
		padding-top: 0;
	}

	.strategy-library-body > * + * {
		margin-top: clamp(12px, 2vw, 16px);
	}

	.strategy-label {
		display: block;
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.strategy-input,
	.strategy-select {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 12px) clamp(12px, 2vw, 14px);
		border-radius: var(--radius-premium);
		border: 1px solid var(--input-border);
		background: var(--input-bg);
		font: inherit;
	}

	.strategy-actions,
	.strategy-load-row {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(8px, 2vw, 10px);
		align-items: center;
	}

	.strategy-load-row .strategy-select {
		flex: 1 1 160px;
		min-width: 0;
	}

	.strategy-btn {
		width: auto;
		margin: 0;
		padding: clamp(8px, 2vw, 10px) clamp(14px, 3vw, 18px);
		border-radius: var(--radius-premium);
		font-size: 0.85rem;
	}

	.strategy-hint {
		margin: 0;
		font-size: 0.88rem;
		color: var(--text-secondary);
		font-weight: 600;
	}

	.strategy-error {
		margin: 0;
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--danger-red);
	}


	/* ─── Pitch centering ─────────────────────────────────────── */
	.strategy-pitch-area {
		position: relative;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.strategy-canvas-wrap {
		position: relative;
		border-radius: var(--radius-premium);
		overflow: hidden;
		background: #4ade80;
		aspect-ratio: 4 / 3;
		width: 100%;
		/* shadow-2xl equivalent on dark background */
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.65),
			0 0 0 1px rgba(255, 255, 255, 0.06);
	}

	.strategy-canvas-wrap--wb {
		background: #ffffff;
	}

	.strategy-canvas-wrap--wb :global(.pitch-lines) {
		border-color: rgba(148, 163, 184, 0.55);
	}

	.strategy-canvas-wrap--wb :global(.pitch-lines)::before {
		border-left-color: rgba(148, 163, 184, 0.55);
	}

	.strategy-canvas-wrap--wb :global(.pitch-lines)::after {
		border-color: rgba(148, 163, 184, 0.55);
	}

	.strategy-pitch-bg {
		position: absolute;
		top: 5%;
		left: 5%;
		right: 5%;
		bottom: 5%;
		border: 3px solid rgba(255, 255, 255, 0.7);
		pointer-events: none;
		border-radius: calc(var(--radius-premium) - 6px);
	}

	.strategy-pitch-bg--wb {
		border-color: rgba(148, 163, 184, 0.45);
	}

	.strategy-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		touch-action: none;
		z-index: 10;
	}

	/* ─── Island toolbar items (rendered inside fw-island pill) ── */
	.strategy-island-intel {
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		margin: 0 2px 0 0;
	}
	.strategy-island-intel :global(.im-trigger) {
		transform: scale(0.92);
		transform-origin: center;
	}
	.strategy-island-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border-radius: 50%;
		border: 1px solid transparent;
		background: transparent;
		color: #3f3f46;
		cursor: pointer;
		transition: background 0.12s ease, color 0.12s ease;
		flex-shrink: 0;
	}

	:global(html.dark) .strategy-island-btn {
		color: #a1a1aa;
	}

	.strategy-island-btn i {
		font-size: 1.1rem;
		pointer-events: none;
	}

	.strategy-island-btn:hover {
		background: #f4f4f5;
		color: #18181b;
	}

	:global(html.dark) .strategy-island-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fafafa;
	}

	.strategy-island-btn--active {
		background: #0f172a;
		color: #ffffff;
	}

	.strategy-island-btn--active:hover {
		background: #1e293b;
		color: #ffffff;
	}

	:global(html.dark) .strategy-island-btn--active {
		background: rgba(255, 255, 255, 0.15);
		color: #fafafa;
	}

	.strategy-island-sep {
		width: 1px;
		height: 22px;
		background: #e4e4e7;
		flex-shrink: 0;
		margin: 0 4px;
	}

	:global(html.dark) .strategy-island-sep {
		background: rgba(255, 255, 255, 0.1);
	}

	/* Colour swatch — the label wraps a hidden native picker + visible circle */
	.strategy-island-color {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		cursor: pointer;
		flex-shrink: 0;
		overflow: hidden;
	}

	.strategy-island-color-swatch {
		display: block;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.6);
		box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.15);
		pointer-events: none;
		flex-shrink: 0;
	}

	.strategy-island-color input[type='color'] {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0.001;
		cursor: pointer;
		padding: 0;
		border: none;
		border-radius: 50%;
	}

	.strategy-ai-trigger {
		display: flex;
		flex-direction: column;
		gap: clamp(8px, 1.5vw, 10px);
		padding: clamp(12px, 2.5vw, 16px);
		border-radius: var(--radius-premium);
		border: 1px solid var(--glass-border);
		background: var(--glass-bg);
		-webkit-backdrop-filter: blur(14px) saturate(150%);
		backdrop-filter: blur(14px) saturate(150%);
		box-shadow: var(--shadow-premium);
	}

	.strategy-ai-analyze-btn {
		width: 100%;
		margin: 0;
		padding: clamp(12px, 2.5vw, 14px) clamp(16px, 3vw, 20px);
		border-radius: var(--radius-premium);
		font-weight: 900;
		font-size: clamp(0.92rem, 2.4vw, 1rem);
		letter-spacing: -0.01em;
	}

	.strategy-ai-trigger-hint {
		margin: 0;
		font-size: clamp(0.78rem, 2vw, 0.84rem);
		font-weight: 600;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.strategy-ai-overlay {
		position: absolute;
		inset: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(16px, 3vw, 24px);
		background: rgba(15, 23, 42, 0.35);
		-webkit-backdrop-filter: blur(10px);
		backdrop-filter: blur(10px);
		border-radius: inherit;
		box-sizing: border-box;
	}

	.strategy-ai-overlay-glass {
		width: min(100%, 320px);
		padding: clamp(20px, 4vw, 28px);
		border-radius: var(--radius-premium);
		background: rgba(255, 255, 255, 0.82);
		border: 1px solid rgba(255, 255, 255, 0.55);
		box-shadow: 0 24px 48px -16px rgba(15, 23, 42, 0.25),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
		text-align: center;
		-webkit-backdrop-filter: blur(20px) saturate(160%);
		backdrop-filter: blur(20px) saturate(160%);
	}

	.strategy-ai-spinner {
		width: 48px;
		height: 48px;
		margin: 0 auto clamp(14px, 2.5vw, 18px);
		border-radius: 50%;
		border: 3px solid rgba(15, 23, 42, 0.12);
		border-top-color: var(--aggie-blue);
		animation: strategy-ai-spin 0.85s linear infinite;
	}

	@keyframes strategy-ai-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.strategy-ai-overlay-title {
		margin: 0 0 6px;
		font-size: 0.72rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-secondary);
	}

	.strategy-ai-overlay-sub {
		margin: 0 0 clamp(14px, 2.5vw, 18px);
		font-size: clamp(0.9rem, 2.4vw, 0.98rem);
		font-weight: 800;
		color: var(--text-primary);
	}

	.strategy-ai-skeleton {
		display: flex;
		flex-direction: column;
		gap: 10px;
		text-align: left;
	}

	.strategy-ai-skel-line {
		height: 10px;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			rgba(15, 23, 42, 0.08) 0%,
			rgba(15, 23, 42, 0.18) 50%,
			rgba(15, 23, 42, 0.08) 100%
		);
		background-size: 200% 100%;
		animation: strategy-ai-shimmer 1.25s ease-in-out infinite;
	}

	.strategy-ai-skel-line--mid {
		width: 88%;
	}

	.strategy-ai-skel-line--short {
		width: 62%;
	}

	@keyframes strategy-ai-shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	.strategy-ai-bento {
		grid-template-columns: 1fr;
		gap: clamp(16px, 3vw, 24px);
		margin-top: clamp(8px, 2vw, 12px);
		margin-bottom: clamp(16px, 3vw, 24px);
	}

	.strategy-ai-insights {
		margin-bottom: 0;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
		overflow: hidden;
	}

	.strategy-ai-insights-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: clamp(12px, 2vw, 16px);
		margin-bottom: clamp(12px, 2vw, 16px);
		padding-bottom: clamp(12px, 2vw, 16px);
		border-bottom: 1px solid var(--border-subtle);
	}

	.strategy-ai-insights-title {
		margin: 0;
		font-size: clamp(1.05rem, 3vw, 1.25rem);
		font-weight: 900;
		letter-spacing: -0.02em;
	}

	.strategy-ai-insights-meta {
		margin: 6px 0 0;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.strategy-ai-dismiss {
		width: auto;
		margin: 0;
		padding: clamp(8px, 2vw, 10px) clamp(14px, 2.5vw, 18px);
		border-radius: var(--radius-premium);
		font-size: 0.82rem;
		font-weight: 800;
	}

	.strategy-ai-insights-body {
		padding: 0;
		padding-top: clamp(4px, 1vw, 8px);
	}

	.strategy-ai-insights-error {
		margin: 0;
		font-weight: 700;
		color: var(--danger-red);
		line-height: 1.55;
	}

	.strategy-ai-prose {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
		line-height: 1.65;
		font-size: clamp(0.9rem, 2.2vw, 0.98rem);
		font-weight: 600;
		color: var(--text-primary);
	}

	:global(html.dark) .strategy-ai-overlay-glass {
		background: rgba(15, 23, 42, 0.72);
		border-color: rgba(255, 255, 255, 0.14);
		box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	:global(html.dark) .strategy-ai-skel-line {
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.06) 0%,
			rgba(255, 255, 255, 0.14) 50%,
			rgba(255, 255, 255, 0.06) 100%
		);
		background-size: 200% 100%;
	}
</style>
