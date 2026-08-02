<script lang="ts">
</script>

<svelte:head>
	<title>Recruiter Onboarding</title>
</svelte:head>

<div class="tw-min-h-screen tw-w-full tw-flex tw-items-center tw-justify-center tw-bg-[#020617] tw-p-8">
	<!-- Zero-distraction layout: No sidebar rendered here -->
	<div class="tw-w-full tw-max-w-3xl tw-bg-slate-900 tw-rounded-2xl tw-border tw-border-slate-800 tw-p-8">
		<!-- Must follow typography rules (e.g. Switzer/Geist Mono properly applied) -->
		<h1 class="tw-font-mono tw-text-2xl tw-font-bold tw-text-white tw-uppercase tw-tracking-widest tw-mb-6">
			Background Verification
		</h1>
		<p class="tw-text-slate-400 tw-text-base tw-leading-relaxed tw-mb-8">
			Please complete your background verification through Checkr to proceed.
		</p>
		
		<!-- Checkr Container -->
		<div class="checkr-verification-container tw-w-full tw-h-[400px] tw-bg-slate-800 tw-rounded-xl tw-border tw-border-slate-700 tw-flex tw-items-center tw-justify-center">
			<span class="tw-font-mono tw-text-slate-500 tw-tracking-widest">[ CHECKR EMBED SECURE ZONE ]</span>
		</div>
	</div>
</div>
