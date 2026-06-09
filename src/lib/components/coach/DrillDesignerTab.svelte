<script lang="ts">
	import { onMount } from 'svelte';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import Swal from 'sweetalert2';
import FocusedWorkspaceWrapper from './FocusedWorkspaceWrapper.svelte';
import Icon from '$lib/components/ui/Icon.svelte';
import type { IconName } from '$lib/icons/registry.js';
	import {
		designerTypeToAttributeId,
	} from '$lib/coach/teamDrillLibrary.js';

	let { teamId = '', onDrillSaved = () => {} } = $props();

	let workoutType = $state('ball_mastery');
	let workoutName = $state('');
	let workoutDuration = $state(15);
	let workoutDesc = $state('');

	/** @type {Array<{ id: string, title: string, attributeId?: string }>} */
	let savedTeamDrills = $state([]);
	let loadingSaved = $state(false);

	let dropzone;
	let fabricCanvas;
	let spatialCanvas = null;

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

	$effect(() => {
		const tid = teamId;
		if (!tid) {
			savedTeamDrills = [];
			return;
		}
		let cancelled = false;
		loadingSaved = true;
		void (async () => {
			try {
				const snap = await getDocs(collection(db, 'teams', tid, 'drills'));
				if (cancelled) return;
				savedTeamDrills = snap.docs
					.map((d) => {
						const x = d.data() || {};
						return {
							id: d.id,
							title:
								typeof x.name === 'string' && x.name.trim() ?
									x.name.trim()
								: typeof x.title === 'string' ?
									x.title
								:	'Untitled',
							attributeId:
								typeof x.attributeId === 'string' ? x.attributeId : undefined,
						};
					})
					.sort((a, b) => a.title.localeCompare(b.title));
			} catch (e) {
				console.error('[DrillDesignerTab] load team drills', e);
				if (!cancelled) savedTeamDrills = [];
			} finally {
				if (!cancelled) loadingSaved = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

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
			const obj = new Text(item?.glyph || type, {
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
		if (!workoutName.trim()) return alert('Drill name is required.');
		if (!teamId) return alert('Select a team first.');
		const uid = authStore.user?.uid;
		if (!uid) return alert('Sign in to save drills.');
		let layoutData = null;
		if (spatialCanvas?.getObjects().length > 0) {
			layoutData = JSON.stringify(spatialCanvas.toJSON());
		}
		const attributeId = designerTypeToAttributeId(workoutType);
		const focusLabel =
			workoutType === 'ball_mastery' ? 'Ball Mastery'
			: workoutType === 'cardio' ? 'Conditioning'
			: workoutType === 'core' ? 'Conditioning'
			: workoutType === 'gameday' ? 'Tactics'
			: 'Ball Mastery';
		const durationMinutes = Math.max(
			1,
			Math.min(120, Math.floor(Number(workoutDuration) || 15)),
		);
		try {
			await addDoc(collection(db, 'teams', teamId, 'drills'), {
				name: workoutName.trim(),
				title: workoutName.trim(),
				focusArea: focusLabel,
				category: focusLabel,
				attributeId,
				metricType: 'reps',
				description: workoutDesc.trim().slice(0, 8000) || `${focusLabel} spatial drill`,
				durationMinutes,
				spatialLayout: layoutData,
				scope: 'team',
				createdBy: uid,
				createdAt: serverTimestamp(),
			});
			await Swal.fire({
				title: 'Drill saved',
				text: 'Available in your team library and Intent Engine deploy picker.',
				icon: 'success',
				confirmButtonColor: '#0f172a',
				customClass: { popup: 'card' },
			});
			workoutName = '';
			workoutDesc = '';
			workoutDuration = 15;
			if (spatialCanvas) spatialCanvas.clear();
			onDrillSaved();
		} catch (err) {
			alert('Error: ' + (err instanceof Error ? err.message : String(err)));
		}
	};
</script>

<div class="designer-tab">
	<div class="bento-section">
	<div class="card">
		<div class="card-header">Drill designer</div>
		<div class="card-body">
			<select bind:value={workoutType}>
				<option value="foundation">Brilliant Basics</option>
				<option value="cardio">Cardio / Warm-Up</option>
				<option value="core">Core Strength</option>
				<option value="ball_mastery">Ball Mastery</option>
				<option value="gameday">Gameday Drill</option>
			</select>
			<input type="text" bind:value={workoutName} placeholder="Drill name (required)" />
			<label>Target duration (minutes)</label>
			<input type="number" bind:value={workoutDuration} min="1" max="120" />
			<textarea bind:value={workoutDesc} rows="3" placeholder="Coaching cues, constraints, progressions…"></textarea>

			<!-- Spatial Canvas — dark workspace with floating item toolbar -->
			<label>Spatial Layout</label>
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
							ondragstart={(e) => e.dataTransfer.setData('text/plain', item.type)}
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

			<button class="primary-btn btn-blue w-100" onclick={saveWorkout}>Save to team library</button>
		</div>
	</div>

	<div class="card">
		<div class="card-header">Team drill library</div>
		<div class="card-body p-0">
			<ul class="session-list">
				{#if loadingSaved}
					<li class="session-empty">Loading team drills…</li>
				{:else if savedTeamDrills.length === 0}
					<li class="session-empty">No team drills yet — save one above to assign from Intent Engine.</li>
				{:else}
					{#each savedTeamDrills as d (d.id)}
						<li class="session-item workout-item">
							<div class="flex-1">
								<b>{d.title}</b>
								{#if d.attributeId}
									<div class="text-sm-sub">Attribute: {d.attributeId}</div>
								{/if}
							</div>
						</li>
					{/each}
				{/if}
			</ul>
		</div>
	</div>
	</div>
</div>

<style>
	select, input, textarea { margin-bottom: 10px; }

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
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid transparent;
		background: transparent;
		font-weight: 900;
		font-size: 1.1rem;
		cursor: grab;
		transition: background 0.12s ease;
		flex-shrink: 0;
	}

	.dd-drag-glyph {
		font-weight: 900;
		line-height: 1;
	}

	.dd-drag-item:hover {
		background: #f4f4f5;
	}

	.dd-drag-item:active {
		cursor: grabbing;
		transform: scale(0.92);
	}

	.dd-sep {
		width: 1px;
		height: 22px;
		background: #e4e4e7;
		flex-shrink: 0;
		margin: 0 4px;
	}

	:global(html.dark) .dd-sep {
		background: rgba(255, 255, 255, 0.1);
	}

	.dd-clear-btn {
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

	.dd-clear-btn:hover {
		background: #fee2e2;
		color: #b91c1c;
	}

	.dd-clear-btn svg {
		width: 1.1rem;
		height: 1.1rem;
		pointer-events: none;
	}

	/* ─── Saved drills list ───────────────────────────────────── */
	.workout-item { border-left: 4px solid var(--aggie-blue); align-items: flex-start; }
	.level-badge { background: var(--aggie-blue); color: white; border-radius: 10px; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; margin-left: 8px; }
	.workout-desc { font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; }
</style>
