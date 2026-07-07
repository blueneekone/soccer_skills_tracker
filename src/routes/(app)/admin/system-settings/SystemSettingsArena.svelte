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

<div class="tw-flex tw-flex-col tw-gap-[clamp(32px,4vw,48px)]">
	<section class="tw-flex tw-flex-col tw-gap-[clamp(16px,2vw,24px)] tw-pl-6 tw-border-l-[3px] tw-border-l-[#14b8a6]" aria-labelledby="ss-access-heading">
		<div class="tw-flex tw-items-center tw-gap-3 tw-text-[#FAFAFA]">
			<Icon name={"game.crown" as IconName} />
			<h2 id="ss-access-heading" class="tw-font-sans tw-tracking-tight tw-text-xl tw-font-bold">System Administrators</h2>
		</div>
		<p class="tw-text-[#D4D4D8] tw-text-sm">
			Global admins have unrestricted access to all platform data and controls. Grant access only to trusted internal accounts.
		</p>

		{#if engine.adminErr}
			<p class="v-flash v-flash--err" role="alert">{engine.adminErr}</p>
		{/if}
		{#if engine.adminOk}
			<p class="v-flash v-flash--ok" role="status">{engine.adminOk}</p>
		{/if}

		<div class="v-table-wrap">
			<table class="v-table">
				<thead>
					<tr>
						<th class="v-th">Admin Email</th>
						<th class="v-th v-th--right">Action</th>
					</tr>
				</thead>
				<tbody>
					{#each teamsStore.admins as email (email)}
						<tr class="v-tr">
							<td class="v-td tw-font-mono tw-tracking-widest">{email}</td>
							<td class="v-td v-td--right">
								<button
									type="button"
									class="v-toolbar-btn"
									onclick={() => void engine.removeAdmin(email)}
									aria-label="Revoke admin access for {email}"
								>
									Revoke
								</button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="2" class="v-td-empty">No super admins loaded.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<hr class="tw-border-slate-800" />

	<!-- ── Global Platform Security ──────────────────────────────────────── -->
	<section class="tw-flex tw-flex-col tw-gap-[clamp(16px,2vw,24px)] tw-pl-6 tw-border-l-[3px] tw-border-l-amber-500" aria-labelledby="ss-sec-heading">
		<div class="tw-flex tw-items-center tw-gap-3 tw-text-[#FAFAFA]">
			<Icon name={"status.shield-check" as IconName} />
			<h2 id="ss-sec-heading" class="tw-font-sans tw-tracking-tight tw-text-xl tw-font-bold">Global Platform Security</h2>
		</div>
		<p class="tw-text-[#D4D4D8] tw-text-sm">
			Enterprise-wide security controls. Changes take effect immediately across all active sessions.
		</p>

		{#if engine.secErr}
			<p class="v-flash v-flash--err" role="alert">{engine.secErr}</p>
		{/if}
		{#if engine.secOk}
			<p class="v-flash v-flash--ok" role="status">{engine.secOk}</p>
		{/if}

		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-[clamp(16px,2vw,24px)]">
			<!-- MFA Toggle -->
			<div class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-[clamp(12px,1.5vw,20px)] tw-flex tw-flex-col tw-gap-3">
				<span class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">Enforce Global MFA</span>
				<p class="tw-text-xs tw-text-[#D4D4D8]">Require multi-factor authentication for all admin and director accounts.</p>
				<label class="tw-flex tw-items-center tw-gap-3 tw-cursor-pointer">
					<input
						type="checkbox"
						bind:checked={engine.secMfaEnabled}
						class="tw-w-5 tw-h-5 tw-accent-amber-500"
					/>
					<span class="tw-text-sm tw-font-mono tw-text-[#FAFAFA]">{engine.secMfaEnabled ? 'ENABLED' : 'DISABLED'}</span>
				</label>
			</div>

			<!-- PII TTL Schedule -->
			<div class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-[clamp(12px,1.5vw,20px)] tw-flex tw-flex-col tw-gap-3">
				<span class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">PII Purge (TTL) Schedule</span>
				<p class="tw-text-xs tw-text-[#D4D4D8]">Automated COPPA-compliant PII overwrite cycle for inactive records.</p>
				<select
					bind:value={engine.secPiiTtl}
					class="tw-bg-[#0B0F19] tw-border tw-border-slate-800 tw-text-[#FAFAFA] tw-text-sm tw-font-mono tw-px-3 tw-py-2"
				>
					<option value="24h">24 hours</option>
					<option value="48h">48 hours</option>
					<option value="7d">7 days</option>
					<option value="30d">30 days</option>
				</select>
			</div>

			<!-- Session Timeout -->
			<div class="tw-bg-[#0f172a] tw-border tw-border-slate-800 tw-p-[clamp(12px,1.5vw,20px)] tw-flex tw-flex-col tw-gap-3">
				<span class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-widest tw-text-[#A1A1AA]">Default Session Timeout</span>
				<p class="tw-text-xs tw-text-[#D4D4D8]">Maximum idle time before sessions are force-expired platform-wide.</p>
				<select
					bind:value={engine.secSessionTimeout}
					class="tw-bg-[#0B0F19] tw-border tw-border-slate-800 tw-text-[#FAFAFA] tw-text-sm tw-font-mono tw-px-3 tw-py-2"
				>
					<option value="30m">30 minutes</option>
					<option value="1h">1 hour</option>
					<option value="4h">4 hours</option>
					<option value="8h">8 hours</option>
				</select>
			</div>
		</div>

		<div class="tw-flex tw-justify-end">
			<button
				type="button"
				class="v-toolbar-btn tw-border-amber-500 tw-text-amber-500 hover:tw-bg-amber-500/10"
				onclick={() => void engine.saveSecurityConfig()}
				disabled={engine.secSaving}
			>
				{engine.secSaving ? 'Saving…' : 'Save Security Configuration'}
			</button>
		</div>
	</section>

	<hr class="tw-border-slate-800" />

	<section class="tw-flex tw-flex-col tw-gap-[clamp(16px,2vw,24px)] tw-pl-6 tw-border-l-[3px] tw-border-l-[#14b8a6]" aria-labelledby="ss-int-heading">
		<div class="tw-flex tw-items-center tw-gap-3 tw-text-[#FAFAFA]">
			<Icon name={"sys.plug-zap" as IconName} />
			<h2 id="ss-int-heading" class="tw-font-sans tw-tracking-tight tw-text-xl tw-font-bold">Sport Module Provisioning & Integrations</h2>
		</div>
		<p class="tw-text-[#D4D4D8] tw-text-sm">
			Pro league data feeds, webhook health, and third-party credentials. API keys are stored in Google Secret Manager — never in Firestore.
		</p>

		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-[clamp(16px,2vw,24px)]">
			{#each integrationSpecs as spec (spec.id)}
				<article class="tw-flex tw-flex-col tw-gap-2 tw-border tw-border-slate-800 tw-bg-[#0f172a] tw-p-[clamp(16px,2vw,24px)]" aria-labelledby="ss-int-{spec.id}">
					<header class="tw-flex tw-items-center tw-justify-between">
						<h3 id="ss-int-{spec.id}" class="tw-font-sans tw-tracking-tight tw-font-bold tw-text-[#FAFAFA]">{spec.label}</h3>
						<span class="tw-text-[10px] tw-uppercase tw-font-bold tw-tracking-widest tw-bg-slate-800 tw-text-[#D4D4D8] tw-px-2 tw-py-1">Secret Manager</span>
					</header>
					<p class="tw-text-[#D4D4D8] tw-text-sm">{spec.description}</p>
					<div class="tw-flex tw-items-center tw-gap-2 tw-mt-auto tw-pt-4">
						<span class="tw-text-xs tw-text-[#A1A1AA] tw-uppercase tw-font-bold tw-tracking-widest">Secret</span>
						<code class="tw-font-mono tw-tracking-widest tw-text-xs tw-text-[#14b8a6] tw-bg-slate-900 tw-px-2 tw-py-1">{spec.secretName}</code>
					</div>
					<p class="tw-text-xs tw-text-[#A1A1AA] tw-mt-2">{spec.statusHint}</p>
				</article>
			{/each}
		</div>

		<div class="tw-flex tw-items-center tw-gap-3 tw-text-[#FAFAFA] tw-mt-8">
			<Icon name={"game.rocket" as IconName} />
			<h2 class="tw-font-sans tw-tracking-tight tw-text-xl tw-font-bold">Upcoming Integrations</h2>
			<span class="tw-text-[10px] tw-uppercase tw-font-bold tw-tracking-widest tw-bg-[#fbbf24] tw-text-[#0B0F19] tw-px-2 tw-py-1">Roadmap</span>
		</div>
		<p class="tw-text-[#D4D4D8] tw-text-sm">
			Platform-level connectors the Director Onboarding flow will turn on once the handshake ships.
		</p>

		<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-[clamp(16px,2vw,24px)]">
			{#each upcomingIntegrations as spec (spec.id)}
				<article class="tw-flex tw-flex-col tw-gap-2 tw-border tw-border-slate-800 tw-bg-[#0f172a] tw-p-[clamp(16px,2vw,24px)]" aria-labelledby="ss-upcoming-{spec.id}">
					<header class="tw-flex tw-items-start tw-gap-4">
						<span class="tw-flex tw-items-center tw-justify-center tw-w-10 tw-h-10" style="background: {spec.accent}1f; color: {spec.accent};" aria-hidden="true">
							<Icon name={spec.icon as IconName} />
						</span>
						<div class="tw-flex tw-flex-col tw-gap-1 tw-flex-1">
							<h3 id="ss-upcoming-{spec.id}" class="tw-font-sans tw-tracking-tight tw-font-bold tw-text-[#FAFAFA]">
								{spec.label}
							</h3>
							<span class="tw-text-xs tw-text-[#A1A1AA] tw-uppercase tw-font-bold tw-tracking-widest">{spec.category}</span>
						</div>
						<span class="tw-text-xs tw-text-[#A1A1AA] tw-font-mono tw-tracking-widest" title="Expected release">
							{spec.sprintEta}
						</span>
					</header>
					<p class="tw-text-[#D4D4D8] tw-text-sm tw-mt-2">{spec.description}</p>
					<div class="tw-flex tw-items-center tw-justify-between tw-mt-auto tw-pt-4">
						<span class="tw-flex tw-items-center tw-gap-2 tw-text-xs tw-text-[#A1A1AA]">
							<Icon name={"sys.lock-simple" as IconName} size={14} />
							Not enabled
						</span>
						<button
							type="button"
							class="v-toolbar-btn"
							disabled
							aria-disabled="true"
							onclick={() => void onUpcomingIntegrationClick(spec)}
							title="Disabled — ships in {spec.sprintEta}"
						>
							<Icon name={"sys.plug" as IconName} size={16} />
							Connect
						</button>
					</div>
				</article>
			{/each}
		</div>
	</section>

	<hr class="tw-border-slate-800" />

	<section class="tw-flex tw-flex-col tw-gap-[clamp(16px,2vw,24px)] tw-pl-6 tw-border-l-[3px] tw-border-l-[#14b8a6]" aria-labelledby="ss-flags-heading">
		<div class="tw-flex tw-items-center tw-gap-3 tw-text-[#f43f5e]">
			<Icon name={"status.warning-octagon" as IconName} />
			<h2 id="ss-flags-heading" class="tw-font-sans tw-tracking-tight tw-text-xl tw-font-bold">Global Kill Switch</h2>
		</div>
		<p class="tw-text-[#D4D4D8] tw-text-sm">
			Toggles cascade immediately to every authenticated session. Use with operational discipline.
		</p>

		{#if engine.flagErr}
			<p class="v-flash v-flash--err" role="alert">{engine.flagErr}</p>
		{/if}
		{#if engine.flagOk}
			<p class="v-flash v-flash--ok" role="status">{engine.flagOk}</p>
		{/if}

		{#if !featureFlagsStore.loaded}
			<div class="tw-text-[#A1A1AA] tw-font-mono tw-tracking-widest">Loading feature flags…</div>
		{:else}
			<div class="v-table-wrap">
				<table class="v-table">
					<thead>
						<tr>
							<th class="v-th">Feature Flag</th>
							<th class="v-th">Description</th>
							<th class="v-th">Status</th>
							<th class="v-th v-th--right">Toggle</th>
						</tr>
					</thead>
					<tbody>
						<tr class="v-tr">
							<td class="v-td tw-font-sans tw-font-bold">{engine.flagLabels.maintenanceMode}</td>
							<td class="v-td tw-text-sm">{engine.flagDescriptions.maintenanceMode}</td>
							<td class="v-td">
								{#if featureFlagsStore.flags.maintenanceMode}
									<span class="tw-text-[10px] tw-uppercase tw-font-bold tw-tracking-widest tw-bg-[#f43f5e] tw-text-[#FAFAFA] tw-px-2 tw-py-1">ACTIVE</span>
								{:else}
									<span class="tw-text-[10px] tw-uppercase tw-font-bold tw-tracking-widest tw-bg-slate-800 tw-text-[#A1A1AA] tw-px-2 tw-py-1">OFF</span>
								{/if}
							</td>
							<td class="v-td v-td--right">
								<button
									type="button"
									class="v-toolbar-btn"
									disabled={engine.flagSaving === 'maintenanceMode'}
									onclick={() => void engine.toggleFlag('maintenanceMode', !featureFlagsStore.flags.maintenanceMode)}
								>
									Toggle
								</button>
							</td>
						</tr>
						
						{#each ['enableRagAiCoaching', 'enableVideoProcessing', 'enableRecruiterMarketplace', 'enableLiveScoring'] as flagKey}
							<tr class="v-tr">
								<td class="v-td tw-font-sans tw-font-bold">{engine.flagLabels[flagKey as keyof typeof engine.flagLabels]}</td>
								<td class="v-td tw-text-sm">{engine.flagDescriptions[flagKey as keyof typeof engine.flagDescriptions]}</td>
								<td class="v-td">
									{#if featureFlagsStore.flags[flagKey as keyof typeof featureFlagsStore.flags]}
										<span class="tw-text-[10px] tw-uppercase tw-font-bold tw-tracking-widest tw-bg-[#10b981] tw-text-[#FAFAFA] tw-px-2 tw-py-1">ON</span>
									{:else}
										<span class="tw-text-[10px] tw-uppercase tw-font-bold tw-tracking-widest tw-bg-slate-800 tw-text-[#A1A1AA] tw-px-2 tw-py-1">OFF</span>
									{/if}
								</td>
								<td class="v-td v-td--right">
									<button
										type="button"
										class="v-toolbar-btn"
										disabled={engine.flagSaving === flagKey}
										onclick={() => void engine.toggleFlag(flagKey as keyof typeof engine.flagLabels, !featureFlagsStore.flags[flagKey as keyof typeof featureFlagsStore.flags])}
									>
										Toggle
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
