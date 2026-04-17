<script>
	import { onMount } from 'svelte';
	import { db } from '$lib/firebase.js';
	import { collection, addDoc } from 'firebase/firestore';
	import Swal from 'sweetalert2';

	let { teamId = '', workouts = [], onWorkoutSaved } = $props();

	let workoutType = $state('foundation');
	let workoutName = $state('');
	let workoutLevel = $state('1');
	let workoutDesc = $state('');

	let dropzone;
	let fabricCanvas;
	let spatialCanvas = null;

	const DRAG_ITEMS = [
		{ type: 'cone', emoji: '🟠', label: 'Cone' },
		{ type: 'ball', emoji: '⚽', label: 'Ball' },
		{ type: 'goal', emoji: '🥅', label: 'Goal' },
		{ type: 'player_x', emoji: 'X', label: 'Player X' },
		{ type: 'player_o', emoji: 'O', label: 'Player O' }
	];

	onMount(async () => {
		try {
			const { Canvas, Text } = await import('fabric');
			if (!fabricCanvas || spatialCanvas) return;
			spatialCanvas = new Canvas('spatialCanvasEl', { selection: false, preserveObjectStacking: true });
			const resize = () => {
				if (!dropzone) return;
				spatialCanvas.setWidth(dropzone.offsetWidth);
				spatialCanvas.setHeight(dropzone.offsetHeight || dropzone.offsetWidth * 0.75);
				spatialCanvas.renderAll();
			};
			resize(); setTimeout(resize, 300);
			window.addEventListener('resize', resize);
		} catch (e) { console.error('Fabric.js init error', e); }
	});

	const spawnObject = (type, x, y) => {
		if (!spatialCanvas) return;
		import('fabric').then(({ Text }) => {
			const item = DRAG_ITEMS.find((d) => d.type === type);
			const obj = new Text(item?.emoji || type, {
				left: x, top: y, fontSize: 24, fill: type === 'player_x' ? '#b91c1c' : '#0284c7',
				fontFamily: 'Inter', fontWeight: '900', originX: 'center', originY: 'center',
				hasControls: false, hasBorders: true, borderColor: '#fbbf24', hoverCursor: 'grab', moveCursor: 'grabbing'
			});
			spatialCanvas.add(obj); spatialCanvas.setActiveObject(obj);
		});
	};

	const onDragOver = (e) => e.preventDefault();
	const onDrop = (e) => {
		e.preventDefault();
		const type = e.dataTransfer.getData('text/plain');
		if (type) spawnObject(type, e.offsetX, e.offsetY);
	};

	const saveWorkout = async () => {
		if (!workoutName.trim()) return alert('Workout Name is required.');
		if (!teamId) return alert('Select a team in the Roster tab first.');
		let layoutData = null;
		if (spatialCanvas?.getObjects().length > 0) {
			layoutData = JSON.stringify(spatialCanvas.toJSON());
		}
		try {
			await addDoc(collection(db, 'team_workouts'), {
				teamId, type: workoutType, name: workoutName, reqLevel: parseInt(workoutLevel),
				drill: workoutDesc, spatialLayout: layoutData, createdAt: new Date()
			});
			await Swal.fire({ title: 'Drill Saved!', text: 'Workout and spatial layout securely saved.', icon: 'success', confirmButtonColor: '#0f172a', customClass: { popup: 'card' } });
			workoutName = ''; workoutDesc = '';
			if (spatialCanvas) spatialCanvas.clear();
			if (onWorkoutSaved) onWorkoutSaved();
		} catch (err) { alert('Error: ' + err.message); }
	};
</script>

<div class="designer-tab">
	<div class="card">
		<div class="card-header">📐 Drill Designer</div>
		<div class="card-body">
			<select bind:value={workoutType}>
				<option value="foundation">Brilliant Basics</option>
				<option value="cardio">Cardio / Warm-Up</option>
				<option value="core">Core Strength</option>
				<option value="ball_mastery">Ball Mastery</option>
				<option value="gameday">Gameday Drill</option>
			</select>
			<input type="text" bind:value={workoutName} placeholder="Drill Name (required)" />
			<label>Required Level (1-5)</label>
			<input type="number" bind:value={workoutLevel} min="1" max="5" />
			<textarea bind:value={workoutDesc} rows="3" placeholder="Describe the drill..."></textarea>

			<!-- Spatial Canvas -->
			<label>Spatial Layout (drag items onto field)</label>
			<div class="drag-toolbar">
				{#each DRAG_ITEMS as item}
					<div
						class="spatial-drag-item"
						draggable="true"
						role="button"
						tabindex="0"
						aria-label={item.label}
						ondragstart={(e) => e.dataTransfer.setData('text/plain', item.type)}
						onclick={() => spawnObject(item.type, 100, 100)}
						onkeydown={(e) => e.key === 'Enter' && spawnObject(item.type, 100, 100)}
					>
						{item.emoji}
					</div>
				{/each}
				<button class="secondary-btn" onclick={() => spatialCanvas?.clear()}>Clear</button>
			</div>

			<div class="spatial-field" bind:this={dropzone} ondragover={onDragOver} ondrop={onDrop} role="img" aria-label="Spatial field designer">
				<div class="pitch-lines"></div>
				<canvas id="spatialCanvasEl" bind:this={fabricCanvas}></canvas>
			</div>

			<button class="primary-btn btn-blue w-100" onclick={saveWorkout}>Save Workout</button>
		</div>
	</div>

	<!-- Workout list -->
	<div class="card">
		<div class="card-header">Saved Drills for This Team</div>
		<div class="card-body p-0">
			<ul class="session-list">
				{#if workouts.length === 0}
					<li class="session-empty">No custom workouts found for this team.</li>
				{:else}
					{#each workouts as w}
						<li class="session-item workout-item">
							<div class="flex-1">
								<b>{w.name}</b>
								<span class="level-badge">Lvl {w.reqLevel || 1}</span>
								<div class="text-sm-sub">Type: {w.type}</div>
								{#if w.drill}<div class="workout-desc">{w.drill}</div>{/if}
							</div>
						</li>
					{/each}
				{/if}
			</ul>
		</div>
	</div>
</div>

<style>
	select, input, textarea { margin-bottom: 10px; }
	.drag-toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; align-items: center; }
	.spatial-drag-item { width: 45px; height: 45px; background: white; border: 2px solid var(--glass-border); border-radius: 12px; font-weight: 900; font-size: 1.3rem; cursor: grab; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.1s; }
	.spatial-drag-item:active { cursor: grabbing; transform: scale(0.95); }
	.spatial-field { position: relative; border: 2px solid var(--aggie-blue); border-radius: 16px; overflow: hidden; background: #4ade80; aspect-ratio: 4/3; width: 100%; margin-bottom: 16px; }
	.pitch-lines { position: absolute; top: 5%; left: 5%; right: 5%; bottom: 5%; border: 3px solid white; pointer-events: none; }
	#spatialCanvasEl { position: absolute; top: 0; left: 0; width: 100%; height: 100%; touch-action: none; z-index: 10; }
	.workout-item { border-left: 4px solid var(--aggie-blue); align-items: flex-start; }
	.level-badge { background: var(--aggie-blue); color: white; border-radius: 10px; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; margin-left: 8px; }
	.workout-desc { font-size: 0.8rem; color: #475569; margin-top: 4px; }
</style>
