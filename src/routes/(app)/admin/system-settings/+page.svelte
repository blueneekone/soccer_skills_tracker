<script>
	import { db } from '$lib/firebase.js';
	import {
		doc,
		getDoc,
		onSnapshot,
		serverTimestamp,
		setDoc
	} from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { featureFlagsStore } from '$lib/stores/featureFlags.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import '$lib/styles/enterprise-console.css';

	/**
	 * Sprint 2.7 — System Settings (Enterprise 3-tab).
	 *   1. Access Control      — Global Admin grant/revoke.
	 *   2. Feature Flags       — Global kill switch + feature toggles.
	 *   3. Integrations        — API keys + webhook status (Pro League data).
	 */

	/** @type {'access' | 'flags' | 'integrations'} */
	let activeTab = $state('access');

	// ── TAB 1: Access Control ────────────────────────────────────────────────
	let newAdminEmail = $state('');
	let adminSaving = $state(false);
	let adminErr = $state('');
	let adminOk = $state('');

	const addAdmin = async () => {
		adminErr = '';
		adminOk = '';
		const email = newAdminEmail.trim().toLowerCase();
		if (!email) {
			adminErr = 'Enter an email address.';
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			adminErr = 'Enter a valid email address.';
			return;
		}
		adminSaving = true;
		try {
			await setDoc(doc(db, 'config', 'admins'), {
				list: Array.from(new Set([...teamsStore.admins, email]))
			});
			await setDoc(doc(db, 'users', email), { role: 'global_admin' }, { merge: true });
			await logSecurityEvent('GRANT_GLOBAL_ADMIN', email, 'Added to global config');
			adminOk = `${email} granted Global Admin access.`;
			newAdminEmail = '';
			await teamsStore.load('super_admin', {
				scope: 'admin_full',
				routePath: '/admin/system-settings'
			});
		} catch (e) {
			adminErr = e instanceof Error ? e.message : 'Operation failed.';
		} finally {
			adminSaving = false;
		}
	};

	/** @param {string} email */
	const removeAdmin = async (email) => {
		if (!confirm(`Revoke super admin access for ${email}?`)) return;
		adminErr = '';
		adminOk = '';
		try {
			const newList = teamsStore.admins.filter((e) => e !== email);
			await setDoc(doc(db, 'config', 'admins'), { list: newList });
			await logSecurityEvent('REVOKE_GLOBAL_ADMIN', email, 'Removed from global config');
			adminOk = `${email} removed from Global Admins.`;
			await teamsStore.load('super_admin', {
				scope: 'admin_full',
				routePath: '/admin/system-settings'
			});
		} catch (e) {
			adminErr = e instanceof Error ? e.message : 'Could not revoke access.';
		}
	};

	// ── TAB 2: Feature Flags ──────────────────────────────────────────────────
	let flagSaving = $state('');
	let flagErr = $state('');
	let flagOk = $state('');
	let maintenanceMessageDraft = $state('');

	$effect(() => {
		if (!featureFlagsStore.loaded) return;
		maintenanceMessageDraft = featureFlagsStore.maintenanceMessage;
	});

	const flagLabels = {
		maintenanceMode: 'Maintenance Mode (Global Kill Switch)',
		enableRagAiCoaching: 'Enable RAG AI Coaching',
		enableVideoProcessing: 'Enable Video Processing',
		enableRecruiterMarketplace: 'Enable Recruiter Marketplace',
		enableLiveScoring: 'Enable Live Scoring'
	};

	const flagDescriptions = {
		maintenanceMode:
			'When enabled, every non-super-admin session is blocked and replaced with a full-screen maintenance UI. Use for incident response or disruptive migrations.',
		enableRagAiCoaching:
			'Tactical & skills coaching surfaces that call the Gemini API. Disabling freezes AI responses platform-wide.',
		enableVideoProcessing:
			'Cloud-function-backed trial video verification. Disabling halts new uploads; existing clips remain viewable.',
		enableRecruiterMarketplace:
			'Public/private recruiter search over verified athlete profiles. Disabling hides the Recruiter OS from scouts.',
		enableLiveScoring:
			'Match-day scoring, roster attendance, and real-time broadcast channels.'
	};

	/**
	 * @param {keyof typeof flagLabels} key
	 * @param {boolean} nextValue
	 */
	const toggleFlag = async (key, nextValue) => {
		flagErr = '';
		flagOk = '';
		flagSaving = key;
		try {
			// Confirm maintenance mode — this is a platform-wide kill switch.
			if (key === 'maintenanceMode' && nextValue === true) {
				const ok = confirm(
					'Enable Maintenance Mode?\n\nEvery non-super-admin session will be locked out of the platform until you disable this flag.'
				);
				if (!ok) {
					flagSaving = '';
					return;
				}
			}

			const payload = {
				[key]: nextValue,
				updatedAt: serverTimestamp(),
				updatedBy: authStore.user?.email || 'super_admin'
			};

			await setDoc(doc(db, 'config', 'feature_flags'), payload, { merge: true });
			await logSecurityEvent(
				'FEATURE_FLAG_UPDATE',
				key,
				`${key}=${String(nextValue)}`
			);
			flagOk = `${flagLabels[key]} is now ${nextValue ? 'ON' : 'OFF'}.`;
		} catch (e) {
			flagErr = e instanceof Error ? e.message : 'Could not update feature flag.';
		} finally {
			flagSaving = '';
		}
	};

	const saveMaintenanceMessage = async () => {
		flagErr = '';
		flagOk = '';
		flagSaving = 'maintenanceMessage';
		try {
			await setDoc(
				doc(db, 'config', 'feature_flags'),
				{
					maintenanceMessage: maintenanceMessageDraft.slice(0, 500),
					updatedAt: serverTimestamp(),
					updatedBy: authStore.user?.email || 'super_admin'
				},
				{ merge: true }
			);
			await logSecurityEvent(
				'FEATURE_FLAG_UPDATE',
				'maintenanceMessage',
				maintenanceMessageDraft.slice(0, 200)
			);
			flagOk = 'Maintenance message saved.';
		} catch (e) {
			flagErr = e instanceof Error ? e.message : 'Could not save maintenance message.';
		} finally {
			flagSaving = '';
		}
	};

	// ── TAB 3: Integrations ───────────────────────────────────────────────────
	/**
	 * @typedef {{
	 *   id: string,
	 *   label: string,
	 *   description: string,
	 *   secretName: string,
	 *   statusHint: string,
	 * }} IntegrationSpec
	 */

	/** @type {IntegrationSpec[]} */
	const integrationSpecs = [
		{
			id: 'espn',
			label: 'ESPN Developer API',
			description:
				'Pro / college fixtures, live odds, and roster feeds for the Coach & Recruiter consoles.',
			secretName: 'ESPN_API_KEY',
			statusHint: 'Stored in Google Secret Manager — not editable from the web UI.'
		},
		{
			id: 'sportradar',
			label: 'Sportradar Sports Data',
			description:
				'Canonical global sports feed powering Live Scoring and advanced recruit profiling.',
			secretName: 'SPORTRADAR_API_KEY',
			statusHint: 'Stored in Google Secret Manager — not editable from the web UI.'
		},
		{
			id: 'affinity',
			label: 'AffinitySports Webhook',
			description:
				'Governing-body eligibility events ingested by the affinityWebhook Cloud Function.',
			secretName: 'AFFINITY_WEBHOOK_HMAC_SECRET',
			statusHint: 'Webhook secret configured via `firebase functions:secrets:set`.'
		},
		{
			id: 'stripe',
			label: 'Stripe Billing',
			description:
				'Checkout + webhook for club licensing, recruiter subscriptions, and parent installments.',
			secretName: 'STRIPE_SECRET_KEY',
			statusHint: 'Live key managed via Secret Manager. Webhook health shown below.'
		}
	];

	/**
	 * @typedef {{
	 *   id: string,
	 *   integration: string,
	 *   status: 'ok' | 'warn' | 'fail',
	 *   timestamp: number,
	 *   summary: string,
	 * }} WebhookRow
	 */

	/** @type {WebhookRow[]} */
	let webhookRows = $state([]);
	let webhookLoading = $state(false);
	/** @type {(() => void) | null} */
	let webhookUnsub = null;

	$effect(() => {
		if (authStore.isLoading || !authStore.isAuthenticated) return;
		if (activeTab !== 'integrations') return;

		let cancelled = false;
		webhookLoading = true;

		// Placeholder stream — in production, this surfaces affinity_webhook_events
		// and stripeWebhook event mirrors. Until the Cloud Function writes a
		// condensed status doc, render an empty panel with guidance.
		(async () => {
			try {
				const snap = await getDoc(doc(db, 'config', 'webhook_status'));
				if (cancelled) return;
				if (snap.exists()) {
					const raw = snap.data();
					/** @type {WebhookRow[]} */
					const rows = Array.isArray(raw?.rows)
						? raw.rows.map((r, i) => ({
								id: typeof r?.id === 'string' ? r.id : `row-${i}`,
								integration: typeof r?.integration === 'string' ? r.integration : 'unknown',
								status:
									r?.status === 'ok' || r?.status === 'warn' || r?.status === 'fail'
										? r.status
										: 'warn',
								timestamp: Number(r?.timestamp) || 0,
								summary: typeof r?.summary === 'string' ? r.summary : ''
							}))
						: [];
					webhookRows = rows;
				} else {
					webhookRows = [];
				}
			} catch (e) {
				console.warn('[system-settings] webhook status unavailable', e);
				webhookRows = [];
			} finally {
				if (!cancelled) webhookLoading = false;
			}
		})();

		return () => {
			cancelled = true;
			if (webhookUnsub) {
				try {
					webhookUnsub();
				} catch {
					/* noop */
				}
				webhookUnsub = null;
			}
		};
	});

	/** @param {number} ts */
	function formatTs(ts) {
		if (!ts) return '—';
		try {
			return new Date(ts).toLocaleString();
		} catch {
			return '—';
		}
	}
