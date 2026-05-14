<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { auth, db, functions } from '$lib/firebase.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import FocusedWorkspaceWrapper from './FocusedWorkspaceWrapper.svelte';
	import IntelModal from '$lib/components/ui/IntelModal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

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

	/** Board shell — tokens + coords are relative to this rect. */
	let boardRef = $state(/** @type {HTMLDivElement | undefined} */ (undefined));
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
	/** Tactics library / save-load — floating overlay (no sidebar). */
	let libraryOpen = $state(false);
	/** @type {Array<{ id: string, name: string, updatedAt: import('firebase/firestore').Timestamp | null }>} */
	let tacticsList = $state([]);
	let libraryLoading = $state(false);
	let libraryError = $state('');
	let saveBusy = $state(false);

	/** Resolves to Firestore `teams/{id}` — pivot from `teamId` prop or `workspaceContextStore.activeTeamId`. */
	const resolvedTeamId = $derived((teamId || workspaceContextStore.activeTeamId || '').trim());

	/**
	 * Multi-domain surface: `teams.sport` on the active team (from workspace + `teamsStore`).
	 * @type {'soccer' | 'basketball'}
	 */
	const boardSport = $derived.by(() => {
		const row = teamsStore.teams.find((t) => t.id === resolvedTeamId);
		const s = String(row?.sport ?? 'soccer').toLowerCase().trim();
		return s === 'basketball' ? 'basketball' : 'soccer';
	});

	/** Dynamic board shell background (layer under pitch SVGs / canvas) — not used in whiteboard mode. */
	const boardFieldSurfaceStyle = $derived.by(() => {
		if (whiteboard) return '';
		if (boardSport === 'basketball') {
			return 'background: linear-gradient(165deg, #9a3412 0%, #7c2d12 48%, #713f12 100%);';
		}
		/* emerald-900 → green-950 */
		return 'background: linear-gradient(to bottom, rgb(6 78 59) 0%, rgb(5 46 22) 100%);';
	});

	/**
	 * @type {null | { kind: 'draw'; pointerId: number } | { kind: 'token'; id: string; pointerId: number }}
	 */
	let pointerSession = $state(null);

	function newTokenId() {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
		return `tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
	}

	$effect(() => {
		const raw = strokes;
		let changed = false;
		const out = raw.map((s) => {
			const o = /** @type {Record<string, unknown>} */ (s);
			if ((o.type === 'x' || o.type === 'o') && (typeof o.id !== 'string' || !o.id)) {
				changed = true;
				return { ...o, id: newTokenId() };
			}
			return s;
		});
		if (changed) strokes = /** @type {typeof raw} */ (out);
	});

	/** X / O markers — rendered as DOM for reliable drag; paths stay on canvas. */
	const tokenItems = $derived.by(() => {
		/** @type {Array<{ id: string; type: 'x' | 'o'; nx: number; ny: number; color: string }>} */
		const out = [];
		for (const raw of strokes) {
			const s = /** @type {Record<string, unknown>} */ (raw);
			if (s.type !== 'x' && s.type !== 'o') continue;
			if (typeof s.id !== 'string' || !s.id) continue;
			const nx = typeof s.nx === 'number' ? s.nx : 0;
			const ny = typeof s.ny === 'number' ? s.ny : 0;
			const color = typeof s.color === 'string' ? s.color : '#0f172a';
			out.push({
				id: s.id,
				type: /** @type {'x' | 'o'} */ (s.type),
				nx,
				ny,
				color,
			});
		}
		return out;
	});

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
			if (s.type === 'x' || s.type === 'o') continue;
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

	/**
	 * Pointer position in canvas pixels and normalized [0,1] relative to the board.
	 * @param {PointerEvent} e
	 */
	const getPos = (e) => {
		if (!canvas || !boardRef) {
			return { x: 0, y: 0, nx: 0, ny: 0 };
		}
		const rect = boardRef.getBoundingClientRect();
		const scaleX = canvas.width / (rect.width || 1);
		const scaleY = canvas.height / (rect.height || 1);
		const x = (e.clientX - rect.left) * scaleX;
		const y = (e.clientY - rect.top) * scaleY;
		const raw = toNorm(x, y);
		const nx = Math.min(1, Math.max(0, raw.nx));
		const ny = Math.min(1, Math.max(0, raw.ny));
		return { x, y, nx, ny };
	};

	/** @param {PointerEvent} e */
	function handleCanvasPointerDown(e) {
		if (!canvas || !ctx || e.button !== 0) return;
		if (e.target !== canvas) return;

		const pos = getPos(e);

		if (currentTool === 'X' || currentTool === 'O') {
			strokes = [
				...strokes,
				{
					type: currentTool === 'X' ? 'x' : 'o',
					color: currentColor,
					nx: pos.nx,
					ny: pos.ny,
					id: newTokenId(),
				},
			];
			return;
		}

		if (currentTool === 'pen' || currentTool === 'arrow') {
			isDrawing = true;
			pointerSession = { kind: 'draw', pointerId: e.pointerId };
			activePath = {
				type: 'path',
				tool: currentTool,
				color: currentColor,
				points: [toNorm(pos.x, pos.y)],
			};
			ctx.strokeStyle = currentColor;
			ctx.fillStyle = currentColor;
			ctx.lineWidth = 4;
			ctx.lineCap = 'round';
			ctx.beginPath();
			ctx.moveTo(pos.x, pos.y);
		}
	}

	/** @param {PointerEvent} e */
	function handleWindowPointerMove(e) {
		if (!pointerSession) return;
		if (pointerSession.kind === 'token' && e.pointerId === pointerSession.pointerId) {
			e.preventDefault();
			const { nx, ny } = getPos(e);
			const id = pointerSession.id;
			strokes = strokes.map((s) => {
				const o = /** @type {Record<string, unknown>} */ (s);
				if (o.id === id && (o.type === 'x' || o.type === 'o')) {
					return { ...o, nx, ny };
				}
				return s;
			});
			return;
		}
		if (pointerSession.kind !== 'draw' || e.pointerId !== pointerSession.pointerId) return;
		if (!isDrawing || !activePath) return;
		e.preventDefault();
		const pos = getPos(e);
		activePath.points.push(toNorm(pos.x, pos.y));
		ctx?.lineTo(pos.x, pos.y);
		ctx?.stroke();
		ctx?.beginPath();
		ctx?.moveTo(pos.x, pos.y);
	}

	/** @param {PointerEvent} e */
	function handleWindowPointerUp(e) {
		if (pointerSession?.kind === 'token' && e.pointerId === pointerSession.pointerId) {
			pointerSession = null;
			return;
		}
		if (pointerSession?.kind === 'draw' && e.pointerId === pointerSession.pointerId) {
			pointerSession = null;
			if (isDrawing && activePath && activePath.points.length >= 2) {
				strokes = [...strokes, activePath];
			}
			isDrawing = false;
			activePath = null;
		}
	}

	/**
	 * @param {PointerEvent} e
	 */
	function onTokenLostPointerCapture(e) {
		if (pointerSession?.kind === 'token' && e.pointerId === pointerSession.pointerId) {
			pointerSession = null;
		}
	}

	/**
	 * @param {PointerEvent} e
	 * @param {string} tokenId
	 */
	function onTokenPointerDown(e, tokenId) {
		e.preventDefault();
		e.stopPropagation();
		if (e.button !== 0) return;
		pointerSession = { kind: 'token', id: tokenId, pointerId: e.pointerId };
		const t = e.currentTarget;
		if (t && typeof t.setPointerCapture === 'function') {
			try {
				t.setPointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
	}

	function clearBoard() {
		strokes = [];
		loadedTacticId = '';
		pointerSession = null;
		isDrawing = false;
		activePath = null;
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

	$effect(() => {
		if (!browser || !libraryOpen) return;
		/** @param {KeyboardEvent} e */
		function onKey(e) {
			if (e.key === 'Escape') libraryOpen = false;
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<svelte:window
	onpointermove={handleWindowPointerMove}
	onpointerup={handleWindowPointerUp}
	onpointercancel={handleWindowPointerUp}
/>

<div class="strategy-tab">
	<FocusedWorkspaceWrapper arena={true}>
		{#snippet toolbar()}
			<button
				type="button"
				class="strategy-dock-library"
				class:strategy-dock-library--open={libraryOpen}
				onclick={() => (libraryOpen = !libraryOpen)}
				aria-pressed={libraryOpen}
				title="Tactics library"
				aria-label="Toggle tactics library"
			>
				<Icon name={"content.books" as IconName} aria-hidden="true" />
				<span class="strategy-dock-txt">Library</span>
			</button>
			<div class="strategy-island-sep" aria-hidden="true"></div>
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
					<Icon name={"action.edit" as IconName} aria-hidden="true" />
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
					<Icon name={"nav.arrow-up-right" as IconName} aria-hidden="true" />
				</button>
				<div class="strategy-island-sep" aria-hidden="true"></div>
				<div class="strategy-island-token-cluster" role="group" aria-label="Plays and board">
					<button
						type="button"
						class="strategy-island-btn"
						class:strategy-island-btn--active={currentTool === 'X'}
						onclick={() => (currentTool = 'X')}
						title="X Player"
						aria-label="X player marker"
					aria-pressed={currentTool === 'X'}
				>
					<Icon name={"sys.close" as IconName} aria-hidden="true" />
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
					<Icon name={"sys.circle" as IconName} aria-hidden="true" />
				</button>
					<button
						type="button"
						class="strategy-island-clear-siem"
						onclick={clearBoard}
						title="Clear board"
						aria-label="Clear board"
					>
						CLR
					</button>
				</div>
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
					<Icon name={"action.eraser" as IconName} aria-hidden="true" />
				</button>
			{/snippet}

			<!-- Pitch / court centered inside the dark workspace -->
			<div class="strategy-pitch-area">
				<div
					class="strategy-canvas-wrap"
					class:strategy-canvas-wrap--wb={whiteboard}
					class:strategy-canvas-wrap--bb={boardSport === 'basketball' && !whiteboard}
					class:strategy-canvas-wrap--soccer={boardSport === 'soccer' && !whiteboard}
					class:strategy-canvas-wrap--token-drag={pointerSession?.kind === 'token'}
					style={boardFieldSurfaceStyle}
					bind:this={boardRef}
				>
					{#if whiteboard}
						<div class="strategy-field-bg strategy-field-bg--wb" aria-hidden="true"></div>
					{:else if boardSport === 'basketball'}
						<div class="strategy-bb-floor" aria-hidden="true">
							<svg
								class="strategy-bb-svg"
								viewBox="0 0 100 60"
								preserveAspectRatio="xMidYMid meet"
							>
								<rect width="100" height="60" fill="#b45309" rx="0.8" />
								<rect
									x="2"
									y="2"
									width="96"
									height="56"
									fill="none"
									stroke="rgba(255,255,255,0.88)"
									stroke-width="0.5"
									rx="0.6"
								/>
								<line
									x1="50"
									y1="2"
									x2="50"
									y2="58"
									stroke="rgba(255,255,255,0.9)"
									stroke-width="0.45"
								/>
								<rect
									x="20"
									y="18"
									width="60"
									height="24"
									fill="none"
									stroke="rgba(255,255,255,0.88)"
									stroke-width="0.4"
									rx="0.4"
								/>
								<circle cx="50" cy="30" r="4.2" fill="none" stroke="rgba(255,255,255,0.88)" stroke-width="0.4" />
							</svg>
						</div>
					{:else}
						<div class="strategy-pitch-bg pitch-lines"></div>
					{/if}
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<canvas
						bind:this={canvas}
						class="strategy-canvas"
						onpointerdown={handleCanvasPointerDown}
						aria-label="Strategy board canvas"
					></canvas>
					<div class="strategy-token-layer">
						{#each tokenItems as tok (tok.id)}
							<button
								type="button"
								class="strategy-token"
								class:strategy-token--x={tok.type === 'x'}
								class:strategy-token--o={tok.type === 'o'}
								class:strategy-token--dragging={pointerSession?.kind === 'token' &&
									pointerSession.id === tok.id}
								style="left: {tok.nx * 100}%; top: {tok.ny * 100}%; --strategy-token-color: {tok.color};"
								aria-label={tok.type === 'x' ? 'X marker' : 'O marker'}
								onpointerdown={(e) => onTokenPointerDown(e, tok.id)}
								onlostpointercapture={onTokenLostPointerCapture}
							>
								{#if tok.type === 'x'}
									<span class="strategy-token-glyph" aria-hidden="true">X</span>
								{:else}
									<span class="strategy-token-glyph strategy-token-glyph--o" aria-hidden="true"></span>
								{/if}
							</button>
						{/each}
					</div>
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

	{#if libraryOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="tcb-lib-scrim"
			role="presentation"
			tabindex="-1"
			onclick={() => (libraryOpen = false)}
		></div>
		<div
			class="tcb-lib-panel card strategy-library"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tcb-lib-title"
			tabindex="-1"
		>
			<div class="card-header strategy-card-head" id="tcb-lib-title">Tactics library</div>
			<div class="card-body strategy-library-body">
				<button
					type="button"
					class="tcb-lib-close"
					onclick={() => (libraryOpen = false)}
					aria-label="Close library"
				>
					<Icon name={"sys.close" as IconName} aria-hidden="true" />
				</button>
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
	{/if}

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
		padding: 0;
		width: 100%;
		box-sizing: border-box;
		min-height: 0;
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
	}

	.strategy-library {
		position: relative;
		margin-bottom: 0;
		padding: var(--spacing-fluid);
		border-radius: var(--radius-premium);
	}

	.tcb-lib-scrim {
		position: fixed;
		inset: 0;
		z-index: 130;
		background: rgba(2, 6, 23, 0.55);
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
	}

	.tcb-lib-panel {
		position: fixed;
		z-index: 140;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: min(100vw - 1.5rem, 24rem);
		max-height: min(88dvh, 720px);
		overflow: auto;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.65),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		-webkit-backdrop-filter: blur(18px) saturate(150%);
		backdrop-filter: blur(18px) saturate(150%);
	}

	.tcb-lib-close {
		position: absolute;
		top: 0.65rem;
		right: 0.65rem;
		z-index: 2;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(15, 23, 42, 0.65);
		color: #e2e8f0;
		cursor: pointer;
		transition:
			transform 0.15s ease,
			background 0.15s ease,
			border-color 0.15s ease;
	}

	.tcb-lib-close:hover {
		transform: scale(1.06);
		background: rgba(30, 41, 59, 0.85);
		border-color: rgba(0, 240, 255, 0.35);
	}

	.tcb-lib-close i {
		font-size: 1.1rem;
		pointer-events: none;
	}

	.strategy-dock-library {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
		height: 36px;
		padding: 0 10px 0 8px;
		margin: 0;
		border-radius: 999px;
		border: 1px solid transparent;
		background: rgba(0, 240, 255, 0.1);
		color: #a5f3fc;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			transform 0.15s ease;
	}

	.strategy-dock-library:hover {
		background: rgba(0, 240, 255, 0.18);
		border-color: rgba(0, 240, 255, 0.35);
		transform: scale(1.03);
	}

	.strategy-dock-library--open {
		background: rgba(0, 240, 255, 0.22);
		border-color: rgba(0, 240, 255, 0.45);
	}

	.strategy-dock-txt {
		font-size: 0.58rem;
		font-weight: 900;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: #ecfeff;
	}

	.strategy-dock-library :global(svg) {
		width: 1rem;
		height: 1rem;
		pointer-events: none;
	}

	.strategy-card-head {
		padding-bottom: clamp(12px, 2vw, 16px);
		margin-bottom: clamp(12px, 2vw, 16px);
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--text-secondary, #94a3b8);
	}

	.strategy-library-body {
		padding-top: 0;
	}

	.strategy-library-body > * + * {
		margin-top: clamp(12px, 2vw, 16px);
	}

	.strategy-label {
		display: block;
		font-size: 0.68rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.2em;
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
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		cursor: pointer;
		transition: transform 0.15s ease, filter 0.15s ease;
	}

	.strategy-btn:hover:not(:disabled) {
		transform: scale(1.02);
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


	/* ─── Pitch — maximum viewport footprint ─────────────────── */
	.strategy-pitch-area {
		position: relative;
		flex: 1 1 auto;
		min-height: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.15rem;
	}

	.strategy-canvas-wrap {
		position: relative;
		overflow: hidden;
		border-radius: 0.65rem;
		background: #064e3b;
		aspect-ratio: 4 / 3;
		width: min(100%, calc((min(100dvh, 100vh) - 9.25rem) * 4 / 3));
		max-width: 100%;
		max-height: calc(min(100dvh, 100vh) - 9.25rem);
		height: auto;
		touch-action: none;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.65),
			0 0 0 1px rgba(255, 255, 255, 0.08),
			inset 0 0 80px rgba(0, 0, 0, 0.12);
	}

	.strategy-canvas-wrap--token-drag {
		cursor: grabbing;
	}

	/* Token tools + clear — grouped in the bottom island (toolbar) */
	.strategy-island-token-cluster {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		flex-shrink: 0;
	}

	.strategy-canvas-wrap--wb {
		background: #ffffff;
	}
	/* Basketball / soccer field fills use inline `boardFieldSurfaceStyle` on the wrap. */

	.strategy-bb-floor {
		position: absolute;
		inset: 5%;
		pointer-events: none;
		z-index: 1;
		border-radius: calc(var(--radius-premium) - 6px);
		overflow: hidden;
	}

	.strategy-bb-svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.strategy-field-bg--wb {
		position: absolute;
		inset: 5%;
		pointer-events: none;
		z-index: 1;
		border: 1px solid rgba(148, 163, 184, 0.5);
		border-radius: calc(var(--radius-premium) - 6px);
		background: #ffffff;
	}

	.strategy-canvas-wrap--wb .strategy-field-bg--wb {
		box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
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

	.strategy-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		touch-action: none;
		z-index: 10;
	}

	.strategy-token-layer {
		position: absolute;
		inset: 0;
		z-index: 20;
		pointer-events: none;
	}

	.strategy-token {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.65rem;
		height: 2.65rem;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.94);
		box-shadow:
			0 10px 22px rgba(0, 0, 0, 0.35),
			0 0 0 2px rgba(255, 255, 255, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
		transform: translate(-50%, -50%);
		cursor: grab;
		touch-action: none;
		pointer-events: auto;
		z-index: 25;
		-webkit-user-select: none;
		user-select: none;
		transition:
			transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
			box-shadow 0.2s ease;
	}

	.strategy-token--x {
		background: linear-gradient(160deg, #f8fafc 0%, #e2e8f0 100%);
	}

	.strategy-token--o {
		background: linear-gradient(160deg, #ecfdf5 0%, #d1fae5 100%);
	}

	.strategy-token:active {
		cursor: grabbing;
	}

	.strategy-token--dragging {
		z-index: 90;
		transform: translate(-50%, -50%) scale(1.14);
		box-shadow:
			0 18px 36px rgba(0, 0, 0, 0.45),
			0 0 0 3px rgba(0, 240, 255, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.95);
	}

	.strategy-token-glyph {
		font: 900 1.05rem/1 ui-sans-serif, system-ui, sans-serif;
		color: var(--strategy-token-color, #0f172a);
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
	}

	.strategy-token-glyph--o {
		display: block;
		width: 1.15rem;
		height: 1.15rem;
		border: 2.5px solid var(--strategy-token-color, #0f172a);
		border-radius: 50%;
		box-sizing: border-box;
		background: rgba(255, 255, 255, 0.35);
	}

	/* ─── Island toolbar items (rendered inside fw-island pill) ── */
	/* Arena glass dock: light chrome (parent `.fw-island--arena` is unscoped) */
	:global(.fw-island--arena) .strategy-island-btn {
		color: #cbd5e1;
	}

	:global(.fw-island--arena) .strategy-island-btn--active {
		background: rgba(255, 255, 255, 0.12);
		color: #f8fafc;
	}

	:global(.fw-island--arena) .strategy-island-btn--active:hover {
		background: rgba(255, 255, 255, 0.18);
		color: #ffffff;
	}

	:global(.fw-island--arena) .strategy-island-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #f1f5f9;
	}

	:global(.fw-island--arena) .strategy-island-sep {
		background: rgba(255, 255, 255, 0.12);
	}

	:global(.fw-island--arena) .strategy-island-color-swatch {
		border-color: rgba(255, 255, 255, 0.35);
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
	}

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
		transition:
			background 0.12s ease,
			color 0.12s ease,
			transform 0.15s ease;
		flex-shrink: 0;
	}

	:global(html.dark) .strategy-island-btn {
		color: #a1a1aa;
	}

	.strategy-island-btn :global(svg) {
		width: 1.1rem;
		height: 1.1rem;
		pointer-events: none;
	}

	/* Compact flat SIEM clear — no glow/shadow; sits flush in token cluster */
	.strategy-island-clear-siem {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 28px;
		min-width: 2.5rem;
		padding: 0 8px;
		margin: 0;
		border-radius: 6px;
		font-size: 0.58rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		font-variant-numeric: tabular-nums;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--ec-ops-accent, #00f0ff) 88%, #ffffff);
		background: rgba(15, 23, 42, 0.55);
		border: 1px solid color-mix(in srgb, var(--ec-ops-accent, #00f0ff) 45%, rgba(255, 255, 255, 0.1));
		box-shadow: none;
		cursor: pointer;
		flex-shrink: 0;
		transition:
			background 0.12s ease,
			border-color 0.12s ease,
			color 0.12s ease,
			transform 0.15s ease;
	}

	.strategy-island-clear-siem:hover {
		background: rgba(15, 23, 42, 0.72);
		border-color: color-mix(in srgb, var(--ec-ops-accent, #00f0ff) 60%, #ffffff);
		transform: scale(1.04);
	}

	:global(html.dark) .strategy-island-clear-siem {
		color: #67e8f9;
		background: rgba(8, 47, 73, 0.45);
		border-color: rgba(0, 240, 255, 0.4);
	}

	:global(html.dark) .strategy-island-clear-siem:hover {
		background: rgba(8, 47, 73, 0.62);
	}

	.strategy-island-btn:hover {
		background: #f4f4f5;
		color: #18181b;
		transform: scale(1.06);
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
		font-size: 0.68rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		cursor: pointer;
		transition: transform 0.15s ease;
	}

	.strategy-ai-analyze-btn:hover:not(:disabled) {
		transform: scale(1.02);
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
