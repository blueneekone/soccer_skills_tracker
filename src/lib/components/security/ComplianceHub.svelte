<script>
	/**
	 * ComplianceHub.svelte — Epic 14: Vanguard Clearance Protocol
	 * ─────────────────────────────────────────────────────────────
	 * High-density compliance terminal for Directors and Registrars.
	 * Lists all coaches and recruiters in the club with their clearance status,
	 * expiry dates, and provides manual override controls for Directors.
	 *
	 * Access: director | registrar | super_admin only.
	 * Zero-Trust: no PII beyond email/name is exposed. Status flag only.
	 */
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { getFunctions, httpsCallable } from 'firebase/functions';
	import { app } from '$lib/firebase.js';

	// ── Reactive auth guards ──────────────────────────────────────────────
	const canAccess = $derived(
		authStore.isDirector || authStore.isRegistrar || authStore.isAdmin,
	);
	const canOverride = $derived(authStore.isDirector || authStore.isAdmin);

	// ── State ─────────────────────────────────────────────────────────────
	/** @type {'idle'|'loading'|'error'} */
	let loadState = $state('idle');
	let errorMsg = $state('');

	/** @typedef {{ email: string, displayName: string, role: string, teamId: string|null, clearanceStatus: string, clearanceRef: string|null, expiresAt: number|null, updatedAt: number|null, source: string|null, isManualOverride: boolean }} ComplianceRow */
	/** @type {ComplianceRow[]} */
	let roster = $state([]);

	// ── Override modal state ──────────────────────────────────────────────
	let overrideOpen = $state(false);
	let overrideEmail = $state('');
	let overrideDocRef = $state('');
	let overrideExpiry = $state('');
	let overrideBusy = $state(false);
	let overrideError = $state('');
	let overrideSuccess = $state('');

	// ── Revoke modal state ────────────────────────────────────────────────
	let revokeOpen = $state(false);
	let revokeEmail = $state('');
	let revokeReason = $state('');
	let revokeBusy = $state(false);

	// ── Search / filter ───────────────────────────────────────────────────
	let searchQuery = $state('');
	let filterStatus = $state('all');

	const filteredRoster = $derived.by(() => {
		let rows = roster;
		if (filterStatus !== 'all') rows = rows.filter((r) => r.clearanceStatus === filterStatus);
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			rows = rows.filter(
				(r) => r.email.toLowerCase().includes(q) || r.displayName.toLowerCase().includes(q),
			);
		}
		return rows;
	});

	// ── Stats ─────────────────────────────────────────────────────────────
	const stats = $derived.by(() => ({
		total:   roster.length,
		cleared: roster.filter((r) => r.clearanceStatus === 'cleared').length,
		pending: roster.filter((r) => r.clearanceStatus === 'pending').length,
		flagged: roster.filter((r) => r.clearanceStatus === 'flagged').length,
	}));

	// ── Firebase callable references ──────────────────────────────────────
	const functions = getFunctions(app, 'us-east1');
	const getComplianceRosterFn  = httpsCallable(functions, 'getComplianceRoster');
	const requestManualOverrideFn = httpsCallable(functions, 'requestManualOverride');
	const revokeCoachClearanceFn  = httpsCallable(functions, 'revokeCoachClearance');

	// ── Load roster ───────────────────────────────────────────────────────
	async function loadRoster() {
		if (!canAccess) return;
		loadState = 'loading';
		errorMsg = '';
		try {
			const result = await getComplianceRosterFn({});
			const data = /** @type {{ roster: ComplianceRow[] }} */ (result.data);
			roster = data.roster ?? [];
			loadState = 'idle';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load compliance roster.';
			loadState = 'error';
		}
	}

	$effect(() => {
		if (canAccess) loadRoster();
	});

	// ── Manual override ───────────────────────────────────────────────────
	function openOverride(email) {
		overrideEmail = email;
		overrideDocRef = '';
		overrideExpiry = '';
		overrideError = '';
		overrideSuccess = '';
		overrideOpen = true;
	}

	async function submitOverride() {
		if (!overrideEmail) return;
		overrideBusy = true;
		overrideError = '';
		try {
			await requestManualOverrideFn({
				targetEmail: overrideEmail,
				documentRef: overrideDocRef || null,
				expiresAt: overrideExpiry || null,
			});
			overrideSuccess = `Clearance granted for ${overrideEmail}`;
			await loadRoster();
			setTimeout(() => {
				overrideOpen = false;
				overrideSuccess = '';
			}, 2000);
		} catch (err) {
			overrideError = err instanceof Error ? err.message : 'Override failed.';
		} finally {
			overrideBusy = false;
		}
	}

	// ── Revoke ────────────────────────────────────────────────────────────
	function openRevoke(email) {
		revokeEmail = email;
		revokeReason = '';
		revokeOpen = true;
	}

	async function submitRevoke() {
		if (!revokeEmail) return;
		revokeBusy = true;
		try {
			await revokeCoachClearanceFn({ targetEmail: revokeEmail, reason: revokeReason });
			await loadRoster();
		} finally {
			revokeBusy = false;
			revokeOpen = false;
		}
	}

	// ── Helpers ───────────────────────────────────────────────────────────
	/** @param {number|null} ms */
	function formatExpiry(ms) {
		if (!ms) return '—';
		const d = new Date(ms);
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	/** @param {string} status */
	function statusClass(status) {
		if (status === 'cleared') return 'ch-badge ch-badge--cleared';
		if (status === 'flagged') return 'ch-badge ch-badge--flagged';
		return 'ch-badge ch-badge--pending';
	}
</script>

{#if !canAccess}
	<div class="ch-denied">
		<span class="ch-denied__icon">⛔</span>
		<p>CLEARANCE PROTOCOL — ACCESS DENIED</p>
		<p class="ch-denied__sub">Director or Registrar credentials required.</p>
	</div>
{:else}
	<!-- ── Header ──────────────────────────────────────────────────────── -->
	<div class="ch-root">
		<div class="ch-header">
			<div class="ch-header__titles">
				<div class="ch-header__label">VANGUARD CLEARANCE TERMINAL</div>
				<h2 class="ch-header__title">Compliance Hub</h2>
				<p class="ch-header__sub">
					Background vetting status for all coaching staff and recruiters.
				</p>
			</div>
			<button
				class="ch-reload-btn"
				onclick={loadRoster}
				disabled={loadState === 'loading'}
				aria-label="Refresh compliance roster"
			>
				{loadState === 'loading' ? 'SYNCING…' : '↻ REFRESH'}
			</button>
		</div>

		<!-- ── Stats rail ──────────────────────────────────────────────── -->
		<div class="ch-stats">
			<div class="ch-stat">
				<span class="ch-stat__num">{stats.total}</span>
				<span class="ch-stat__lbl">TOTAL</span>
			</div>
			<div class="ch-stat ch-stat--cleared">
				<span class="ch-stat__num">{stats.cleared}</span>
				<span class="ch-stat__lbl">CLEARED</span>
			</div>
			<div class="ch-stat ch-stat--pending">
				<span class="ch-stat__num">{stats.pending}</span>
				<span class="ch-stat__lbl">PENDING</span>
			</div>
			<div class="ch-stat ch-stat--flagged">
				<span class="ch-stat__num">{stats.flagged}</span>
				<span class="ch-stat__lbl">FLAGGED</span>
			</div>
		</div>

		<!-- ── Filters ─────────────────────────────────────────────────── -->
		<div class="ch-filters">
			<input
				type="search"
				class="ch-search"
				placeholder="Search by email or name…"
				bind:value={searchQuery}
				aria-label="Search compliance roster"
			/>
			<div class="ch-filter-pills" role="group" aria-label="Filter by status">
				{#each ['all','cleared','pending','flagged'] as s (s)}
					<button
						class="ch-pill {filterStatus === s ? 'ch-pill--active' : ''}"
						onclick={() => (filterStatus = s)}
					>
						{s.toUpperCase()}
					</button>
				{/each}
			</div>
		</div>

		<!-- ── Error state ─────────────────────────────────────────────── -->
		{#if loadState === 'error'}
			<div class="ch-error" role="alert">
				<span>⚠ TELEMETRY ERROR:</span> {errorMsg}
			</div>
		{/if}

		<!-- ── Data grid ───────────────────────────────────────────────── -->
		{#if loadState === 'loading' && roster.length === 0}
			<div class="ch-loading" aria-live="polite">
				<div class="ch-loading__pulse"></div>
				<span>LOADING COMPLIANCE ROSTER…</span>
			</div>
		{:else if filteredRoster.length === 0}
			<div class="ch-empty">
				<p>NO PERSONNEL MATCHING CURRENT FILTER.</p>
				<p class="ch-empty__sub">Adjust the search or status filter above.</p>
			</div>
		{:else}
			<div class="ch-grid" role="table" aria-label="Compliance roster">
				<!-- Grid header -->
				<div class="ch-grid__header" role="row">
					<span role="columnheader">PERSONNEL</span>
					<span role="columnheader">ROLE</span>
					<span role="columnheader">STATUS</span>
					<span role="columnheader">EXPIRY</span>
					<span role="columnheader">SOURCE</span>
					{#if canOverride}
						<span role="columnheader">ACTIONS</span>
					{/if}
				</div>

				<!-- Grid rows -->
				{#each filteredRoster as row (row.email)}
					<div
						class="ch-grid__row {row.clearanceStatus === 'flagged' ? 'ch-grid__row--flagged' : ''}"
						role="row"
					>
						<!-- Personnel cell -->
						<div role="cell" class="ch-cell ch-cell--person">
							<span class="ch-cell__name">{row.displayName}</span>
							<span class="ch-cell__email">{row.email}</span>
						</div>

						<!-- Role cell -->
						<div role="cell" class="ch-cell">
							<span class="ch-role-badge">
								{row.role.toUpperCase()}
							</span>
						</div>

						<!-- Status cell -->
						<div role="cell" class="ch-cell">
							<span class={statusClass(row.clearanceStatus)}>
								{#if row.clearanceStatus === 'cleared'}
									✓ CLEARED
								{:else if row.clearanceStatus === 'flagged'}
									⚑ FLAGGED
								{:else}
									⧗ PENDING
								{/if}
							</span>
							{#if row.isManualOverride}
								<span class="ch-override-tag">MANUAL</span>
							{/if}
						</div>

						<!-- Expiry cell -->
						<div role="cell" class="ch-cell ch-cell--mono">
							{formatExpiry(row.expiresAt)}
						</div>

						<!-- Source cell -->
						<div role="cell" class="ch-cell ch-cell--mono">
							{row.source ? row.source.replace('_', ' ').toUpperCase() : '—'}
						</div>

						<!-- Actions cell -->
						{#if canOverride}
							<div role="cell" class="ch-cell ch-cell--actions">
								{#if row.clearanceStatus !== 'cleared'}
									<button
										class="ch-action-btn ch-action-btn--grant"
										onclick={() => openOverride(row.email)}
										title="Grant manual clearance"
									>
										GRANT
									</button>
								{/if}
								{#if row.clearanceStatus === 'cleared'}
									<button
										class="ch-action-btn ch-action-btn--revoke"
										onclick={() => openRevoke(row.email)}
										title="Revoke clearance"
									>
										REVOKE
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<!-- ── Manual Override Modal ──────────────────────────────────────────────── -->
{#if overrideOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="ch-modal-backdrop" onclick={() => !overrideBusy && (overrideOpen = false)}>
		<div
			class="ch-modal vanguard-card"
			role="dialog"
			aria-modal="true"
			aria-labelledby="override-title"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="ch-modal__title" id="override-title">REQUEST MANUAL OVERRIDE</h3>
			<p class="ch-modal__sub">
				Granting manual clearance for: <strong class="ch-modal__email">{overrideEmail}</strong>
			</p>

			{#if overrideSuccess}
				<div class="ch-modal__success">{overrideSuccess}</div>
			{:else}
				<label class="ch-modal__field">
					<span>DOCUMENT REFERENCE (PDF path or external ID)</span>
					<input
						class="ch-modal__input"
						type="text"
						placeholder="e.g. clearances/2026/coach_smith.pdf"
						bind:value={overrideDocRef}
					/>
				</label>
				<label class="ch-modal__field">
					<span>CLEARANCE EXPIRY DATE (leave blank = 1 year)</span>
					<input
						class="ch-modal__input"
						type="date"
						bind:value={overrideExpiry}
					/>
				</label>

				{#if overrideError}
					<div class="ch-modal__error" role="alert">{overrideError}</div>
				{/if}

				<div class="ch-modal__actions">
					<button
						class="vanguard-btn-primary"
						onclick={submitOverride}
						disabled={overrideBusy}
					>
						{overrideBusy ? 'APPLYING…' : '[ APPLY CLEARANCE ]'}
					</button>
					<button
						class="ch-modal__cancel"
						onclick={() => (overrideOpen = false)}
						disabled={overrideBusy}
					>
						CANCEL
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- ── Revoke Confirmation Modal ──────────────────────────────────────────── -->
{#if revokeOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="ch-modal-backdrop" onclick={() => !revokeBusy && (revokeOpen = false)}>
		<div
			class="ch-modal ch-modal--danger vanguard-card"
			role="dialog"
			aria-modal="true"
			aria-labelledby="revoke-title"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="ch-modal__title ch-modal__title--danger" id="revoke-title">
				⚑ REVOKE CLEARANCE
			</h3>
			<p class="ch-modal__sub">
				Revoking clearance for: <strong class="ch-modal__email">{revokeEmail}</strong><br />
				This will immediately block their access to player data.
			</p>

			<label class="ch-modal__field">
				<span>REASON (optional)</span>
				<input
					class="ch-modal__input ch-modal__input--danger"
					type="text"
					placeholder="e.g. Expired clearance, policy violation…"
					bind:value={revokeReason}
				/>
			</label>

			<div class="ch-modal__actions">
				<button
					class="vanguard-btn-danger"
					onclick={submitRevoke}
					disabled={revokeBusy}
				>
					{revokeBusy ? 'REVOKING…' : '[ CONFIRM REVOKE ]'}
				</button>
				<button
					class="ch-modal__cancel"
					onclick={() => (revokeOpen = false)}
					disabled={revokeBusy}
				>
					CANCEL
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Root ──────────────────────────────────────────────────────────── */
	.ch-root {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem;
	}

	/* ── Header ────────────────────────────────────────────────────────── */
	.ch-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.ch-header__label {
		font-size: 0.65rem;
		letter-spacing: 0.15em;
		color: var(--vanguard-cyan);
		text-transform: uppercase;
		margin-bottom: 0.25rem;
	}

	.ch-header__title {
		margin: 0 0 0.25rem;
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #f3f4f6;
	}

	.ch-header__sub {
		margin: 0;
		font-size: 0.75rem;
		color: #6b7280;
	}

	.ch-reload-btn {
		background: transparent;
		border: 1px solid rgba(0, 240, 255, 0.3);
		color: var(--vanguard-cyan);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.7rem;
		letter-spacing: 0.1em;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
	}

	.ch-reload-btn:hover:not(:disabled) {
		border-color: var(--vanguard-cyan);
		background: rgba(0, 240, 255, 0.06);
	}

	.ch-reload-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ── Stats rail ────────────────────────────────────────────────────── */
	.ch-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
	}

	.ch-stat {
		background: var(--vanguard-glass);
		border: 1px solid var(--vanguard-border);
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.ch-stat__num {
		font-size: 1.75rem;
		font-weight: 900;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		color: #9ca3af;
		line-height: 1;
	}

	.ch-stat__lbl {
		font-size: 0.6rem;
		letter-spacing: 0.15em;
		color: #4b5563;
	}

	.ch-stat--cleared .ch-stat__num { color: var(--vanguard-cyan); }
	.ch-stat--cleared { border-color: rgba(0, 240, 255, 0.25); }

	.ch-stat--pending .ch-stat__num { color: #d97706; }
	.ch-stat--pending { border-color: rgba(217, 119, 6, 0.25); }

	.ch-stat--flagged .ch-stat__num { color: var(--vanguard-red); }
	.ch-stat--flagged { border-color: rgba(255, 0, 60, 0.25); }

	/* ── Filters ───────────────────────────────────────────────────────── */
	.ch-filters {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.ch-search {
		flex: 1;
		min-width: 200px;
		background: var(--vanguard-glass);
		border: 1px solid var(--vanguard-border);
		border-radius: 0.375rem;
		padding: 0.5rem 0.875rem;
		color: #e5e7eb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.8rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.ch-search:focus { border-color: var(--vanguard-cyan); }
	.ch-search::placeholder { color: #4b5563; }

	.ch-filter-pills {
		display: flex;
		gap: 0.375rem;
	}

	.ch-pill {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #6b7280;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		padding: 0.35rem 0.75rem;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.ch-pill:hover { border-color: rgba(0, 240, 255, 0.3); color: #9ca3af; }

	.ch-pill--active {
		border-color: var(--vanguard-cyan);
		color: var(--vanguard-cyan);
		background: rgba(0, 240, 255, 0.06);
	}

	/* ── Grid ──────────────────────────────────────────────────────────── */
	.ch-grid {
		border: 1px solid var(--vanguard-border);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.ch-grid__header {
		display: grid;
		grid-template-columns: 2fr 1fr 1.25fr 1fr 1fr auto;
		padding: 0.6rem 1rem;
		background: rgba(0, 240, 255, 0.04);
		border-bottom: 1px solid var(--vanguard-border);
		font-size: 0.6rem;
		letter-spacing: 0.12em;
		color: #4b5563;
		gap: 0.5rem;
	}

	.ch-grid__header span { text-transform: uppercase; }

	.ch-grid__row {
		display: grid;
		grid-template-columns: 2fr 1fr 1.25fr 1fr 1fr auto;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(0, 240, 255, 0.06);
		gap: 0.5rem;
		align-items: center;
		transition: background 0.15s;
	}

	.ch-grid__row:last-child { border-bottom: none; }
	.ch-grid__row:hover { background: rgba(0, 240, 255, 0.02); }

	.ch-grid__row--flagged {
		animation: ch-flag-pulse 2.5s ease-in-out infinite;
	}

	@keyframes ch-flag-pulse {
		0%, 100% { background: transparent; }
		50% { background: rgba(255, 0, 60, 0.04); }
	}

	/* ── Cells ─────────────────────────────────────────────────────────── */
	.ch-cell {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.ch-cell--mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; }
	.ch-cell--actions { flex-direction: row; gap: 0.4rem; align-items: center; }

	.ch-cell__name {
		font-size: 0.875rem;
		font-weight: 600;
		color: #f3f4f6;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ch-cell__email {
		font-size: 0.7rem;
		color: #6b7280;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ── Badges ────────────────────────────────────────────────────────── */
	.ch-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		white-space: nowrap;
		border: 1px solid transparent;
	}

	.ch-badge--cleared {
		color: var(--vanguard-cyan);
		border-color: rgba(0, 240, 255, 0.3);
		background: rgba(0, 240, 255, 0.08);
		text-shadow: 0 0 8px rgba(0, 240, 255, 0.6);
	}

	.ch-badge--pending {
		color: #d97706;
		border-color: rgba(217, 119, 6, 0.3);
		background: rgba(217, 119, 6, 0.08);
	}

	.ch-badge--flagged {
		color: var(--vanguard-red);
		border-color: rgba(255, 0, 60, 0.4);
		background: rgba(255, 0, 60, 0.1);
		animation: ch-flag-blink 1.2s step-end infinite;
	}

	@keyframes ch-flag-blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.ch-role-badge {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		color: #9ca3af;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0.15rem 0.45rem;
		border-radius: 0.25rem;
	}

	.ch-override-tag {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.55rem;
		letter-spacing: 0.1em;
		color: #d97706;
		border: 1px solid rgba(217, 119, 6, 0.3);
		padding: 0.1rem 0.3rem;
		border-radius: 0.2rem;
		margin-left: 0.25rem;
	}

	/* ── Action buttons ────────────────────────────────────────────────── */
	.ch-action-btn {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		padding: 0.3rem 0.6rem;
		border-radius: 0.25rem;
		cursor: pointer;
		border: 1px solid;
		transition: background 0.15s, box-shadow 0.15s;
	}

	.ch-action-btn--grant {
		border-color: rgba(0, 240, 255, 0.4);
		color: var(--vanguard-cyan);
		background: rgba(0, 240, 255, 0.06);
	}

	.ch-action-btn--grant:hover {
		background: rgba(0, 240, 255, 0.14);
		box-shadow: 0 0 8px rgba(0, 240, 255, 0.3);
	}

	.ch-action-btn--revoke {
		border-color: rgba(255, 0, 60, 0.4);
		color: var(--vanguard-red);
		background: rgba(255, 0, 60, 0.06);
	}

	.ch-action-btn--revoke:hover {
		background: rgba(255, 0, 60, 0.14);
		box-shadow: 0 0 8px rgba(255, 0, 60, 0.3);
	}

	/* ── Loading / empty / error ───────────────────────────────────────── */
	.ch-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem;
		color: #4b5563;
		font-size: 0.75rem;
		letter-spacing: 0.1em;
	}

	.ch-loading__pulse {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--vanguard-cyan);
		animation: ch-pulse 1.2s ease-in-out infinite;
	}

	@keyframes ch-pulse {
		0%, 100% { opacity: 0.3; transform: scale(0.8); }
		50% { opacity: 1; transform: scale(1); }
	}

	.ch-empty {
		padding: 3rem;
		text-align: center;
		color: #4b5563;
		font-size: 0.8rem;
		letter-spacing: 0.08em;
	}

	.ch-empty__sub { font-size: 0.7rem; margin-top: 0.5rem; }

	.ch-error {
		padding: 0.75rem 1rem;
		background: rgba(255, 0, 60, 0.1);
		border: 1px solid rgba(255, 0, 60, 0.3);
		border-radius: 0.375rem;
		color: var(--vanguard-red);
		font-size: 0.78rem;
	}

	.ch-error span { font-weight: 700; }

	/* ── Modal ─────────────────────────────────────────────────────────── */
	.ch-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9000;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}

	.ch-modal {
		width: 100%;
		max-width: 480px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.ch-modal--danger {
		border-color: rgba(255, 0, 60, 0.3);
	}

	.ch-modal__title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: var(--vanguard-cyan);
	}

	.ch-modal__title--danger { color: var(--vanguard-red); }

	.ch-modal__sub {
		margin: 0;
		font-size: 0.8rem;
		color: #9ca3af;
		line-height: 1.5;
	}

	.ch-modal__email {
		color: #e5e7eb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
	}

	.ch-modal__field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		color: #6b7280;
		text-transform: uppercase;
	}

	.ch-modal__input {
		background: var(--vanguard-glass);
		border: 1px solid var(--vanguard-border);
		border-radius: 0.375rem;
		padding: 0.6rem 0.875rem;
		color: #e5e7eb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.8rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.ch-modal__input:focus { border-color: var(--vanguard-cyan); }

	.ch-modal__input--danger:focus { border-color: var(--vanguard-red); }

	.ch-modal__actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.ch-modal__cancel {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #6b7280;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.ch-modal__cancel:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.25);
		color: #9ca3af;
	}

	.ch-modal__success {
		padding: 0.75rem 1rem;
		background: rgba(0, 240, 255, 0.1);
		border: 1px solid rgba(0, 240, 255, 0.3);
		border-radius: 0.375rem;
		color: var(--vanguard-cyan);
		font-size: 0.8rem;
		text-align: center;
	}

	.ch-modal__error {
		padding: 0.6rem 0.875rem;
		background: rgba(255, 0, 60, 0.1);
		border: 1px solid rgba(255, 0, 60, 0.3);
		border-radius: 0.375rem;
		color: var(--vanguard-red);
		font-size: 0.78rem;
	}

	/* ── Denied / access gate ──────────────────────────────────────────── */
	.ch-denied {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		gap: 0.5rem;
	}

	.ch-denied__icon { font-size: 2.5rem; }

	.ch-denied p {
		margin: 0;
		font-size: 0.85rem;
		letter-spacing: 0.12em;
		color: var(--vanguard-red);
		text-transform: uppercase;
	}

	.ch-denied__sub {
		font-size: 0.7rem !important;
		color: #6b7280 !important;
		text-transform: none !important;
	}

	/* ── Responsive ────────────────────────────────────────────────────── */
	@media (max-width: 640px) {
		.ch-stats { grid-template-columns: repeat(2, 1fr); }

		.ch-grid__header,
		.ch-grid__row {
			grid-template-columns: 1.5fr 1fr 1.25fr;
		}

		/* Hide expiry, source, actions on very small screens */
		.ch-grid__header span:nth-child(n+4),
		.ch-grid__row > div:nth-child(n+4) {
			display: none;
		}
	}
</style>
