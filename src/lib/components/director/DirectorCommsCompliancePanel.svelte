<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import {
		collection,
		getDocs,
		limit,
		orderBy,
		query,
		where,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let {
		clubId = '',
		teams = [],
	}: {
		clubId?: string;
		teams?: Array<{ id: string; name?: string }>;
	} = $props();

	let loading = $state(false);
	let exporting = $state(false);
	let err = $state('');

	/** @type {Array<Record<string, unknown>>} */
	let broadcasts = $state([]);
	/** @type {Array<Record<string, unknown>>} */
	let messagingAudit = $state([]);
	/** @type {Array<Record<string, unknown>>} */
	let broadcastAuditLogs = $state([]);
	/** @type {Array<Record<string, unknown>>} */
	let incidents = $state([]);

	const canView = $derived(authStore.isDirector || authStore.isAdmin);

	$effect(() => {
		if (!browser || !clubId || !canView) return;
		void loadConsole();
	});

	async function loadConsole() {
		if (!db || !authStore.isAuthenticated) return;
		if (!clubId) return;
		loading = true;
		err = '';
		try {
			const teamIds = teams.map((t) => t.id);
			const broadcastRows: Record<string, unknown>[] = [];
			const auditRows: Record<string, unknown>[] = [];

			await Promise.all(
				teamIds.map(async (teamId) => {
					const bq = query(
						collection(db, 'team_broadcasts'),
						where('teamId', '==', teamId),
						orderBy('createdAt', 'desc'),
						limit(25),
					);
					const bs = await getDocs(bq);
					for (const d of bs.docs) {
						const data = d.data();
						broadcastRows.push({
							id: d.id,
							teamId,
							subject: data.subject ?? null,
							bodyPreview: data.bodyPreview ?? null,
							fromEmail: data.fromEmail ?? null,
							fromRole: data.fromRole ?? null,
							parentNotified: data.parentNotified ?? false,
							ccParentCount: Array.isArray(data.ccParentEmails)
								? data.ccParentEmails.length
								: 0,
							recipientCount: data.recipientCount ?? 0,
							source: data.source ?? null,
							createdAt: data.createdAt?.toMillis?.() ?? null,
						});
					}

					const mq = query(
						collection(db, 'messaging_audit'),
						where('teamId', '==', teamId),
						limit(40),
					);
					const ms = await getDocs(mq);
					for (const d of ms.docs) {
						const data = d.data();
						auditRows.push({
							id: d.id,
							action: data.action ?? null,
							teamId,
							fromEmail: data.fromEmail ?? null,
							toPlayerEmail: data.toPlayerEmail ?? null,
							channelId: data.channelId ?? null,
							safesportMonitored: data.safesportMonitored ?? false,
							ccParentCount: Array.isArray(data.ccParentEmails)
								? data.ccParentEmails.length
								: 0,
							bodyPreview: data.bodyPreview ?? null,
							bodyLength: data.bodyLength ?? null,
							at: data.at?.toMillis?.() ?? null,
						});
					}
				}),
			);

			broadcastRows.sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
			auditRows.sort((a, b) => Number(b.at ?? 0) - Number(a.at ?? 0));

			const logQ = query(
				collection(db, 'audit_logs'),
				where('tenantId', '==', clubId),
				orderBy('timestamp', 'desc'),
				limit(80),
			);
			const logSnap = await getDocs(logQ);
			const logs = logSnap.docs
				.map((d) => {
					const data = d.data();
					return {
						id: d.id,
						action: data.action ?? null,
						actorEmail: data.actorEmail ?? null,
						tenantId: data.tenantId ?? null,
						notes: data.notes ?? null,
						extra: data.extra ?? null,
						timestamp: data.timestamp?.toMillis?.() ?? null,
					};
				})
				.filter((row) => String(row.action || '').includes('MESSAGE') || String(row.action || '').includes('BROADCAST'));

			broadcasts = broadcastRows.slice(0, 60);
			messagingAudit = auditRows.slice(0, 80);
			broadcastAuditLogs = logs;

			const incidentQ = query(
				collection(db, 'message_incidents'),
				where('clubId', '==', clubId),
				orderBy('createdAt', 'desc'),
				limit(40),
			);
			const incidentSnap = await getDocs(incidentQ);
			incidents = incidentSnap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					reason: data.reason ?? null,
					messageKind: data.messageKind ?? null,
					reporterEmail: data.reporterEmail ?? null,
					status: data.status ?? null,
					teamId: data.teamId ?? null,
					createdAt: data.createdAt?.toMillis?.() ?? null,
				};
			});
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not load comms compliance data.';
		} finally {
			loading = false;
		}
	}

	async function exportAudit() {
		if (!db || !authStore.isAuthenticated) return;
		exporting = true;
		try {
			if (broadcasts.length === 0 && messagingAudit.length === 0) {
				await loadConsole();
			}
			const payload = {
				generatedAt: new Date().toISOString(),
				generatedBy: authStore.user?.email ?? 'unknown',
				clubId,
				policy: 'SafeSport Comms Matrix — Epic 4.9 export',
				teamBroadcasts: broadcasts,
				messagingAudit,
				broadcastAuditLogs,
				messageIncidents: incidents,
				counts: {
					teamBroadcasts: broadcasts.length,
					messagingAudit: messagingAudit.length,
					broadcastAuditLogs: broadcastAuditLogs.length,
					messageIncidents: incidents.length,
				},
			};
			const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `comms-compliance-${clubId}-${new Date().toISOString().slice(0, 10)}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			exporting = false;
		}
	}

	function fmtTs(ms: unknown) {
		if (typeof ms !== 'number' || ms <= 0) return '—';
		return new Date(ms).toLocaleString();
	}
</script>

<section class="compliance-console" aria-labelledby="compliance-console-heading">
	<header class="compliance-console__head">
		<div>
			<h2 id="compliance-console-heading" class="compliance-console__title">Comms compliance console</h2>
			<p class="compliance-console__sub">
				Read-only view of team broadcasts, messaging audit records, and broadcast audit logs for your club.
				Export JSON for league SafeSport review.
			</p>
		</div>
		<button
			type="button"
			class="compliance-console__export"
			disabled={!clubId || exporting || loading}
			onclick={() => void exportAudit()}
		>
			{exporting ? 'Exporting…' : 'Export audit JSON'}
		</button>
	</header>

	{#if !canView}
		<p class="compliance-console__muted">Director access required.</p>
	{:else if loading}
		<p class="compliance-console__muted">Loading compliance records…</p>
	{:else if err}
		<p class="compliance-console__err" role="alert">{err}</p>
	{:else}
		<div class="compliance-console__grid">
			<div class="compliance-console__panel">
				<h3 class="compliance-console__panel-title">Team broadcasts ({broadcasts.length})</h3>
				{#if broadcasts.length === 0}
					<p class="compliance-console__muted">No broadcasts yet.</p>
				{:else}
					<ul class="compliance-console__list">
						{#each broadcasts.slice(0, 12) as row (row.id)}
							<li class="compliance-console__row">
								<strong>{row.subject || row.bodyPreview || 'Broadcast'}</strong>
								<span class="compliance-console__meta">
									{row.fromEmail} · team {row.teamId} · {fmtTs(row.createdAt)}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="compliance-console__panel">
				<h3 class="compliance-console__panel-title">Messaging audit ({messagingAudit.length})</h3>
				{#if messagingAudit.length === 0}
					<p class="compliance-console__muted">No monitored message audit rows.</p>
				{:else}
					<ul class="compliance-console__list">
						{#each messagingAudit.slice(0, 12) as row (row.id)}
							<li class="compliance-console__row">
								<strong>{row.action}</strong>
								<span class="compliance-console__meta">
									{row.fromEmail} → {row.toPlayerEmail || row.channelId || 'channel'} · {fmtTs(row.at)}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="compliance-console__panel compliance-console__panel--full">
				<h3 class="compliance-console__panel-title">Open incidents ({incidents.length})</h3>
				{#if incidents.length === 0}
					<p class="compliance-console__muted">No filed comms incidents.</p>
				{:else}
					<ul class="compliance-console__list">
						{#each incidents.slice(0, 10) as row (row.id)}
							<li class="compliance-console__row">
								<strong>{row.reason}</strong>
								<span class="compliance-console__meta">
									{row.reporterEmail} · {row.messageKind} · {row.status} · {fmtTs(row.createdAt)}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	.compliance-console {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px;
		border: 1px solid #334155;
		border-radius: 12px;
		background: #0f172a;
		margin-top: 16px;
	}

	.compliance-console__head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.compliance-console__title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		color: #f8fafc;
	}

	.compliance-console__sub {
		margin: 4px 0 0;
		font-size: 12px;
		line-height: 1.45;
		color: #94a3b8;
		max-width: 40rem;
	}

	.compliance-console__export {
		border: 1px solid #334155;
		border-radius: 8px;
		padding: 8px 14px;
		font-size: 12px;
		font-weight: 700;
		background: #1e293b;
		color: #e2e8f0;
		cursor: pointer;
	}

	.compliance-console__export:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.compliance-console__grid {
		display: grid;
		gap: 14px;
		grid-template-columns: 1fr;
	}

	@media (min-width: 900px) {
		.compliance-console__grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.compliance-console__panel {
		border: 1px solid #334155;
		border-radius: 10px;
		padding: 12px;
		background: #1e293b;
		min-width: 0;
	}

	.compliance-console__panel--full {
		grid-column: 1 / -1;
	}

	.compliance-console__panel-title {
		margin: 0 0 8px;
		font-size: 12px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #94a3b8;
	}

	.compliance-console__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.compliance-console__row {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 12px;
		color: #e2e8f0;
	}

	.compliance-console__meta {
		font-size: 11px;
		color: #64748b;
		font-family: ui-monospace, monospace;
	}

	.compliance-console__muted {
		margin: 0;
		font-size: 13px;
		color: #94a3b8;
	}

	.compliance-console__err {
		margin: 0;
		font-size: 12px;
		color: #f87171;
	}
</style>
