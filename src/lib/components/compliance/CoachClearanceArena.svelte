<script lang="ts">
	import type { CoachClearanceEngine, CoachRow } from './CoachClearanceEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import {
		getCheckrCandidateDashboardUrl,
		getCheckrDashboardBaseUrl,
		getClearanceStatusSubLabel,
		clearanceStatusSubLabelTitle,
	} from '$lib/compliance/checkrCoachClearance.js';
	import InboxZeroCelebration from '$lib/components/director/os/InboxZeroCelebration.svelte';
	let { engine }: { engine: CoachClearanceEngine } = $props();

	function fmtTimestamp(ts: unknown) {
		if (!ts || typeof ts !== 'object') return '—';
		try {
			const t = ts as Record<string, unknown>;
			const ms = typeof t.toMillis === 'function' ? t.toMillis() :
				typeof t.seconds === 'number' ? t.seconds * 1000 : null;
			if (!ms) return '—';
			return new Intl.DateTimeFormat('en-US', {
				month: 'short', day: 'numeric', year: 'numeric',
				hour: '2-digit', minute: '2-digit',
			}).format(new Date(ms));
		} catch {
			return '—';
		}
	}

	const checkrDashboardUrl = getCheckrDashboardBaseUrl();
</script>

{#if engine.loading}
	<div class="dp-loading" role="status" aria-live="polite">
		<div class="dp-spinner"></div>
		<span>LOADING COMPLIANCE ROSTER…</span>
	</div>
{:else if engine.loadError}
	<div class="dp-error">{engine.loadError}</div>
{:else if engine.filtered.length === 0}
	<InboxZeroCelebration 
		title="COMPLIANCE INBOX ZERO" 
		message="All coach background checks cleared. No pending liabilities." 
	/>
{:else}
	<div class="v-table-wrap tw-overflow-x-auto" role="region" aria-label="Compliance roster">
		<table class="v-table">
			<thead>
				<tr>
					<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]">COACH / ROLE</th>
					<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]">CLEARANCE STATUS</th>
					<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]">LAST SYNCED</th>
					<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]">CHECKR VENDOR STATUS</th>
					<th class="tw-px-4 tw-py-3 tw-bg-slate-900/70 tw-text-left tw-font-semibold tw-text-xs tw-uppercase tw-tracking-wider tw-text-[#E2E8F0]">ACTIONS</th>
				</tr>
			</thead>
			<tbody>
				{#each engine.filtered as coach (coach.email)}
					{@const status = engine.getStatus(coach)}
					{@const rs = engine.getRowState(coach.email)}
					{@const statusSubLabel = getClearanceStatusSubLabel(
						/** @type {import('$lib/types/backgroundCheck.js').ClearanceDoc|undefined} */ (
							coach.clearance
						),
					)}
					{@const invitationUrl = coach.clearance?.invitationUrl as string | undefined}
					{@const checkrCandidateId = coach.clearance?.checkrCandidateId as string | undefined}
					{@const lastVerified = coach.clearance?.lastVerified}
					<tr class="dp-row dp-row--{status}">
						<!-- Coach identity -->
						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0 dp-cell dp-cell--identity">
							<div class="dp-identity__name">
								{coach.displayName ?? coach.email.split('@')[0]}
							</div>
							<div class="dp-identity__email">{coach.email}</div>
							<div class="dp-identity__role">{coach.role ?? 'coach'}</div>
						</td>

						<!-- Clearance status -->
						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0 dp-cell dp-cell--status">
							<div class="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider
								{status === 'cleared' ? 'tw-text-emerald-500' : status === 'flagged' ? 'tw-text-rose-500' : 'tw-text-amber-500'}">
							{#if status === 'cleared'}
								<Icon name="status.verified" />
							{:else if status === 'flagged'}
								<Icon name="status.warning-circle" />
								{:else}
									<span class="tw-inline-block tw-w-2 tw-h-2 tw-rounded-full tw-animate-pulse
										{status === 'cleared' ? 'tw-bg-emerald-500' : status === 'flagged' ? 'tw-bg-rose-500' : 'tw-bg-amber-500'}"></span>
								{/if}
								{status.toUpperCase()}
							</div>
							{#if statusSubLabel}
								<div
									class="tw-text-[10px] tw-text-[#A1A1AA] tw-font-mono tw-mt-0.5"
									title={clearanceStatusSubLabelTitle(statusSubLabel.kind)}
								>
									{#if statusSubLabel.kind === 'legacyRecordId'}
										<span class="tw-text-amber-500 tw-mr-1">legacy</span>
									{/if}
									{statusSubLabel.value}
								</div>
							{/if}
						</td>

						<!-- Last synced -->
						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0 dp-cell dp-cell--synced tw-font-mono">
							<span class="dp-synced-ts">{fmtTimestamp(lastVerified)}</span>
						</td>

						<!-- Checkr actions -->
						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0 dp-cell dp-cell--dashboard">
							{#if engine.needsScreeningOrder(coach)}
								<button
									class="dp-btn dp-btn--order"
									disabled={rs.ordering}
									onclick={() => void engine.orderScreening(coach)}
									aria-label="Order Checkr screening for {coach.email}"
								>
									{#if rs.ordering}
										<span class="dp-btn-spin">↻</span> Ordering…
									{:else}
										<Icon name="status.shield-check" />
										Order screening
									{/if}
								</button>
							{/if}
							{#if status !== 'cleared'}
								<button
									class="dp-btn dp-btn--simulate"
									disabled={rs.simulating}
									onclick={() => void engine.simulateClearance(coach)}
									aria-label="Simulate clearance (QA) for {coach.email}"
								>
									{#if rs.simulating}
										<span class="dp-btn-spin">↻</span> SYNCING…
									{:else}
									<Icon name="game.zap" />
									Simulate clearance (QA)
									{/if}
								</button>
							{/if}
							{#if invitationUrl}
								<a
									href={invitationUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="dp-btn dp-btn--checkr tw-text-[#14b8a6]"
									aria-label="Open Checkr invitation for {coach.email}"
								>
									<Icon name="nav.external" />
									Open Checkr invitation
								</a>
							{/if}
							{#if checkrCandidateId}
								<a
									href={getCheckrCandidateDashboardUrl(checkrCandidateId)}
									target="_blank"
									rel="noopener noreferrer"
									class="dp-btn dp-btn--checkr tw-text-[#14b8a6]"
									aria-label="Open Checkr candidate for {coach.email}"
								>
									<Icon name="nav.external" />
									Open Checkr candidate
								</a>
							{/if}
							<a
								href={checkrDashboardUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="dp-btn dp-btn--checkr tw-text-[#14b8a6]"
								aria-label="Open Checkr dashboard"
							>
							<Icon name="nav.external" />
							Open Checkr dashboard
							</a>
						</td>

						<!-- Actions -->
						<td class="tw-px-4 tw-py-2.5 tw-border-t tw-border-slate-900 tw-text-[#E2E8F0] tw-whitespace-nowrap tw-min-w-0 dp-cell dp-cell--actions">
							{#if rs.error}
								<span class="dp-row-error">{rs.error}</span>
							{/if}
							{#if status === 'cleared'}
								<button
									class="dp-btn dp-btn--revoke"
									disabled={rs.verifying}
									onclick={() => void engine.revokeCoach(coach)}
									aria-label="Revoke clearance for {coach.email}"
								>
								<Icon name="sys.ban" />
								REVOKE
								</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
