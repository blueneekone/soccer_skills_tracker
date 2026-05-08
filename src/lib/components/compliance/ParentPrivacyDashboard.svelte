<script lang="ts">
	/**
	 * ParentPrivacyDashboard.svelte
	 * ──────────────────────────────
	 * PARENT VIEW — "Who has seen my child's data?"
	 *
	 * Queries `audit_logs` for VIEW_PII / DOWNLOAD_PII / DOCUMENT_VERIFIED events
	 * targeting the child's email in the past 30 days.
	 *
	 * Each row shows:
	 *   • Action type (colour-coded: Ares Red for PII access)
	 *   • Actor email (who viewed)
	 *   • Document type
	 *   • Timestamp
	 *
	 * Zero-Trust: query uses the parent's authenticated session; Firestore rules
	 * enforce that a parent can only read logs for their linked child.
	 */

	import { browser } from '$app/environment';
	import {
		collection,
		query,
		where,
		orderBy,
		limit,
		getDocs,
		Timestamp,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	// ── Props ──────────────────────────────────────────────────────────────────
	interface Props {
		/** Email of the child (player) to display PII access for. */
		childEmail: string;
	}
	const { childEmail }: Props = $props();

	// ── Types ──────────────────────────────────────────────────────────────────
	interface AuditRow {
		id: string;
		action: string;
		actorEmail: string | null;
		documentType: string | null;
		notes: string | null;
		timestamp: Date | null;
	}

	const PII_ACTIONS = ['VIEW_PII', 'DOWNLOAD_PII', 'DOCUMENT_VERIFIED', 'DOCUMENT_BURNED'];
	const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

	// ── State ──────────────────────────────────────────────────────────────────
	let rows = $state<AuditRow[]>([]);
	let loading = $state(false);
	let error = $state('');

	// ── Load ───────────────────────────────────────────────────────────────────
	$effect(() => {
		if (!browser || !childEmail) return;
		load();
	});

	async function load() {
		loading = true;
		error = '';
		try {
			const cutoff = Timestamp.fromDate(new Date(Date.now() - THIRTY_DAYS_MS));
			const q = query(
				collection(db, 'audit_logs'),
				where('targetEmail', '==', childEmail.toLowerCase()),
				where('timestamp', '>=', cutoff),
				orderBy('timestamp', 'desc'),
				limit(50),
			);
			const snap = await getDocs(q);
			rows = snap.docs
				.map((d) => {
					const data = d.data();
					return {
						id: d.id,
						action: String(data.action ?? ''),
						actorEmail: data.actorEmail ? String(data.actorEmail) : null,
						documentType: data.documentType ? String(data.documentType) : null,
						notes: data.notes ? String(data.notes) : null,
						timestamp: data.timestamp?.toDate?.() ?? null,
					};
				})
				.filter((r) => PII_ACTIONS.includes(r.action));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load privacy log.';
		} finally {
			loading = false;
		}
	}

	function fmtDate(d: Date | null): string {
		if (!d) return '—';
		return d.toLocaleString('en-US', {
			month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit',
		});
	}

	function actionLabel(action: string): string {
		const map: Record<string, string> = {
			VIEW_PII:         'PII VIEWED',
			DOWNLOAD_PII:     'PII DOWNLOADED',
			DOCUMENT_VERIFIED:'DOC VERIFIED',
			DOCUMENT_BURNED:  'DOC BURNED',
		};
		return map[action] ?? action;
	}

	function actionColor(action: string): string {
		if (action === 'DOCUMENT_BURNED') return 'rgba(0, 240, 255, 0.7)';
		if (action === 'DOCUMENT_VERIFIED') return 'rgba(251, 146, 60, 0.75)';
		return 'rgba(255, 50, 80, 0.85)'; // Ares Red for any PII access
	}
</script>

<div class="ppd-root">
	<header class="ppd-header">
		<div class="ppd-header__left">
			<span class="ppd-eyebrow">PRIVACY DASHBOARD · 30-DAY LOG</span>
			<h2 class="ppd-title">WHO SAW YOUR CHILD'S DATA</h2>
		</div>
		<button class="ppd-refresh" onclick={load} disabled={loading} aria-label="Refresh log">
			{#if loading}
				<span class="ppd-refresh__spin" aria-hidden="true"></span>
			{:else}
				↺
			{/if}
		</button>
	</header>

	<p class="ppd-subtitle">
		Every time an authorised director or administrator accesses your child's private documents,
		the event is logged here. This log is immutable — no one can alter or delete these records.
	</p>

	{#if error}
		<div class="ppd-error" role="alert">{error}</div>
	{:else if loading}
		<div class="ppd-loading">
			<span class="ppd-loading__spin" aria-hidden="true"></span>
			Loading audit trail…
		</div>
	{:else if rows.length === 0}
		<div class="ppd-empty">
			<span class="ppd-empty__icon" aria-hidden="true">◈</span>
			<p>No access events in the past 30 days.</p>
			<p class="ppd-empty__sub">Your child's documents have not been accessed by any staff member.</p>
		</div>
	{:else}
		<div class="ppd-table-wrap" role="table" aria-label="PII access log">
			<div class="ppd-table-head" role="row">
				<span role="columnheader">ACTION</span>
				<span role="columnheader">ACCESSED BY</span>
				<span role="columnheader">DOCUMENT</span>
				<span role="columnheader">TIMESTAMP</span>
			</div>
			{#each rows as row (row.id)}
				<div class="ppd-row" role="row">
					<span class="ppd-cell ppd-cell--action" style:color={actionColor(row.action)}>
						<span class="ppd-dot" style:background={actionColor(row.action)} aria-hidden="true"></span>
						{actionLabel(row.action)}
					</span>
					<span class="ppd-cell ppd-cell--mono">
						{row.actorEmail ?? '— system —'}
					</span>
					<span class="ppd-cell ppd-cell--dim">
						{row.documentType ?? '—'}
					</span>
					<span class="ppd-cell ppd-cell--mono ppd-cell--dim">
						{fmtDate(row.timestamp)}
					</span>
				</div>
			{/each}
		</div>

		<p class="ppd-legal">
			This log is maintained under COPPA 2026 requirements. For data deletion requests,
			contact your club director.
		</p>
	{/if}
</div>

<style>
	.ppd-root {
		background: rgba(6, 8, 16, 0.92);
		border: 1px solid rgba(255, 50, 80, 0.2);
		border-radius: 12px;
		overflow: hidden;
		font-family: 'JetBrains Mono', monospace;
	}

	.ppd-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 1.25rem 1.5rem 1rem;
		background: rgba(255, 50, 80, 0.04);
		border-bottom: 1px solid rgba(255, 50, 80, 0.12);
	}

	.ppd-eyebrow {
		display: block;
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(255, 50, 80, 0.6);
		margin-bottom: 0.3rem;
	}

	.ppd-title {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: #fff;
	}

	.ppd-refresh {
		width: 32px; height: 32px;
		display: flex; align-items: center; justify-content: center;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.4);
		font-size: 1rem;
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.15s;
	}
	.ppd-refresh:hover:not(:disabled) { border-color: rgba(0, 240, 255, 0.3); color: #00f0ff; }
	.ppd-refresh:disabled { opacity: 0.4; cursor: not-allowed; }
	.ppd-refresh__spin {
		width: 14px; height: 14px;
		border: 2px solid rgba(0, 240, 255, 0.25);
		border-top-color: #00f0ff;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	.ppd-subtitle {
		margin: 0;
		padding: 0.875rem 1.5rem;
		font-size: 0.72rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.35);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	/* ── States ─────────────────────────────────────────────────────────────── */
	.ppd-loading, .ppd-empty {
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		gap: 0.5rem;
		padding: 3rem 2rem;
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.75rem;
	}
	.ppd-loading__spin {
		width: 20px; height: 20px;
		border: 2px solid rgba(0, 240, 255, 0.2);
		border-top-color: #00f0ff;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	.ppd-empty__icon { font-size: 1.75rem; opacity: 0.25; }
	.ppd-empty p { margin: 0; }
	.ppd-empty__sub { font-size: 0.65rem; color: rgba(255, 255, 255, 0.2); text-align: center; }

	.ppd-error {
		margin: 1rem 1.5rem;
		padding: 0.6rem 0.875rem;
		background: rgba(255, 50, 80, 0.08);
		border: 1px solid rgba(255, 50, 80, 0.2);
		border-radius: 6px;
		color: rgba(255, 50, 80, 0.85);
		font-size: 0.72rem;
	}

	/* ── Table ───────────────────────────────────────────────────────────────── */
	.ppd-table-wrap { display: grid; }

	.ppd-table-head, .ppd-row {
		display: grid;
		grid-template-columns: 160px 1fr 140px 160px;
		gap: 0;
		padding: 0.55rem 1.5rem;
		align-items: center;
	}

	.ppd-table-head {
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: rgba(255, 255, 255, 0.2);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.ppd-row {
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: background 0.15s;
	}
	.ppd-row:hover { background: rgba(255, 255, 255, 0.02); }

	.ppd-cell {
		font-size: 0.68rem;
		padding: 0.2rem 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ppd-cell--action {
		display: flex; align-items: center; gap: 0.4rem;
		font-weight: 700; font-size: 0.6rem; letter-spacing: 0.1em;
	}
	.ppd-cell--mono { font-family: 'JetBrains Mono', monospace; }
	.ppd-cell--dim { color: rgba(255, 255, 255, 0.4); }

	.ppd-dot {
		width: 6px; height: 6px;
		border-radius: 50%; flex-shrink: 0;
		box-shadow: 0 0 4px currentColor;
	}

	.ppd-legal {
		margin: 0;
		padding: 0.75rem 1.5rem;
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.2);
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		line-height: 1.55;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	@media (max-width: 600px) {
		.ppd-table-head, .ppd-row {
			grid-template-columns: 140px 1fr;
		}
		.ppd-cell:nth-child(3), .ppd-cell:nth-child(4),
		[role=columnheader]:nth-child(3), [role=columnheader]:nth-child(4) {
			display: none;
		}
	}
</style>
