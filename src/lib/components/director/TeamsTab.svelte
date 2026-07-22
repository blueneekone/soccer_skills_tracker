<script lang="ts">
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import { db, functions } from '$lib/firebase.js';
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import { doc, setDoc, collection, query, where, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
	import { isSubscriptionReadOnly } from '$lib/auth/billing.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import StateRosterExportPanel from '$lib/components/director/StateRosterExportPanel.svelte';

	let { clubId = '' } = $props();

	/** @type {() => void} */
	const openReadOnlyUpgrade = (getContext('openReadOnlyUpgrade') as (() => void) | undefined) ?? (() => {});

	const isReadOnly = $derived(
		isSubscriptionReadOnly(
			authStore.role,
			licenseEntitlementStore.clubIdResolved,
			licenseEntitlementStore.entitlement,
			{
				clubInfinite: licenseEntitlementStore.isInfiniteClub,
				billingModel: licenseEntitlementStore.billingModel,
			},
		),
	);



	// ── Adaptive UI state ──────────────────────────────────────────────────
	let searchQuery    = $state('');
	let statusFilter   = $state(/** @type {'all'|'active'|'pending_invite'|'unassigned'} */ ('all'));
	let selectedTeamIds = $state(/** @type {string[]} */ ([]));
	let isDenseMode    = $state(false);
	let showCreateForm = $state(false);

	// ── Write-op state ────────────────────────────────────────────────────
	let newTeamName    = $state('');
	let newCoachEmail  = $state('');
	let saving         = $state(false);
	let batchWorking   = $state(false);

	/** @type {Record<string, string>} */
	let inlineInviteEmail  = $state({});
	/** @type {Record<string, boolean>} */
	let inlineInviteSaving = $state({});
	/** @type {Record<string, boolean>} */
	let showInlineInvite   = $state({});

	// ── Live pending-invite subscription ──────────────────────────────────
	/**
	 * @typedef {{ id: string; teamId: string; coachEmail: string }} PendingInvite
	 */
	let pendingInvites = $state(/** @type {PendingInvite[]} */ ([]));

	$effect(() => {
		if (!clubId) { pendingInvites = []; return; }
		const q = query(
			collection(db, 'coach_invites'),
			where('clubId', '==', clubId),
			where('status', '==', 'pending'),
			orderBy('createdAt', 'desc'),
		);
		const unsub = onSnapshot(q, (snap) => {
			pendingInvites = snap.docs.map((d) => {
				const x = d.data();
				return {
					id: d.id,
					teamId:     typeof x.teamId     === 'string' ? x.teamId     : '',
					coachEmail: typeof x.coachEmail === 'string' ? x.coachEmail : '',
				};
			});
		}, (err) => {
			console.warn('[TeamsTab] coach_invites snapshot error', err);
		});
		return () => unsub();
	});

	const pendingInviteTeamIds = $derived(new Set(pendingInvites.map((i) => i.teamId)));

	// ── Derived matrix ────────────────────────────────────────────────────
	const allClubTeams = $derived(teamsStore.teams.filter((t) => t.clubId === clubId));

	const filteredTeams = $derived(
		allClubTeams
			.filter((t) => {
				if (!searchQuery) return true;
				const q = searchQuery.toLowerCase();
				return (
					t.name?.toLowerCase().includes(q) ||
					t.id.toLowerCase().includes(q) ||
					t.coachEmail?.toLowerCase().includes(q)
				);
			})
			.filter((t) => {
				if (statusFilter === 'all')          return true;
				if (statusFilter === 'pending_invite') return pendingInviteTeamIds.has(t.id);
				if (statusFilter === 'unassigned')   return !t.coachEmail && !pendingInviteTeamIds.has(t.id);
				if (statusFilter === 'active')       return !!t.coachEmail && !pendingInviteTeamIds.has(t.id);
				return true;
			}),
	);

	const allFilteredSelected = $derived(
		filteredTeams.length > 0 && filteredTeams.every((t) => selectedTeamIds.includes(t.id)),
	);

	const vacantCount  = $derived(allClubTeams.filter((t) => !t.coachEmail && !pendingInviteTeamIds.has(t.id)).length);
	const pendingCount = $derived(allClubTeams.filter((t) => pendingInviteTeamIds.has(t.id)).length);

	// ── Status helpers ────────────────────────────────────────────────────
	/** @param {{ id: string; coachEmail?: string }} t */
	function teamStatusLabel(t) {
		if (pendingInviteTeamIds.has(t.id)) return 'PENDING';
		if (t.coachEmail) return 'ACTIVE';
		return 'VACANT';
	}

	/** @param {{ id: string; coachEmail?: string }} t */
	function teamStatusClass(t) {
		if (pendingInviteTeamIds.has(t.id)) return 'status--pending';
		if (t.coachEmail) return 'status--active';
		return 'status--vacant';
	}

	// ── Selection helpers ─────────────────────────────────────────────────
	/** @param {string} id */
	function toggleSelect(id) {
		if (selectedTeamIds.includes(id)) {
			selectedTeamIds = selectedTeamIds.filter((x) => x !== id);
		} else {
			selectedTeamIds = [...selectedTeamIds, id];
		}
	}

	function toggleSelectAll() {
		if (allFilteredSelected) {
			selectedTeamIds = selectedTeamIds.filter((id) => !filteredTeams.some((t) => t.id === id));
		} else {
			const add = filteredTeams.map((t) => t.id).filter((id) => !selectedTeamIds.includes(id));
			selectedTeamIds = [...selectedTeamIds, ...add];
		}
	}

	// ── Drawer ────────────────────────────────────────────────────────────
	/** @param {{ id: string; name?: string }} t */
	function openTeamDrawer(t) {
		enterprisePlayerDrawer.open({
			title: t.name || t.id,
			meta: t.id,
			body: `Team ID: ${t.id}\nClub: ${clubId || '—'}\n\nManage seat allocation under Licenses & Seats.`,
		});
	}

	// ── Client Batch Invite Coach ─────────────────────────────────────────
	async function clientBatchInviteCoach(teamId, coachEmail) {
		const emailLower = coachEmail.toLowerCase().trim();
		if (!emailLower) throw new Error('Email is required.');
		const batch = writeBatch(db);
		
		batch.set(doc(db, 'coach_lookup', emailLower), {
			teamId,
			clubId,
			role: 'coach',
			invitedAt: new Date()
		}, { merge: true });
		
		batch.set(doc(db, 'users', emailLower), {
			teamId,
			clubId,
			role: 'coach'
		}, { merge: true });
		
		await batch.commit();
	}

	// ── Create team ───────────────────────────────────────────────────────
	const createTeam = async () => {
		if (isReadOnly) { openReadOnlyUpgrade(); return; }
		if (!clubId)              return alert('No club on your profile.');
		if (!newTeamName.trim())  return alert('Please enter a team name.');
		const slug   = newTeamName.toLowerCase().replace(/[^a-z0-9]/g, '');
		const teamId = `${clubId}_${slug}`;
		saving = true;
		try {
			await setDoc(doc(db, 'teams', teamId), {
				clubId,
				name: newTeamName.trim(),
				createdAt: new Date(),
			});
			let msg = '';
			if (newCoachEmail.trim()) {
				try {
					await clientBatchInviteCoach(teamId, newCoachEmail.trim());
					msg = ' Coach invite queued.';
				} catch (ie) {
					const m = ie instanceof Error ? ie.message : String(ie);
					msg = ` Team created — coach invite failed: ${m}`;
				}
			}
			alert(`Squad "${newTeamName.trim()}" provisioned.${msg}`);
			newTeamName   = '';
			newCoachEmail = '';
			showCreateForm = false;
			await teamsStore.load('director', { clubId, scope: 'club', routePath: page.url.pathname });
		} catch (e) {
			alert('Error: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			saving = false;
		}
	};

	// ── Inline coach invite (per-card) ────────────────────────────────────
	/** @param {string} teamId */
	async function inviteCoachInline(teamId) {
		if (isReadOnly) { openReadOnlyUpgrade(); return; }
		const email = inlineInviteEmail[teamId]?.trim();
		if (!email) return;
		inlineInviteSaving = { ...inlineInviteSaving, [teamId]: true };
		try {
			await clientBatchInviteCoach(teamId, email);
			alert(`Coach invite sent to ${email}.`);
			inlineInviteEmail  = { ...inlineInviteEmail,  [teamId]: '' };
			showInlineInvite   = { ...showInlineInvite,   [teamId]: false };
		} catch (e) {
			alert('Invite failed: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			inlineInviteSaving = { ...inlineInviteSaving, [teamId]: false };
		}
	}

	// ── Batch: bulk seat-reminder re-invite ───────────────────────────────
	async function bulkSeatReminder() {
		if (!selectedTeamIds.length || batchWorking) return;
		batchWorking = true;
		let sent = 0, failed = 0;
		for (const teamId of selectedTeamIds) {
			const inv   = pendingInvites.find((i) => i.teamId === teamId);
			const team  = allClubTeams.find((t) => t.id === teamId);
			const email = inv?.coachEmail || team?.coachEmail;
			if (!email) continue;
			try {
				await clientBatchInviteCoach(teamId, email);
				sent++;
			} catch { failed++; }
		}
		batchWorking = false;
		alert(`Seat reminder dispatched to ${sent} coach(es).${failed ? ` ${failed} failed.` : ''}`);
	}

	// ── Batch: CSV roster export to clipboard ─────────────────────────────
	async function exportRosters() {
		const header = ['Team Name', 'Team ID', 'Club ID', 'Coach Email', 'Status'];
		const rows   = selectedTeamIds.map((id) => {
			const t = allClubTeams.find((x) => x.id === id);
			if (!t) return null;
			return [
				t.name || id,
				t.id,
				clubId,
				t.coachEmail || '—',
				teamStatusLabel(t),
			];
		}).filter(Boolean);
		const csv = [header, ...rows].map((r) => (r ?? []).map((c) => `"${c}"`).join(',')).join('\n');
		try {
			await navigator.clipboard.writeText(csv);
			alert(`${rows.length} squad record(s) copied to clipboard (CSV).`);
		} catch {
			alert('Clipboard write failed.\n\n' + csv);
		}
	}
</script>

<!-- ══════════════════════════════════════════════════════════════════════ -->
<!-- ADAPTIVE DENSITY MATRIX — DIRECTOR TEAMS HUB                          -->
<!-- ══════════════════════════════════════════════════════════════════════ -->

<StateRosterExportPanel {clubId} />

<!-- ── Control Bar ──────────────────────────────────────────────────────── -->
<div class="tt-control-bar">
	<div class="tt-search-wrap">
		<Icon name="action.search" class="tt-search-icon" size={15} />
		<input
			type="search"
			bind:value={searchQuery}
			placeholder="Search squads, IDs, coaches…"
			class="tt-search-input"
			aria-label="Search teams"
		/>
		{#if searchQuery}
			<button class="tt-search-clear" onclick={() => (searchQuery = '')} aria-label="Clear search">
				<Icon name="sys.close" />
			</button>
		{/if}
	</div>

	<div class="tt-filter-row">
		<div class="tt-segments" role="group" aria-label="Status filter">
			{#each [['all', 'ALL'], ['active', 'ACTIVE'], ['pending_invite', 'PENDING'], ['unassigned', 'VACANT']] as [val, label] (val)}
				<button
					class="tt-seg"
					class:tt-seg--on={statusFilter === val}
					onclick={() => (statusFilter = /** @type {any} */ (val))}
				>{label}</button>
			{/each}
		</div>

		<div class="tt-control-actions">
			<label class="tt-dense-toggle" title="Toggle high-density matrix view">
				<input type="checkbox" bind:checked={isDenseMode} class="tt-dense-cb" />
				<span class="tt-dense-track"><span class="tt-dense-thumb"></span></span>
				<span class="tt-dense-lbl">MATRIX</span>
			</label>

			<button
				class="tt-new-btn"
				class:tt-new-btn--active={showCreateForm}
				onclick={() => (showCreateForm = !showCreateForm)}
			>
				<Icon name="action.add" />
				<span>NEW SQUAD</span>
			</button>
		</div>
	</div>
</div>

<!-- ── Create Form (collapsible) ────────────────────────────────────────── -->
{#if showCreateForm}
	<div class="tt-create-panel">
		<div class="tt-create-panel__inner">
			<p class="tt-create-panel__head">
				<Icon name="status.shield-plus" /> PROVISION NEW SQUAD
			</p>
			<div class="tt-create-fields">
				<div class="tt-field-group">
					<label for="tt-new-name" class="tt-label">Squad Label</label>
					<input
						id="tt-new-name"
						type="text"
						bind:value={newTeamName}
						placeholder="U12 Gold"
						class="tt-input"
					/>
				</div>
				<div class="tt-field-group">
					<label for="tt-new-coach" class="tt-label">Head Coach Email <span class="tt-label-opt">(optional)</span></label>
					<input
						id="tt-new-coach"
						type="email"
						bind:value={newCoachEmail}
						placeholder="coach@club.com"
						class="tt-input"
					/>
				</div>
				<div class="tt-create-actions">
					<button
						class="tt-create-submit"
						class:tt-create-submit--readonly={isReadOnly}
						onclick={createTeam}
						disabled={saving}
					>
						{saving ? 'PROVISIONING…' : 'PROVISION SQUAD'}
					</button>
					<button class="tt-create-cancel" onclick={() => (showCreateForm = false)}>CANCEL</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- ── Telemetry Strip ───────────────────────────────────────────────────── -->
<div class="tt-telem-strip">
	<span class="tt-telem-cell">
		<span class="tt-telem-val">{allClubTeams.length}</span>
		<span class="tt-telem-lbl">TOTAL</span>
	</span>
	<span class="tt-telem-div"></span>
	<span class="tt-telem-cell">
		<span class="tt-telem-val tt-val--active">{allClubTeams.length - vacantCount - pendingCount}</span>
		<span class="tt-telem-lbl">ACTIVE</span>
	</span>
	<span class="tt-telem-div"></span>
	<span class="tt-telem-cell">
		<span class="tt-telem-val tt-val--pending">{pendingCount}</span>
		<span class="tt-telem-lbl">PENDING</span>
	</span>
	<span class="tt-telem-div"></span>
	<span class="tt-telem-cell">
		<span class="tt-telem-val tt-val--vacant">{vacantCount}</span>
		<span class="tt-telem-lbl">VACANT</span>
	</span>
	{#if filteredTeams.length !== allClubTeams.length}
		<span class="tt-telem-div"></span>
		<span class="tt-telem-cell tt-telem-cell--filter">
			<span class="tt-telem-val">{filteredTeams.length}</span>
			<span class="tt-telem-lbl">FILTERED</span>
		</span>
	{/if}
</div>

<!-- ── Empty State ───────────────────────────────────────────────────────── -->
{#if filteredTeams.length === 0}
	<div class="tt-empty">
		<Icon name="status.shield-ban" class="tt-empty-icon" size={40} />
		<p class="tt-empty-head">
			{#if searchQuery || statusFilter !== 'all'}
				No squads match the current filters.
			{:else}
				No squads provisioned yet.
			{/if}
		</p>
		{#if !searchQuery && statusFilter === 'all'}
			<button class="tt-empty-cta" onclick={() => (showCreateForm = true)}>
				<Icon name="action.add" /> Provision First Squad
			</button>
		{/if}
	</div>

<!-- ── Dense Matrix View ────────────────────────────────────────────────── -->
{:else if isDenseMode}
	<div class="tt-matrix" role="table" aria-label="Teams matrix">
		<!-- Header row -->
		<div class="tt-matrix-head" role="row">
			<div class="tt-matrix-cell tt-matrix-cell--cb" role="columnheader">
				<input
					type="checkbox"
					checked={allFilteredSelected}
					onchange={toggleSelectAll}
					aria-label="Select all visible squads"
					class="tt-cb"
				/>
			</div>
			<div class="tt-matrix-cell tt-matrix-cell--name"  role="columnheader">SQUAD</div>
			<div class="tt-matrix-cell tt-matrix-cell--id"    role="columnheader">ID</div>
			<div class="tt-matrix-cell tt-matrix-cell--coach" role="columnheader">COACH</div>
			<div class="tt-matrix-cell tt-matrix-cell--status" role="columnheader">STATUS</div>
			<div class="tt-matrix-cell tt-matrix-cell--acts"  role="columnheader">ACTIONS</div>
		</div>

		{#each filteredTeams as t (t.id)}
			{@const selected = selectedTeamIds.includes(t.id)}
			<div
				class="tt-matrix-row"
				class:tt-matrix-row--sel={selected}
				role="row"
				aria-selected={selected}
			>
				<div class="tt-matrix-cell tt-matrix-cell--cb" role="cell">
					<input
						type="checkbox"
						checked={selected}
						onchange={() => toggleSelect(t.id)}
						aria-label="Select {t.name || t.id}"
						class="tt-cb"
					/>
				</div>
				<div class="tt-matrix-cell tt-matrix-cell--name" role="cell">
					<span class="tt-m-name">{t.name || t.id}</span>
				</div>
				<div class="tt-matrix-cell tt-matrix-cell--id" role="cell">
					<code class="tt-m-code">{t.id}</code>
				</div>
				<div class="tt-matrix-cell tt-matrix-cell--coach" role="cell">
					<span class="tt-m-coach">{t.coachEmail || '—'}</span>
				</div>
				<div class="tt-matrix-cell tt-matrix-cell--status" role="cell">
					<span class="tt-status-badge {teamStatusClass(t)}">{teamStatusLabel(t)}</span>
				</div>
				<div class="tt-matrix-cell tt-matrix-cell--acts" role="cell">
					<a
						href="/admin/organizations/{clubId}/teams/{t.id}/roster"
						class="tt-act-link"
					>ROSTER</a>
					<button
						class="tt-act-btn"
						onclick={() => openTeamDrawer(t)}
					>INSPECT</button>
				</div>
			</div>
		{/each}
	</div>

<!-- ── Card Swimlane View ────────────────────────────────────────────────── -->
{:else}
	<div class="tt-card-grid">
		{#each filteredTeams as t (t.id)}
			{@const selected = selectedTeamIds.includes(t.id)}
			{@const showInvForm = showInlineInvite[t.id]}
			<div
				class="tt-squad-card"
				class:tt-squad-card--sel={selected}
				class:tt-squad-card--pending={pendingInviteTeamIds.has(t.id)}
			>
				<!-- Card header -->
				<div class="tt-card-head">
					<label class="tt-card-cb-wrap" aria-label="Select {t.name || t.id}">
						<input
							type="checkbox"
							checked={selected}
							onchange={() => toggleSelect(t.id)}
							class="tt-cb"
						/>
					</label>
					<div class="tt-card-identity">
						<p class="tt-card-name">{t.name || t.id}</p>
						<code class="tt-card-id">{t.id}</code>
					</div>
					<span class="tt-status-badge {teamStatusClass(t)}">{teamStatusLabel(t)}</span>
				</div>

				<!-- Coach row -->
				<div class="tt-card-coach-row">
					<Icon name="user.avatar" class="tt-coach-icon" size={14} />
					<span class="tt-coach-email">{t.coachEmail || 'No coach assigned'}</span>
				</div>

				<!-- Card actions -->
				<div class="tt-card-acts">
					<a
						href="/admin/organizations/{clubId}/teams/{t.id}/roster"
						class="tt-card-act-link"
					>
						<Icon name="user.group" /> ROSTER
					</a>
					<button
						class="tt-card-act-btn"
						onclick={() => openTeamDrawer(t)}
					>
						<Icon name="nav.sidebar" /> INSPECT
					</button>
					{#if !t.coachEmail}
						<button
							class="tt-card-act-invite"
							onclick={() => (showInlineInvite = { ...showInlineInvite, [t.id]: !showInvForm })}
						>
							<Icon name="comm.mail-open" /> INVITE
						</button>
					{/if}
				</div>

				<!-- Inline invite form -->
				{#if showInvForm}
					<div class="tt-inline-invite">
						<input
							type="email"
							bind:value={inlineInviteEmail[t.id]}
							placeholder="coach@club.com"
							class="tt-input tt-input--sm"
							aria-label="Coach email for {t.name || t.id}"
						/>
						<button
							class="tt-invite-send"
							onclick={() => inviteCoachInline(t.id)}
							disabled={inlineInviteSaving[t.id]}
						>
							{inlineInviteSaving[t.id] ? '…' : 'SEND'}
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<!-- ── Batch Command Dock ──────────────────────────────────────────────── -->
{#if selectedTeamIds.length > 0}
	<div class="tt-batch-dock" role="toolbar" aria-label="Batch command dock">
		<span class="tt-batch-count">
			<span class="tt-batch-count-num">{selectedTeamIds.length}</span>
			<span class="tt-batch-count-lbl">SQUAD{selectedTeamIds.length !== 1 ? 'S' : ''} SELECTED</span>
		</span>

		<div class="tt-batch-divider"></div>

		<button
			class="tt-batch-action"
			onclick={bulkSeatReminder}
			disabled={batchWorking}
			title="Re-dispatch seat reservation reminder to pending coaches"
		>
			<Icon name="comm.mail-open" />
			<span>BULK SEAT REMINDER</span>
		</button>

		<button
			class="tt-batch-action"
			onclick={exportRosters}
			disabled={batchWorking}
			title="Copy multi-squad CSV roster extract to clipboard"
		>
			<Icon name="action.download" />
			<span>EXPORT CSV</span>
		</button>

		<div class="tt-batch-divider"></div>

		<button
			class="tt-batch-clear"
			onclick={() => (selectedTeamIds = [])}
			aria-label="Clear selection"
		>
			<Icon name="sys.close" />
		</button>
	</div>
{/if}

<style>
	/* ── Design tokens ─────────────────────────────────────────────────── */
	:root {
		--tt-bg:       #020202;
		--tt-glass:    rgba(20, 184, 166, 0.03);
		--tt-border:   rgba(20, 184, 166, 0.14);
		--tt-accent:   #14b8a6;
		--tt-orange:   #f97316;
		--tt-pending:  #f59e0b;
		--tt-vacant:   rgba(248, 250, 252, 0.35);
		--tt-mono:     'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
	}

	/* ── Control Bar ───────────────────────────────────────────────────── */
	.tt-control-bar {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 16px;
	}

	.tt-search-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.tt-search-icon {
		position: absolute;
		left: 12px;
		width: 15px;
		height: 15px;
		color: rgba(20, 184, 166, 0.5);
		pointer-events: none;
	}

	.tt-search-input {
		width: 100%;
		padding: 9px 36px 9px 36px;
		background: rgba(20, 184, 166, 0.04);
		border: 1px solid var(--tt-border);
		border-radius: 10px;
		color: #f8fafc;
		font-family: var(--tt-mono);
		font-size: 12px;
		letter-spacing: 0.03em;
		outline: none;
		transition: border-color 0.2s, box-shadow 0.2s;
		appearance: none;
		-webkit-appearance: none;
	}

	.tt-search-input::placeholder { color: rgba(248, 250, 252, 0.25); }

	.tt-search-input:focus {
		border-color: rgba(20, 184, 166, 0.45);
		box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.08);
	}

	.tt-search-clear {
		position: absolute;
		right: 10px;
		background: none;
		border: none;
		color: rgba(248, 250, 252, 0.4);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		font-size: 14px;
		transition: color 0.15s;
	}
	.tt-search-clear:hover { color: #f8fafc; }

	.tt-filter-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.tt-segments {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.tt-seg {
		padding: 5px 10px;
		border-radius: 6px;
		border: 1px solid rgba(20, 184, 166, 0.12);
		background: rgba(20, 184, 166, 0.03);
		color: rgba(248, 250, 252, 0.45);
		font-family: var(--tt-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.12em;
		cursor: pointer;
		transition: all 0.15s;
		pointer-events: auto;
	}
	.tt-seg:hover { border-color: rgba(20, 184, 166, 0.3); color: rgba(248, 250, 252, 0.7); }
	.tt-seg--on {
		border-color: var(--tt-accent);
		background: rgba(20, 184, 166, 0.1);
		color: var(--tt-accent);
		box-shadow: 0 0 8px rgba(20, 184, 166, 0.15);
	}

	.tt-control-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	/* Dense toggle */
	.tt-dense-toggle {
		display: flex;
		align-items: center;
		gap: 7px;
		cursor: pointer;
		user-select: none;
	}
	.tt-dense-cb { display: none; }
	.tt-dense-track {
		width: 30px;
		height: 17px;
		border-radius: 99px;
		background: rgba(20, 184, 166, 0.1);
		border: 1px solid var(--tt-border);
		position: relative;
		transition: background 0.2s;
	}
	.tt-dense-toggle:has(.tt-dense-cb:checked) .tt-dense-track {
		background: rgba(20, 184, 166, 0.25);
		border-color: var(--tt-accent);
	}
	.tt-dense-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: rgba(248, 250, 252, 0.4);
		transition: left 0.2s, background 0.2s;
	}
	.tt-dense-toggle:has(.tt-dense-cb:checked) .tt-dense-thumb {
		left: 15px;
		background: var(--tt-accent);
	}
	.tt-dense-lbl {
		font-family: var(--tt-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: rgba(248, 250, 252, 0.45);
	}

	/* New squad button */
	.tt-new-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: 8px;
		border: 1px solid rgba(20, 184, 166, 0.3);
		background: rgba(20, 184, 166, 0.06);
		color: var(--tt-accent);
		font-family: var(--tt-mono);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.15s;
		pointer-events: auto;
	}
	.tt-new-btn:hover,
	.tt-new-btn--active {
		background: rgba(20, 184, 166, 0.12);
		box-shadow: 0 0 12px rgba(20, 184, 166, 0.2);
	}

	/* ── Create Panel ──────────────────────────────────────────────────── */
	.tt-create-panel {
		margin-bottom: 16px;
		border-radius: 12px;
		border: 1px solid rgba(20, 184, 166, 0.2);
		background: rgba(20, 184, 166, 0.03);
		backdrop-filter: blur(24px);
		overflow: hidden;
	}
	.tt-create-panel__inner { padding: 18px 20px; }
	.tt-create-panel__head {
		margin: 0 0 14px;
		font-family: var(--tt-mono);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.14em;
		color: var(--tt-accent);
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.tt-create-fields {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 10px;
		align-items: end;
	}
	@media (max-width: 640px) {
		.tt-create-fields { grid-template-columns: 1fr; }
	}
	.tt-field-group { display: flex; flex-direction: column; gap: 5px; }
	.tt-label {
		font-family: var(--tt-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(248, 250, 252, 0.45);
	}
	.tt-label-opt { opacity: 0.6; font-weight: 400; }
	.tt-input {
		padding: 8px 12px;
		background: rgba(2, 8, 23, 0.7);
		border: 1px solid var(--tt-border);
		border-radius: 8px;
		color: #f8fafc;
		font-family: var(--tt-mono);
		font-size: 12px;
		outline: none;
		transition: border-color 0.2s;
		width: 100%;
		box-sizing: border-box;
	}
	.tt-input:focus { border-color: rgba(20, 184, 166, 0.45); }
	.tt-input--sm { padding: 6px 10px; font-size: 11px; }
	.tt-create-actions { display: flex; gap: 8px; align-items: center; }
	.tt-create-submit {
		padding: 8px 18px;
		border-radius: 8px;
		border: 1px solid rgba(20, 184, 166, 0.4);
		background: rgba(20, 184, 166, 0.1);
		color: var(--tt-accent);
		font-family: var(--tt-mono);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.tt-create-submit:hover { background: rgba(20, 184, 166, 0.18); }
	.tt-create-submit--readonly { opacity: 0.6; cursor: not-allowed; filter: grayscale(0.3); }
	.tt-create-cancel {
		background: none;
		border: 1px solid rgba(248, 250, 252, 0.1);
		border-radius: 8px;
		color: rgba(248, 250, 252, 0.4);
		font-family: var(--tt-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		padding: 8px 12px;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.tt-create-cancel:hover { border-color: rgba(248, 250, 252, 0.25); color: rgba(248, 250, 252, 0.6); }

	/* ── Telemetry Strip ───────────────────────────────────────────────── */
	.tt-telem-strip {
		display: flex;
		align-items: center;
		gap: 0;
		margin-bottom: 16px;
		padding: 10px 16px;
		border-radius: 10px;
		border: 1px solid var(--tt-border);
		background: rgba(20, 184, 166, 0.02);
	}
	.tt-telem-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		flex: 1;
	}
	.tt-telem-cell--filter { opacity: 0.7; }
	.tt-telem-val {
		font-family: var(--tt-mono);
		font-size: 18px;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: #f8fafc;
		line-height: 1;
	}
	.tt-val--active  { color: var(--tt-accent); }
	.tt-val--pending { color: var(--tt-pending); }
	.tt-val--vacant  { color: rgba(248, 250, 252, 0.35); }
	.tt-telem-lbl {
		font-family: var(--tt-mono);
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: rgba(248, 250, 252, 0.35);
	}
	.tt-telem-div {
		width: 1px;
		height: 28px;
		background: var(--tt-border);
		flex-shrink: 0;
	}

	/* ── Status badge ──────────────────────────────────────────────────── */
	.tt-status-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: 99px;
		font-family: var(--tt-mono);
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.14em;
		border: 1px solid transparent;
	}
	.status--active  { color: var(--tt-accent);   border-color: rgba(20, 184, 166,0.25); background: rgba(20, 184, 166,0.08); }
	.status--pending { color: var(--tt-pending);   border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.08); }
	.status--vacant  { color: rgba(248,250,252,0.4); border-color: rgba(248,250,252,0.1); background: rgba(248,250,252,0.04); }

	/* ── Empty State ───────────────────────────────────────────────────── */
	.tt-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 60px 24px;
		text-align: center;
	}
	.tt-empty-icon { width: 40px; height: 40px; color: rgba(20, 184, 166, 0.2); }
	.tt-empty-head {
		margin: 0;
		font-family: var(--tt-mono);
		font-size: 13px;
		font-weight: 600;
		color: rgba(248, 250, 252, 0.4);
	}
	.tt-empty-cta {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 18px;
		border-radius: 8px;
		border: 1px solid rgba(20, 184, 166, 0.3);
		background: rgba(20, 184, 166, 0.06);
		color: var(--tt-accent);
		font-family: var(--tt-mono);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.15s;
	}
	.tt-empty-cta:hover { background: rgba(20, 184, 166, 0.12); }

	/* ── Dense Matrix ──────────────────────────────────────────────────── */
	.tt-matrix {
		border: 1px solid var(--tt-border);
		border-radius: 12px;
		overflow: hidden;
		background: rgba(20, 184, 166, 0.015);
		margin-bottom: 80px;
	}
	.tt-matrix-head {
		display: grid;
		grid-template-columns: 40px 1fr 200px 200px 90px 160px;
		gap: 0;
		padding: 8px 12px;
		background: rgba(20, 184, 166, 0.04);
		border-bottom: 1px solid var(--tt-border);
	}
	.tt-matrix-row {
		display: grid;
		grid-template-columns: 40px 1fr 200px 200px 90px 160px;
		gap: 0;
		padding: 8px 12px;
		border-bottom: 1px solid rgba(20, 184, 166, 0.06);
		transition: background 0.15s;
		align-items: center;
	}
	.tt-matrix-row:last-child { border-bottom: none; }
	.tt-matrix-row:hover { background: rgba(20, 184, 166, 0.04); }
	.tt-matrix-row--sel { background: rgba(20, 184, 166, 0.07) !important; }

	@media (max-width: 900px) {
		.tt-matrix-head,
		.tt-matrix-row {
			grid-template-columns: 40px 1fr 90px 130px;
		}
		.tt-matrix-cell--id,
		.tt-matrix-cell--coach { display: none; }
	}

	.tt-matrix-cell {
		font-family: var(--tt-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(248, 250, 252, 0.35);
		padding: 0 8px;
		display: flex;
		align-items: center;
	}
	.tt-matrix-cell--cb { padding-left: 0; }
	.tt-m-name { font-size: 12px; font-weight: 600; color: #f8fafc; letter-spacing: 0; }
	.tt-m-code { font-size: 10px; color: rgba(20, 184, 166, 0.6); background: rgba(20, 184, 166, 0.06); padding: 2px 6px; border-radius: 4px; }
	.tt-m-coach { font-size: 11px; color: rgba(248, 250, 252, 0.5); }

	.tt-act-link,
	.tt-act-btn {
		font-family: var(--tt-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--tt-accent);
		background: none;
		border: none;
		cursor: pointer;
		padding: 3px 8px;
		border-radius: 4px;
		text-decoration: none;
		transition: background 0.15s;
	}
	.tt-act-link:hover,
	.tt-act-btn:hover { background: rgba(20, 184, 166, 0.08); }

	/* ── Card Grid ─────────────────────────────────────────────────────── */
	.tt-card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 14px;
		margin-bottom: 80px;
	}

	.tt-squad-card {
		border-radius: 14px;
		border: 1px solid var(--tt-border);
		background: rgba(20, 184, 166, 0.025);
		backdrop-filter: blur(24px);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		transition: border-color 0.2s, box-shadow 0.2s;
	}
	.tt-squad-card:hover { border-color: rgba(20, 184, 166, 0.3); }
	.tt-squad-card--sel {
		border-color: var(--tt-accent);
		box-shadow: 0 0 16px rgba(20, 184, 166, 0.12), inset 0 0 0 1px rgba(20, 184, 166, 0.08);
	}
	.tt-squad-card--pending { border-color: rgba(245, 158, 11, 0.3); }

	.tt-card-head {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}
	.tt-card-cb-wrap { flex-shrink: 0; padding-top: 2px; cursor: pointer; }
	.tt-card-identity { flex: 1; min-width: 0; }
	.tt-card-name {
		margin: 0 0 4px;
		font-size: 14px;
		font-weight: 700;
		color: #f8fafc;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tt-card-id {
		font-family: var(--tt-mono);
		font-size: 10px;
		color: rgba(20, 184, 166, 0.5);
		background: rgba(20, 184, 166, 0.06);
		padding: 2px 6px;
		border-radius: 4px;
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tt-card-coach-row {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 20px;
	}
	.tt-coach-icon { width: 14px; height: 14px; color: rgba(248, 250, 252, 0.3); flex-shrink: 0; }
	.tt-coach-email {
		font-family: var(--tt-mono);
		font-size: 11px;
		color: rgba(248, 250, 252, 0.5);
		word-break: break-all;
	}

	.tt-card-acts {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.tt-card-act-link,
	.tt-card-act-btn,
	.tt-card-act-invite {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		border-radius: 6px;
		font-family: var(--tt-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.15s;
		pointer-events: auto;
	}
	.tt-card-act-link {
		border: 1px solid rgba(20, 184, 166, 0.2);
		background: rgba(20, 184, 166, 0.04);
		color: var(--tt-accent);
	}
	.tt-card-act-link:hover { background: rgba(20, 184, 166, 0.1); }
	.tt-card-act-btn {
		border: 1px solid rgba(248, 250, 252, 0.1);
		background: rgba(248, 250, 252, 0.03);
		color: rgba(248, 250, 252, 0.5);
	}
	.tt-card-act-btn:hover { border-color: rgba(248, 250, 252, 0.22); color: #f8fafc; }
	.tt-card-act-invite {
		border: 1px solid rgba(249, 115, 22, 0.25);
		background: rgba(249, 115, 22, 0.05);
		color: var(--tt-orange);
	}
	.tt-card-act-invite:hover { background: rgba(249, 115, 22, 0.1); }

	.tt-inline-invite {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.tt-inline-invite .tt-input--sm { flex: 1; }
	.tt-invite-send {
		padding: 6px 12px;
		border-radius: 6px;
		border: 1px solid rgba(249, 115, 22, 0.4);
		background: rgba(249, 115, 22, 0.1);
		color: var(--tt-orange);
		font-family: var(--tt-mono);
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.tt-invite-send:hover  { background: rgba(249, 115, 22, 0.18); }
	.tt-invite-send:disabled { opacity: 0.5; cursor: default; }

	/* ── Batch Dock ────────────────────────────────────────────────────── */
	.tt-batch-dock {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 20px;
		border-radius: 99px;
		border: 1px solid rgba(20, 184, 166, 0.4);
		background: rgba(8, 13, 24, 0.95);
		backdrop-filter: blur(32px);
		box-shadow: 0 8px 40px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(20, 184, 166, 0.08);
		white-space: nowrap;
		pointer-events: auto;
	}

	.tt-batch-count {
		display: flex;
		align-items: baseline;
		gap: 5px;
	}
	.tt-batch-count-num {
		font-family: var(--tt-mono);
		font-size: 18px;
		font-weight: 800;
		color: var(--tt-accent);
		line-height: 1;
	}
	.tt-batch-count-lbl {
		font-family: var(--tt-mono);
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: rgba(248, 250, 252, 0.45);
	}

	.tt-batch-divider {
		width: 1px;
		height: 22px;
		background: rgba(20, 184, 166, 0.2);
		flex-shrink: 0;
	}

	.tt-batch-action {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 8px;
		border: 1px solid rgba(20, 184, 166, 0.2);
		background: rgba(20, 184, 166, 0.05);
		color: rgba(248, 250, 252, 0.8);
		font-family: var(--tt-mono);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.15s;
		pointer-events: auto;
	}
	.tt-batch-action:hover { border-color: var(--tt-accent); color: var(--tt-accent); background: rgba(20, 184, 166, 0.1); }
	.tt-batch-action:disabled { opacity: 0.45; cursor: not-allowed; }

	.tt-batch-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid rgba(248, 250, 252, 0.15);
		background: rgba(248, 250, 252, 0.04);
		color: rgba(248, 250, 252, 0.45);
		font-size: 13px;
		cursor: pointer;
		transition: all 0.15s;
		pointer-events: auto;
	}
	.tt-batch-clear:hover { border-color: rgba(248, 250, 252, 0.3); color: #f8fafc; }

	/* Shared checkbox style */
	.tt-cb {
		width: 15px;
		height: 15px;
		accent-color: var(--tt-accent);
		cursor: pointer;
	}
</style>
