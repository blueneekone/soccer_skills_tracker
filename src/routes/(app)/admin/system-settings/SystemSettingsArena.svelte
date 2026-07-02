<script lang="ts">
	import type { SystemSettingsEngine } from './SystemSettingsEngine.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { featureFlagsStore } from '$lib/stores/featureFlags.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import { logSecurityEvent } from '$lib/utils/security.js';

	let { engine }: { engine: SystemSettingsEngine } = $props();

	const integrationSpecs = [
		{
			id: 'espn',
			label: 'ESPN Developer API',
			description: 'Pro / college fixtures, live odds, and roster feeds for the Coach & Recruiter consoles.',
			secretName: 'ESPN_API_KEY',
			statusHint: 'Stored in Google Secret Manager — not editable from the web UI.'
		},
		{
			id: 'sportradar',
			label: 'Sportradar Sports Data',
			description: 'Canonical global sports feed powering Live Scoring and advanced recruit profiling.',
			secretName: 'SPORTRADAR_API_KEY',
			statusHint: 'Stored in Google Secret Manager — not editable from the web UI.'
		},
		{
			id: 'affinity',
			label: 'AffinitySports Webhook',
			description: 'Governing-body eligibility events ingested by the affinityWebhook Cloud Function.',
			secretName: 'AFFINITY_WEBHOOK_HMAC_SECRET',
			statusHint: 'Webhook secret configured via `firebase functions:secrets:set`.'
		},
		{
			id: 'stripe',
			label: 'Stripe Billing',
			description: 'Checkout + webhook for club licensing, recruiter subscriptions, and parent installments.',
			secretName: 'STRIPE_SECRET_KEY',
			statusHint: 'Live key managed via Secret Manager. Webhook health shown below.'
		}
	];

	const upcomingIntegrations = [
		{
			id: 'hudl',
			label: 'HUDL',
			category: 'Video Analysis Sync',
			description: 'Two-way clip exchange so coaches can pull film libraries into the Video Room and push highlight reels back into HUDL.',
			icon: 'content.film',
			accent: '#f97316',
			sprintEta: 'Sprint 3.1'
		},
		{
			id: 'mailchimp',
			label: 'Mailchimp · HubSpot',
			category: 'Marketing CRM',
			description: 'Sync club admins, parents, and verified scouts into marketing journeys with tier-aware segmentation.',
			icon: 'comm.mail' as IconName,
			accent: '#facc15',
			sprintEta: 'Sprint 3.2'
		},
		{
			id: 'checkr',
			label: 'Checkr',
			category: 'Background Vetting',
			description: 'Automated background checks for Coaches, Recruiters, and Facility Managers — drives the Compliance Alerts KPI.',
			icon: 'sys.fingerprint',
			accent: '#22c55e',
			sprintEta: 'Sprint 3.3'
		},
		{
			id: 'stripe-connect',
			label: 'Stripe Connect',
			category: 'Payouts',
			description: 'Marketplace payouts for Recruiter commissions, facility rentals, and tournament disbursements.',
			icon: 'sys.credit-card' as IconName,
			accent: '#6366f1',
			sprintEta: 'Sprint 3.4'
		}
	];

	async function onUpcomingIntegrationClick(spec: typeof upcomingIntegrations[0]) {
		try {
			await logSecurityEvent(
				'INTEGRATION_CONNECT_ATTEMPT',
				spec.id,
				`${spec.label} connector is not yet available (${spec.sprintEta}).`
			);
		} catch {
			/* noop */
		}
	}

	function formatTs(ts: number) {
		if (!ts) return '—';
		try {
			return new Date(ts).toLocaleString();
		} catch {
			return '—';
		}
	}
</script>

