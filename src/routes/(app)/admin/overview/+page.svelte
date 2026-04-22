<script>
	import { db, functions } from '$lib/firebase.js';
	import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { logSecurityEvent } from '$lib/utils/security.js';
	import '$lib/styles/enterprise-console.css';

	const createSportModuleFn = httpsCallable(functions, 'createSportModule');

	// ── KPI counts ──────────────────────────────────────────────────────────────
	let userCount = $state(0);
	let licenseCount = $state(0);
	let countsLoading = $state(false);

	const clubCount = $derived(teamsStore.clubs.length);

	$effect(() => {
		if (!teamsStore.loaded) return;
		void countsLoading; // silence lint
		void loadCounts();
	});

	async function loadCounts() {
		countsLoading = true;
		try {
			const [usersSnap, licensesSnap] = await Promise.all([
				getDocs(collection(db, 'users')),
				getDocs(collection(db, 'licenses')),
			]);
			userCount = usersSnap.size;
			licenseCount = licensesSnap.size;
		} catch (e) {
			console.error('[overview] loadCounts', e);
		} finally {
			countsLoading = false;
		}
	}

	// ── Sport module provisioning ────────────────────────────────────────────────
	let sportName = $state('');
	let sportIcon = $state('ph-soccer-ball');
	let sportCourtType = $state('');
	let sportBusy = $state(false);
	let sportError = $state('');
	let sportSuccess = $state('');

	/** @param {unknown} e */
	function formatCallableError(e) {
		if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
			return e.message;
		}
		if (e instanceof Error) return e.message;
		return 'Something went wrong. Check the Cloud Functions logs.';
	}

	async function onCreateSportModule() {
		sportError = '';
		sportSuccess = '';
		if (!sportName.trim()) {
			sportError = 'Sport name is required.';
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
				sportSuccess = `Sport module created (id: ${data.sportId}).`;
				sportName = '';
				sportIcon = 'ph-soccer-ball';
				sportCourtType = '';
			} else {
				sportError = 'Server did not confirm creation.';
			}
		} catch (e) {
			console.error('[overview] createSportModule', e);
			sportError = formatCallableError(e);
		} finally {
			sportBusy = false;
		}
	}

	// ── System Admins management ─────────────────────────────────────────────────
	let newAdminEmail = $state('');
	let adminSaving = $state(false);

	const addAdmin = async () => {
		if (!newAdminEmail.trim()) return alert('Enter email.');
		const email = newAdminEmail.trim().toLowerCase();
		adminSaving = true;
		try {
			await setDoc(doc(db, 'config', 'admins'), { list: [...teamsStore.admins, email] });
			await setDoc(doc(db, 'users', email), { role: 'super_admin' }, { merge: true });
			await logSecurityEvent('GRANT_SUPER_ADMIN', email, 'Added to global config');
			alert('Global Admin Added!');
			newAdminEmail = '';
			await teamsStore.load('super_admin', { scope: 'admin_full', routePath: '/admin/overview' });
		} catch (e) {
			alert('Error: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			adminSaving = false;
		}
	};

	/** @param {string} email */
	const removeAdmin = async (email) => {
		if (!confirm(`Remove ${email} from Global Admins?`)) return;
		const newList = teamsStore.admins.filter((e) => e !== email);
		await setDoc(doc(db, 'config', 'admins'), { list: newList });
		await logSecurityEvent('REVOKE_SUPER_ADMIN', email, 'Removed from global config');
		await teamsStore.load('super_admin', { scope: 'admin_full', routePath: '/admin/overview' });
	};
</script>

<div class="ov-page">

	<!-- ── Header ─────────────────────────────────────────────────────────────── -->
	<div class="ov-header">
		<h1 class="ov-header__title">
			<i class="ph ph-terminal-window" aria-hidden="true"></i>
			Platform Overview
		</h1>
		<p class="ov-header__sub">Real-time platform health at a glance.</p>
	</div>

	<!-- ── KPI Bento ──────────────────────────────────────────────────────────── -->
	<div class="ov-kpi-grid">
		<div class="ov-kpi-card">
			<div class="ov-kpi-card__icon-wrap ov-kpi-card__icon-wrap--blue">
				<i class="ph ph-users" aria-hidden="true"></i>
			</div>
			<div class="ov-kpi-card__body">
				<span class="ov-kpi-card__label">Total Users</span>
				<span class="ov-kpi-card__value">{countsLoading ? '…' : userCount.toLocaleString()}</span>
			</div>
		</div>
		<div class="ov-kpi-card">
			<div class="ov-kpi-card__icon-wrap ov-kpi-card__icon-wrap--green">
				<i class="ph ph-buildings" aria-hidden="true"></i>
			</div>
			<div class="ov-kpi-card__body">
				<span class="ov-kpi-card__label">Active Organizations</span>
				<span class="ov-kpi-card__value">{clubCount.toLocaleString()}</span>
			</div>
		</div>
		<div class="ov-kpi-card">
			<div class="ov-kpi-card__icon-wrap ov-kpi-card__icon-wrap--gold">
				<i class="ph ph-credit-card" aria-hidden="true"></i>
			</div>
			<div class="ov-kpi-card__body">
				<span class="ov-kpi-card__label">Active Licenses</span>
				<span class="ov-kpi-card__value">{countsLoading ? '…' : licenseCount.toLocaleString()}</span>
			</div>
		</div>
		<div class="ov-kpi-card">
			<div class="ov-kpi-card__icon-wrap ov-kpi-card__icon-wrap--purple">
				<i class="ph ph-users-three" aria-hidden="true"></i>
			</div>
			<div class="ov-kpi-card__body">
				<span class="ov-kpi-card__label">Platform Admins</span>
				<span class="ov-kpi-card__value">{teamsStore.admins.length}</span>
			</div>
		</div>
	</div>

	<!-- ── Two-column action area ─────────────────────────────────────────────── -->
	<div class="ov-action-grid">

		<!-- Sport module provisioning -->
		<div class="card">
			<div class="card-header">
				<i class="ph ph-trophy" aria-hidden="true"></i> Provision Sport Module
			</div>
			<div class="card-body">
				{#if sportError}
					<p class="ov-flash ov-flash--err" role="alert">{sportError}</p>
				{/if}
				{#if sportSuccess}
					<p class="ov-flash ov-flash--ok">{sportSuccess}</p>
				{/if}
				<label for="ov-sport-name">Sport name</label>
				<input
					id="ov-sport-name"
					type="text"
					placeholder="e.g., Volleyball"
					bind:value={sportName}
					disabled={sportBusy}
				/>
				<label for="ov-sport-icon">Default icon (Phosphor class)</label>
				<input
					id="ov-sport-icon"
					type="text"
					placeholder="ph-volleyball"
					bind:value={sportIcon}
					disabled={sportBusy}
				/>
				<label for="ov-sport-court">Court type key (optional)</label>
				<input
					id="ov-sport-court"
					type="text"
					placeholder="volleyball — auto from name if empty"
					bind:value={sportCourtType}
					disabled={sportBusy}
				/>
				<button
					type="button"
					class="primary-btn btn-blue w-100"
					disabled={sportBusy || !sportName.trim()}
					onclick={onCreateSportModule}
				>
					{sportBusy ? 'Creating…' : 'Create sport module'}
				</button>
				<p class="text-sm-sub">
					Writes to <code>sports</code> via secure Cloud Function (super admin only).
				</p>
			</div>
		</div>

		<!-- System Admins management -->
		<div class="card border-gold">
			<div class="card-header bg-gold-header">
				<i class="ph ph-crown" aria-hidden="true"></i> System Administrators
			</div>
			<div class="card-body">
				<div class="ec-table-wrap">
					<table class="admin-table">
						<thead>
							<tr>
								<th>Admin Email</th>
								<th style="width:56px; text-align:right">Action</th>
							</tr>
						</thead>
						<tbody>
							{#each teamsStore.admins as email (email)}
								<tr>
									<td class="ov-admin-email">{email}</td>
									<td style="text-align:right">
										<button
											type="button"
											class="delete-btn"
											onclick={() => removeAdmin(email)}
											aria-label="Revoke admin access for {email}"
										>
											Revoke
										</button>
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="2" class="text-center">No admins loaded.</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<label for="ov-grant-email" class="ov-grant-label">Grant Super Admin Access</label>
				<div class="ov-grant-row">
					<input
						id="ov-grant-email"
						type="email"
						bind:value={newAdminEmail}
						placeholder="Enter admin email…"
						class="m-0 flex-1"
					/>
					<button
						type="button"
						class="primary-btn btn-gold"
						onclick={addAdmin}
						disabled={adminSaving}
					>
						{adminSaving ? 'Saving…' : 'Grant Access'}
					</button>
				</div>
			</div>
		</div>

	</div>
</div>

<style>
	.ov-page {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	/* ── Header ────────────────────────────────────────────────────── */
	.ov-header {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ov-header__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-primary);
		letter-spacing: -0.03em;
	}

	.ov-header__sub {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	/* ── KPI grid ──────────────────────────────────────────────────── */
	.ov-kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 16px;
	}

	.ov-kpi-card {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 20px;
		background: var(--glass-bg, #fff);
		border: 1px solid var(--border-subtle, #e5e5e5);
		border-radius: var(--radius-premium, 20px);
		box-shadow: var(--shadow-card, 0 1px 3px rgba(0,0,0,0.06));
	}

	:global(html.dark) .ov-kpi-card {
		background: #111113;
		border-color: rgba(255,255,255,0.08);
	}

	.ov-kpi-card__icon-wrap {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.4rem;
	}

	.ov-kpi-card__icon-wrap--blue   { background: rgba(99,102,241,0.12); color: #6366f1; }
	.ov-kpi-card__icon-wrap--green  { background: rgba(22,163,74,0.12);  color: #16a34a; }
	.ov-kpi-card__icon-wrap--gold   { background: rgba(245,158,11,0.12); color: #d97706; }
	.ov-kpi-card__icon-wrap--purple { background: rgba(168,85,247,0.12); color: #9333ea; }

	.ov-kpi-card__body {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.ov-kpi-card__label {
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.ov-kpi-card__value {
		font-size: 1.65rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	/* ── Action grid ───────────────────────────────────────────────── */
	.ov-action-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 20px;
		align-items: start;
	}

	/* ── Flash messages ────────────────────────────────────────────── */
	.ov-flash {
		margin: 0 0 12px;
		padding: 12px 14px;
		border-radius: 12px;
		font-weight: 700;
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.ov-flash--ok {
		background: rgba(4,120,87,0.12);
		color: var(--success-green, #047857);
		border: 1px solid rgba(4,120,87,0.35);
	}

	.ov-flash--err {
		background: rgba(185,28,28,0.1);
		color: var(--danger-red, #991b1b);
		border: 1px solid rgba(185,28,28,0.35);
	}

	:global(html.dark) .ov-flash--ok {
		color: #a7f3d0;
		border-color: rgba(52,211,153,0.4);
		background: rgba(52,211,153,0.1);
	}

	:global(html.dark) .ov-flash--err {
		color: #fecaca;
		border-color: rgba(248,113,113,0.35);
		background: rgba(127,29,29,0.25);
	}

	/* ── Admin table helpers ───────────────────────────────────────── */
	.ov-admin-email {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.82rem;
		color: var(--text-primary);
	}

	.ov-grant-label {
		display: block;
		margin-top: 14px;
		margin-bottom: 8px;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.ov-grant-row {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
	}

	.delete-btn {
		background: none;
		border: 1px solid var(--border-strong);
		border-radius: 6px;
		cursor: pointer;
		color: var(--danger-red);
		padding: 4px 10px;
		font-size: 0.8rem;
		font-weight: 600;
	}
</style>
