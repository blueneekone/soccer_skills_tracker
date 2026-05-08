<script lang="ts">
	/**
	 * OrgInvites.svelte
	 * ──────────────────
	 * Trinity role: ARENA (UI) — logic lives in OrgManager (ENGINE)
	 *
	 * Invite Command Center for the Director's Mission Control:
	 *  - Lists all active invite codes for the tenant (live snapshot)
	 *  - [GENERATE COACH CODE] → OrgManager.generateInvite('coach', teamId)
	 *  - [GENERATE PLAYER CODE] → OrgManager.generateInvite('player', teamId)
	 *  - One-click copy + expiry countdown display
	 *
	 * Props:
	 *   org — the instantiated OrgManager engine
	 */

	import type { OrgManager } from '$lib/services/org.svelte.js';
	import type { InviteDoc, TenantRole } from '$lib/types/tenant';

	interface Props {
		org: OrgManager;
		class?: string;
	}

	const { org, class: className = '' }: Props = $props();

	// ── Generate invite modal ─────────────────────────────────────────────────
	let genOpen = $state(false);
	let genRole = $state<TenantRole>('coach');
	let genTeamId = $state('');
	let genLimit = $state(1);
	let genLoading = $state(false);
	let genError = $state('');
	let generatedCode = $state('');
	let generatedExpiry = $state('');

	function openGenerate(role: TenantRole) {
		genRole = role;
		genTeamId = '';
		genLimit = 1;
		genError = '';
		generatedCode = '';
		generatedExpiry = '';
		genOpen = true;
	}

	async function handleGenerate() {
		genError = '';
		genLoading = true;
		try {
			const result = await org.generateInvite(
				genRole,
				genTeamId || undefined,
				genLimit,
			);
			generatedCode = result.code;
			generatedExpiry = result.expiresAt.toLocaleString(undefined, {
				dateStyle: 'medium',
				timeStyle: 'short',
			});
		} catch (err) {
			genError = err instanceof Error ? err.message : 'Failed to generate code.';
		} finally {
			genLoading = false;
		}
	}

	let copyLabel = $state('COPY');
	async function copyCode() {
		if (!generatedCode) return;
		try {
			await navigator.clipboard.writeText(generatedCode);
			copyLabel = 'COPIED ✓';
			setTimeout(() => (copyLabel = 'COPY'), 2000);
		} catch {
			copyLabel = 'ERR';
		}
	}

	// ── Invite URL failsafe ─────────────────────────────────────────────────
	// If DKIM/SPF fails or the email gets spam-filtered, directors can copy
	// this URL and send it directly via SMS/WhatsApp/Telegram.
	const inviteBaseUrl = $derived(
		typeof window !== 'undefined'
			? `${window.location.origin}/join`
			: 'https://vanguard.app/join',
	);
	const generatedInviteUrl = $derived(
		generatedCode ? `${inviteBaseUrl}?code=${generatedCode}` : '',
	);

	let copyUrlLabel = $state('COPY LINK');
	async function copyInviteUrl() {
		if (!generatedInviteUrl) return;
		try {
			await navigator.clipboard.writeText(generatedInviteUrl);
			copyUrlLabel = 'COPIED ✓';
			setTimeout(() => (copyUrlLabel = 'COPY LINK'), 2500);
		} catch {
			copyUrlLabel = 'ERR';
		}
	}

	// ── Invite list helpers ───────────────────────────────────────────────────
	const ROLE_COLORS: Record<string, string> = {
		coach: '#00f0ff',
		player: '#22c55e',
		director: '#a855f7',
		parent: '#f59e0b',
	};

	function expiryLabel(inv: InviteDoc): { text: string; danger: boolean } {
		if (!inv.expiresAt) return { text: '—', danger: false };
		const exDate =
			inv.expiresAt instanceof Date
				? inv.expiresAt
				: typeof inv.expiresAt === 'object' &&
					  inv.expiresAt !== null &&
					  'toDate' in (inv.expiresAt as object)
					? (inv.expiresAt as { toDate: () => Date }).toDate()
					: new Date(String(inv.expiresAt));
		const diff = exDate.getTime() - Date.now();
		if (diff < 0) return { text: 'EXPIRED', danger: true };
		const hrs = Math.floor(diff / 3_600_000);
		if (hrs < 4) return { text: `${hrs}h LEFT`, danger: true };
		if (hrs < 24) return { text: `${hrs}h LEFT`, danger: false };
		return { text: `${Math.floor(hrs / 24)}d LEFT`, danger: false };
	}

	function usageBar(inv: InviteDoc): number {
		const limit = inv.usageLimit ?? 1;
		const used = inv.usageCount ?? 0;
		return limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
	}

	// ── Active invites tab filter ─────────────────────────────────────────────
	type InviteFilter = 'ALL' | 'coach' | 'player';
	let inviteFilter = $state<InviteFilter>('ALL');

	const filteredInvites = $derived(
		inviteFilter === 'ALL'
			? org.activeInvites
			: org.activeInvites.filter((inv) => inv.targetRole === inviteFilter),
	);
