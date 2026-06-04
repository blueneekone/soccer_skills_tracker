<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	type DeployPhase = 'idle' | 'saving' | 'success' | 'error';

	let {
		attributes = [] as Array<{ id: string; name: string; hexColor: string }>,
		roster = [] as Array<{ uid: string; playerName: string; email: string }>,
		draftAttributeId = $bindable(''),
		draftRequiredXp = $bindable(150),
		draftDurationDays = $bindable(7),
		draftScope = $bindable<'team' | 'players'>('team'),
		draftTargetUids = $bindable<string[]>([]),
		draftPriority = $bindable(100),
		draftPrescriptionSets = $bindable(3),
		draftPrescriptionRepsPerSet = $bindable(10),
		draftPrescriptionBilateral = $bindable(false),
		draftPrescriptionDurationMin = $bindable(0),
		draftPrescriptionTargetRpe = $bindable(0),
		deployPhase = 'idle' as DeployPhase,
		deployError = '',
		isLoadingRoster = false,
		canDeploy = false,
		onDeploy = () => {},
		onToggleUid = (_uid: string) => {},
		onSelectAll = () => {},
		onClearSelection = () => {},
	} = $props();

	const deployBtnLabel = $derived(
		deployPhase === 'saving'
			? '[ TRANSMITTING... ]'
			: deployPhase === 'success'
				? '[ ✓ INTENT DEPLOYED ]'
				: deployPhase === 'error'
					? '[ RETRY DEPLOY ]'
					: '[ DEPLOY TACTICAL INTENT ]',
	);

	const deployBorderColor = $derived(
		deployPhase === 'success'
			? 'rgba(57,255,20,0.45)'
			: deployPhase === 'error'
				? 'rgba(255,48,64,0.45)'
				: 'rgba(20, 184, 166,0.25)',
	);
</script>

