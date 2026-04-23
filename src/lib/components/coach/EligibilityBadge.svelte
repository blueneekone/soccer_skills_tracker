<script>
	/**
	 * Compliance chips for Match Day (SafeSport, concussion, VPC, governing body).
	 * @typedef {Object} EligLike
	 * @property {boolean} [safeSportVerified]
	 * @property {boolean} [concussionClearanceVerified]
	 * @property {boolean} [vpcSatisfied]
	 * @property {boolean} [identityVerified]
	 * @property {string} [governingBodyStatus]
	 */

	/** @type {{ eligibility: EligLike | null }} */
	let { eligibility = null } = $props();

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

<div class="elig-badge-row">
	{#if showIdentityWarning}
		<span class="elig-warn-identity" title="No verified email or external member ID on file">
			<i class="ph ph-warning-circle" aria-hidden="true"></i> Unverified identity
		</span>
	{/if}

	{#if eligibility}
		<span
			class="elig-chip"
			class:elig-chip--ok={eligibility.safeSportVerified === true}
			class:elig-chip--bad={eligibility.safeSportVerified !== true}
		>
			SafeSport
		</span>
		<span
			class="elig-chip"
			class:elig-chip--ok={eligibility.concussionClearanceVerified === true}
			class:elig-chip--bad={eligibility.concussionClearanceVerified !== true}
		>
			Concussion
		</span>
		<span
			class="elig-chip"
			class:elig-chip--ok={eligibility.vpcSatisfied === true}
			class:elig-chip--bad={eligibility.vpcSatisfied !== true}
		>
			VPC
		</span>
		<span
			class="elig-chip"
			class:elig-chip--ok={gbOk}
			class:elig-chip--bad={!gbOk}
		>
			{gbLabel}
		</span>
	{:else}
		<span class="elig-chip elig-chip--muted">No eligibility record</span>
	{/if}
</div>

<style>
	.elig-badge-row {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(6px, 1.5vw, 10px);
		align-items: center;
		margin-top: clamp(8px, 1.5vw, 12px);
	}

	.elig-warn-identity {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		padding: clamp(4px, 1vw, 6px) clamp(10px, 2vw, 14px);
		border-radius: var(--radius-premium);
		font-size: clamp(0.72rem, 2.4vw, 0.82rem);
		font-weight: 800;
		background: rgba(234, 179, 8, 0.2);
		color: #854d0e;
		border: 1px solid rgba(202, 138, 4, 0.45);
	}

	:global(html.dark) .elig-warn-identity {
		background: rgba(234, 179, 8, 0.16);
		color: #fde68a;
		border-color: rgba(250, 204, 21, 0.35);
	}

	.elig-chip {
		display: inline-flex;
		align-items: center;
		padding: clamp(4px, 1vw, 6px) clamp(10px, 2vw, 12px);
		border-radius: var(--radius-premium);
		font-size: clamp(0.7rem, 2.2vw, 0.78rem);
		font-weight: 800;
		border: 1px solid var(--border-strong);
		background: var(--surface-subtle);
		color: var(--text-secondary);
	}

	.elig-chip--ok {
		background: rgba(4, 120, 87, 0.12);
		color: #065f46;
		border-color: rgba(4, 120, 87, 0.35);
	}

	.elig-chip--bad {
		background: rgba(153, 27, 27, 0.08);
		color: var(--danger-red);
		border-color: rgba(153, 27, 27, 0.25);
	}

	.elig-chip--muted {
		opacity: 0.85;
		font-weight: 700;
	}
</style>