{#if engine.activeTab === 'access'}
	<section class="ss-section" aria-labelledby="ss-access-heading">
		<div class="ss-section__label">
			<Icon name={"game.crown" as IconName} />
			<h2 id="ss-access-heading" class="ss-section__heading">System Administrators</h2>
		</div>
		<p class="ss-section__desc">
			Global admins have unrestricted access to all platform data and controls. Grant access
			only to trusted internal accounts.
		</p>

		{#if engine.adminErr}
			<p class="ss-flash ss-flash--err" role="alert">{engine.adminErr}</p>
		{/if}
		{#if engine.adminOk}
			<p class="ss-flash ss-flash--ok" role="status">{engine.adminOk}</p>
		{/if}

		<div class="ss-dt-wrap">
			<table class="ss-dt">
				<thead>
					<tr>
						<th>Admin Email</th>
						<th class="ss-dt__th-right">Action</th>
					</tr>
				</thead>
				<tbody>
					{#each teamsStore.admins as email (email)}
						<tr class="ss-dt__row">
							<td class="ss-dt__td-mono">{email}</td>
							<td class="ss-dt__td-right">
								<button
									type="button"
									class="ss-revoke-btn"
									onclick={() => void engine.removeAdmin(email)}
									aria-label="Revoke admin access for {email}"
								>
									Revoke
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="2" class="ss-dt__td-empty">No super admins loaded.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

{#if engine.activeTab === 'flags'}
	<section class="ss-section" aria-labelledby="ss-flags-heading">
		<div class="ss-section__label ss-section__label--danger">
			<Icon name={"status.warning-octagon" as IconName} />
			<h2 id="ss-flags-heading" class="ss-section__heading">Global Kill Switch</h2>
		</div>
		<p class="ss-section__desc">
			Toggles cascade immediately to every authenticated session. Use with operational
			discipline.
		</p>

		{#if engine.flagErr}
			<p class="ss-flash ss-flash--err" role="alert">{engine.flagErr}</p>
		{/if}
		{#if engine.flagOk}
			<p class="ss-flash ss-flash--ok" role="status">{engine.flagOk}</p>
		{/if}

		{#if !featureFlagsStore.loaded}
			<div class="ss-skel">Loading feature flags…</div>
		{:else}
			<ul class="ss-flag-list">
				<!-- Maintenance Mode -->
				<li class="ss-flag-row ss-flag-row--danger">
					<div class="ss-flag-meta">
						<div class="ss-flag-title-row">
							<strong class="ss-flag-title">{engine.flagLabels.maintenanceMode}</strong>
							{#if featureFlagsStore.flags.maintenanceMode}
								<span class="ss-flag-badge ss-flag-badge--on">ACTIVE</span>
							{:else}
								<span class="ss-flag-badge ss-flag-badge--off">Off</span>
							{/if}
						</div>
						<p class="ss-flag-desc">{engine.flagDescriptions.maintenanceMode}</p>
					</div>
					<label class="ss-switch" aria-label="Toggle maintenance mode">
						<input
							type="checkbox"
							checked={featureFlagsStore.flags.maintenanceMode}
							disabled={engine.flagSaving === 'maintenanceMode'}
							onchange={(e) => void engine.toggleFlag('maintenanceMode', /** @type {HTMLInputElement} */ (e.currentTarget).checked)}
						/>
						<span class="ss-switch__track"></span>
					</label>
				</li>

				{#if featureFlagsStore.flags.maintenanceMode || engine.maintenanceMessageDraft}
					<li class="ss-flag-sub">
						<label class="ss-label" for="ss-maint-msg">Maintenance message</label>
						<textarea
							id="ss-maint-msg"
							class="ss-input ss-textarea"
							bind:value={engine.maintenanceMessageDraft}
							rows={2}
							maxlength={500}
							placeholder="Optional — shown to non-super-admins on the maintenance screen."
						></textarea>
						<div class="ss-form-row ss-form-row--end">
							<button
								type="button"
								class="ss-btn ss-btn--ghost"
								onclick={() => void engine.saveMaintenanceMessage()}
								disabled={engine.flagSaving === 'maintenanceMessage'}
							>
								{engine.flagSaving === 'maintenanceMessage' ? 'Saving…' : 'Save message'}
							</button>
						</div>
					</li>
				{/if}

				{#each ['enableRagAiCoaching', 'enableVideoProcessing', 'enableRecruiterMarketplace', 'enableLiveScoring'] as flagKey}
					<li class="ss-flag-row">
						<div class="ss-flag-meta">
							<div class="ss-flag-title-row">
								<strong class="ss-flag-title">{engine.flagLabels[flagKey as keyof typeof engine.flagLabels]}</strong>
								{#if featureFlagsStore.flags[flagKey as keyof typeof featureFlagsStore.flags]}
									<span class="ss-flag-badge ss-flag-badge--muted-on">On</span>
								{:else}
									<span class="ss-flag-badge ss-flag-badge--off">Off</span>
								{/if}
							</div>
							<p class="ss-flag-desc">{engine.flagDescriptions[flagKey as keyof typeof engine.flagDescriptions]}</p>
						</div>
						<label class="ss-switch" aria-label="Toggle {engine.flagLabels[flagKey as keyof typeof engine.flagLabels]}">
							<input
								type="checkbox"
								checked={Boolean(featureFlagsStore.flags[flagKey as keyof typeof featureFlagsStore.flags])}
								disabled={engine.flagSaving === flagKey}
								onchange={(e) => void engine.toggleFlag(flagKey as keyof typeof engine.flagLabels, /** @type {HTMLInputElement} */ (e.currentTarget).checked)}
							/>
							<span class="ss-switch__track"></span>
						</label>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

{#if engine.activeTab === 'integrations'}
	<section class="ss-section" aria-labelledby="ss-int-heading">
		<div class="ss-section__label">
			<Icon name={"sys.plug-zap" as IconName} />
			<h2 id="ss-int-heading" class="ss-section__heading">External Integrations (API)</h2>
		</div>
		<p class="ss-section__desc">
			Pro league data feeds, webhook health, and third-party credentials. API keys are
			stored in Google Secret Manager — never in Firestore.
		</p>

		<div class="ss-int-grid">
			{#each integrationSpecs as spec (spec.id)}
				<article class="ss-int-card" aria-labelledby="ss-int-{spec.id}">
					<header class="ss-int-card__head">
						<h3 id="ss-int-{spec.id}" class="ss-int-card__title">{spec.label}</h3>
						<span class="ss-int-card__badge">Secret Manager</span>
					</header>
					<p class="ss-int-card__desc">{spec.description}</p>
					<div class="ss-int-card__key">
						<span class="ss-int-card__key-label">Secret</span>
						<code class="ss-int-card__key-code">{spec.secretName}</code>
					</div>
					<p class="ss-int-card__hint">{spec.statusHint}</p>
				</article>
			{/each}
		</div>

		<div class="ss-section__label ss-section__label--pad">
			<Icon name={"game.rocket" as IconName} />
			<h2 class="ss-section__heading">Upcoming Integrations</h2>
			<span class="ss-upcoming__header-chip">Roadmap</span>
		</div>
		<p class="ss-section__desc">
			Platform-level connectors the Director Onboarding flow will turn on once
			the handshake ships. Each hook is deliberately disabled until the
			matching Cloud Function is live — we never render a half-wired OAuth flow.
		</p>

		<div class="ss-upcoming-grid">
			{#each upcomingIntegrations as spec (spec.id)}
				<article class="ss-upcoming-card" aria-labelledby="ss-upcoming-{spec.id}">
					<header class="ss-upcoming-card__head">
					<span
						class="ss-upcoming-card__icon"
						style="background: {spec.accent}1f; color: {spec.accent};"
						aria-hidden="true"
					>
					<Icon name={spec.icon as IconName} />
					</span>
						<div class="ss-upcoming-card__title-wrap">
							<h3 id="ss-upcoming-{spec.id}" class="ss-upcoming-card__title">
								{spec.label}
							</h3>
							<span class="ss-upcoming-card__category">{spec.category}</span>
						</div>
						<span class="ss-upcoming-card__sprint" title="Expected release">
							{spec.sprintEta}
						</span>
					</header>
					<p class="ss-upcoming-card__desc">{spec.description}</p>
					<div class="ss-upcoming-card__foot">
						<span class="ss-upcoming-card__status">
						<Icon name={"sys.lock-simple" as IconName} />
							Not enabled
						</span>
						<button
							type="button"
							class="ss-upcoming-card__btn"
							disabled
							aria-disabled="true"
							onclick={() => void onUpcomingIntegrationClick(spec)}
							title="Disabled — ships in {spec.sprintEta}"
						>
							<Icon name={"sys.plug" as IconName} />
							Connect
						</button>
					</div>
				</article>
			{/each}
		</div>

		<div class="ss-section__label ss-section__label--pad">
			<Icon name={"data.activity" as IconName} />
			<h2 class="ss-section__heading">Webhook Status Log</h2>
		</div>
		<p class="ss-section__desc">
			Most-recent webhook deliveries from active integrations. Populated by Cloud Functions
			writing to <code class="ss-code">config/webhook_status</code>.
		</p>

		<div class="ss-dt-wrap">
			<table class="ss-dt">
				<thead>
					<tr>
						<th>Integration</th>
						<th>Status</th>
						<th>Received</th>
						<th>Summary</th>
					</tr>
				</thead>
				<tbody>
					{#if engine.webhookLoading}
						<tr>
							<td colspan="4" class="ss-dt__td-empty">Loading webhook status…</td>
						</tr>
					{:else if engine.webhookRows.length === 0}
						<tr>
							<td colspan="4" class="ss-dt__td-empty">
								No webhook events recorded yet.
							</td>
						</tr>
					{:else}
						{#each engine.webhookRows as row (row.id)}
							<tr class="ss-dt__row">
								<td class="ss-dt__td-mono">{row.integration}</td>
								<td>
									<span
										class="ss-status ss-status--{row.status}"
										aria-label="Status: {row.status}"
									>
										{row.status.toUpperCase()}
									</span>
								</td>
								<td>{formatTs(row.timestamp)}</td>
								<td>{row.summary || '—'}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</section>
{/if}
