<script>
	import { db, functions } from '$lib/firebase.js';
	import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import '$lib/styles/enterprise-console.css';

	const createSportModuleFn = httpsCallable(functions, 'createSportModule');

	// ── System Administrators ────────────────────────────────────────────────────
	let newAdminEmail = $state('');
	let adminSaving = $state(false);
	let adminErr = $state('');
	let adminOk = $state('');

	const addAdmin = async () => {
		adminErr = '';
		adminOk = '';
		if (!newAdminEmail.trim()) {
			adminErr = 'Enter an email address.';
			return;
		}
		const email = newAdminEmail.trim().toLowerCase();
		adminSaving = true;
		try {
			await setDoc(doc(db, 'config', 'admins'), { list: [...teamsStore.admins, email] });
			await setDoc(doc(db, 'users', email), { role: 'super_admin' }, { merge: true });
			await logSecurityEvent('GRANT_SUPER_ADMIN', email, 'Added to global config');
			adminOk = `${email} granted super admin access.`;
			newAdminEmail = '';
			await teamsStore.load('super_admin', { scope: 'admin_full', routePath: '/admin/system-settings' });
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
			await logSecurityEvent('REVOKE_SUPER_ADMIN', email, 'Removed from global config');
			adminOk = `${email} removed from super admins.`;
			await teamsStore.load('super_admin', { scope: 'admin_full', routePath: '/admin/system-settings' });
		} catch (e) {
			adminErr = e instanceof Error ? e.message : 'Could not revoke access.';
		}
	};

	// ── Sport Module Provisioning ────────────────────────────────────────────────
	let sportName = $state('');
	let sportIcon = $state('ph-soccer-ball');
	let sportCourtType = $state('');
	let sportBusy = $state(false);
	let sportErr = $state('');
	let sportOk = $state('');

	/** @param {unknown} e */
	function formatCallableError(e) {
		if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
			return e.message;
		}
		if (e instanceof Error) return e.message;
		return 'Check the Cloud Functions logs.';
	}

	async function onCreateSportModule() {
		sportErr = '';
		sportOk = '';
		if (!sportName.trim()) {
			sportErr = 'Sport name is required.';
			return;
		}
		sportBusy = true;
		try {
			const res = await createSportModuleFn({
				sportName: sportName.trim(),
				defaultIcon: sportIcon.trim() || 'ph-soccer-ball',
				courtType: sportCourtType.trim(),
			});
			const data = /** @type {{ ok?: boolean, sportId?: string }} */ (res.data);
			if (data?.ok && data.sportId) {
				sportOk = `Sport module created — ID: ${data.sportId}`;
				sportName = '';
				sportIcon = 'ph-soccer-ball';
				sportCourtType = '';
			} else {
				sportErr = 'Server did not confirm creation.';
			}
		} catch (e) {
			sportErr = formatCallableError(e);
		} finally {
			sportBusy = false;
		}
	}
</script>

