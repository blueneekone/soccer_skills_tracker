<script>
	/**
	 * @typedef {{ id: string, label: string, role: string }} Prospect
	 */

	/** @type {Prospect[]} */
	const MOCK_PROSPECTS = [
		{ id: 'p042', label: 'Player 042 — Midfielder', role: 'Midfielder' },
		{ id: 'p019', label: 'Player 019 — Striker', role: 'Striker' },
		{ id: 'p031', label: 'Player 031 — Center Back', role: 'Center back' },
		{ id: 'p007', label: 'Player 007 — Winger', role: 'Winger' },
		{ id: 'p024', label: 'Player 024 — Goalkeeper', role: 'Goalkeeper' },
	];

	/** @type {{ pace: number; technique: number; tacticalVision: number; physicality: number; mentality: number }} */
	function defaultMatrix() {
		return {
			pace: 52,
			technique: 58,
			tacticalVision: 48,
			physicality: 55,
			mentality: 62,
		};
	}

	/** @type {Record<string, ReturnType<typeof defaultMatrix>>} */
	let scoresByProspect = $state(
		Object.fromEntries(MOCK_PROSPECTS.map((p) => [p.id, defaultMatrix()])),
	);

	let searchQuery = $state('');
	let activeId = $state(MOCK_PROSPECTS[0].id);
	let lockFlash = $state(false);

	const activeProspect = $derived(
		MOCK_PROSPECTS.find((p) => p.id === activeId) ?? MOCK_PROSPECTS[0],
	);

	const filteredProspects = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return MOCK_PROSPECTS;
		return MOCK_PROSPECTS.filter(
			(p) =>
				p.label.toLowerCase().includes(q) ||
				p.role.toLowerCase().includes(q) ||
				p.id.toLowerCase().includes(q),
		);
	});

	const activeMatrix = $derived(scoresByProspect[activeProspect.id] ?? defaultMatrix());

	const overallGrade = $derived.by(() => {
		const m = activeMatrix;
		const sum = m.pace + m.technique + m.tacticalVision + m.physicality + m.mentality;
		return Math.round(sum / 5);
	});

	const CRITERIA = [
		{ key: 'pace', label: 'Pace' },
		{ key: 'technique', label: 'Technique' },
		{ key: 'tacticalVision', label: 'Tactical Vision' },
		{ key: 'physicality', label: 'Physicality' },
		{ key: 'mentality', label: 'Mentality' },
	];

	function lockAssessment() {
		lockFlash = true;
		setTimeout(() => {
			lockFlash = false;
		}, 1600);
	}
</script>