<!-- Root: fixed bottom-right, pointer-events-none so it doesn't block map/canvas below -->
<div class="tw-fixed tw-bottom-6 tw-right-6 tw-z-50 tw-w-80 tw-pointer-events-none">

	<!-- Glass card: pointer-events-auto restores interactivity for the panel itself -->
	<div
		class="tw-pointer-events-auto tw-bg-[#020202]/95 tw-backdrop-blur-xl tw-border tw-border-[#14b8a6]/20
		       tw-rounded-2xl tw-p-5 tw-flex tw-flex-col tw-gap-4"
	>
		<!-- ── Header ──────────────────────────────────────── -->
		<div class="tw-flex tw-flex-col tw-gap-0.5">
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#14b8a6]/60 tw-uppercase">
				[ // INTENT ENGINE ]
			</span>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/30 tw-uppercase">
				[ ASSIGNMENT TERMINAL ]
			</span>
		</div>

		<div class="tw-h-px tw-w-full tw-bg-[#14b8a6]/10"></div>

		<!-- ── Attribute picker ───────────────────────────── -->
		<div class="tw-flex tw-flex-col tw-gap-1.5">
			<label for="hud-attr" class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
				TARGET ATTRIBUTE
			</label>
			<select
				id="hud-attr"
				bind:value={draftAttributeId}
				class="tw-w-full tw-rounded-lg tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
				       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-tracking-widest
				       tw-px-3 tw-py-1.5 tw-outline-none tw-appearance-none
				       focus:tw-border-[#14b8a6] tw-transition-colors"
			>
				{#each attributes as attr (attr.id)}
					<option value={attr.id}>{attr.name}</option>
				{/each}
			</select>
		</div>

		<!-- ── XP bounty ──────────────────────────────────── -->
		<div class="tw-flex tw-flex-col tw-gap-1.5">
			<div class="tw-flex tw-items-center tw-justify-between">
				<label for="hud-xp" class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
					XP BOUNTY
				</label>
				<span class="tw-font-mono tw-text-[14px] tw-tracking-wider tw-text-[#14b8a6] tw-font-bold">
					{draftRequiredXp}
				</span>
			</div>
			<input
				id="hud-xp"
				type="range"
				min="50"
				max="2000"
				step="25"
				bind:value={draftRequiredXp}
				class="tw-w-full tw-accent-[#14b8a6] tw-h-1 tw-rounded-full tw-cursor-pointer"
			/>
		</div>

		<!-- ── Duration ───────────────────────────────────── -->
		<div class="tw-flex tw-flex-col tw-gap-1.5">
			<div class="tw-flex tw-items-center tw-justify-between">
				<label for="hud-dur" class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
					DURATION
				</label>
				<span class="tw-font-mono tw-text-[14px] tw-tracking-wider tw-text-[#14b8a6] tw-font-bold">
					{draftDurationDays}d
				</span>
			</div>
			<input
				id="hud-dur"
				type="range"
				min="1"
				max="90"
				step="1"
				bind:value={draftDurationDays}
				class="tw-w-full tw-accent-[#14b8a6] tw-h-1 tw-rounded-full tw-cursor-pointer"
			/>
		</div>

		<!-- ── Prescription volume ──────────────────────── -->
		<div class="tw-flex tw-flex-col tw-gap-2">
			<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
				DRILL PRESCRIPTION
			</span>
			<div class="tw-grid tw-grid-cols-2 tw-gap-2">
				<div class="tw-flex tw-flex-col tw-gap-1">
					<label for="hud-sets" class="tw-font-mono tw-text-[8px] tw-text-[#14b8a6]/35 tw-uppercase">Sets</label>
					<input
						id="hud-sets"
						type="number"
						min="1"
						max="99"
						bind:value={draftPrescriptionSets}
						class="tw-w-full tw-rounded-lg tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
						       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-px-2 tw-py-1 tw-outline-none
						       focus:tw-border-[#14b8a6]"
					/>
				</div>
				<div class="tw-flex tw-flex-col tw-gap-1">
					<label for="hud-reps" class="tw-font-mono tw-text-[8px] tw-text-[#14b8a6]/35 tw-uppercase">Reps / set</label>
					<input
						id="hud-reps"
						type="number"
						min="0"
						max="999"
						bind:value={draftPrescriptionRepsPerSet}
						class="tw-w-full tw-rounded-lg tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
						       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-px-2 tw-py-1 tw-outline-none
						       focus:tw-border-[#14b8a6]"
					/>
				</div>
			</div>
			<label class="tw-flex tw-items-center tw-gap-2 tw-cursor-pointer">
				<input
					type="checkbox"
					bind:checked={draftPrescriptionBilateral}
					class="tw-accent-[#14b8a6] tw-w-3 tw-h-3"
				/>
				<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/55 tw-uppercase">
					Both sides
				</span>
			</label>
			<div class="tw-grid tw-grid-cols-2 tw-gap-2">
				<div class="tw-flex tw-flex-col tw-gap-1">
					<label for="hud-rx-dur" class="tw-font-mono tw-text-[8px] tw-text-[#14b8a6]/35 tw-uppercase">Target min (opt)</label>
					<input
						id="hud-rx-dur"
						type="number"
						min="0"
						max="480"
						bind:value={draftPrescriptionDurationMin}
						placeholder="—"
						class="tw-w-full tw-rounded-lg tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
						       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-px-2 tw-py-1 tw-outline-none
						       focus:tw-border-[#14b8a6]"
					/>
				</div>
				<div class="tw-flex tw-flex-col tw-gap-1">
					<label for="hud-rx-rpe" class="tw-font-mono tw-text-[8px] tw-text-[#14b8a6]/35 tw-uppercase">Target RPE (opt)</label>
					<input
						id="hud-rx-rpe"
						type="number"
						min="0"
						max="10"
						bind:value={draftPrescriptionTargetRpe}
						placeholder="—"
						class="tw-w-full tw-rounded-lg tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
						       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-px-2 tw-py-1 tw-outline-none
						       focus:tw-border-[#14b8a6]"
					/>
				</div>
			</div>
			<p class="tw-font-mono tw-text-[8px] tw-text-white/20 tw-leading-relaxed">
				Leave reps at 0 for time-only homework. Both sides doubles rep count for XP.
			</p>
		</div>

		<!-- ── Priority (secondary row) ─────────────────── -->
		<div class="tw-flex tw-items-center tw-gap-3">
			<label for="hud-pri" class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/30 tw-uppercase tw-shrink-0">
				PRIORITY
			</label>
			<input
				id="hud-pri"
				type="range"
				min="1"
				max="200"
				step="5"
				bind:value={draftPriority}
				class="tw-flex-1 tw-accent-[#14b8a6] tw-h-px tw-cursor-pointer"
			/>
			<span class="tw-font-mono tw-text-[10px] tw-tracking-wider tw-text-[#14b8a6]/50 tw-w-8 tw-text-right tw-shrink-0">
				{draftPriority}
			</span>
		</div>

		<!-- ── Scope toggle ───────────────────────────────── -->
		<div class="tw-flex tw-flex-col tw-gap-1.5">
			<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
				SCOPE
			</span>
			<div class="tw-flex tw-gap-2">
				<button
					class="tw-flex-1 tw-py-1.5 tw-rounded-lg tw-font-mono tw-text-[9px] tw-tracking-widest
					       tw-uppercase tw-border tw-transition-all"
					style={draftScope === 'team'
						? 'border-color:#14b8a6; color:#14b8a6; background:rgba(20, 184, 166,0.1);'
						: 'border-color:rgba(20, 184, 166,0.2); color:rgba(20, 184, 166,0.35);'}
					onclick={() => (draftScope = 'team')}
				>
					SQUAD
				</button>
				<button
					class="tw-flex-1 tw-py-1.5 tw-rounded-lg tw-font-mono tw-text-[9px] tw-tracking-widest
					       tw-uppercase tw-border tw-transition-all"
					style={draftScope === 'players'
						? 'border-color:#14b8a6; color:#14b8a6; background:rgba(20, 184, 166,0.1);'
						: 'border-color:rgba(20, 184, 166,0.2); color:rgba(20, 184, 166,0.35);'}
					onclick={() => (draftScope = 'players')}
				>
					OPERATIVES
				</button>
			</div>
		</div>

		<!-- ── Roster multi-select ────────────────────────── -->
		{#if draftScope === 'players'}
			<div class="tw-flex tw-flex-col tw-gap-2">
				<!-- Select all / clear -->
				<div class="tw-flex tw-items-center tw-gap-2">
					<button
						class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase
						       tw-text-[#14b8a6]/50 hover:tw-text-[#14b8a6] tw-transition-colors"
						onclick={onSelectAll}
					>
						SELECT ALL
					</button>
					<span class="tw-text-[#14b8a6]/20">·</span>
					<button
						class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase
						       tw-text-[#14b8a6]/50 hover:tw-text-[#ff3040] tw-transition-colors"
						onclick={onClearSelection}
					>
						CLEAR
					</button>
					<span class="tw-ml-auto tw-font-mono tw-text-[9px] tw-text-[#14b8a6]/30">
						{draftTargetUids.length} selected
					</span>
				</div>

				<!-- Player list -->
				<div
					class="tw-flex tw-flex-col tw-gap-px tw-overflow-y-auto tw-rounded-lg
					       tw-border tw-border-[#14b8a6]/10"
					style="max-height:160px;"
				>
					{#if isLoadingRoster}
						{#each [0, 1, 2] as i (i)}
							<div class="tw-h-7 tw-w-full tw-bg-[#05050a] tw-animate-pulse"></div>
						{/each}
					{:else}
						{#each roster as player (player.uid)}
							{@const isChecked = draftTargetUids.includes(player.uid)}
							<label
								class="tw-flex tw-items-center tw-gap-2.5 tw-px-3 tw-py-1.5 tw-cursor-pointer
								       tw-transition-colors hover:tw-bg-[#14b8a6]/5"
								style={isChecked ? 'background:rgba(20, 184, 166,0.07);' : ''}
							>
								<input
									type="checkbox"
									checked={isChecked}
									onchange={() => onToggleUid(player.uid)}
									class="tw-accent-[#14b8a6] tw-w-3 tw-h-3 tw-shrink-0"
								/>
								<span
									class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase tw-truncate"
									style={isChecked ? 'color:#14b8a6;' : 'color:rgba(20, 184, 166,0.45);'}
								>
									{player.playerName}
								</span>
							</label>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<!-- ── Deploy button ──────────────────────────────── -->
		<div class="tw-flex tw-flex-col tw-gap-1.5">
			{#if deployPhase === 'error' && deployError}
				<p class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#ff3040] tw-uppercase tw-leading-relaxed">
					{deployError}
				</p>
			{/if}
			<button
				class="tw-w-full tw-py-2.5 tw-rounded-xl tw-font-mono tw-text-[10px] tw-tracking-widest
				       tw-uppercase tw-border tw-transition-all tw-flex tw-items-center tw-justify-center tw-gap-2
				       disabled:tw-opacity-30 disabled:tw-cursor-not-allowed
				       enabled:hover:tw-brightness-125 active:tw-scale-[0.98]"
				style="border-color:{deployBorderColor}; color:{deployPhase === 'success' ? '#2dd4bf' : deployPhase === 'error' ? '#ff3040' : '#14b8a6'};"
				disabled={!canDeploy}
				onclick={onDeploy}
			>
				{#if deployPhase === 'idle'}
					<Icon name={"game.zap" as IconName} size={14} />
				{/if}
				{deployBtnLabel}
			</button>
		</div>

		<!-- ── Footer ─────────────────────────────────────── -->
		<div class="tw-h-px tw-w-full tw-bg-[#14b8a6]/10"></div>
		<div class="tw-font-mono tw-text-[8px] tw-tracking-widest tw-text-white/10 tw-uppercase tw-text-center">
			[ NEXUS INTENT ENGINE v1 ]
		</div>
	</div>

</div>
