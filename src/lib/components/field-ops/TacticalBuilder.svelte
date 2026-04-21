<script>
	import { browser } from '$app/environment';
	import { tick } from 'svelte';

	import { db } from '$lib/firebase.js';
	import { doc, updateDoc } from 'firebase/firestore';

	let {
		clubId = '',
		facilityId = '',
		canManage = false,
		initialJson = undefined,
		onSaved = undefined,
	} = $props();

	let saveErr = $state('');
	let saving = $state(false);
	let canvasReady = $state(false);
	let isFullscreen = $state(false);

	/** @type {HTMLDivElement | null} */
	let pitchAreaRef = $state(null);
	/** @type {HTMLDivElement | null} */
	let pitchContainer = $state(null);
	/** @type {HTMLCanvasElement | null} */
	let canvasEl = $state(null);

	/** @type {any} */
	let canvasRef = null;
	/** @type {typeof import('fabric') | null} */
	let fabricMod = null;

	/** @type {() => void} */
	let resizeCanvas = () => {};

	/**
	 * Largest 4:3 rect that fits inside the box (no stretch).
	 * @param {number} boxW
	 * @param {number} boxH
	 */
	function fitPitchDimensions(boxW, boxH) {
		const aspect = 4 / 3;
		const aw = Math.max(1, Math.floor(boxW));
		const ah = Math.max(1, Math.floor(boxH));
		let w = aw;
		let h = w / aspect;
		if (h > ah) {
			h = ah;
			w = h * aspect;
		}
		return {
			w: Math.max(200, Math.floor(w)),
			h: Math.max(150, Math.floor(h)),
		};
	}

	function applyInteract(obj) {
		obj.set({
			selectable: canManage,
			evented: canManage,
			hasControls: canManage,
			hasBorders: canManage,
			lockRotation: false,
		});
		if (!canManage) {
			obj.set({ hoverCursor: 'default', moveCursor: 'default' });
		}
	}

	function center() {
		if (!canvasRef) return { cx: 0, cy: 0 };
		return { cx: canvasRef.getWidth() / 2, cy: canvasRef.getHeight() / 2 };
	}

	function addCone() {
		if (!canvasRef || !fabricMod) return;
		const { Triangle } = fabricMod;
		const { cx, cy } = center();
		const cone = new Triangle({
			width: 28,
			height: 32,
			fill: '#ea580c',
			left: cx,
			top: cy,
			originX: 'center',
			originY: 'center',
		});
		applyInteract(cone);
		canvasRef.add(cone);
		canvasRef.setActiveObject(cone);
		canvasRef.requestRenderAll();
	}

	function addGoal() {
		if (!canvasRef || !fabricMod) return;
		const { Rect } = fabricMod;
		const { cx, cy } = center();
		const goal = new Rect({
			width: 140,
			height: 50,
			fill: 'transparent',
			stroke: '#ffffff',
			strokeWidth: 3,
			left: cx - 70,
			top: cy - 25,
		});
		applyInteract(goal);
		canvasRef.add(goal);
		canvasRef.setActiveObject(goal);
		canvasRef.requestRenderAll();
	}

	function addLine() {
		if (!canvasRef || !fabricMod) return;
		const { Line } = fabricMod;
		const { cx, cy } = center();
		const line = new Line([cx - 60, cy, cx + 60, cy], {
			stroke: '#ffffff',
			strokeWidth: 3,
		});
		applyInteract(line);
		canvasRef.add(line);
		canvasRef.setActiveObject(line);
		canvasRef.requestRenderAll();
	}

	function addText() {
		if (!canvasRef || !fabricMod) return;
		const { IText } = fabricMod;
		const { cx, cy } = center();
		const t = new IText('Label', {
			fill: '#ffffff',
			fontSize: 18,
			fontFamily: 'system-ui, sans-serif',
			left: cx,
			top: cy,
			originX: 'center',
			originY: 'center',
		});
		applyInteract(t);
		canvasRef.add(t);
		canvasRef.setActiveObject(t);
		canvasRef.requestRenderAll();
	}

	function clearCanvas() {
		if (!canvasRef) return;
		if (!confirm('Clear the tactical canvas? Unsaved changes will be lost unless you save again.')) return;
		canvasRef.clear();
		canvasRef.requestRenderAll();
	}

	async function saveMap() {
		if (!canvasRef || !clubId || !facilityId || !canManage) return;
		saveErr = '';
		saving = true;
		try {
			const json = JSON.stringify(canvasRef.toJSON());
			await updateDoc(doc(db, 'clubs', clubId, 'facilities', facilityId), {
				tacticalCanvasJson: json,
			});
			onSaved?.();
		} catch (e) {
			saveErr =
				e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message)
				:	String(e);
		} finally {
			saving = false;
		}
	}

	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
	}

	$effect(() => {
		if (!browser) return;
		if (isFullscreen) {
			const prev = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			return () => {
				document.body.style.overflow = prev;
			};
		}
	});

	$effect(() => {
		if (!browser) return;
		isFullscreen;
		void tick().then(() => resizeCanvas());
	});

	$effect(() => {
		if (!browser) return;
		function onKey(/** @type {KeyboardEvent} */ e) {
			if (e.key === 'Escape' && isFullscreen) {
				e.preventDefault();
				isFullscreen = false;
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (!browser || !clubId || !facilityId || !pitchAreaRef || !pitchContainer || !canvasEl) return;

		let cancelled = false;
		/** @type {ResizeObserver | undefined} */
		let ro;

		canvasReady = false;

		(async () => {
			await tick();
			if (cancelled || !pitchAreaRef || !pitchContainer || !canvasEl) return;

			const mod = await import('fabric');
			const { Canvas } = mod;
			if (cancelled || !pitchAreaRef || !pitchContainer || !canvasEl) return;

			fabricMod = mod;

			let lastW = 0;
			let lastH = 0;

			const resizeToContainer = () => {
				if (!canvasRef || !pitchAreaRef || !pitchContainer || cancelled) return;
				const aw = pitchAreaRef.clientWidth;
				const ah = pitchAreaRef.clientHeight;
				const { w: nw, h: nh } = fitPitchDimensions(aw, ah);
				pitchContainer.style.width = `${nw}px`;
				pitchContainer.style.height = `${nh}px`;

				if (lastW === 0 || lastH === 0) {
					canvasRef.setDimensions({ width: nw, height: nh });
					lastW = nw;
					lastH = nh;
					canvasRef.requestRenderAll();
					return;
				}
				if (nw === lastW && nh === lastH) return;
				const sx = nw / lastW;
				const sy = nh / lastH;
				canvasRef.getObjects().forEach((o) => {
					o.set({
						left: (o.left ?? 0) * sx,
						top: (o.top ?? 0) * sy,
						scaleX: (o.scaleX ?? 1) * sx,
						scaleY: (o.scaleY ?? 1) * sy,
					});
					o.setCoords();
				});
				canvasRef.setDimensions({ width: nw, height: nh });
				lastW = nw;
				lastH = nh;
				canvasRef.requestRenderAll();
			};

			resizeCanvas = resizeToContainer;

			const aw0 = pitchAreaRef.clientWidth;
			const ah0 = pitchAreaRef.clientHeight;
			const { w, h } = fitPitchDimensions(aw0, ah0);
			pitchContainer.style.width = `${w}px`;
			pitchContainer.style.height = `${h}px`;

			const canvas = new Canvas(canvasEl, {
				width: w,
				height: h,
				preserveObjectStacking: true,
				selection: canManage,
				backgroundColor: 'transparent',
			});

			canvasRef = canvas;
			lastW = w;
			lastH = h;

			ro = new ResizeObserver(() => resizeToContainer());
			ro.observe(pitchAreaRef);

			const loadJson = async (raw) => {
				if (!raw || !canvasRef || cancelled) return;
				try {
					const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
					await canvasRef.loadFromJSON(parsed);
					canvasRef.getObjects().forEach((o) => applyInteract(o));
					canvasRef.requestRenderAll();
				} catch (e) {
					console.error('[TacticalBuilder] loadFromJSON', e);
				}
			};

			if (initialJson && initialJson.trim()) {
				await loadJson(initialJson);
			}

			canvas.on('object:added', (e) => {
				const o = e.target;
				if (o) applyInteract(o);
			});

			canvasReady = true;
			resizeToContainer();
		})();

		return () => {
			cancelled = true;
			canvasReady = false;
			resizeCanvas = () => {};
			ro?.disconnect();
			const c = canvasRef;
			canvasRef = null;
			fabricMod = null;
			if (c) {
				void c.dispose().catch(() => {
					try {
						c.clear();
					} catch {
						/* ignore */
					}
				});
			}
		};
	});
</script>

<div
	class="fm-tactical-root"
	class:fm-tactical-root--fullscreen={isFullscreen}
	class:fm-tactical-root--embed={!isFullscreen}
>
	{#if canManage && saveErr}
		<p class="fm-tactical-err" role="alert">{saveErr}</p>
	{/if}

	<div class="fm-tactical-canvas-wrap">
		<button
			type="button"
			class="fm-tactical-fs-btn"
			onclick={toggleFullscreen}
			aria-pressed={isFullscreen}
			aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
		>
			<i class="ph {isFullscreen ? 'ph-corners-in' : 'ph-corners-out'}" aria-hidden="true"></i>
		</button>

		<div
			class="fm-tactical-pitch-area"
			class:fm-tactical-pitch-area--fullscreen={isFullscreen}
			bind:this={pitchAreaRef}
		>
			<div class="fm-tactical-pitch" bind:this={pitchContainer}>
				<div class="fm-pitch-lines" aria-hidden="true"></div>
				<canvas bind:this={canvasEl}></canvas>
			</div>
		</div>

		{#if canManage}
			<div class="fm-tactical-island" role="toolbar" aria-label="Tactical canvas tools">
				<div class="fm-tactical-island__tools">
					<button type="button" class="fm-tb-btn" disabled={!canvasReady} onclick={addCone}>
						<i class="ph ph-triangle" aria-hidden="true"></i>
						Cone
					</button>
					<button type="button" class="fm-tb-btn" disabled={!canvasReady} onclick={addGoal}>
						<i class="ph ph-rectangle-dashed" aria-hidden="true"></i>
						Goal
					</button>
					<button type="button" class="fm-tb-btn" disabled={!canvasReady} onclick={addLine}>
						<i class="ph ph-line-segment" aria-hidden="true"></i>
						Line
					</button>
					<button type="button" class="fm-tb-btn" disabled={!canvasReady} onclick={addText}>
						<i class="ph ph-text-t" aria-hidden="true"></i>
						Text
					</button>
				</div>
				<div class="fm-tactical-island__meta">
					<button
						type="button"
						class="fm-tb-btn fm-tb-btn--danger"
						disabled={!canvasReady}
						onclick={clearCanvas}
					>
						Clear
					</button>
					<button
						type="button"
						class="fm-tb-btn fm-tb-btn--primary"
						disabled={!canvasReady || saving}
						onclick={() => void saveMap()}
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.fm-tactical-root {
		position: relative;
		width: 100%;
		box-sizing: border-box;
	}

	.fm-tactical-root--embed {
		border-radius: 14px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
		overflow: hidden;
	}

	:global(html.dark) .fm-tactical-root--embed {
		border-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	/* Mirrors Tailwind: fixed inset-0 z-[100] bg-zinc-900 p-8 (no global tw- in field-ops shell) */
	.fm-tactical-root--fullscreen {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: #18181b;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		overflow: hidden;
	}

	.fm-tactical-err {
		margin: 0 0 8px;
		padding: 8px 12px;
		font-size: 12px;
		font-weight: 600;
		color: #fecaca;
		background: rgba(127, 29, 29, 0.35);
		border-radius: 8px;
		flex-shrink: 0;
	}

	.fm-tactical-root--embed .fm-tactical-err {
		color: #b91c1c;
		background: #ffffff;
	}

	:global(html.dark) .fm-tactical-root--embed .fm-tactical-err {
		background: #18181b;
		color: #fca5a5;
	}

	.fm-tactical-canvas-wrap {
		position: relative;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.fm-tactical-root--embed .fm-tactical-canvas-wrap {
		min-height: 200px;
	}

	.fm-tactical-fs-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		z-index: 40;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(15, 15, 17, 0.65);
		color: #fafafa;
		cursor: pointer;
		backdrop-filter: blur(8px);
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	.fm-tactical-root--embed .fm-tactical-fs-btn {
		border-color: rgba(0, 0, 0, 0.1);
		background: rgba(255, 255, 255, 0.92);
		color: var(--text-primary);
	}

	.fm-tactical-fs-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.35);
	}

	.fm-tactical-root--embed .fm-tactical-fs-btn:hover {
		background: #ffffff;
		border-color: rgba(0, 0, 0, 0.12);
	}

	.fm-tactical-fs-btn i {
		font-size: 1.25rem;
	}

	.fm-tactical-pitch-area {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 3;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}

	.fm-tactical-pitch-area--fullscreen {
		flex: 1;
		min-height: 0;
		aspect-ratio: unset;
		width: 100%;
	}

	.fm-tactical-pitch {
		position: relative;
		flex-shrink: 0;
		background: linear-gradient(180deg, #14532d 0%, #166534 45%, #14532d 100%);
		border-radius: 10px;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
	}

	.fm-tactical-root--fullscreen .fm-tactical-pitch {
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.1),
			0 24px 48px rgba(0, 0, 0, 0.45);
	}

	.fm-tactical-pitch :global(canvas) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		touch-action: none;
		z-index: 10;
		display: block;
	}

	.fm-pitch-lines {
		position: absolute;
		inset: 5%;
		border: 2px solid rgba(255, 255, 255, 0.45);
		border-radius: 6px;
		pointer-events: none;
		z-index: 1;
	}

	.fm-tactical-island {
		position: absolute;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 30;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 8px 12px;
		max-width: calc(100% - 2rem);
		padding: 10px 14px;
		background: #ffffff;
		border: 1px solid #e4e4e7;
		border-radius: 14px;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -4px rgba(0, 0, 0, 0.1);
		box-sizing: border-box;
	}

	.fm-tactical-island__tools,
	.fm-tactical-island__meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.fm-tactical-island__meta {
		padding-left: 12px;
		border-left: 1px solid #e4e4e7;
	}

	@media (max-width: 520px) {
		.fm-tactical-island__meta {
			padding-left: 0;
			border-left: none;
			width: 100%;
			justify-content: center;
			border-top: 1px solid #e4e4e7;
			padding-top: 8px;
		}
	}

	.fm-tb-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 6px 10px;
		border-radius: 999px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
		color: var(--text-primary);
		cursor: pointer;
		white-space: nowrap;
	}

	.fm-tb-btn i {
		font-size: 1rem;
		opacity: 0.9;
	}

	.fm-tb-btn:hover:not(:disabled) {
		background: #f4f4f5;
		border-color: #d4d4d8;
	}

	.fm-tb-btn--primary {
		background: var(--brand-primary, #f59e0b);
		border-color: color-mix(in srgb, var(--brand-primary, #f59e0b) 55%, #0f172a);
		color: #0f172a;
	}

	.fm-tb-btn--primary:hover:not(:disabled) {
		filter: brightness(0.97);
	}

	.fm-tb-btn--danger {
		border-color: rgba(220, 38, 38, 0.35);
		color: #b91c1c;
		background: #ffffff;
	}

	.fm-tb-btn--danger:hover:not(:disabled) {
		background: rgba(254, 226, 226, 0.35);
	}

	.fm-tb-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
