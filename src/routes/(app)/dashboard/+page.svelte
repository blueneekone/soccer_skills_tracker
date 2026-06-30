<svelte:head>
	<title>Execution Terminal · NEXUS COMMAND</title>
</svelte:head>

<div class="tw-mx-auto tw-flex tw-h-full tw-w-full tw-max-w-[1600px] tw-flex-col tw-p-4 md:tw-p-6 lg:tw-p-8" style="gap: var(--bento-gap-liquid);">

	<!-- Page header -->
	<div class="tw-flex tw-w-full tw-flex-col tw-gap-1">
		<h1 class="tw-font-sans tw-text-2xl tw-tracking-tight tw-text-slate-100">Execution Terminal</h1>
		<p class="tw-font-mono tw-text-xs tw-uppercase tw-tracking-widest tw-text-slate-500">
			System Status: Operative Active // Telemetry Online
		</p>
	</div>

	<!-- Liquid Bento Grid — Sprint 1.1 -->
	<div class="bento-grid bento-grid--12col bento-grid--liquid tw-w-full">

		<!-- ── Capability Level hero tile (8 cols) ────────────────────────── -->
		<div
			class="vanguard-surface vanguard-surface--hero-liquid bento-cell tw-col-span-12 lg:tw-col-span-8 tw-relative tw-flex tw-min-h-[240px] tw-min-w-0 tw-flex-col tw-justify-between tw-overflow-hidden tw-rounded-vanguard"
			aria-label="Current Capability Level"
		>
			<!-- Ambient gradient — no neon, strictly per .cursorrules §2 -->
			<div
				class="tw-pointer-events-none tw-absolute tw-right-0 tw-top-0 tw-h-64 tw-w-64 -tw-translate-y-1/2 tw-translate-x-1/4 tw-rounded-full tw-bg-teal-500/5 tw-blur-[80px]"
				aria-hidden="true"
			></div>

			<h2 class="tw-font-mono tw-text-xs tw-uppercase tw-tracking-widest tw-text-slate-400">
				Current Capability Level
			</h2>

			<div class="tw-flex tw-items-end tw-gap-4">
				<span class="tw-font-mono tw-text-6xl tw-leading-none tw-tracking-tighter tw-text-teal-400">LVL.14</span>
				<div class="tw-flex tw-flex-col tw-pb-1">
					<span class="tw-font-mono tw-text-sm tw-text-slate-300">2,450 / 3,000 XP</span>
					<span class="tw-font-mono tw-text-xs tw-text-slate-500">Next unlock: Advanced Spatial Vision</span>
				</div>
			</div>

			<!-- XP progress bar -->
			<div class="tw-mt-6 tw-h-2 tw-w-full tw-overflow-hidden tw-rounded-full tw-border tw-border-slate-800/50 tw-bg-black/40">
				<div class="tw-h-full tw-w-[81%] tw-rounded-full tw-bg-teal-500 tw-shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div>
			</div>
		</div>

		<!-- ── Engagement Streak card (4 cols) ────────────────────────────── -->
		<div
			class="vanguard-card vanguard-surface--liquid bento-cell tw-col-span-12 lg:tw-col-span-4 tw-flex tw-min-h-[240px] tw-min-w-0 tw-flex-col tw-justify-between tw-rounded-vanguard"
			aria-label="Engagement Streak"
		>
			<h2 class="tw-font-mono tw-text-xs tw-uppercase tw-tracking-widest tw-text-slate-400">
				Engagement Streak
			</h2>
			<div class="tw-flex tw-flex-1 tw-flex-col tw-items-center tw-justify-center">
				<span class="tw-mb-2 tw-font-mono tw-text-5xl tw-tracking-tighter tw-text-amber-500">
					12 DAYS
				</span>
				<p class="tw-text-center tw-font-mono tw-text-xs tw-text-slate-500">
					Skill Decay intercept active.<br />Log a workout in 14h 22m to maintain.
				</p>
			</div>
		</div>

		<!-- ── Active Objectives panel (full width) ───────────────────────── -->
		<div
			class="vanguard-card vanguard-surface--liquid bento-cell bento-span-12 tw-min-w-0 tw-rounded-vanguard"
			aria-label="Active Objectives"
		>
			<div class="tw-mb-6 tw-flex tw-items-center tw-justify-between">
				<h2 class="tw-font-mono tw-text-xs tw-uppercase tw-tracking-widest tw-text-slate-400">
					Active Objectives (RL-Optimized)
				</h2>
				<button
					type="button"
					class="vanguard-btn-primary"
				>
					Initialize Sequence
				</button>
			</div>

			<div class="tw-flex tw-flex-col tw-gap-3">
				<div class="tw-flex tw-h-16 tw-w-full tw-cursor-pointer tw-items-center tw-justify-between tw-rounded-lg tw-border tw-border-slate-800/50 tw-bg-black/20 tw-px-4 tw-transition-colors hover:tw-border-slate-600">
					<div class="tw-flex tw-items-center tw-gap-4">
						<div class="tw-h-2 tw-w-2 tw-rounded-full tw-bg-teal-500 tw-shadow-[0_0_8px_rgba(20,184,166,0.8)]"></div>
						<span class="tw-font-mono tw-text-sm tw-text-slate-200">Dynamic Ball Mastery v4</span>
					</div>
					<span class="tw-font-mono tw-text-xs tw-text-slate-500">+150 XP</span>
				</div>
			</div>
		</div>

	</div>
</div>
