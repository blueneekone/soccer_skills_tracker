<script lang="ts">
	export let xpLost: number = 0;
</script>

<div class="tw-col-span-12 tw-bg-amber-500/10 tw-border tw-border-amber-500/50 tw-p-4 tw-rounded-lg tw-flex tw-items-center tw-justify-between tw-mb-4" role="alert">
	<div class="tw-flex tw-items-center tw-gap-4">
		<span class="tw-text-amber-500 tw-text-2xl">⚠️</span>
		<div>
			<h3 class="tw-text-amber-500 tw-font-mono tw-font-bold tw-text-sm tw-uppercase tw-tracking-wider tw-m-0">Skill Decay Imminent</h3>
			<p class="tw-text-amber-200 tw-text-xs tw-m-0 tw-mt-1">Inactivity penalty applied. You have lost {xpLost} XP. Resume training immediately.</p>
		</div>
	</div>
	<button class="tw-bg-amber-500 hover:tw-bg-amber-400 tw-text-black tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-px-4 tw-py-2 tw-rounded tw-transition-colors">
		Resume
	</button>
</div>