<div class="tw-mb-10 tw-mt-2 tw-min-w-0 tw-flex-1">
	<header class="tw-mb-8 tw-text-center md:tw-text-left">
		<h1
			class="tw-font-black tw-uppercase tw-tracking-tight tw-text-transparent tw-bg-clip-text tw-bg-gradient-to-r tw-from-cyan-300 tw-via-emerald-300 tw-to-cyan-400 tw-drop-shadow-[0_0_28px_rgba(34,211,238,0.35)] md:tw-text-4xl tw-text-2xl"
		>
			<span class="tw-text-slate-500 tw-bg-none tw-text-transparent">[</span>
			<span
				class="tw-bg-gradient-to-r tw-from-cyan-200 tw-via-emerald-200 tw-to-cyan-300 tw-bg-clip-text tw-text-transparent"
			>
				Proving Grounds
			</span>
			<span class="tw-text-slate-600"> : </span>
			<span
				class="tw-bg-gradient-to-r tw-from-emerald-300 tw-via-cyan-300 tw-to-emerald-400 tw-bg-clip-text tw-text-transparent"
			>
				Evaluation Matrix
			</span>
			<span class="tw-text-slate-500">]</span>
		</h1>
		<p class="tw-mt-2 tw-text-xs tw-font-semibold tw-uppercase tw-tracking-widest tw-text-slate-500">
			iPad-first · live rubric
		</p>
	</header>

	<div class="tw-grid tw-grid-cols-1 tw-gap-6 md:tw-grid-cols-3">
		<!-- Prospect roster -->
		<div
			class="tw-flex tw-min-h-[min(70vh,560px)] tw-flex-col tw-rounded-2xl tw-border tw-border-white/5 tw-bg-slate-900/60 tw-p-4 tw-shadow-xl tw-backdrop-blur-md md:tw-min-h-[640px]"
		>
			<h2 class="tw-mb-3 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.25em] tw-text-slate-500">
				Prospect roster
			</h2>
			<label class="tw-sr-only" for="proving-grounds-search">Search prospects</label>
			<input
				id="proving-grounds-search"
				type="search"
				placeholder="Search…"
				autocomplete="off"
				class="tw-mb-3 tw-w-full tw-rounded-xl tw-border tw-border-white/10 tw-bg-slate-950/80 tw-px-3 tw-py-2.5 tw-font-mono tw-text-sm tw-text-slate-100 tw-outline-none tw-ring-cyan-500/30 placeholder:tw-text-slate-600 focus-visible:tw-ring-2"
				bind:value={searchQuery}
			/>

			<ul class="tw-min-h-0 tw-flex-1 tw-space-y-1 tw-overflow-y-auto tw-p-0" role="listbox" aria-label="Prospects">
				{#each filteredProspects as prospect (prospect.id)}
					<li>
						<button
							type="button"
							role="option"
							aria-selected={activeId === prospect.id}
							class="tw-w-full tw-rounded-lg tw-border tw-px-3 tw-py-3 tw-text-left tw-transition-colors hover:tw-bg-slate-800/50 {activeId === prospect.id
								? 'tw-border-cyan-500/35 tw-bg-slate-800/40 tw-ring-1 tw-ring-cyan-500/25'
								: 'tw-border-transparent'}"
							onclick={() => {
								activeId = prospect.id;
							}}
						>
							<span class="tw-block tw-text-sm tw-font-semibold tw-text-slate-100">{prospect.label}</span>
							<span class="tw-mt-0.5 tw-block tw-text-[11px] tw-font-medium tw-text-slate-500">{prospect.role}</span>
						</button>
					</li>
				{/each}
			</ul>
			{#if filteredProspects.length === 0}
				<p class="tw-py-6 tw-text-center tw-text-sm tw-text-slate-500">No prospects match.</p>
			{/if}
		</div>

		<!-- Evaluation console -->
		<div
			class="tw-flex tw-min-h-[min(70vh,560px)] tw-flex-col tw-rounded-2xl tw-border tw-border-white/5 tw-bg-slate-900/60 tw-p-5 tw-shadow-xl tw-backdrop-blur-md md:tw-col-span-2 md:tw-min-h-[640px] md:tw-p-6"
		>
			<div
				class="tw-mb-6 tw-flex tw-flex-col tw-gap-4 tw-border-b tw-border-white/5 tw-pb-6 sm:tw-flex-row sm:tw-items-end sm:tw-justify-between"
			>
				<div class="tw-min-w-0">
					<p class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.22em] tw-text-slate-500">
						Active prospect
					</p>
					<h2 class="tw-mt-1 tw-truncate tw-text-xl tw-font-black tw-text-white md:tw-text-2xl">
						{activeProspect.label}
					</h2>
				</div>
				<div class="tw-shrink-0 tw-text-right">
					<p class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-emerald-400/90">
						Overall grade
					</p>
					<p
						class="tw-font-black tw-tabular-nums tw-text-emerald-400 tw-text-5xl tw-leading-none tw-tracking-tighter tw-shadow-[0_0_24px_rgba(52,211,153,0.35)] md:tw-text-6xl"
					>
						{overallGrade}
					</p>
				</div>
			</div>

			<div class="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-gap-6 tw-overflow-y-auto">
				{#each CRITERIA as row (row.key)}
					{@const k = /** @type {'pace' | 'technique' | 'tacticalVision' | 'physicality' | 'mentality'} */ (
						row.key
					)}
					{@const value = activeMatrix[k]}
					<div class="tw-min-w-0">
						<div class="tw-mb-2 tw-flex tw-items-center tw-justify-between tw-gap-3">
							<label class="tw-text-sm tw-font-bold tw-text-slate-200" for="slider-{activeProspect.id}-{row.key}">
								{row.label}
							</label>
							<span class="tw-font-mono tw-text-xs tw-tabular-nums tw-text-cyan-400/90">{value}</span>
						</div>
						<input
							id="slider-{activeProspect.id}-{row.key}"
							type="range"
							min="0"
							max="100"
							class="tw-mb-2 tw-h-2 tw-w-full tw-cursor-pointer tw-accent-emerald-400"
							value={scoresByProspect[activeProspect.id][k]}
							oninput={(e) => {
								const v = Number(e.currentTarget.value);
								const id = activeProspect.id;
								scoresByProspect = {
									...scoresByProspect,
									[id]: { ...scoresByProspect[id], [k]: v },
								};
							}}
						/>
						<div class="tw-h-2 tw-overflow-hidden tw-rounded-full tw-bg-slate-800">
							<div
								class="tw-h-full tw-rounded-full tw-bg-emerald-400 tw-transition-[width] tw-duration-150 tw-ease-out"
								style="width: {value}%"
							></div>
						</div>
					</div>
				{/each}
			</div>

			<div class="tw-mt-6 tw-shrink-0 tw-border-t tw-border-white/5 tw-pt-5">
				<button
					type="button"
					class="tw-w-full tw-rounded-xl tw-border tw-border-emerald-500/40 tw-bg-emerald-950/50 tw-py-3.5 tw-text-center tw-text-xs tw-font-black tw-uppercase tw-tracking-[0.22em] tw-text-emerald-200 tw-shadow-[0_0_20px_rgba(52,211,153,0.2)] tw-transition hover:tw-border-emerald-400/60 hover:tw-bg-emerald-900/40 hover:tw-text-white focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-emerald-400 {lockFlash
						? 'tw-ring-2 tw-ring-emerald-400/70'
						: ''}"
					onclick={lockAssessment}
				>
					Lock assessment
				</button>
				{#if lockFlash}
					<p class="tw-mt-3 tw-text-center tw-text-[11px] tw-font-semibold tw-text-emerald-400/90">
						Assessment snapshot recorded (simulated).
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>
