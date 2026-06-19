<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import type { MouseEventHandler } from 'svelte/elements';

	type DeployPhase = 'idle' | 'saving' | 'success' | 'error';

	let {
		attributes = [] as Array<{ id: string; name: string; hexColor: string }>,
		roster = [] as Array<{
			uid: string;
			rosterKey: string;
			playerName: string;
			email: string;
			assignable?: boolean;
			nameOnly?: boolean;
		}>,
		draftAttributeId = $bindable(''),
		draftRequiredXp = $bindable(150),
		draftDurationDays = $bindable(7),
		draftScope = $bindable<'team' | 'players'>('team'),
		draftTargetUids = $bindable<string[]>([]),
		draftHighPriority = $bindable(false),
		draftPrescriptionSets = $bindable(3),
		draftPrescriptionRepsPerSet = $bindable(10),
		draftPrescriptionBilateral = $bindable(false),
	draftPrescriptionDurationMin = $bindable(0),
	draftPrescriptionTargetRpe = $bindable(0),
	/** 0 = absent (no cadence). 1–21 = sessions per 7-day window. */
	draftCadenceSessionsPerWindow = $bindable(0),
	draftDrillId = $bindable(''),
		draftDrillTitle = $bindable(''),
		availableDrills = [] as Array<{ id: string; title: string; scope?: string }>,
		isLoadingDrills = false,
		/** B3 bundle drill entries (ordered). Empty = single-drill mode. */
		draftBundleDrills = $bindable([] as Array<{ drillId: string; drillTitle: string; sets: number; repsPerSet: number }>),
	/** B4a — coach opt-in: require parent verification (advisory). Default off. */
	draftRequiresParentVerification = $bindable(false),
		deployPhase = 'idle' as DeployPhase,
		deployError = '',
		rosterError = '',
		isLoadingRoster = false,
		assignableRosterCount = 0,
		nameOnlyRosterCount = 0,
		canDeploy = false,
		onDeploy = (() => {}) as MouseEventHandler<HTMLButtonElement>,
		onToggleUid = (_uid: string) => {},
		onSelectAll = (() => {}) as MouseEventHandler<HTMLButtonElement>,
		onClearSelection = (() => {}) as MouseEventHandler<HTMLButtonElement>,
		onAttributeChange = () => {},
		onAddBundleDrill = () => {},
		onRemoveBundleDrill = (_index: number) => {},
		onUpdateBundleDrill = (_index: number, _patch: Partial<{ drillId: string; drillTitle: string; sets: number; repsPerSet: number }>) => {},
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

<!-- Inline deploy panel — full-width on mobile; no fixed slide-out HUD -->
<div class="tw-w-full tw-min-w-0">
	<div
		class="tw-w-full tw-bg-[#05050a] tw-border tw-border-[#14b8a6]/20
		       tw-rounded-2xl tw-p-5 tw-flex tw-flex-col tw-gap-4"
	>
		<!-- ── Section head ───────────────────────────────── -->
		<div class="tw-flex tw-flex-col tw-gap-0.5">
			<h2 class="tw-m-0 tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#14b8a6] tw-uppercase">
				Deploy intent
			</h2>
			<p class="tw-m-0 tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-white/30 tw-uppercase">
				Assignment terminal
			</p>
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
				onchange={() => onAttributeChange()}
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
			<div class="tw-flex tw-flex-col tw-gap-1">
				<label for="hud-drill" class="tw-font-mono tw-text-[8px] tw-text-[#14b8a6]/35 tw-uppercase">
					Team drill
				</label>
				<select
					id="hud-drill"
					bind:value={draftDrillId}
					disabled={isLoadingDrills}
					class="tw-w-full tw-rounded-lg tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
					       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-tracking-widest
					       tw-px-2 tw-py-1.5 tw-outline-none focus:tw-border-[#14b8a6]
					       disabled:tw-opacity-40"
				>
					<option value="">
						{isLoadingDrills ? 'Loading team drills…' : '— Open intent (RL suggests drill) —'}
					</option>
					{#each availableDrills as drill (drill.id)}
						<option value={drill.id}>
							{drill.scope === 'club' ? `[CLUB] ${drill.title}` : drill.title}
						</option>
					{/each}
				</select>
				{#if !isLoadingDrills && availableDrills.length === 0}
					<p class="tw-font-mono tw-text-[8px] tw-text-white/25 tw-leading-relaxed">
						No saved team drills — type a drill name below, copy from Drill library → Platform basics, or leave open for RL suggestion.
					</p>
				{/if}
				{#if !draftDrillId}
					<div class="tw-flex tw-flex-col tw-gap-1">
						<label for="hud-drill-title" class="tw-font-mono tw-text-[8px] tw-text-[#14b8a6]/35 tw-uppercase">
							Drill name (optional)
						</label>
						<input
							id="hud-drill-title"
							type="text"
							maxlength="200"
							placeholder="e.g. Toe taps"
							bind:value={draftDrillTitle}
							class="tw-w-full tw-rounded-lg tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
							       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-tracking-wide
							       tw-px-2 tw-py-1.5 tw-outline-none focus:tw-border-[#14b8a6]
							       placeholder:tw-text-white/20"
						/>
					</div>
				{/if}
			</div>
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
						max="120"
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
		Team + club drills, or type a drill name. Platform basics: copy from Drill library first.
	</p>
</div>

<!-- ── B3 Bundle drills (ordered sequence) ─────── -->
<div class="tw-flex tw-flex-col tw-gap-2">
	<div class="tw-flex tw-items-center tw-justify-between">
		<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
			Bundle drills <span class="tw-text-white/20">(opt)</span>
		</span>
		{#if draftBundleDrills.length < 8}
			<button
				class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase tw-text-[#14b8a6]/60
				       hover:tw-text-[#14b8a6] tw-transition-colors"
				onclick={() => onAddBundleDrill()}
			>
				+ Add drill
			</button>
		{/if}
	</div>
	{#if draftBundleDrills.length > 0}
		<p class="tw-font-mono tw-text-[8px] tw-text-white/25 tw-leading-relaxed">
			Player runs drills in order. Top single-drill fields above are replaced by this sequence.
		</p>
		{#each draftBundleDrills as entry, i (i)}
			<div class="tw-flex tw-flex-col tw-gap-1 tw-rounded-lg tw-border tw-border-[#14b8a6]/15
			             tw-bg-[#14b8a6]/5 tw-px-2 tw-py-2">
				<div class="tw-flex tw-items-center tw-justify-between">
					<span class="tw-font-mono tw-text-[8px] tw-text-[#14b8a6]/50 tw-uppercase">
						Drill {i + 1}
					</span>
					<button
						class="tw-font-mono tw-text-[8px] tw-text-white/30 hover:tw-text-red-400/70 tw-transition-colors"
						onclick={() => onRemoveBundleDrill(i)}
					>
						remove
					</button>
				</div>
				<select
					value={entry.drillId}
					onchange={(e) => onUpdateBundleDrill(i, { drillId: (e.target as HTMLSelectElement).value })}
					disabled={isLoadingDrills}
					class="tw-w-full tw-rounded tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
					       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-px-2 tw-py-1
					       tw-outline-none focus:tw-border-[#14b8a6] disabled:tw-opacity-40"
				>
					<option value="">— Select team drill —</option>
					{#each availableDrills as drill (drill.id)}
						<option value={drill.id}>{drill.scope === 'club' ? `[CLUB] ${drill.title}` : drill.title}</option>
					{/each}
				</select>
				{#if !entry.drillId}
					<input
						type="text"
						maxlength="200"
						placeholder="Or type drill name"
						value={entry.drillTitle}
						oninput={(e) => onUpdateBundleDrill(i, { drillTitle: (e.target as HTMLInputElement).value })}
						class="tw-w-full tw-rounded tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
						       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-px-2 tw-py-1
						       tw-outline-none focus:tw-border-[#14b8a6] placeholder:tw-text-white/20"
					/>
				{/if}
				<div class="tw-flex tw-gap-2">
					<div class="tw-flex tw-flex-col tw-gap-0.5 tw-flex-1">
						<label class="tw-font-mono tw-text-[8px] tw-text-[#14b8a6]/35 tw-uppercase">Sets</label>
						<input
							type="number"
							min="1"
							max="99"
							value={entry.sets}
							oninput={(e) => onUpdateBundleDrill(i, { sets: Number((e.target as HTMLInputElement).value) })}
							class="tw-w-full tw-rounded tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
							       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-px-2 tw-py-1
							       tw-outline-none focus:tw-border-[#14b8a6]"
						/>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-0.5 tw-flex-1">
						<label class="tw-font-mono tw-text-[8px] tw-text-[#14b8a6]/35 tw-uppercase">Reps/set</label>
						<input
							type="number"
							min="0"
							max="999"
							value={entry.repsPerSet}
							oninput={(e) => onUpdateBundleDrill(i, { repsPerSet: Number((e.target as HTMLInputElement).value) })}
							class="tw-w-full tw-rounded tw-border tw-border-[#14b8a6]/20 tw-bg-[#020202]
							       tw-text-[#14b8a6]/80 tw-font-mono tw-text-[10px] tw-px-2 tw-py-1
							       tw-outline-none focus:tw-border-[#14b8a6]"
						/>
					</div>
				</div>
			</div>
		{/each}
	{:else}
		<p class="tw-font-mono tw-text-[8px] tw-text-white/20 tw-leading-relaxed">
			Add 2+ drills for a sequential bundle session. Leave empty for single-drill (default).
		</p>
	{/if}
</div>

	<!-- ── Cadence (optional sessions / week) ────────── -->
	<div class="tw-flex tw-flex-col tw-gap-1.5">
		<div class="tw-flex tw-items-center tw-justify-between">
			<label for="hud-cadence" class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
				Sessions / week <span class="tw-text-white/20">(opt)</span>
			</label>
			<span class="tw-font-mono tw-text-[11px] tw-tracking-wider tw-text-[#14b8a6]/60">
				{draftCadenceSessionsPerWindow > 0 ? `${draftCadenceSessionsPerWindow}×/wk` : 'off'}
			</span>
		</div>
		<input
			id="hud-cadence"
			type="range"
			min="0"
			max="7"
			step="1"
			bind:value={draftCadenceSessionsPerWindow}
			class="tw-w-full tw-accent-[#14b8a6] tw-h-1 tw-rounded-full tw-cursor-pointer"
		/>
		<p class="tw-font-mono tw-text-[8px] tw-text-white/20 tw-leading-relaxed">
			Repeat frequency goal shown on player mission card. 0 = one-shot (default).
		</p>
	</div>

	<!-- ── Parent verification opt-in (B4a) ──────────── -->
	<div class="tw-flex tw-items-center tw-justify-between tw-gap-3">
		<label for="hud-parent-verify" class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase tw-leading-relaxed">
			Require parent verification <span class="tw-text-white/20">(opt)</span>
		</label>
		<button
			id="hud-parent-verify"
			type="button"
			role="switch"
			aria-checked={draftRequiresParentVerification}
			onclick={() => (draftRequiresParentVerification = !draftRequiresParentVerification)}
			class="tw-w-8 tw-h-4 tw-rounded-full tw-border tw-transition-all tw-shrink-0"
			style={draftRequiresParentVerification
				? 'background:rgba(20,184,166,0.25); border-color:#14b8a6;'
				: 'background:transparent; border-color:rgba(20,184,166,0.2);'}
		>
			<span
				class="tw-block tw-w-2.5 tw-h-2.5 tw-rounded-full tw-transition-transform"
				style={draftRequiresParentVerification
					? 'background:#14b8a6; transform:translateX(18px);'
					: 'background:rgba(20,184,166,0.3); transform:translateX(2px);'}
			></span>
		</button>
	</div>
	<p class="tw-font-mono tw-text-[8px] tw-text-white/20 tw-leading-relaxed tw-mt-[-4px]">
		Player sees optional "Send proof" prompt after logging. Advisory — XP is never gated.
	</p>

	<!-- ── High priority toggle ─────────────────────── -->
	<div class="tw-flex tw-items-center tw-justify-between tw-gap-3">
		<label for="hud-high-priority" class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase tw-leading-relaxed">
			High priority <span class="tw-text-white/20">(opt)</span>
		</label>
		<button
			id="hud-high-priority"
			type="button"
			role="switch"
			aria-checked={draftHighPriority}
			onclick={() => (draftHighPriority = !draftHighPriority)}
			class="tw-w-8 tw-h-4 tw-rounded-full tw-border tw-transition-all tw-shrink-0"
			style={draftHighPriority
				? 'background:rgba(251,191,36,0.25); border-color:#fbbf24;'
				: 'background:transparent; border-color:rgba(20,184,166,0.2);'}
		>
			<span
				class="tw-block tw-w-2.5 tw-h-2.5 tw-rounded-full tw-transition-transform"
				style={draftHighPriority
					? 'background:#fbbf24; transform:translateX(18px);'
					: 'background:rgba(20,184,166,0.3); transform:translateX(2px);'}
			></span>
		</button>
	</div>
	<p class="tw-font-mono tw-text-[8px] tw-text-white/20 tw-leading-relaxed tw-mt-[-4px]">
		Surfaces first on player dashboards with a priority alert.
	</p>

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

		{#if draftScope === 'team'}
			<div class="tw-flex tw-flex-col tw-gap-1.5">
				<span class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/40 tw-uppercase">
					SQUAD ROSTER
				</span>
				<div
					class="tw-flex tw-flex-col tw-gap-px tw-overflow-y-auto tw-rounded-lg tw-border tw-border-[#14b8a6]/10"
					style="max-height:120px;"
				>
					{#if isLoadingRoster}
						{#each [0, 1] as i (i)}
							<div class="tw-h-7 tw-w-full tw-bg-[#05050a] tw-animate-pulse"></div>
						{/each}
					{:else if roster.length === 0}
						<p class="tw-px-3 tw-py-2 tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/35 tw-uppercase">
							No operatives on this squad yet.
						</p>
					{:else}
						{#each roster as player (player.rosterKey)}
							<div class="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-px-3 tw-py-1.5">
								<span
									class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase tw-truncate"
									class:tw-text-slate-500={player.assignable === false}
									class:tw-text-[#14b8a6]={player.assignable !== false}
									style={player.assignable === false ? '' : 'opacity:0.75;'}
								>
									{player.playerName}
								</span>
								{#if player.assignable === false}
									<span class="tw-shrink-0 tw-font-mono tw-text-[8px] tw-text-amber-500/80">NAME ONLY</span>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

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
					{:else if roster.length === 0}
						<p class="tw-px-3 tw-py-2 tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#14b8a6]/35 tw-uppercase">
							No operatives on this squad yet.
						</p>
					{:else}
						{#each roster as player (player.rosterKey)}
							{@const isChecked = draftTargetUids.includes(player.rosterKey)}
							{@const canSelect = player.assignable !== false}
							{#if canSelect}
								<label
									class="tw-flex tw-items-center tw-gap-2.5 tw-px-3 tw-py-1.5 tw-cursor-pointer
									       tw-transition-colors hover:tw-bg-[#14b8a6]/5"
									style={isChecked ? 'background:rgba(20, 184, 166,0.07);' : ''}
								>
									<input
										type="checkbox"
										checked={isChecked}
										onchange={() => onToggleUid(player.rosterKey)}
										class="tw-accent-[#14b8a6] tw-w-3 tw-h-3 tw-shrink-0"
									/>
									<span
										class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase tw-truncate"
										style={isChecked ? 'color:#14b8a6;' : 'color:rgba(20, 184, 166,0.45);'}
									>
										{player.playerName}
									</span>
								</label>
							{:else}
								<div
									class="tw-flex tw-flex-col tw-gap-0.5 tw-px-3 tw-py-1.5 tw-opacity-50"
									title="Add email to assign — name-only roster entry"
								>
									<span
										class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase tw-truncate tw-text-slate-500"
									>
										{player.playerName}
									</span>
									<span class="tw-font-mono tw-text-[8px] tw-tracking-wide tw-text-amber-500/80">
										Add email to assign
									</span>
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<!-- ── Name-only roster advisory (D9) ─────────────── -->
		{#if nameOnlyRosterCount > 0}
			<p
				class="tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-amber-500/90 tw-leading-relaxed tw-uppercase"
				role="status"
			>
				{#if draftScope === 'team'}
					{nameOnlyRosterCount} name-only {nameOnlyRosterCount === 1 ? 'entry' : 'entries'} —
					excluded from deploy until player accounts are linked on Daily Intel.
				{:else}
					{nameOnlyRosterCount} name-only roster {nameOnlyRosterCount === 1 ? 'entry' : 'entries'} —
					link player accounts on Daily Intel before individual assignment.
				{/if}
			</p>
		{/if}
		{#if draftScope === 'players' && !isLoadingRoster && assignableRosterCount === 0}
			<p class="tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-slate-500 tw-uppercase" role="status">
				No assignable players — sync roster emails on Daily Intel first.
			</p>
		{/if}
		{#if draftScope === 'team' && !isLoadingRoster && assignableRosterCount === 0 && roster.length > 0}
			<p class="tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-slate-500 tw-uppercase" role="status">
				No linked player accounts — link accounts on Daily Intel before squad deploy.
			</p>
		{/if}
		{#if rosterError}
			<p class="tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-[#ff3040] tw-uppercase" role="alert">
				{rosterError}
			</p>
		{/if}
		{#if draftScope === 'team' && !isLoadingRoster && roster.length === 0 && !rosterError}
			<p class="tw-font-mono tw-text-[9px] tw-tracking-wide tw-text-slate-500 tw-uppercase" role="status">
				No roster entries — add players on Daily Intel or sync the squad list first.
			</p>
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
