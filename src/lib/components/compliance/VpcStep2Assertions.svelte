<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	export let wizardStage: string;
	export let consentWorkout: boolean;
	export let consentIdentity: boolean;
	export let consentAnalytics: boolean;
	export let consentComms: boolean;
	export let consentSponsor: boolean;
	export let activePlayerEmail: string;
</script>

<div class="tw-rounded-[24px] tw-border tw-border-[#334155] tw-bg-slate-900 tw-p-6 tw-shadow-2xl tw-mb-6">
	<div class="tw-flex tw-items-center tw-mb-8">
		<button type="button" class="tw-w-8 tw-h-8 tw-bg-black/50 tw-border tw-border-[#334155] tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-[#94a3b8] hover:tw-text-white tw-transition-colors tw-mr-4" onclick={() => wizardStage = 'step1'} aria-label="Back">
			<Icon name={"nav.arrow-left" as IconName} size={14} />
		</button>
		<div class="tw-flex tw-items-center tw-gap-2 tw-flex-1">
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#14b8a6] tw-text-black tw-flex tw-items-center tw-justify-center"><Icon name={"status.check" as IconName} size={12} /></span>
			<div class="tw-flex-1 tw-h-[1px] tw-bg-[#14b8a6]"></div>
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#f59e0b] tw-text-black tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">2</span>
			<div class="tw-flex-1 tw-h-[1px] tw-bg-[#334155]"></div>
			<span class="tw-w-6 tw-h-6 tw-rounded-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-[#64748b] tw-flex tw-items-center tw-justify-center tw-font-mono tw-text-xs tw-font-bold">3</span>
		</div>
	</div>

	<h2 class="tw-font-sans tw-text-xl tw-font-semibold tw-tracking-tight tw-text-white tw-mb-2">Step 2 — Consent Assertions</h2>
	<p class="tw-text-[#94a3b8] tw-font-sans tw-text-sm tw-mb-6">Review each item and indicate your consent. Items marked <strong class="tw-text-[#f59e0b]">Required</strong> must be accepted to proceed.</p>

	<div class="tw-space-y-4 tw-mb-8">
		<label class="tw-flex tw-items-start tw-gap-4 tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#f59e0b] tw-transition-colors">
			<input type="checkbox" bind:checked={consentWorkout} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#f59e0b]" />
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<strong class="tw-text-white tw-font-sans">Workout &amp; training data</strong>
					<span class="tw-bg-[#f59e0b]/10 tw-border tw-border-[#f59e0b]/40 tw-text-[#f59e0b] tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Required</span>
				</div>
				<span class="tw-text-[#94a3b8] tw-font-sans tw-text-xs">Allow SSTRACKER to collect and store repetition counts, session logs, drill completions, and XP data for {activePlayerEmail}.</span>
			</div>
		</label>
		<label class="tw-flex tw-items-start tw-gap-4 tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#f59e0b] tw-transition-colors">
			<input type="checkbox" bind:checked={consentIdentity} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#f59e0b]" />
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<strong class="tw-text-white tw-font-sans">Identity &amp; roster data</strong>
					<span class="tw-bg-[#f59e0b]/10 tw-border tw-border-[#f59e0b]/40 tw-text-[#f59e0b] tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Required</span>
				</div>
				<span class="tw-text-[#94a3b8] tw-font-sans tw-text-xs">Allow the platform to store the athlete's display name, email address, club and team membership, and date of birth for access control.</span>
			</div>
		</label>
		<label class="tw-flex tw-items-start tw-gap-4 tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
			<input type="checkbox" bind:checked={consentAnalytics} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#64748b]" />
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<strong class="tw-text-white tw-font-sans">Performance analytics</strong>
					<span class="tw-bg-[#334155] tw-text-[#94a3b8] tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Optional</span>
				</div>
				<span class="tw-text-[#94a3b8] tw-font-sans tw-text-xs">Allow attribute scoring, leaderboard rankings, and team-comparison analytics. Declining will exclude the athlete from club dashboards but will not affect training data logging.</span>
			</div>
		</label>
		<label class="tw-flex tw-items-start tw-gap-4 tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
			<input type="checkbox" bind:checked={consentComms} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#64748b]" />
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<strong class="tw-text-white tw-font-sans">In-app communications</strong>
					<span class="tw-bg-[#334155] tw-text-[#94a3b8] tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Optional</span>
				</div>
				<span class="tw-text-[#94a3b8] tw-font-sans tw-text-xs">Allow coaches to send in-app messages and notifications to the athlete account.</span>
			</div>
		</label>
		<label class="tw-flex tw-items-start tw-gap-4 tw-bg-[#1e293b] tw-rounded-lg tw-border tw-border-[#334155] tw-p-4 tw-cursor-pointer hover:tw-border-[#64748b] tw-transition-colors">
			<input type="checkbox" bind:checked={consentSponsor} class="tw-mt-1 tw-w-4 tw-h-4 tw-accent-[#64748b]" />
			<div>
				<div class="tw-flex tw-items-center tw-gap-2 tw-mb-1">
					<strong class="tw-text-white tw-font-sans">Sponsor &amp; partner updates</strong>
					<span class="tw-bg-[#334155] tw-text-[#94a3b8] tw-px-2 tw-py-0.5 tw-rounded tw-font-mono tw-text-[9px] tw-uppercase tw-tracking-widest">Optional</span>
				</div>
				<span class="tw-text-[#94a3b8] tw-font-sans tw-text-xs">Receive director-approved club partner announcements in your guardian inbox. Separate from coach team messages. Never sent to minor accounts.</span>
			</div>
		</label>
	</div>

	<button type="button" class="tw-w-full tw-py-4 tw-rounded-lg tw-bg-[#f59e0b] tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest hover:tw-bg-[#d97706] tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed" disabled={!consentWorkout || !consentIdentity} onclick={() => wizardStage = 'step3'}>
		Continue to Attestation
	</button>
</div>
