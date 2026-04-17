<script>
	import { onMount } from 'svelte';

	let canvas;
	let ctx;
	let isDrawing = false;
	let currentTool = $state('pen');
	let currentColor = $state('#0f172a');
	let whiteboard = $state(false);

	const resize = () => {
		if (!canvas?.parentElement?.offsetWidth) return;
		const cont = canvas.parentElement;
		canvas.width = cont.offsetWidth;
		canvas.height = cont.offsetHeight || cont.offsetWidth * 0.75;
	};

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
			y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
		};
	};

	const startDraw = (e) => {
		isDrawing = true;
		const pos = getPos(e);
		ctx.strokeStyle = currentColor; ctx.fillStyle = currentColor;
		ctx.lineWidth = 4; ctx.lineCap = 'round';
		if (currentTool === 'pen' || currentTool === 'arrow') { ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
		else if (currentTool === 'X') { ctx.font = 'bold 24px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('X', pos.x, pos.y); isDrawing = false; }
		else if (currentTool === 'O') { ctx.beginPath(); ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI); ctx.stroke(); isDrawing = false; }
	};

	const draw = (e) => {
		if (!isDrawing) return;
		e.preventDefault();
		const pos = getPos(e);
		ctx.lineTo(pos.x, pos.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
	};

	const endDraw = () => { isDrawing = false; };
	const clearCanvas = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

	$effect(() => {
		if (!canvas) return;
		const pitchBg = canvas.parentElement?.parentElement?.querySelector('.strategy-pitch-bg');
		if (pitchBg) pitchBg.style.background = whiteboard ? '#ffffff' : '#4ade80';
	});
</script>

<div class="strategy-tab">
	<div class="strategy-toolbar">
		{#each [['pen', 'Pen'], ['arrow', 'Arrow'], ['X', 'X Player'], ['O', 'O Player']] as [tool, label]}
			<button class="secondary-btn strategy-tool-btn" class:active={currentTool === tool} onclick={() => (currentTool = tool)}>{label}</button>
		{/each}
		<input type="color" bind:value={currentColor} title="Color" class="color-input" />
		<button class="secondary-btn strategy-tool-btn" onclick={clearCanvas}>Clear</button>
		<label class="whiteboard-toggle">
			<input type="checkbox" bind:checked={whiteboard} />
			Whiteboard mode
		</label>
	</div>

	<div class="canvas-container" class:whiteboard-bg={whiteboard}>
		<div class="strategy-pitch-bg pitch-lines"></div>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<canvas
			bind:this={canvas}
			class="pitch-canvas"
			onmousedown={startDraw} onmouseup={endDraw} onmousemove={draw} onmouseout={endDraw}
			ontouchstart={startDraw} ontouchend={endDraw} ontouchmove={draw}
			role="img" aria-label="Strategy board canvas"
		></canvas>
	</div>
</div>

<style>
	.strategy-tab { padding: clamp(8px, 2vw, 16px) 0; }
	.strategy-toolbar {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 12px;
		padding: 12px;
		background: rgba(255,255,255,0.8);
		border-radius: 16px;
		align-items: center;
		border: 1px solid rgba(15,23,42,0.1);
	}
	.strategy-tool-btn {
		padding: 8px 14px;
		width: auto;
		margin: 0;
		font-size: 0.85rem;
	}
	.strategy-tool-btn.active { background: var(--aggie-blue); color: white; border-color: var(--aggie-blue); }
	.color-input { width: 40px; height: 40px; padding: 2px; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; }
	.whiteboard-toggle { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
	.canvas-container { position: relative; border: 2px solid var(--aggie-blue); border-radius: 16px; overflow: hidden; background: #4ade80; aspect-ratio: 4/3; width: 100%; }
	.whiteboard-bg { background: #ffffff; }
	.strategy-pitch-bg { position: absolute; top: 5%; left: 5%; right: 5%; bottom: 5%; border: 3px solid white; pointer-events: none; }
	.pitch-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; touch-action: none; z-index: 10; }
</style>
