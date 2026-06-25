<script lang="ts">
	import type { DeliveryReport, ParentSkipReason } from '$lib/services/comms.svelte.js';

	let {
		report,
		rosterAthleteCount,
		compact = false,
	}: {
		report: DeliveryReport;
		rosterAthleteCount?: number;
		compact?: boolean;
	} = $props();

	const athletes = $derived(rosterAthleteCount ?? report.rosterAthleteCount ?? 0);
	const delivered = $derived(report.parentDelivered ?? []);
	const skipped = $derived(report.parentSkipped ?? []);
	const hasPartial = $derived(skipped.length > 0 && delivered.length > 0);
	const allSkipped = $derived(delivered.length === 0 && skipped.length > 0);

	const reasonLabels: Record<ParentSkipReason, string> = {
		no_household: 'No household link',
		not_on_roster: 'Not on roster',
		consent_comms_declined: 'Comms consent declined (VPC)',
		not_guardian: 'Not designated guardian',
		push_token_missing: 'Push token missing',
	};

	const channelLabels: Record<string, string> = {
		in_app: 'in_app',
		push: 'push',
		email: 'email',
		sms: 'sms',
	};
</script>

<div
	class="delivery-receipt"
	class:delivery-receipt--warn={hasPartial || allSkipped}
	class:delivery-receipt--compact={compact}
	role="status"
>
	<p class="delivery-receipt__head">
		<strong>{delivered.length}</strong> parent{delivered.length === 1 ? '' : 's'} delivered
		{#if skipped.length > 0}
			· <strong>{skipped.length}</strong> skipped
		{/if}
		{#if athletes > 0}
			<span class="delivery-receipt__meta">
				({athletes} roster athlete{athletes === 1 ? '' : 's'} on team)
			</span>
		{/if}
	</p>

	{#if !compact && delivered.length > 0}
		<ul class="delivery-receipt__list">
			{#each delivered as row (row.email)}
				<li class="delivery-receipt__ok">
					✓ {row.email}
					{#if row.channels?.length}
						<span class="delivery-receipt__channels">
							{#each row.channels as ch (ch)}
								<span class="delivery-receipt__chip">{channelLabels[ch] ?? ch}</span>
							{/each}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if skipped.length > 0}
		<ul class="delivery-receipt__list delivery-receipt__list--skip">
			{#each skipped as row (row.email)}
				<li class="delivery-receipt__skip">
					{row.email}
					<span class="delivery-receipt__reason">({reasonLabels[row.reason] ?? row.reason})</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if report.ccParentEmails?.length}
		<p class="delivery-receipt__audit">
			SafeSport minor CC audit: {report.ccParentEmails.length} guardian{report.ccParentEmails.length === 1
				? ''
				: 's'}
		</p>
	{/if}
</div>

<style>
	.delivery-receipt {
		margin: 0;
		padding: 10px 12px;
		border-radius: 10px;
		font-size: 12px;
		line-height: 1.45;
		color: #047857;
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.25);
	}

	.delivery-receipt--warn {
		color: #92400e;
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.35);
	}

	.delivery-receipt--compact .delivery-receipt__list {
		display: none;
	}

	.delivery-receipt__head {
		margin: 0;
		font-weight: 600;
	}

	.delivery-receipt__meta {
		font-weight: 500;
		color: #64748b;
	}

	.delivery-receipt__list {
		margin: 8px 0 0;
		padding-left: 1.1rem;
	}

	.delivery-receipt__list--skip {
		color: #b45309;
	}

	.delivery-receipt__ok {
		margin: 2px 0;
	}

	.delivery-receipt__channels {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-left: 6px;
	}

	.delivery-receipt__chip {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 1px 6px;
		border-radius: 4px;
		background: rgba(15, 23, 42, 0.08);
		border: 1px solid rgba(15, 23, 42, 0.12);
		color: #334155;
	}

	.delivery-receipt--warn .delivery-receipt__chip {
		background: rgba(146, 64, 14, 0.08);
		border-color: rgba(146, 64, 14, 0.2);
		color: #92400e;
	}

	.delivery-receipt__skip {
		margin: 2px 0;
	}

	.delivery-receipt__reason {
		font-size: 11px;
		opacity: 0.9;
	}

	.delivery-receipt__audit {
		margin: 8px 0 0;
		font-size: 11px;
		color: #64748b;
	}
</style>
