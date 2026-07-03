<script lang="ts">
	import { onMount } from 'svelte';
	import FocusedWorkspaceWrapper from './FocusedWorkspaceWrapper.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import type { DrillDesignerEngine } from './DrillDesignerEngine.svelte.ts';

	let { engine }: { engine: DrillDesignerEngine } = $props();

	let dropzone: HTMLElement | undefined;
	let fabricCanvas: HTMLCanvasElement | undefined;
	let spatialCanvas: any = null;

	const DRAG_ITEMS = [
		{ type: 'cone', glyph: '▲', label: 'Cone' },
		{ type: 'ball', glyph: '●', label: 'Soccer ball' },
		{ type: 'mini_goal', glyph: '▢', label: 'Mini goal' },
		{ type: 'ladder', glyph: '▥', label: 'Agility ladder' },
		{ type: 'flag', glyph: '⚑', label: 'Flag / pole' },
		{ type: 'goal', glyph: '⌂', label: 'Full goal' },
		{ type: 'player_x', glyph: 'X', label: 'Defender (X)' },
		{ type: 'player_o', glyph: 'O', label: 'Attacker (O)' },
	];

	onMount(() => {
		let cleanup = () => {};
		(async () => {
			try {
				const { Canvas, Text } = await import('fabric');
				if (!fabricCanvas || spatialCanvas) return;
				spatialCanvas = new Canvas('spatialCanvasEl', { selection: false, preserveObjectStacking: true });
				engine.spatialCanvas = spatialCanvas;
				
				const BASE_WIDTH = 800;
				const BASE_HEIGHT = 600;

				const resize = () => {
					if (!dropzone || !spatialCanvas) return;
					const w = dropzone.offsetWidth;
					const h = dropzone.offsetHeight || dropzone.offsetWidth * 0.75;
					
					// Sprint 4.1: SVG bounding-box scaling with preserveAspectRatio="xMidYMid slice"
					const scaleX = w / BASE_WIDTH;
					const scaleY = h / BASE_HEIGHT;
					const scale = Math.max(scaleX, scaleY); // 'slice' = cover the area
					
					spatialCanvas.setWidth(w);
					spatialCanvas.setHeight(h);
					spatialCanvas.setZoom(scale);
					
					// Center the viewport (xMidYMid)
					const panX = (w - BASE_WIDTH * scale) / 2;
					const panY = (h - BASE_HEIGHT * scale) / 2;
					spatialCanvas.absolutePan({ x: -panX, y: -panY });
					
					spatialCanvas.renderAll();
				};
				resize(); setTimeout(resize, 300);
				window.addEventListener('resize', resize);
				cleanup = () => window.removeEventListener('resize', resize);
			} catch (e) { console.error('Fabric.js init error', e); }
		})();
		return () => cleanup();
	});

	const spawnObject = (type: string, x: number, y: number) => {
		if (!spatialCanvas) return;
		import('fabric').then(({ Text }) => {
			const item = DRAG_ITEMS.find((d) => d.type === type);
			const obj = new Text(item?.glyph || type, {
				left: x, top: y, fontSize: 24, fill: type === 'player_x' ? '#b91c1c' : '#0284c7',
				fontFamily: 'Inter', fontWeight: '900', originX: 'center', originY: 'center',
				hasControls: false, hasBorders: true, borderColor: '#fbbf24', hoverCursor: 'grab', moveCursor: 'grabbing'
			});
			spatialCanvas.add(obj); spatialCanvas.setActiveObject(obj);
		});
	};

	const onDragOver = (e: any) => e.preventDefault();
	const onDrop = (e: any) => {
		e.preventDefault();
		const type = e.dataTransfer.getData('text/plain');
		if (type && spatialCanvas) {
			const pointer = spatialCanvas.getPointer(e);
			spawnObject(type, pointer.x, pointer.y);
		}
	};
</script>

<FocusedWorkspaceWrapper>
	{#snippet toolbar()}
		{#each DRAG_ITEMS as item (item.type)}
			<div
				class="dd-drag-item"
				draggable="true"
				role="button"
				tabindex="0"
				aria-label={item.label}
				title={item.label}
				ondragstart={(e) => e.dataTransfer?.setData('text/plain', item.type)}
				onclick={() => spawnObject(item.type, 100, 100)}
				onkeydown={(e) => e.key === 'Enter' && spawnObject(item.type, 100, 100)}
			>
				<span class="dd-drag-glyph">{item.glyph}</span>
			</div>
		{/each}
		<div class="dd-sep" aria-hidden="true"></div>
		<button
			type="button"
			class="dd-clear-btn"
			onclick={() => spatialCanvas?.clear()}
			title="Clear canvas"
			aria-label="Clear canvas"
		>
			<Icon name={"action.eraser" as IconName} />
		</button>
	{/snippet}

	<div
		class="spatial-field"
		bind:this={dropzone}
		ondragover={onDragOver}
		ondrop={onDrop}
		role="img"
		aria-label="Spatial field designer"
	>
		<div class="pitch-lines"></div>
		<canvas id="spatialCanvasEl" bind:this={fabricCanvas}></canvas>
	</div>
</FocusedWorkspaceWrapper>

<style>
	/* ─── Spatial field (inside FocusedWorkspaceWrapper) ─────── */
	.spatial-field {
		position: relative;
		border-radius: var(--radius-premium);
		overflow: hidden;
		background: #4ade80;
		aspect-ratio: 4 / 3;
		width: 100%;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.65),
			0 0 0 1px rgba(255, 255, 255, 0.06);
	}

	.pitch-lines {
		position: absolute;
		top: 5%;
		left: 5%;
		right: 5%;
		bottom: 5%;
		border: 3px solid white;
		pointer-events: none;
	}

	#spatialCanvasEl {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		touch-action: none;
		z-index: 10;
	}

	/* ─── Floating toolbar items (rendered in fw-island pill) ─── */
	.dd-drag-item {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: transparent;
		color: var(--text-base);
		cursor: grab;
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.dd-drag-item:hover, .dd-drag-item:focus-visible {
		background: rgba(255,255,255,0.08);
		transform: translateY(-2px);
		color: #fff;
		outline: none;
	}
	.dd-drag-item:active {
		cursor: grabbing;
		transform: scale(0.92);
	}
	.dd-drag-glyph {
		font-size: 1.35rem;
		font-weight: 700;
	}
	.dd-sep {
		width: 1px;
		height: 24px;
		background: rgba(255,255,255,0.1);
		margin: 0 4px;
	}
	.dd-clear-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: transparent;
		color: #ef4444;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.dd-clear-btn:hover {
		background: rgba(239, 68, 68, 0.15);
		transform: scale(1.05);
	}
</style>
