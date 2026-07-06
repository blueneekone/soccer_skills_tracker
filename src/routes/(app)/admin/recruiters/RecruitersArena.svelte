<script lang="ts">
	import type { RecruitersEngine } from './RecruitersEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	let { engine }: { engine: RecruitersEngine } = $props();

	function formatRelative(ts: number) {
		if (!ts || !Number.isFinite(ts)) return '—';
		const diff = Date.now() - ts;
		if (diff < 0) return 'Just now';
		const MIN = 60_000;
		const HR = 60 * MIN;
		const DAY = 24 * HR;
		if (diff < MIN) return 'Just now';
		if (diff < HR) return `${Math.floor(diff / MIN)}m ago`;
		if (diff < DAY) return `${Math.floor(diff / HR)}h ago`;
		if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
		try {
			return new Date(ts).toLocaleDateString();
		} catch {
			return '—';
		}
	}

	function initials(name: string) {
		const s = (name || '').trim();
		if (!s) return '•';
		const parts = s.split(/\s+/).filter(Boolean);
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
</script>

<div class="v-table-wrap" role="region" aria-label="Recruiters table" tabindex="-1">
	<table class="v-table">
		<thead>
			<tr>
				<th class="v-th v-th--avatar" aria-label="Avatar"></th>
				<th class="v-th">Agency / University</th>
				<th class="v-th">Scout</th>
				<th class="v-th">Subscription</th>
				<th class="v-th">Verification</th>
				<th class="v-th">Vetting</th>
				<th class="v-th">Last Active</th>
				<th class="v-th v-th--right">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#if engine.loading}
				<tr>
					<td colspan="8" class="v-td-empty">Loading recruiters…</td>
				</tr>
			{:else if engine.filteredRows.length === 0}
				<tr>
					<td colspan="8" class="v-td-empty">
						{engine.searchInput || engine.statusFilter
							? 'No recruiters match the current filter.'
							: 'No recruiter applications yet.'}
					</td>
				</tr>
			{:else}
				{#each engine.filteredRows as row (row.id)}
					<tr class="v-tr">
						<td class="v-td v-td--avatar">
							<span class="ar-avatar" aria-hidden="true">
								{initials(row.agency || row.scoutName || row.email)}
							</span>
						</td>
						<td class="v-td">
							<div class="ar-agency">
								<span class="ar-agency__primary">
									{row.agency || '—'}
								</span>
								{#if row.affiliationType}
									<span class="ar-agency__type">{row.affiliationType}</span>
								{/if}
								{#if row.region}
									<span class="ar-agency__meta">
									<Icon name={"sys.map-pin" as IconName} />
										{row.region}
									</span>
								{/if}
							</div>
						</td>
						<td class="v-td">
							<div class="ar-scout">
								<span class="ar-scout__name">{row.scoutName || '—'}</span>
								<span class="ar-scout__email">{row.email}</span>
							</div>
						</td>
						<td class="v-td">
							<span class="ar-sub-pill ar-sub-pill--{row.subscriptionStatus}">
								{row.subscriptionStatus.replace('_', ' ')}
							</span>
							{#if row.subscriptionTier}
								<span class="ar-sub-tier">{row.subscriptionTier}</span>
							{/if}
						</td>
						<td class="v-td">
						<span
							class="ar-verify-pill ar-verify-pill--{row.verificationStatus}"
						>
							{#if row.verificationStatus === 'verified'}
								<Icon name={"status.seal-check" as IconName} />
							{:else}
								{#if row.verificationStatus === 'rejected'}
								<Icon name={"sys.ban" as IconName} />
							{:else}
								<Icon name={"sys.hourglass" as IconName} />
							{/if}
							{/if}
							{row.verificationStatus}
						</span>
						</td>
						<!-- Strike 2 — Checkr Vetting Status column. -->
						<td class="v-td">
						<span class="ar-vet-pill ar-vet-pill--{row.vettingStatus}">
							{#if row.vettingStatus === 'cleared'}
								<Icon name={"status.shield-check" as IconName} />
							{:else if row.vettingStatus === 'processing'}
								<Icon name={"status.loading" as IconName} class="ar-vet-pill__spin" />
							{:else}
								{#if row.vettingStatus === 'flagged'}
								<Icon name={"status.warning-octagon" as IconName} />
							{:else}
								<Icon name={"sys.hourglass" as IconName} />
							{/if}
							{/if}
							{row.vettingStatus}
						</span>
						</td>
						<td class="v-td">
							<span class="ar-muted" title={row.createdAt ? `created ${new Date(row.createdAt).toISOString()}` : ''}>
								{formatRelative(row.lastActiveAt)}
							</span>
						</td>
						<td class="v-td v-td--right">
							{#if engine.rejectingFor === row.id}
								<div class="ar-reject-inline">
									<input
										type="text"
										bind:value={engine.rejectReason}
										placeholder="Reason for rejection (required)"
										maxlength={500}
										aria-label="Rejection reason"
									/>
									<button
										type="button"
										class="ar-btn ar-btn--danger"
										onclick={() => engine.confirmReject(row)}
										disabled={engine.busyFor === row.id}
									>
										{engine.busyFor === row.id ? 'Rejecting…' : 'Confirm reject'}
									</button>
									<button
										type="button"
										class="ar-btn ar-btn--ghost"
										onclick={() => engine.cancelReject()}
										disabled={engine.busyFor === row.id}
									>
										Cancel
									</button>
								</div>
							{:else}
								<div class="ar-actions">
									{#if row.verificationStatus !== 'verified'}
										<button
											type="button"
											class="ar-btn ar-btn--success"
											onclick={() => engine.approve(row)}
											disabled={engine.busyFor === row.id}
										>
									<Icon name={"status.verified" as IconName} />
										Approve
										</button>
									{/if}
									{#if row.verificationStatus !== 'rejected'}
										<button
											type="button"
											class="ar-btn ar-btn--danger-ghost"
											onclick={() => engine.openReject(row)}
											disabled={engine.busyFor === row.id}
										>
									<Icon name={"sys.close" as IconName} />
										Reject
										</button>
									{/if}
									<div class="ar-menu-wrap">
										<button
											type="button"
											class="ar-btn ar-btn--ghost ar-menu-trigger"
											onclick={() => engine.toggleMenu(row.id)}
											aria-haspopup="menu"
											aria-expanded={engine.openMenuFor === row.id}
											aria-label="More actions for {row.email}"
											disabled={engine.busyFor === row.id}
										>
											<Icon name={"nav.more-v" as IconName} />
										</button>
										{#if engine.openMenuFor === row.id}
											<div
												class="ar-menu"
												role="menu"
												tabindex="-1"
												onclick={(e) => e.stopPropagation()}
												onkeydown={(e) => { if (e.key === 'Escape') engine.closeMenu(); }}
											>
												<button
													type="button"
													role="menuitem"
													class="ar-menu__item"
													onclick={() => engine.runBackgroundCheck(row)}
												>
													<Icon name={"status.shield-check" as IconName} />
													<span class="ar-menu__item-body">
														<span class="ar-menu__item-label">Run Background Check</span>
														<span class="ar-menu__item-hint">Checkr API — Sprint 2.9</span>
													</span>
												</button>
												{#if row.verificationStatus !== 'pending'}
													<button
														type="button"
														role="menuitem"
														class="ar-menu__item"
														onclick={() => { engine.closeMenu(); engine.resetPending(row); }}
													>
														<Icon name={"nav.rotate-ccw" as IconName} />
														<span class="ar-menu__item-body">
															<span class="ar-menu__item-label">Reset to Pending</span>
															<span class="ar-menu__item-hint">Return to queue</span>
														</span>
													</button>
												{/if}
												<a
													href="mailto:{row.email}"
													role="menuitem"
													class="ar-menu__item"
													onclick={() => engine.closeMenu()}
												>
													<Icon name={"comm.send" as IconName} />
													<span class="ar-menu__item-body">
														<span class="ar-menu__item-label">Email Scout</span>
														<span class="ar-menu__item-hint">{row.email}</span>
													</span>
												</a>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

{#if engine.toasts.length > 0}
	<div class="ar-toast-stack" role="region" aria-live="polite" aria-label="Notifications">
		{#each engine.toasts as t (t.id)}
			<div class="ar-toast ar-toast--{t.tone}" role="status">
			<Icon
				name={t.tone === 'ok'
					? ("status.verified" as IconName)
					: t.tone === 'warn'
						? ("status.warning" as IconName)
						: ("status.info" as IconName)}
			/>
			<span>{t.text}</span>
		</div>
		{/each}
	</div>
{/if}
