<script>
	import { onMount, tick } from 'svelte';
	import { auth, db } from '$lib/firebase.js';
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
		if (ctx && canvas) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
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

					{#if libraryLoading}
						<p class="strategy-hint">Loading library…</p>
					{/if}
					{#if libraryError}
						<p class="strategy-error" role="alert">{libraryError}</p>
					{/if}
				{/if}
			</div>
		</div>

		<div class="card strategy-board-card">
			<div class="card-header strategy-card-head">Strategy canvas</div>
			<div class="card-body strategy-board-body">
				<div class="strategy-toolbar">
					{#each [['pen', 'Pen'], ['arrow', 'Arrow'], ['X', 'X Player'], ['O', 'O Player']] as [tool, label]}
						<button
							type="button"
							class="secondary-btn strategy-tool-btn"
							class:active={currentTool === tool}
							onclick={() => (currentTool = tool)}
						>
							{label}
						</button>
					{/each}
					<input
						type="color"
						bind:value={currentColor}
						title="Stroke color"
						class="strategy-color-input"
					/>
					<label class="strategy-wb-toggle">
						<input type="checkbox" bind:checked={whiteboard} />
						Whiteboard mode
					</label>
				</div>

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
				</div>
			</div>
		</div>
	</div>
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

	.strategy-library,
	.strategy-board-card {
		margin-bottom: 0;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
	}

	.strategy-card-head {
		padding-bottom: clamp(12px, 2vw, 16px);
		margin-bottom: clamp(12px, 2vw, 16px);
	}

	.strategy-library-body,
	.strategy-board-body {
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

	.strategy-toolbar {
		display: flex;
		gap: clamp(8px, 2vw, 10px);
		flex-wrap: wrap;
		margin-bottom: clamp(12px, 2vw, 16px);
		padding: clamp(12px, 2.5vw, 16px);
		background: var(--glass-bg);
		-webkit-backdrop-filter: blur(20px) saturate(160%);
		backdrop-filter: blur(20px) saturate(160%);
		border-radius: var(--radius-premium);
		border: 1px solid var(--glass-border);
		align-items: center;
		box-shadow: var(--shadow-premium);
	}

	.strategy-tool-btn {
		padding: clamp(8px, 2vw, 10px) clamp(12px, 2.5vw, 14px);
		width: auto;
		margin: 0;
		font-size: 0.85rem;
		border-radius: var(--radius-premium);
	}

	.strategy-tool-btn.active {
		background: var(--aggie-blue);
		color: white;
		border-color: var(--aggie-blue);
	}

	.strategy-color-input {
		width: 44px;
		height: 44px;
		padding: 2px;
		border-radius: var(--radius-premium);
		border: 1px solid var(--input-border);
		cursor: pointer;
	}

	.strategy-wb-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}

	.strategy-canvas-wrap {
		position: relative;
		border: 2px solid var(--aggie-blue);
		border-radius: var(--radius-premium);
		overflow: hidden;
		background: #4ade80;
		aspect-ratio: 4/3;
		width: 100%;
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
		border: 3px solid white;
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
</style>
