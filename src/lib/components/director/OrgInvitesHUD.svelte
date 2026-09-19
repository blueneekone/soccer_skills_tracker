<script lang="ts">
	import type { OrgInvitesEngine } from './OrgInvitesEngine.svelte.js';

	let { engine }: { engine: OrgInvitesEngine } = $props();
</script>

<div class="oi-header">
	<div class="oi-header-left">
		<span class="oi-eyebrow">IDENTITY CONTROL</span>
		<h2 class="oi-title">INVITE COMMAND CENTER</h2>
	</div>
	<div class="oi-header-right">
		<button
			class="oi-gen-btn oi-gen-btn--coach"
			onclick={() => engine.openGenerate('coach')}
		>
			＋ COACH CODE
		</button>
		<button
			class="oi-gen-btn oi-gen-btn--player"
			onclick={() => engine.openGenerate('player')}
		>
			＋ PLAYER CODE
		</button>
	</div>
</div>

<div class="oi-filter-bar">
	{#each (['ALL', 'coach', 'player'] as const) as f (f)}
		<button
			class="oi-tab"
			class:oi-tab--active={engine.inviteFilter === f}
			onclick={() => (engine.inviteFilter = f)}
		>
			{f === 'ALL' ? 'ALL ACTIVE' : f.toUpperCase()}
			<span class="oi-tab-count tw-font-mono">
				{f === 'ALL'
					? engine.org.activeInvites.length
					: f === 'coach'
						? engine.org.coachInvites.length
						: engine.org.playerInvites.length}
			</span>
		</button>
	{/each}
</div>

<style>
	.oi-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		padding: 1.25rem 1.5rem 0.75rem;
		border-bottom: 1px solid rgba(20, 184, 166, 0.1);
		gap: 1rem;
		flex-wrap: wrap;
	}
	.oi-eyebrow {
		font-size: 9px;
		letter-spacing: 0.28em;
		color: #14b8a6;
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
		border-radius: 0px;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.oi-gen-btn--coach {
		border: 1px solid rgba(20, 184, 166, 0.4);
		background: rgba(20, 184, 166, 0.07);
		color: #14b8a6;
	}
	.oi-gen-btn--coach:hover {
		background: rgba(20, 184, 166, 0.14);
		box-shadow: 0 0 12px rgba(20, 184, 166, 0.2);
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
		padding: clamp(2px, 0.5vw, 4px) 10px;
		border-radius: 0px;
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
		background: rgba(20, 184, 166, 0.08);
		border-color: rgba(20, 184, 166, 0.3);
		color: #14b8a6;
	}
	.oi-tab-count {
		background: rgba(255, 255, 255, 0.07);
		border-radius: 0px;
		padding: 0 5px;
		font-size: 8px;
	}
	.oi-tab--active .oi-tab-count {
		background: rgba(20, 184, 166, 0.15);
	}
</style>
