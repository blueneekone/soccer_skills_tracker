<script lang="ts">
	import type { OrgInvitesEngine } from './OrgInvitesEngine.svelte.js';
	import OrgInvitesModal from './OrgInvitesModal.svelte';

	let { engine }: { engine: OrgInvitesEngine } = $props();
</script>

{#if engine.filteredInvites.length === 0}
	<div class="oi-empty">
		<span class="oi-empty-icon" aria-hidden="true">◎</span>
		<p>No active codes. Generate one above.</p>
	</div>
{:else}
	<div class="oi-list">
		{#each engine.filteredInvites as inv (inv.id)}
			{@const expiry = engine.expiryLabel(inv)}
			{@const roleColor = engine.ROLE_COLORS[inv.targetRole ?? ''] ?? '#64748b'}
			<div class="oi-row">
				<div class="oi-code-wrap">
					<span
						class="oi-code"
						style:color={roleColor}
						style:text-shadow="0 0 16px {roleColor}55"
					>
						{inv.code ?? inv.id}
					</span>
				</div>

				<span
					class="oi-role-badge"
					style:border-color="{roleColor}55"
					style:color={roleColor}
				>
					{(inv.targetRole ?? 'unknown').toUpperCase()}
				</span>

				<div class="oi-usage-wrap">
					<div class="oi-usage-track">
						<div class="oi-usage-fill" style:width="{engine.usageBar(inv)}%"></div>
					</div>
					<span class="oi-usage-label"
						>{inv.usageCount ?? 0}/{inv.usageLimit ?? 1}</span
					>
				</div>

				<span class="oi-expiry" class:oi-expiry--danger={expiry.danger}>
					{expiry.text}
				</span>

				{#if inv.teamId}
					<span class="oi-team-scope">
						{engine.org.teams.find((t) => t.id === inv.teamId)?.name ?? inv.teamId}
					</span>
				{:else}
					<span class="oi-team-scope oi-team-scope--global">CLUB-WIDE</span>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<OrgInvitesModal {engine} />

<style>
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
		border-radius: 0px;
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
		border-radius: 0px;
		overflow: hidden;
	}
	.oi-usage-fill {
		height: 100%;
		background: #14b8a6;
		border-radius: 0px;
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
