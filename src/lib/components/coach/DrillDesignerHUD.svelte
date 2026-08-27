<script lang="ts">
	import type { DrillDesignerEngine } from './DrillDesignerEngine.svelte.js';

	let { engine }: { engine: DrillDesignerEngine } = $props();

	function printDrillSheet() {
		if (typeof window !== 'undefined') {
			window.print();
		}
	}
</script>

<div class="tw-flex tw-flex-col tw-gap-4 tw-font-sans tw-text-slate-200">
	<!-- Drill Sheet Header -->
	<div class="tw-border-b tw-border-[#334155] tw-pb-3">
		<div class="tw-flex tw-items-center tw-justify-between">
			<span class="tw-text-[10px] tw-font-mono tw-font-bold tw-tracking-widest tw-text-[#daff0a] tw-uppercase">
				PHYSICAL DRILL SHEET SPEC
			</span>
			<span class="tw-text-[10px] tw-font-mono tw-text-slate-400">
				TACTICAL WHITEBOARD SYNC
			</span>
		</div>
		<h3 class="tw-text-base tw-font-bold tw-text-white tw-mt-1">
			{engine.workoutName || 'Untitled Session Drill'}
		</h3>
	</div>

	<!-- Section 1: Core Parameters -->
	<div class="tw-space-y-2">
		<label class="tw-block">
			<span class="tw-text-[11px] tw-font-mono tw-text-[#94a3b8] tw-uppercase">Drill Title</span>
			<input
				type="text"
				bind:value={engine.workoutName}
				placeholder="e.g. 3v2 Transition Counter-Press"
				class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-text-xs tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1"
			/>
		</label>

		<div class="tw-grid tw-grid-cols-2 tw-gap-2">
			<label class="tw-block">
				<span class="tw-text-[11px] tw-font-mono tw-text-[#94a3b8] tw-uppercase">Focus Area</span>
				<select
					bind:value={engine.workoutType}
					class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-2 tw-py-2 tw-text-xs tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1"
				>
					<option value="ball_mastery">Ball Mastery</option>
					<option value="gameday">Tactics & Shape</option>
					<option value="foundation">Technical Basics</option>
					<option value="cardio">Conditioning & Speed</option>
					<option value="core">Physical Power</option>
				</select>
			</label>
			<label class="tw-block">
				<span class="tw-text-[11px] tw-font-mono tw-text-[#94a3b8] tw-uppercase">Age Bracket</span>
				<select
					bind:value={engine.ageGroup}
					class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-2 tw-py-2 tw-text-xs tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1"
				>
					<option value="U6-U8">U6 / U8 (FUNdamentals)</option>
					<option value="U10-U12">U10 / U12 (Learn to Train)</option>
					<option value="U14-U16">U14 / U16 (Train to Train)</option>
					<option value="U18+">U18+ / Senior Elite</option>
				</select>
			</label>
		</div>

		<div class="tw-grid tw-grid-cols-3 tw-gap-2">
			<label class="tw-block">
				<span class="tw-text-[10px] tw-font-mono tw-text-[#94a3b8] tw-uppercase">Duration (min)</span>
				<input
					type="number"
					bind:value={engine.workoutDuration}
					min="1"
					max="120"
					class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-2 tw-py-2 tw-text-xs tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1"
				/>
			</label>
			<label class="tw-block">
				<span class="tw-text-[10px] tw-font-mono tw-text-[#94a3b8] tw-uppercase">Player Count</span>
				<input
					type="text"
					bind:value={engine.playerCount}
					placeholder="e.g. 6-10"
					class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-2 tw-py-2 tw-text-xs tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1"
				/>
			</label>
			<label class="tw-block">
				<span class="tw-text-[10px] tw-font-mono tw-text-[#94a3b8] tw-uppercase">Intensity</span>
				<select
					bind:value={engine.intensity}
					class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-2 tw-py-2 tw-text-xs tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1"
				>
					<option value="Low">Low</option>
					<option value="Medium">Medium</option>
					<option value="High">Match Tempo</option>
				</select>
			</label>
		</div>
	</div>

	<!-- Section 2: Equipment & Field Checklist -->
	<div class="tw-space-y-1">
		<span class="tw-text-[11px] tw-font-mono tw-text-[#14b8a6] tw-uppercase">Physical Equipment</span>
		<input
			type="text"
			bind:value={engine.equipment}
			placeholder="Cones, Flags/Poles, Mini Goals, Balls, Pinnies..."
			class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-text-xs tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none"
		/>
	</div>

	<!-- Section 3: Coaching Points & Constraints -->
	<div class="tw-space-y-2">
		<label class="tw-block">
			<span class="tw-text-[11px] tw-font-mono tw-text-[#94a3b8] tw-uppercase">Setup & Instructions</span>
			<textarea
				bind:value={engine.workoutDesc}
				rows="3"
				placeholder="Grid setup, rotation pattern, starting trigger..."
				class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-text-xs tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1 tw-resize-none"
			></textarea>
		</label>

		<label class="tw-block">
			<span class="tw-text-[11px] tw-font-mono tw-text-[#94a3b8] tw-uppercase">Key Coaching Points & Constraints</span>
			<textarea
				bind:value={engine.coachingPoints}
				rows="2"
				placeholder="2-touch restriction, body shape when receiving, scan before pass..."
				class="tw-w-full tw-bg-[#020617] tw-border tw-border-[#334155] tw-rounded-lg tw-px-3 tw-py-2 tw-text-xs tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-mt-1 tw-resize-none"
			></textarea>
		</label>
	</div>

	<!-- Section 4: Actions -->
	<div class="tw-pt-2 tw-flex tw-flex-col tw-gap-2">
		<button
			type="button"
			class="tw-w-full tw-bg-[#fbbf24] hover:tw-bg-amber-400 tw-text-black tw-font-mono tw-font-bold tw-py-2.5 tw-px-4 tw-rounded-lg tw-text-xs tw-uppercase tw-transition-colors tw-shadow-[0_0_15px_rgba(251,191,36,0.2)]"
			onclick={() => engine.saveWorkout()}
		>
			💾 SAVE DRILL TO PLAYBOOK
		</button>
		<button
			type="button"
			class="tw-w-full tw-border tw-border-[#334155] tw-bg-[#020617] hover:tw-border-[#14b8a6] hover:tw-text-[#14b8a6] tw-text-slate-300 tw-font-mono tw-font-bold tw-py-2 tw-px-4 tw-rounded-lg tw-text-xs tw-uppercase tw-transition-colors"
			onclick={printDrillSheet}
		>
			🖨 PRINT PHYSICAL SHEET
		</button>
	</div>
</div>
