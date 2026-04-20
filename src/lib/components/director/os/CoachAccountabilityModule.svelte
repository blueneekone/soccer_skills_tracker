<script>
	import { functions } from '$lib/firebase.js';
	import { httpsCallable } from 'firebase/functions';

	let { clubId = '' } = $props();

	const getAccountabilityReport = httpsCallable(functions, 'getAccountabilityReport');

	let loading = $state(true);
	let err = $state('');
	/** @type {{ data?: Record<string, unknown> } | null} */
	let lastResult = $state(null);

	const load = async () => {
		if (!clubId) {
			loading = false;
			return;
		}
		loading = true;
		err = '';
		try {
			const res = await getAccountabilityReport({});
			lastResult = res;
		} catch (e) {
			const msg =
				e && typeof e === 'object' && 'message' in e ?
					String(/** @type {{ message?: string }} */ (e).message) :
					String(e);
			err = msg;
			lastResult = null;
		} finally {
			loading = false;
		}
	};

	$effect(() => {
		void load();
	});

	/**
	 * @param {string} email
	 * @param {string} teamName
	 */
	function nudgeCoach(email, teamName) {
		if (!email) return;
		const subject = encodeURIComponent(
			`Practice log reminder — ${teamName}`,
		);
		const body = encodeURIComponent(
			`Hi,\n\n` +
				`This is a quick check-in from the club: team "${teamName}" shows no ` +
				`logged practice activity in the accountability window.\n\n` +
				`Please log team sessions as usual, or reply with any blockers.\n\n` +
				`— Club leadership`,
		);
		window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
	}

	/** @param {string} status */
	function statusLabel(status) {
		if (status === 'active') return 'Active';
		if (status === 'warning') return 'Warning';
		return 'At-Risk';
	}

	/** @param {string} status */
	function dotClass(status) {
		if (status === 'active') return 'acc-dot acc-dot--active';
		if (status === 'warning') return 'acc-dot acc-dot--warning';
		return 'acc-dot acc-dot--at-risk';
	}
</script>

