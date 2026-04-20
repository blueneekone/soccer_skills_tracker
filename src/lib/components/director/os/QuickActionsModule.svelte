<script>
	import PendingInvitesList from './PendingInvitesList.svelte';

	let {
		clubId = '',
		onCreateTeam = () => {},
		onInviteCoach = () => {}
	} = $props();
</script>

<div class="tw-flex tw-flex-col tw-gap-4 tw-h-full">
	<h3 class="tw-m-0 tw-text-lg tw-font-extrabold tw-tracking-tight" style="color: var(--text-primary);">
		Staff & invites
	</h3>
	<p class="tw-m-0 tw-text-sm tw-leading-relaxed" style="color: var(--text-secondary);">
		Create structure, send coach invites, and monitor pending seat holds.
	</p>
	<div class="tw-flex tw-flex-col tw-gap-3">
		<button type="button" class="dir-os-btn-primary" onclick={onCreateTeam}>Create new team</button>
		<button type="button" class="dir-os-btn-primary" onclick={onInviteCoach}>Invite coach</button>
	</div>
	<div class="tw-pt-2 tw-border-t tw-mt-1" style="border-color: rgba(15,23,42,0.08);">
		<PendingInvitesList {clubId} />
	</div>
</div>
