<script lang="ts">
	import StatusChip from '$lib/components/ui/StatusChip.svelte';
	/**
	 * Compliance chips for Match Day (SafeSport, concussion, VPC, governing body).
	 * @typedef {Object} EligLike
	 * @property {boolean} [safeSportVerified]
	 * @property {boolean} [concussionClearanceVerified]
	 * @property {boolean} [vpcSatisfied]
	 * @property {boolean} [identityVerified]
	 * @property {string} [governingBodyStatus]
	 */

	/** @type {{ eligibility: EligLike | null; vpc_approved?: boolean | null }} */
	let { eligibility = null, vpc_approved = null } = $props();

	const gbLabel = $derived.by(() => {
		const s = eligibility?.governingBodyStatus;
		if (s === 'clear') return 'GB: Clear';
		if (s === 'red_card') return 'GB: Red card';
		if (s === 'suspended') return 'GB: Suspended';
		if (s === 'unknown' || !s) return 'GB: Unknown';
		return `GB: ${s}`;
	});

	const gbOk = $derived(eligibility?.governingBodyStatus === 'clear');

	const showIdentityWarning = $derived(
		!eligibility || eligibility.identityVerified !== true,
	);
</script>

{#if vpc_approved !== null && vpc_approved !== undefined}
	<!-- Standalone VPC pill — used by CoachSquadReadinessCard -->
	<StatusChip
		tone={vpc_approved ? 'verified' : 'critical'}
		label={vpc_approved ? 'VPC · VERIFIED' : 'VPC · REQUIRED'}
		icon={vpc_approved ? 'status.verified' : 'status.error'}
	/>
{:else}

<div class="elig-badge-row">
	{#if showIdentityWarning}
		<StatusChip tone="warning" label="Unverified identity" icon="status.warning-circle" />
	{/if}

	{#if eligibility}
		<StatusChip
			tone={eligibility.safeSportVerified === true ? 'verified' : 'critical'}
			label="SafeSport"
		/>
		<StatusChip
			tone={eligibility.concussionClearanceVerified === true ? 'verified' : 'critical'}
			label="Concussion"
		/>
		<StatusChip
			tone={eligibility.vpcSatisfied === true ? 'verified' : 'critical'}
			label="VPC"
		/>
		<StatusChip
			tone={gbOk ? 'verified' : 'warning'}
			label={gbLabel}
		/>
	{:else}
		<StatusChip tone="muted" label="No eligibility record" />
	{/if}
</div>

{/if}

<style>
	.elig-badge-row {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(6px, 1.5vw, 10px);
		align-items: center;
		margin-top: clamp(8px, 1.5vw, 12px);
	}
</style>