<div class="acc-root tw-h-full tw-flex tw-flex-col tw-gap-4">
	<div>
		<h3
			class="tw-m-0 tw-text-lg tw-font-extrabold tw-tracking-tight"
			style="color: var(--text-primary);"
		>
			Coach accountability
		</h3>
		<p class="tw-m-0 tw-mt-1 tw-text-sm tw-leading-relaxed" style="color: var(--text-secondary);">
			Practice logging signals from athlete-submitted reps. Teams bucketed by days since last log.
		</p>
	</div>

	{#if loading}
		<p class="tw-m-0 tw-text-sm" style="color: var(--text-secondary);">Loading report…</p>
	{:else if err}
		<p class="acc-err tw-m-0 tw-text-sm" role="alert">{err}</p>
		<button type="button" class="dir-os-btn-primary tw-self-start" onclick={() => load()}>Retry</button>
	{:else if lastResult?.data}
		{@const d = lastResult.data}
		{@const summary = d.summary && typeof d.summary === 'object' ? d.summary : {}}
		{@const teams = Array.isArray(d.teams) ? d.teams : []}
		<div class="acc-summary tw-flex tw-flex-wrap tw-gap-3 tw-text-sm">
			<span class="acc-pill"
				><span class={dotClass('active')}></span> Active {summary.active ?? 0}</span
			>
			<span class="acc-pill"
				><span class={dotClass('warning')}></span> Warning {summary.warning ?? 0}</span
			>
			<span class="acc-pill"
				><span class={dotClass('at_risk')}></span> At-risk {summary.atRisk ?? 0}</span
			>
		</div>
		{#if typeof d.generatedAt === 'string'}
			<p class="tw-m-0 tw-text-xs" style="color: var(--text-secondary);">
				Generated {new Date(d.generatedAt).toLocaleString()}
			</p>
		{/if}
		<div class="acc-grid">
			{#each teams as row (row.teamId)}
				{@const st = typeof row.status === 'string' ? row.status : 'at_risk'}
				{@const name = typeof row.teamName === 'string' ? row.teamName : row.teamId}
				{@const email = typeof row.coachEmail === 'string' ? row.coachEmail : ''}
				{@const days =
					typeof row.daysSinceActivity === 'number' ? row.daysSinceActivity : null}
				{@const sessions =
					typeof row.sessionsThisMonth === 'number' ? row.sessionsThisMonth : 0}
				<div class="acc-card">
					<div class="acc-card__top">
						<span class={dotClass(st)} aria-hidden="true"></span>
						<div class="acc-card__titles">
							<span class="acc-card__name">{name}</span>
							<span class="acc-card__sub">{statusLabel(st)}</span>
						</div>
					</div>
					<dl class="acc-dl">
						<div class="acc-dl__row">
							<dt>Days since last log</dt>
							<dd>{days === null ? '—' : days}</dd>
						</div>
						<div class="acc-dl__row">
							<dt>Sessions this month</dt>
							<dd>{sessions}</dd>
						</div>
					</dl>
					{#if st === 'at_risk'}
						<div class="acc-actions">
							{#if email}
								<button
									type="button"
									class="acc-nudge"
									onclick={() => nudgeCoach(email, name)}
								>
									Nudge coach
								</button>
							{:else}
								<button type="button" class="acc-nudge acc-nudge--disabled" disabled title="No coach email on file">
									Nudge coach
								</button>
							{/if}
							<span class="acc-placeholder">Push notification — coming soon</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<button type="button" class="dir-os-btn-primary tw-self-start tw-text-sm" onclick={() => load()}>
			Refresh
		</button>
	{/if}
</div>

<style>
	.acc-err {
		color: var(--danger-red, #dc2626);
		font-weight: 700;
	}

	.acc-summary {
		align-items: center;
	}

	.acc-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--brand-primary, #0f172a) 15%, transparent);
		background: color-mix(in srgb, var(--brand-primary, #0f172a) 5%, transparent);
		font-weight: 700;
		color: var(--text-primary);
	}

	.acc-dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 999px;
		flex-shrink: 0;
	}

	.acc-dot--active {
		background: radial-gradient(circle at 30% 30%, #6ee7b7, #059669);
		box-shadow:
			0 0 0 1px color-mix(in srgb, #059669 45%, transparent),
			0 0 12px color-mix(in srgb, #10b981 55%, transparent);
	}

	.acc-dot--warning {
		background: radial-gradient(circle at 30% 30%, #fde68a, #d97706);
		box-shadow:
			0 0 0 1px color-mix(in srgb, #d97706 40%, transparent),
			0 0 10px color-mix(in srgb, #f59e0b 45%, transparent);
	}

	.acc-dot--at-risk {
		background: radial-gradient(circle at 30% 30%, #fca5a5, #dc2626);
		box-shadow:
			0 0 0 1px color-mix(in srgb, #dc2626 50%, transparent),
			0 0 14px color-mix(in srgb, #ef4444 65%, transparent);
		animation: acc-pulse 1.6s ease-in-out infinite;
	}

	@keyframes acc-pulse {
		0%,
		100% {
			opacity: 1;
			filter: brightness(1);
		}
		50% {
			opacity: 0.88;
			filter: brightness(1.12);
		}
	}

	.acc-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
	}

	@media (min-width: 40rem) {
		.acc-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 64rem) {
		.acc-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.acc-card {
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--brand-primary, #0f172a) 12%, transparent);
		background: color-mix(in srgb, var(--glass-bg, #fff) 88%, transparent);
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.acc-card__top {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.acc-card__titles {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.acc-card__name {
		font-weight: 800;
		font-size: 0.95rem;
		color: var(--text-primary);
		word-break: break-word;
	}

	.acc-card__sub {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.acc-dl {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 0.8rem;
	}

	.acc-dl__row {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}

	.acc-dl dt {
		color: var(--text-secondary);
		font-weight: 600;
	}

	.acc-dl dd {
		margin: 0;
		font-weight: 800;
		color: var(--text-primary);
	}

	.acc-actions {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 4px;
		border-top: 1px dashed color-mix(in srgb, var(--brand-primary, #0f172a) 15%, transparent);
	}

	.acc-nudge {
		font: inherit;
		font-weight: 800;
		font-size: 0.8rem;
		padding: 8px 12px;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--brand-primary, #0f172a) 28%, transparent);
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--brand-primary, #0f172a) 12%, rgba(255, 255, 255, 0.95)),
			color-mix(in srgb, var(--brand-accent, #10b981) 8%, rgba(248, 250, 252, 0.98))
		);
		color: var(--brand-primary, #0f172a);
		cursor: pointer;
	}

	.acc-nudge--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.acc-placeholder {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-secondary);
		font-style: italic;
	}
</style>