</script>

<div class="oi-root {className}">
	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<div class="oi-header">
		<div class="oi-header-left">
			<span class="oi-eyebrow">IDENTITY CONTROL</span>
			<h2 class="oi-title">INVITE COMMAND CENTER</h2>
		</div>
		<div class="oi-header-right">
			<!-- Quick-generate buttons -->
			<button
				class="oi-gen-btn oi-gen-btn--coach"
				onclick={() => openGenerate('coach')}
			>
				＋ COACH CODE
			</button>
			<button
				class="oi-gen-btn oi-gen-btn--player"
				onclick={() => openGenerate('player')}
			>
				＋ PLAYER CODE
			</button>
		</div>
	</div>

	<!-- ── Filter tabs ────────────────────────────────────────────────────── -->
	<div class="oi-filter-bar">
		{#each (['ALL', 'coach', 'player'] as InviteFilter[]) as f (f)}
			<button
				class="oi-tab"
				class:oi-tab--active={inviteFilter === f}
				onclick={() => (inviteFilter = f)}
			>
				{f === 'ALL' ? 'ALL ACTIVE' : f.toUpperCase()}
				<span class="oi-tab-count">
					{f === 'ALL'
						? org.activeInvites.length
						: f === 'coach'
							? org.coachInvites.length
							: org.playerInvites.length}
				</span>
			</button>
		{/each}
	</div>

	<!-- ── Code list ──────────────────────────────────────────────────────── -->
	{#if filteredInvites.length === 0}
		<div class="oi-empty">
			<span class="oi-empty-icon" aria-hidden="true">◎</span>
			<p>No active codes. Generate one above.</p>
		</div>
	{:else}
		<div class="oi-list">
			{#each filteredInvites as inv (inv.id)}
				{@const expiry = expiryLabel(inv)}
				{@const roleColor = ROLE_COLORS[inv.targetRole ?? ''] ?? '#64748b'}
				<div class="oi-row">
					<!-- Code -->
					<div class="oi-code-wrap">
						<span
							class="oi-code"
							style:color={roleColor}
							style:text-shadow="0 0 16px {roleColor}55"
						>
							{inv.code ?? inv.id}
						</span>
					</div>

					<!-- Role badge -->
					<span
						class="oi-role-badge"
						style:border-color="{roleColor}55"
						style:color={roleColor}
					>
						{(inv.targetRole ?? 'unknown').toUpperCase()}
					</span>

					<!-- Usage bar -->
					<div class="oi-usage-wrap">
						<div class="oi-usage-track">
							<div class="oi-usage-fill" style:width="{usageBar(inv)}%"></div>
						</div>
						<span class="oi-usage-label"
							>{inv.usageCount ?? 0}/{inv.usageLimit ?? 1}</span
						>
					</div>

					<!-- Expiry -->
					<span class="oi-expiry" class:oi-expiry--danger={expiry.danger}>
						{expiry.text}
					</span>

					<!-- Team scope -->
					{#if inv.teamId}
						<span class="oi-team-scope">
							{org.teams.find((t) => t.id === inv.teamId)?.name ?? inv.teamId}
						</span>
					{:else}
						<span class="oi-team-scope oi-team-scope--global">CLUB-WIDE</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- ── Generate Code Modal ────────────────────────────────────────────────── -->
{#if genOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="oi-backdrop" onclick={() => (genOpen = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="oi-modal" onclick={(e) => e.stopPropagation()}>
			<div class="oi-modal-header">
				<span class="oi-modal-label">INVITE CODE GENERATOR</span>
				<button class="oi-modal-close" onclick={() => (genOpen = false)}>✕</button>
			</div>

			<div class="oi-modal-body">
				<!-- Role selector -->
				<div class="oi-role-selector">
					{#each (['coach', 'player', 'director'] as TenantRole[]) as r (r)}
						<button
							class="oi-role-chip"
							class:oi-role-chip--active={genRole === r}
							style:--rc={ROLE_COLORS[r] ?? '#64748b'}
							onclick={() => (genRole = r)}
						>
							{r.toUpperCase()}
						</button>
					{/each}
				</div>

				<!-- Team scope (optional) -->
				<div class="oi-field">
					<label class="oi-label" for="gen-team">TEAM SCOPE (OPTIONAL)</label>
					<select id="gen-team" class="oi-select" bind:value={genTeamId}>
						<option value="">— CLUB-WIDE —</option>
						{#each org.teams as team (team.id)}
							<option value={team.id}>{team.name}</option>
						{/each}
					</select>
				</div>

				<!-- Usage limit -->
				<div class="oi-field">
					<label class="oi-label" for="gen-limit">USAGE LIMIT</label>
					<div class="oi-limit-row">
						{#each [1, 5, 10, 25] as limit (limit)}
							<button
								class="oi-limit-chip"
								class:oi-limit-chip--active={genLimit === limit}
								onclick={() => (genLimit = limit)}
							>
								{limit}×
							</button>
						{/each}
						<input
							id="gen-limit"
							class="oi-limit-input"
							type="number"
							min="1"
							max="100"
							bind:value={genLimit}
						/>
					</div>
				</div>

				{#if generatedCode}
					<!-- Generated code display -->
					<div class="oi-generated">
						<div class="oi-gen-code-row">
							<span class="oi-gen-code">{generatedCode}</span>
							<button class="oi-copy-btn" onclick={copyCode}>{copyLabel}</button>
						</div>
						<p class="oi-gen-expiry">Expires: {generatedExpiry}</p>

						<!-- ── COMMUNICATIONS FAILSAFE ──────────────────────────── -->
						<!-- If email is bounced / spam-filtered, share this link   -->
						<!-- directly via SMS, WhatsApp, or any channel.            -->
						<div class="oi-url-failsafe">
							<span class="oi-url-label">⚡ DIRECT LINK FAILSAFE</span>
							<p class="oi-url-subtext">
								If the invite email is blocked or bounced, share this URL directly.
							</p>
							<div class="oi-url-row">
								<input
									type="text"
									readonly
									value={generatedInviteUrl}
									class="oi-url-input"
									aria-label="Invite join URL"
									onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
								/>
								<button class="oi-copy-btn oi-copy-btn--url" onclick={copyInviteUrl}>
									{copyUrlLabel}
								</button>
							</div>
						</div>
					</div>
					<button
						class="oi-action-btn oi-action-btn--secondary"
						onclick={handleGenerate}
						disabled={genLoading}
					>
						{genLoading ? '...' : '↺ REGENERATE'}
					</button>
				{:else}
					<button
						class="oi-action-btn"
						onclick={handleGenerate}
						disabled={genLoading}
					>
						{genLoading ? 'GENERATING...' : '⚡ GENERATE CODE'}
					</button>
				{/if}

				{#if genError}
					<p class="oi-error">{genError}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Root ─────────────────────────────────────────────────────────────── */
	.oi-root {
		background: rgba(1, 4, 9, 0.85);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 8px;
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
		color: #e2e8f0;
		overflow: hidden;
	}

	/* ── Header ──────────────────────────────────────────────────────────── */
	.oi-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		padding: 1.25rem 1.5rem 0.75rem;
		border-bottom: 1px solid rgba(0, 240, 255, 0.1);
		gap: 1rem;
		flex-wrap: wrap;
	}
	.oi-eyebrow {
		font-size: 9px;
		letter-spacing: 0.28em;
		color: #00f0ff;
		display: block;
		margin-bottom: 3px;
	}
	.oi-title {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		margin: 0;
		color: #f8fafc;
	}
	.oi-header-right {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.oi-gen-btn {
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.18em;
		font-weight: 700;
		padding: 6px 12px;
		border-radius: 3px;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.oi-gen-btn--coach {
		border: 1px solid rgba(0, 240, 255, 0.4);
		background: rgba(0, 240, 255, 0.07);
		color: #00f0ff;
	}
	.oi-gen-btn--coach:hover {
		background: rgba(0, 240, 255, 0.14);
		box-shadow: 0 0 12px rgba(0, 240, 255, 0.2);
	}
	.oi-gen-btn--player {
		border: 1px solid rgba(34, 197, 94, 0.35);
		background: rgba(34, 197, 94, 0.06);
		color: #22c55e;
	}
	.oi-gen-btn--player:hover {
		background: rgba(34, 197, 94, 0.13);
		box-shadow: 0 0 12px rgba(34, 197, 94, 0.2);
	}

	/* ── Filter tabs ─────────────────────────────────────────────────────── */
	.oi-filter-bar {
		display: flex;
		gap: 2px;
		padding: 0.6rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	.oi-tab {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.18em;
		padding: 4px 10px;
		border-radius: 2px;
		border: 1px solid transparent;
		background: transparent;
		color: #475569;
		cursor: pointer;
		transition: all 0.15s;
	}
	.oi-tab:hover {
		color: #94a3b8;
	}
	.oi-tab--active {
		background: rgba(0, 240, 255, 0.08);
		border-color: rgba(0, 240, 255, 0.3);
		color: #00f0ff;
	}
	.oi-tab-count {
		background: rgba(255, 255, 255, 0.07);
		border-radius: 2px;
		padding: 0 5px;
		font-size: 8px;
	}
	.oi-tab--active .oi-tab-count {
		background: rgba(0, 240, 255, 0.15);
	}

	/* ── Code list ───────────────────────────────────────────────────────── */
	.oi-list {
		display: flex;
		flex-direction: column;
	}
	.oi-row {
		display: grid;
		grid-template-columns: 100px auto 120px 80px 1fr;
		align-items: center;
		gap: 1rem;
		padding: 0.7rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		transition: background 0.12s;
	}
	.oi-row:last-child {
		border-bottom: none;
	}
	.oi-row:hover {
		background: rgba(255, 255, 255, 0.02);
	}
	.oi-code-wrap {
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.22em;
	}
	.oi-code {
		font-size: 15px;
		font-weight: 700;
		letter-spacing: 0.22em;
	}
	.oi-role-badge {
		font-size: 8px;
		letter-spacing: 0.18em;
		padding: 2px 7px;
		border-radius: 2px;
		border: 1px solid;
		white-space: nowrap;
	}
	.oi-usage-wrap {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.oi-usage-track {
		flex: 1;
		height: 3px;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 2px;
		overflow: hidden;
	}
	.oi-usage-fill {
		height: 100%;
		background: #00f0ff;
		border-radius: 2px;
		transition: width 0.4s;
	}
	.oi-usage-label {
		font-size: 9px;
		color: #475569;
		white-space: nowrap;
		min-width: 28px;
		text-align: right;
	}
	.oi-expiry {
		font-size: 9px;
		letter-spacing: 0.1em;
		color: #475569;
		white-space: nowrap;
	}
	.oi-expiry--danger {
		color: #ef4444;
	}
	.oi-team-scope {
		font-size: 9px;
		color: #64748b;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.oi-team-scope--global {
		color: #334155;
		letter-spacing: 0.12em;
	}

	/* ── Empty ───────────────────────────────────────────────────────────── */
	.oi-empty {
		text-align: center;
		padding: 2.5rem 2rem;
		color: #475569;
		font-size: 12px;
	}
	.oi-empty-icon {
		display: block;
		font-size: 2rem;
		margin-bottom: 0.5rem;
		opacity: 0.3;
	}

	/* ── Modal ───────────────────────────────────────────────────────────── */
	.oi-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}
	.oi-modal {
		background: #080d18;
		border: 1px solid rgba(0, 240, 255, 0.18);
		border-radius: 8px;
		width: min(440px, 94vw);
		box-shadow: 0 0 40px rgba(0, 240, 255, 0.07);
	}
	.oi-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.oi-modal-label {
		font-size: 9px;
		letter-spacing: 0.28em;
		color: #00f0ff;
	}
	.oi-modal-close {
		background: none;
		border: none;
		color: #475569;
		font-size: 1rem;
		cursor: pointer;
		padding: 2px 6px;
		transition: color 0.15s;
	}
	.oi-modal-close:hover {
		color: #e2e8f0;
	}
	.oi-modal-body {
		padding: 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}
	.oi-role-selector {
		display: flex;
		gap: 4px;
	}
	.oi-role-chip {
		flex: 1;
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.15em;
		padding: 6px;
		border-radius: 3px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: transparent;
		color: #475569;
		cursor: pointer;
		transition: all 0.15s;
	}
	.oi-role-chip--active {
		background: rgba(from var(--rc) r g b / 0.1);
		border-color: color-mix(in srgb, var(--rc) 40%, transparent);
		color: var(--rc);
	}
	.oi-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.oi-label {
		font-size: 8px;
		letter-spacing: 0.22em;
		color: #475569;
	}
	.oi-select {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		color: #e2e8f0;
		font-family: inherit;
		font-size: 12px;
		padding: 8px 10px;
		outline: none;
	}
	.oi-limit-row {
		display: flex;
		gap: 4px;
		align-items: center;
	}
	.oi-limit-chip {
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.1em;
		padding: 5px 10px;
		border-radius: 3px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: transparent;
		color: #475569;
		cursor: pointer;
		transition: all 0.15s;
	}
	.oi-limit-chip--active {
		background: rgba(0, 240, 255, 0.08);
		border-color: rgba(0, 240, 255, 0.35);
		color: #00f0ff;
	}
	.oi-limit-input {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 3px;
		color: #e2e8f0;
		font-family: inherit;
		font-size: 11px;
		padding: 5px 8px;
		width: 60px;
		outline: none;
		text-align: center;
	}
	.oi-generated {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: rgba(0, 240, 255, 0.04);
		border: 1px solid rgba(0, 240, 255, 0.2);
		border-radius: 6px;
		padding: 0.75rem 1rem;
	}
	/* ── Communications Failsafe URL block ─────────────────────────────── */
	.oi-url-failsafe {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.5rem;
		padding-top: 0.6rem;
		border-top: 1px solid rgba(0, 240, 255, 0.1);
	}
	.oi-url-label {
		font-size: 8px;
		letter-spacing: 0.2em;
		color: rgba(251, 191, 36, 0.8);
		font-weight: 700;
	}
	.oi-url-subtext {
		margin: 0;
		font-size: 9px;
		color: rgba(0, 240, 255, 0.4);
		line-height: 1.5;
	}
	.oi-url-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.oi-url-input {
		flex: 1;
		min-width: 0;
		padding: 5px 8px;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		letter-spacing: 0.03em;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(0, 240, 255, 0.2);
		border-radius: 3px;
		color: rgba(0, 240, 255, 0.7);
		outline: none;
		cursor: text;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.oi-url-input:focus {
		border-color: rgba(0, 240, 255, 0.45);
		color: #00f0ff;
	}
	.oi-copy-btn--url {
		white-space: nowrap;
		font-size: 8px;
		padding: 5px 10px;
		color: rgba(251, 191, 36, 0.9);
		border-color: rgba(251, 191, 36, 0.35);
		background: rgba(251, 191, 36, 0.05);
	}
	.oi-copy-btn--url:hover {
		background: rgba(251, 191, 36, 0.12);
		box-shadow: 0 0 10px rgba(251, 191, 36, 0.15);
	}
	.oi-gen-code-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.oi-gen-code {
		flex: 1;
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: 0.35em;
		color: #00f0ff;
		text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
	}
	.oi-copy-btn {
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.18em;
		padding: 5px 12px;
		border: 1px solid rgba(0, 240, 255, 0.4);
		border-radius: 3px;
		background: rgba(0, 240, 255, 0.08);
		color: #00f0ff;
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}
	.oi-copy-btn:hover {
		background: rgba(0, 240, 255, 0.16);
	}
	.oi-gen-expiry {
		font-size: 10px;
		color: #475569;
		margin: 0;
		text-align: center;
	}
	.oi-action-btn {
		font-family: inherit;
		font-size: 11px;
		letter-spacing: 0.18em;
		font-weight: 700;
		padding: 0.75rem;
		border-radius: 4px;
		width: 100%;
		cursor: pointer;
		transition: all 0.15s;
		background: rgba(0, 240, 255, 0.1);
		border: 1px solid rgba(0, 240, 255, 0.4);
		color: #00f0ff;
	}
	.oi-action-btn:hover:not(:disabled) {
		background: rgba(0, 240, 255, 0.18);
		box-shadow: 0 0 16px rgba(0, 240, 255, 0.25);
	}
	.oi-action-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.oi-action-btn--secondary {
		background: transparent;
		border-color: rgba(255, 255, 255, 0.1);
		color: #475569;
		font-size: 10px;
	}
	.oi-action-btn--secondary:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.2);
		color: #94a3b8;
	}
	.oi-error {
		font-size: 11px;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 3px;
		padding: 6px 10px;
		margin: 0;
	}

	/* ── Responsive ──────────────────────────────────────────────────────── */
	@media (max-width: 640px) {
		.oi-row {
			grid-template-columns: 90px auto 1fr;
		}
		.oi-usage-wrap,
		.oi-team-scope {
			display: none;
		}
	}
</style>
