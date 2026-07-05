<!--
	AlertMatrix — Pane 3: Global Alert Matrix / Telemetry Rail.

	Renders on ultra-wide (2xl: 1536px+) viewports only.
	Typography: Geist Mono via tw-font-mono — required for technical data readouts.
	Color tokens: Void Black bg-[#0B0F19], border-slate-800, text-slate-300/400.
	Zero props, zero reactive state — this is a pure presentational Z2 Panel.
-->
<aside
	class="tw-hidden 2xl:tw-flex 2xl:tw-flex-col tw-w-96 tw-flex-shrink-0 tw-border-l tw-border-slate-800 tw-bg-[#0B0F19] tw-p-4"
	aria-label="Global Alert Matrix"
>
	<header
		class="tw-font-mono tw-text-xs tw-tracking-widest tw-uppercase tw-text-slate-400 tw-mb-4"
	>
		Global Alert Matrix
	</header>

	<ul class="tw-flex tw-flex-col tw-gap-2 tw-list-none tw-p-0 tw-m-0">
		<li
			class="tw-px-3 tw-py-2 tw-bg-slate-900 tw-border tw-border-slate-800 tw-rounded-md tw-text-sm tw-font-mono tw-text-slate-300 hover:tw-bg-slate-800 hover:tw-border-slate-700 tw-transition-colors tw-duration-150 tw-ease-out"
		>
			SafeSport Intercept: Clear
		</li>
		<li
			class="tw-px-3 tw-py-2 tw-bg-slate-900 tw-border tw-border-slate-800 tw-rounded-md tw-text-sm tw-font-mono tw-text-slate-300 hover:tw-bg-slate-800 hover:tw-border-slate-700 tw-transition-colors tw-duration-150 tw-ease-out"
		>
			Tomorrow.io: Optimal
		</li>
		<li
			class="tw-px-3 tw-py-2 tw-bg-slate-900 tw-border tw-border-slate-800 tw-rounded-md tw-text-sm tw-font-mono tw-text-slate-300 hover:tw-bg-slate-800 hover:tw-border-slate-700 tw-transition-colors tw-duration-150 tw-ease-out"
		>
			VPC Bottlenecks: Nominal
		</li>
		<li
			class="tw-px-3 tw-py-2 tw-bg-slate-900 tw-border tw-border-slate-800 tw-rounded-md tw-text-sm tw-font-mono tw-text-slate-300 hover:tw-bg-slate-800 hover:tw-border-slate-700 tw-transition-colors tw-duration-150 tw-ease-out"
		>
			Stripe: Nominal
		</li>
	</ul>
</aside>
