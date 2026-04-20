<script>
	import ClubIdentityModule from './ClubIdentityModule.svelte';
	import QuickActionsModule from './QuickActionsModule.svelte';
	import CoachAccountabilityModule from './CoachAccountabilityModule.svelte';
	import EntitlementModule from './EntitlementModule.svelte';
	import FieldOpsModule from './FieldOpsModule.svelte';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import DirectorAnalyticsCharts from '$lib/components/shell/DirectorAnalyticsCharts.svelte';
	import { clubBrandingStore } from '$lib/stores/clubBranding.svelte.js';

	let {
		clubId = '',
		onNavigateTab = /** @param {string} _id */ (_id) => {}
	} = $props();
</script>

<section class="tw-mb-8 tw-max-w-[min(100%,120rem)] tw-mx-auto" aria-labelledby="dir-os-heading">
	<div class="tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-4 tw-mb-6">
		<div>
			<h2
				id="dir-os-heading"
				class="tw-m-0 tw-text-2xl md:tw-text-3xl tw-font-black tw-tracking-tight"
				style="color: var(--text-primary);"
			>
				Command center
			</h2>
			<p class="tw-m-0 tw-mt-2 tw-text-sm md:tw-text-base tw-max-w-2xl" style="color: var(--text-secondary);">
				Executive overview — branding, staffing, seat usage, and field operations.
			</p>
		</div>
	</div>

	<ActionInbox {clubId} />
	<DirectorAnalyticsCharts {clubId} />

	<div class="director-bento-grid director-bento-grid--lg director-os-shell">
		<article
			class="dir-bento-card dir-bento-card--interactive glass-panel tw-p-5 md:tw-p-6 tw-relative tw-z-0"
			class:dir-bento-club-brand={!!clubBrandingStore.logoUrl}
		>
			<div class="tw-relative tw-z-10">
				<ClubIdentityModule {clubId} />
			</div>
		</article>

		<article
			class="dir-bento-card dir-bento-card--interactive glass-panel tw-p-5 md:tw-p-6 tw-relative tw-z-0"
			class:dir-bento-club-brand={!!clubBrandingStore.logoUrl}
		>
			<div class="tw-relative tw-z-10">
			<QuickActionsModule
				{clubId}
				onCreateTeam={() => onNavigateTab('teams')}
				onInviteCoach={() => onNavigateTab('teams')}
			/>
			</div>
		</article>

		<article
			class="dir-bento-card dir-bento-card--interactive director-bento-full glass-panel tw-p-5 md:tw-p-6 tw-relative tw-z-0"
			class:dir-bento-club-brand={!!clubBrandingStore.logoUrl}
		>
			<div class="tw-relative tw-z-10">
				<CoachAccountabilityModule {clubId} />
			</div>
		</article>

		<!-- Read-only seat visualization — no tile-level motion -->
		<article
			class="dir-bento-card director-bento-full glass-panel tw-p-5 md:tw-p-6 tw-relative tw-z-0"
			class:dir-bento-club-brand={!!clubBrandingStore.logoUrl}
		>
			<div class="tw-relative tw-z-10">
			<EntitlementModule {clubId} />
			</div>
		</article>

		<article
			class="dir-bento-card dir-bento-card--interactive director-bento-full glass-panel tw-p-5 md:tw-p-6 tw-relative tw-z-0"
			class:dir-bento-club-brand={!!clubBrandingStore.logoUrl}
		>
			<div class="tw-relative tw-z-10">
				<FieldOpsModule {clubId} />
			</div>
		</article>
	</div>
</section>