<div class="ss-page">

	<!-- ── Page heading ─────────────────────────────────────────────────────────── -->
	<div class="ss-page__head">
		<h1 class="ss-page__title">System Settings</h1>
		<p class="ss-page__sub">Platform-level configuration. Changes here affect all tenants.</p>
	</div>

	<!-- ══════════════════════════════════════════════════════════════════════════ -->
	<!-- Section 1: System Administrators                                          -->
	<!-- ══════════════════════════════════════════════════════════════════════════ -->
	<section class="ss-section" aria-labelledby="ss-admins-heading">
		<div class="ss-section__label">
			<i class="ph ph-crown" aria-hidden="true"></i>
			<h2 id="ss-admins-heading" class="ss-section__heading">System Administrators</h2>
		</div>
		<p class="ss-section__desc">
			Super admins have unrestricted access to all platform data and controls.
			Grant access only to trusted internal accounts.
		</p>

		{#if adminErr}
			<p class="ss-flash ss-flash--err" role="alert">{adminErr}</p>
		{/if}
		{#if adminOk}
			<p class="ss-flash ss-flash--ok" role="status">{adminOk}</p>
		{/if}

		<!-- Current admins table -->
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

		<!-- Grant access form -->
		<div class="ss-inline-form">
			<label class="ss-label" for="ss-grant-email">Grant Super Admin Access</label>
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

	<div class="ss-hr" role="separator" aria-hidden="true"></div>

	<!-- ══════════════════════════════════════════════════════════════════════════ -->
	<!-- Section 2: Sport Module Provisioning                                      -->
	<!-- ══════════════════════════════════════════════════════════════════════════ -->
	<section class="ss-section" aria-labelledby="ss-sport-heading">
		<div class="ss-section__label">
			<i class="ph ph-trophy" aria-hidden="true"></i>
			<h2 id="ss-sport-heading" class="ss-section__heading">Sport Module Provisioning</h2>
		</div>
		<p class="ss-section__desc">
			Creates a new sport configuration document in Firestore via secure Cloud Function.
			This module becomes available to all organizations on the platform.
		</p>

		{#if sportErr}
			<p class="ss-flash ss-flash--err" role="alert">{sportErr}</p>
		{/if}
		{#if sportOk}
			<p class="ss-flash ss-flash--ok" role="status">{sportOk}</p>
		{/if}

		<div class="ss-sport-grid">
			<div class="ss-field">
				<label class="ss-label" for="ss-sport-name">
					Sport Name <span class="ss-req" aria-hidden="true">*</span>
				</label>
				<input
					id="ss-sport-name"
					type="text"
					bind:value={sportName}
					placeholder="e.g., Volleyball"
					disabled={sportBusy}
					class="ss-input"
				/>
			</div>
			<div class="ss-field">
				<label class="ss-label" for="ss-sport-icon">
					Default Icon <span class="ss-label__hint">(Phosphor class)</span>
				</label>
				<input
					id="ss-sport-icon"
					type="text"
					bind:value={sportIcon}
					placeholder="ph-volleyball"
					disabled={sportBusy}
					class="ss-input"
				/>
			</div>
			<div class="ss-field">
				<label class="ss-label" for="ss-sport-court">
					Court Type Key <span class="ss-label__hint">(optional)</span>
				</label>
				<input
					id="ss-sport-court"
					type="text"
					bind:value={sportCourtType}
					placeholder="volleyball — auto-inferred if empty"
					disabled={sportBusy}
					class="ss-input"
				/>
			</div>
		</div>

		<button
			type="button"
			class="ss-btn ss-btn--primary"
			disabled={sportBusy || !sportName.trim()}
			onclick={onCreateSportModule}
		>
			{sportBusy ? 'Provisioning…' : 'Provision Sport Module'}
		</button>
		<p class="ss-hint">
			Writes to <code>sports/{'{sportId}'}</code> via <code>createSportModule</code> Cloud Function.
			Super admin invocation only — not reachable by tenant roles.
		</p>
	</section>

</div>

<style>
	.ss-page {
		display: flex;
		flex-direction: column;
		gap: 0;
		max-width: 760px;
	}

	/* ── Page head ───────────────────────────────────────────────────── */
	.ss-page__head {
		margin-bottom: 28px;
	}

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

	/* ── Section layout ─────────────────────────────────────────────── */
	.ss-section {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 28px 0;
	}

	.ss-section__label {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-left: 12px;
		border-left: 3px solid var(--brand-primary, #f59e0b);
	}

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
		max-width: 560px;
	}

	/* ── Horizontal rule ────────────────────────────────────────────── */
	.ss-hr {
		border: none;
		border-top: 1px solid var(--border-subtle, #e5e5e5);
	}

	:global(html.dark) .ss-hr {
		border-top-color: rgba(255, 255, 255, 0.08);
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
	}

	.ss-dt__th-right { text-align: right; }

	.ss-dt__row {
		border-bottom: 1px solid var(--border-subtle, #e5e5e5);
		transition: background 0.08s ease;
	}

	.ss-dt__row:last-child { border-bottom: none; }

	.ss-dt__row:hover {
		background: rgba(0, 0, 0, 0.018);
	}

	:global(html.dark) .ss-dt__row {
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	:global(html.dark) .ss-dt__row:hover {
		background: rgba(255, 255, 255, 0.025);
	}

	.ss-dt__row td {
		padding: 9px 14px;
		color: var(--text-primary);
	}

	.ss-dt__td-mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.8rem;
		color: var(--text-primary);
	}

	.ss-dt__td-right {
		text-align: right;
		width: 80px;
	}

	.ss-dt__td-empty {
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.8rem;
		padding: 20px 14px !important;
	}

	/* ── Forms ───────────────────────────────────────────────────────── */
	.ss-inline-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ss-form-row {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
	}

	.ss-sport-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 16px;
	}

	.ss-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.ss-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.ss-label__hint {
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: none;
		letter-spacing: 0;
		opacity: 0.75;
	}

	.ss-req {
		color: var(--danger-red, #b91c1c);
		font-size: 0.85rem;
	}

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

	.ss-input:focus {
		border-color: var(--brand-primary, #f59e0b);
	}

	.ss-input:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	:global(html.dark) .ss-input {
		background: #09090b;
		border-color: rgba(255, 255, 255, 0.1);
		color: #f4f4f5;
	}

	:global(html.dark) .ss-input:focus {
		border-color: var(--brand-primary, #f59e0b);
	}

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
		transition: opacity 0.12s ease, background 0.12s ease;
		white-space: nowrap;
	}

	.ss-btn--primary {
		background: var(--brand-primary, #f59e0b);
		color: #0f172a;
	}

	.ss-btn--primary:hover:not(:disabled) {
		filter: brightness(1.06);
	}

	.ss-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

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

	.ss-revoke-btn:hover {
		background: rgba(185, 28, 28, 0.06);
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

	/* ── Hint text ───────────────────────────────────────────────────── */
	.ss-hint {
		margin: 4px 0 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.55;
	}

	.ss-hint code {
		font-family: ui-monospace, monospace;
		font-size: 0.72rem;
		background: rgba(0, 0, 0, 0.05);
		padding: 1px 4px;
		border-radius: 4px;
	}

	:global(html.dark) .ss-hint code {
		background: rgba(255, 255, 255, 0.08);
	}
</style>