</script>

<div class="ss-page">
	<!-- Page heading -->
	<div class="ss-page__head">
		<h1 class="ss-page__title">System Settings</h1>
		<p class="ss-page__sub">Platform-level configuration. Changes here affect all tenants.</p>
	</div>

	<!-- Tabs -->
	<div class="ss-tabs" role="tablist" aria-label="System settings sections">
		<button
			type="button"
			class="ss-tab"
			class:ss-tab--active={activeTab === 'access'}
			role="tab"
			aria-selected={activeTab === 'access'}
			onclick={() => (activeTab = 'access')}
		>
			<i class="ph ph-shield-star" aria-hidden="true"></i>
			<span>Access Control</span>
		</button>
		<button
			type="button"
			class="ss-tab"
			class:ss-tab--active={activeTab === 'flags'}
			role="tab"
			aria-selected={activeTab === 'flags'}
			onclick={() => (activeTab = 'flags')}
		>
			<i class="ph ph-toggle-right" aria-hidden="true"></i>
			<span>Feature Flags</span>
		</button>
		<button
			type="button"
			class="ss-tab"
			class:ss-tab--active={activeTab === 'integrations'}
			role="tab"
			aria-selected={activeTab === 'integrations'}
			onclick={() => (activeTab = 'integrations')}
		>
			<i class="ph ph-plugs-connected" aria-hidden="true"></i>
			<span>External Integrations</span>
		</button>
	</div>

	<!-- ══════════════════════════════════════════════════════════════════════
	     TAB 1: Access Control
	     ══════════════════════════════════════════════════════════════════════ -->
	{#if activeTab === 'access'}
		<section class="ss-section" aria-labelledby="ss-access-heading">
			<div class="ss-section__label">
				<i class="ph ph-crown" aria-hidden="true"></i>
				<h2 id="ss-access-heading" class="ss-section__heading">System Administrators</h2>
			</div>
			<p class="ss-section__desc">
				Global admins have unrestricted access to all platform data and controls. Grant access
				only to trusted internal accounts.
			</p>

			{#if adminErr}
				<p class="ss-flash ss-flash--err" role="alert">{adminErr}</p>
			{/if}
			{#if adminOk}
				<p class="ss-flash ss-flash--ok" role="status">{adminOk}</p>
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
										onclick={() => removeAdmin(email)}
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

			<div class="ss-inline-form">
				<label class="ss-label" for="ss-grant-email">Grant Global Admin Access</label>
				<div class="ss-form-row">
					<input
						id="ss-grant-email"
						type="email"
						bind:value={newAdminEmail}
						placeholder="admin@organization.com"
						disabled={adminSaving}
						class="ss-input"
					/>
					<button
						type="button"
						class="ss-btn ss-btn--primary"
						onclick={addAdmin}
						disabled={adminSaving}
					>
						{adminSaving ? 'Saving…' : 'Grant Access'}
					</button>
				</div>
			</div>
		</section>
	{/if}

	<!-- ══════════════════════════════════════════════════════════════════════
	     TAB 2: Feature Flags
	     ══════════════════════════════════════════════════════════════════════ -->
	{#if activeTab === 'flags'}
		<section class="ss-section" aria-labelledby="ss-flags-heading">
			<div class="ss-section__label ss-section__label--danger">
				<i class="ph ph-warning-octagon" aria-hidden="true"></i>
				<h2 id="ss-flags-heading" class="ss-section__heading">Global Kill Switch</h2>
			</div>
			<p class="ss-section__desc">
				Toggles cascade immediately to every authenticated session. Use with operational
				discipline.
			</p>

			{#if flagErr}
				<p class="ss-flash ss-flash--err" role="alert">{flagErr}</p>
			{/if}
			{#if flagOk}
				<p class="ss-flash ss-flash--ok" role="status">{flagOk}</p>
			{/if}

			{#if !featureFlagsStore.loaded}
				<div class="ss-skel">Loading feature flags…</div>
			{:else}
				<ul class="ss-flag-list">
					<!-- Maintenance Mode gets a distinct "danger" row. -->
					<li class="ss-flag-row ss-flag-row--danger">
						<div class="ss-flag-meta">
							<div class="ss-flag-title-row">
								<strong class="ss-flag-title">{flagLabels.maintenanceMode}</strong>
								{#if featureFlagsStore.flags.maintenanceMode}
									<span class="ss-flag-badge ss-flag-badge--on">ACTIVE</span>
								{:else}
									<span class="ss-flag-badge ss-flag-badge--off">Off</span>
								{/if}
							</div>
							<p class="ss-flag-desc">{flagDescriptions.maintenanceMode}</p>
						</div>
						<label class="ss-switch" aria-label="Toggle maintenance mode">
							<input
								type="checkbox"
								checked={featureFlagsStore.flags.maintenanceMode}
								disabled={flagSaving === 'maintenanceMode'}
								onchange={(e) =>
									toggleFlag('maintenanceMode', /** @type {HTMLInputElement} */ (e.currentTarget).checked)}
							/>
							<span class="ss-switch__track"></span>
						</label>
					</li>

					{#if featureFlagsStore.flags.maintenanceMode || maintenanceMessageDraft}
						<li class="ss-flag-sub">
							<label class="ss-label" for="ss-maint-msg">Maintenance message</label>
							<textarea
								id="ss-maint-msg"
								class="ss-input ss-textarea"
								bind:value={maintenanceMessageDraft}
								rows="2"
								maxlength="500"
								placeholder="Optional — shown to non-super-admins on the maintenance screen."
							></textarea>
							<div class="ss-form-row ss-form-row--end">
								<button
									type="button"
									class="ss-btn ss-btn--ghost"
									onclick={saveMaintenanceMessage}
									disabled={flagSaving === 'maintenanceMessage'}
								>
									{flagSaving === 'maintenanceMessage' ? 'Saving…' : 'Save message'}
								</button>
							</div>
						</li>
					{/if}

					{#each ['enableRagAiCoaching', 'enableVideoProcessing', 'enableRecruiterMarketplace', 'enableLiveScoring'] as flagKey (flagKey)}
						<li class="ss-flag-row">
							<div class="ss-flag-meta">
								<div class="ss-flag-title-row">
									<strong class="ss-flag-title">{flagLabels[flagKey]}</strong>
									{#if featureFlagsStore.flags[flagKey]}
										<span class="ss-flag-badge ss-flag-badge--muted-on">On</span>
									{:else}
										<span class="ss-flag-badge ss-flag-badge--off">Off</span>
									{/if}
								</div>
								<p class="ss-flag-desc">{flagDescriptions[flagKey]}</p>
							</div>
							<label class="ss-switch" aria-label="Toggle {flagLabels[flagKey]}">
								<input
									type="checkbox"
									checked={featureFlagsStore.flags[flagKey]}
									disabled={flagSaving === flagKey}
									onchange={(e) =>
										toggleFlag(
											/** @type {keyof typeof flagLabels} */ (flagKey),
											/** @type {HTMLInputElement} */ (e.currentTarget).checked
										)}
								/>
								<span class="ss-switch__track"></span>
							</label>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	<!-- ══════════════════════════════════════════════════════════════════════
	     TAB 3: External Integrations
	     ══════════════════════════════════════════════════════════════════════ -->
	{#if activeTab === 'integrations'}
		<section class="ss-section" aria-labelledby="ss-int-heading">
			<div class="ss-section__label">
				<i class="ph ph-plugs-connected" aria-hidden="true"></i>
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
				<i class="ph ph-activity" aria-hidden="true"></i>
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
						{#if webhookLoading}
							<tr>
								<td colspan="4" class="ss-dt__td-empty">Loading webhook status…</td>
							</tr>
						{:else if webhookRows.length === 0}
							<tr>
								<td colspan="4" class="ss-dt__td-empty">
									No webhook events recorded yet.
								</td>
							</tr>
						{:else}
							{#each webhookRows as row (row.id)}
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
</div>

<style>
	.ss-page {
		display: flex;
		flex-direction: column;
		gap: 0;
		max-width: 960px;
	}

	.ss-page__head { margin-bottom: 20px; }

	.ss-page__title {
		margin: 0 0 4px;
		font-size: 1.125rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--text-primary);
	}

	.ss-page__sub {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	/* ── Tabs ────────────────────────────────────────────────────────── */
	.ss-tabs {
		display: flex;
		gap: 2px;
		margin: 8px 0 4px;
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .ss-tabs {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.ss-tab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border: none;
		background: transparent;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #52525b;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: color 0.12s ease, border-color 0.12s ease;
	}

	:global(html.dark) .ss-tab { color: #a1a1aa; }

	.ss-tab i { font-size: 1rem; }

	.ss-tab:hover { color: var(--text-primary); }

	.ss-tab--active {
		color: var(--text-primary);
		border-bottom-color: var(--brand-primary, #f59e0b);
	}

	:global(html.dark) .ss-tab--active { color: #fafafa; }

	/* ── Section layout ─────────────────────────────────────────────── */
	.ss-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 24px 0;
	}

	.ss-section__label {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-left: 12px;
		border-left: 3px solid var(--brand-primary, #f59e0b);
	}

	.ss-section__label--danger { border-left-color: #dc2626; }
	.ss-section__label--danger i { color: #dc2626; }

	.ss-section__label--pad { margin-top: 16px; }

	.ss-section__label i {
		font-size: 1rem;
		color: var(--brand-primary, #d97706);
		flex-shrink: 0;
	}

	.ss-section__heading {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.ss-section__desc {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.55;
		max-width: 620px;
	}

	/* ── Data table ─────────────────────────────────────────────────── */
	.ss-dt-wrap {
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 8px;
		overflow: hidden;
		background: var(--glass-bg, #fff);
	}

	:global(html.dark) .ss-dt-wrap {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ss-dt {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.ss-dt thead th {
		padding: 8px 14px;
		text-align: left;
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
		background: var(--surface-subtle, #fafafa);
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .ss-dt thead th {
		background: rgba(255, 255, 255, 0.03);
		border-bottom-color: rgba(255, 255, 255, 0.07);
		color: #d4d4d8;
	}

	.ss-dt__th-right { text-align: right; }

	.ss-dt__row {
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		transition: background 0.08s ease;
	}

	.ss-dt__row:last-child { border-bottom: none; }
	.ss-dt__row:hover { background: rgba(0, 0, 0, 0.018); }

	:global(html.dark) .ss-dt__row { border-bottom-color: rgba(255, 255, 255, 0.06); }
	:global(html.dark) .ss-dt__row:hover { background: rgba(255, 255, 255, 0.025); }

	.ss-dt__row td {
		padding: 9px 14px;
		color: var(--text-primary);
	}

	:global(html.dark) .ss-dt__row td { color: #fafafa; }

	.ss-dt__td-mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.8rem;
		color: var(--text-primary);
	}

	:global(html.dark) .ss-dt__td-mono { color: #fafafa; }

	.ss-dt__td-right { text-align: right; width: 80px; }

	.ss-dt__td-empty {
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.8rem;
		padding: 20px 14px !important;
	}

	:global(html.dark) .ss-dt__td-empty { color: #a1a1aa; }

	/* ── Forms ───────────────────────────────────────────────────────── */
	.ss-inline-form { display: flex; flex-direction: column; gap: 8px; }

	.ss-form-row {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
	}

	.ss-form-row--end { justify-content: flex-end; }

	.ss-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	:global(html.dark) .ss-label { color: #d4d4d8; }

	.ss-input {
		width: 100%;
		padding: 8px 12px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		background: var(--glass-bg, #fff);
		font: inherit;
		font-size: 0.875rem;
		color: var(--text-primary);
		box-sizing: border-box;
		outline: none;
		transition: border-color 0.12s ease;
	}

	.ss-input:focus { border-color: var(--brand-primary, #f59e0b); }
	.ss-input:disabled { opacity: 0.55; cursor: not-allowed; }

	:global(html.dark) .ss-input {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.1);
		color: #fafafa;
	}

	:global(html.dark) .ss-input:focus { border-color: var(--brand-primary, #f59e0b); }

	.ss-textarea { font-family: inherit; resize: vertical; min-height: 56px; }

	/* ── Buttons ─────────────────────────────────────────────────────── */
	.ss-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 36px;
		padding: 0 16px;
		border-radius: 8px;
		border: none;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 0.12s ease, background 0.12s ease, border-color 0.12s ease;
		white-space: nowrap;
	}

	.ss-btn--primary {
		background: var(--brand-primary, #f59e0b);
		color: #0f172a;
	}

	.ss-btn--primary:hover:not(:disabled) { filter: brightness(1.06); }

	.ss-btn--ghost {
		background: transparent;
		border: 1px solid var(--border-subtle, #e5e5e5);
		color: var(--text-primary);
	}

	.ss-btn--ghost:hover:not(:disabled) {
		background: var(--surface-subtle, #fafafa);
	}

	:global(html.dark) .ss-btn--ghost {
		border-color: rgba(255, 255, 255, 0.12);
		color: #fafafa;
	}

	:global(html.dark) .ss-btn--ghost:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.04);
	}

	.ss-btn:disabled { opacity: 0.5; cursor: not-allowed; }

	.ss-revoke-btn {
		background: none;
		border: 1px solid rgba(185, 28, 28, 0.3);
		border-radius: 6px;
		cursor: pointer;
		color: var(--danger-red, #b91c1c);
		padding: 4px 12px;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		transition: background 0.1s ease;
	}

	.ss-revoke-btn:hover { background: rgba(185, 28, 28, 0.06); }

	:global(html.dark) .ss-revoke-btn {
		color: #fca5a5;
		border-color: rgba(248, 113, 113, 0.4);
	}

	/* ── Flash messages ──────────────────────────────────────────────── */
	.ss-flash {
		margin: 0;
		padding: 10px 14px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.875rem;
		line-height: 1.45;
	}

	.ss-flash--ok {
		background: rgba(4, 120, 87, 0.1);
		color: var(--success-green, #047857);
		border: 1px solid rgba(4, 120, 87, 0.3);
	}

	.ss-flash--err {
		background: rgba(185, 28, 28, 0.08);
		color: var(--danger-red, #991b1b);
		border: 1px solid rgba(185, 28, 28, 0.3);
	}

	:global(html.dark) .ss-flash--ok {
		color: #a7f3d0;
		border-color: rgba(52, 211, 153, 0.35);
		background: rgba(52, 211, 153, 0.08);
	}

	:global(html.dark) .ss-flash--err {
		color: #fecaca;
		border-color: rgba(248, 113, 113, 0.3);
		background: rgba(127, 29, 29, 0.2);
	}

	.ss-skel {
		padding: 14px;
		border-radius: 8px;
		border: 1px dashed var(--border-subtle, #e5e5e5);
		font-size: 0.8125rem;
		color: var(--text-secondary);
		background: var(--surface-subtle, #fafafa);
	}

	:global(html.dark) .ss-skel {
		border-color: rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.02);
		color: #d4d4d8;
	}

	/* ── Feature flag rows ──────────────────────────────────────────── */
	.ss-flag-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.ss-flag-row {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 14px 16px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 10px;
		background: var(--glass-bg, #fff);
	}

	:global(html.dark) .ss-flag-row {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ss-flag-row--danger {
		border-color: rgba(220, 38, 38, 0.4);
		background: rgba(220, 38, 38, 0.04);
	}

	:global(html.dark) .ss-flag-row--danger {
		border-color: rgba(248, 113, 113, 0.3);
		background: rgba(127, 29, 29, 0.12);
	}

	.ss-flag-meta { flex: 1 1 auto; min-width: 0; }

	.ss-flag-title-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.ss-flag-title {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	:global(html.dark) .ss-flag-title { color: #fafafa; }

	.ss-flag-desc {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	:global(html.dark) .ss-flag-desc { color: #d4d4d8; }

	.ss-flag-badge {
		display: inline-block;
		padding: 1px 8px;
		border-radius: 999px;
		font-size: 0.625rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.ss-flag-badge--on {
		background: #dc2626;
		color: #fff;
	}

	.ss-flag-badge--muted-on {
		background: rgba(34, 197, 94, 0.12);
		color: #166534;
		border: 1px solid rgba(34, 197, 94, 0.35);
	}

	:global(html.dark) .ss-flag-badge--muted-on {
		color: #86efac;
		border-color: rgba(134, 239, 172, 0.35);
		background: rgba(34, 197, 94, 0.12);
	}

	.ss-flag-badge--off {
		background: rgba(161, 161, 170, 0.15);
		color: #52525b;
		border: 1px solid rgba(161, 161, 170, 0.35);
	}

	:global(html.dark) .ss-flag-badge--off {
		color: #d4d4d8;
		border-color: rgba(212, 212, 216, 0.25);
		background: rgba(255, 255, 255, 0.04);
	}

	.ss-flag-sub {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 16px 14px;
		margin-top: -10px;
		border: 1px solid rgba(220, 38, 38, 0.25);
		border-top: none;
		border-radius: 0 0 10px 10px;
		background: rgba(220, 38, 38, 0.025);
	}

	:global(html.dark) .ss-flag-sub {
		border-color: rgba(248, 113, 113, 0.22);
		background: rgba(127, 29, 29, 0.08);
	}

	/* Switch */
	.ss-switch {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
		flex-shrink: 0;
	}

	.ss-switch input { opacity: 0; width: 0; height: 0; }

	.ss-switch__track {
		position: absolute;
		inset: 0;
		cursor: pointer;
		background: #d4d4d8;
		border-radius: 999px;
		transition: background 0.2s ease;
	}

	.ss-switch__track::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #ffffff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		transition: transform 0.2s ease;
	}

	.ss-switch input:checked + .ss-switch__track {
		background: var(--brand-primary, #f59e0b);
	}

	.ss-switch input:checked + .ss-switch__track::after {
		transform: translateX(20px);
	}

	.ss-switch input:disabled + .ss-switch__track {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(html.dark) .ss-switch__track { background: rgba(255, 255, 255, 0.15); }

	/* ── Integration cards ──────────────────────────────────────────── */
	.ss-int-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 12px;
		margin-bottom: 4px;
	}

	.ss-int-card {
		padding: 16px;
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: 10px;
		background: var(--glass-bg, #fff);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	:global(html.dark) .ss-int-card {
		background: #111113;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ss-int-card__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}

	.ss-int-card__title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	:global(html.dark) .ss-int-card__title { color: #fafafa; }

	.ss-int-card__badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 700;
		background: rgba(99, 102, 241, 0.1);
		color: #4338ca;
		border: 1px solid rgba(99, 102, 241, 0.25);
	}

	:global(html.dark) .ss-int-card__badge {
		background: rgba(99, 102, 241, 0.15);
		color: #a5b4fc;
		border-color: rgba(165, 180, 252, 0.3);
	}

	.ss-int-card__desc {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	:global(html.dark) .ss-int-card__desc { color: #d4d4d8; }

	.ss-int-card__key {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: 6px;
		background: var(--surface-subtle, #fafafa);
		border: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .ss-int-card__key {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.ss-int-card__key-label {
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	:global(html.dark) .ss-int-card__key-label { color: #a1a1aa; }

	.ss-int-card__key-code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
		color: var(--text-primary);
	}

	:global(html.dark) .ss-int-card__key-code { color: #fafafa; }

	.ss-int-card__hint {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	:global(html.dark) .ss-int-card__hint { color: #a1a1aa; }

	.ss-code {
		padding: 2px 5px;
		border-radius: 4px;
		background: var(--surface-subtle, #fafafa);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
	}

	:global(html.dark) .ss-code {
		background: rgba(255, 255, 255, 0.06);
		color: #fafafa;
	}

	.ss-status {
		display: inline-block;
		padding: 1px 8px;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 800;
		letter-spacing: 0.06em;
	}

	.ss-status--ok {
		background: rgba(34, 197, 94, 0.12);
		color: #15803d;
		border: 1px solid rgba(34, 197, 94, 0.35);
	}

	.ss-status--warn {
		background: rgba(245, 158, 11, 0.12);
		color: #b45309;
		border: 1px solid rgba(245, 158, 11, 0.35);
	}

	.ss-status--fail {
		background: rgba(220, 38, 38, 0.12);
		color: #b91c1c;
		border: 1px solid rgba(220, 38, 38, 0.35);
	}

	:global(html.dark) .ss-status--ok { color: #86efac; }
	:global(html.dark) .ss-status--warn { color: #fcd34d; }
	:global(html.dark) .ss-status--fail { color: #fca5a5; }
</style>
