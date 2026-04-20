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

	/** @type {HTMLDivElement | null} */
	let pitchContainer = $state(null);
	/** @type {HTMLCanvasElement | null} */
	let canvasEl = $state(null);

	/** @type {any} */
	let canvasRef = null;
	/** @type {typeof import('fabric') | null} */
	let fabricMod = null;

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

	$effect(() => {
		if (!browser || !clubId || !facilityId || !pitchContainer || !canvasEl) return;

		let cancelled = false;
		/** @type {ResizeObserver | undefined} */
		let ro;

		canvasReady = false;

		(async () => {
			await tick();
			if (cancelled || !pitchContainer || !canvasEl) return;

			const mod = await import('fabric');
			const { Canvas } = mod;
			if (cancelled || !pitchContainer || !canvasEl) return;

			fabricMod = mod;

			const w = Math.max(200, Math.floor(pitchContainer.clientWidth));
			const h = Math.max(150, Math.floor((w * 3) / 4));

			const canvas = new Canvas(canvasEl, {
				width: w,
				height: h,
				preserveObjectStacking: true,
				selection: canManage,
				backgroundColor: 'transparent',
			});

			canvasRef = canvas;

			let lastW = canvas.getWidth();
			let lastH = canvas.getHeight();

			const resizeToContainer = () => {
				if (!canvasRef || !pitchContainer || cancelled) return;
				const nw = Math.max(200, Math.floor(pitchContainer.clientWidth));
				const nh = Math.max(150, Math.floor((nw * 3) / 4));
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

			ro = new ResizeObserver(() => resizeToContainer());
			ro.observe(pitchContainer);

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
		})();

		return () => {
			cancelled = true;
			canvasReady = false;
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

<div class="fm-tactical-root">
	{#if canManage}
		<div
			class="fm-tactical-toolbar tw-bg-zinc-50 tw-border-b tw-border-zinc-200 tw-p-2 tw-flex tw-gap-2 tw-flex-wrap tw-items-center"
			role="toolbar"
			aria-label="Tactical canvas tools"
		>
			<button type="button" class="fm-tb-btn" disabled={!canvasReady} onclick={addCone}>Add Cone</button>
			<button type="button" class="fm-tb-btn" disabled={!canvasReady} onclick={addGoal}>Add Goal</button>
			<button type="button" class="fm-tb-btn" disabled={!canvasReady} onclick={addLine}>Add Line</button>
			<button type="button" class="fm-tb-btn" disabled={!canvasReady} onclick={addText}>Add Text</button>
			<button type="button" class="fm-tb-btn fm-tb-btn--danger" disabled={!canvasReady} onclick={clearCanvas}>
				Clear Canvas
			</button>
			<button type="button" class="fm-tb-btn fm-tb-btn--primary" disabled={!canvasReady || saving} onclick={() => void saveMap()}>
				{saving ? 'Saving…' : 'Save Map'}
			</button>
		</div>
		{#if saveErr}
			<p class="fm-tactical-err" role="alert">{saveErr}</p>
		{/if}
	{/if}

	<div class="pitch-container fm-tactical-pitch" bind:this={pitchContainer}>
		<div class="fm-pitch-lines" aria-hidden="true"></div>
		<canvas id="spatialCanvas" bind:this={canvasEl}></canvas>
	</div>
</div>

<style>
	.fm-tactical-root {
		width: 100%;
		box-sizing: border-box;
		border-radius: 14px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
		overflow: hidden;
	}

	:global(html.dark) .fm-tactical-root {
		border-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	.fm-tactical-toolbar {
		border-radius: 14px 14px 0 0;
	}

	:global(html.dark) .fm-tactical-toolbar {
		background: #18181b !important;
		border-color: rgba(255, 255, 255, 0.12) !important;
	}

	.fm-tb-btn {
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1px solid #e5e5e5;
		background: #ffffff;
		color: var(--text-primary);
		cursor: pointer;
	}

	:global(html.dark) .fm-tb-btn {
		background: #18181b;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.fm-tb-btn:hover:not(:disabled) {
		background: #f4f4f5;
	}

	:global(html.dark) .fm-tb-btn:hover:not(:disabled) {
		background: #27272a;
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
		opacity: 0.6;
		cursor: not-allowed;
	}

	.fm-tactical-err {
		margin: 0;
		padding: 8px 12px;
		font-size: 12px;
		font-weight: 600;
		color: #b91c1c;
		background: #ffffff;
	}

	.fm-tactical-pitch {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		margin-bottom: 0;
		border-radius: 0 0 14px 14px;
		border: none;
	}

	.fm-tactical-pitch :global(#spatialCanvas) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		touch-action: none;
		z-index: 10;
	}

	.fm-pitch-lines {
		position: absolute;
		inset: 5%;
		border: 2px solid rgba(255, 255, 255, 0.45);
		border-radius: 6px;
		pointer-events: none;
		z-index: 1;
	}
</style>
