<script lang="ts">
	import type { TenantRole } from '$lib/types/tenant';
	import type { OrgInvitesEngine } from './OrgInvitesEngine.svelte.js';

	let { engine }: { engine: OrgInvitesEngine } = $props();
</script>

{#if engine.genOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="oi-backdrop" onclick={() => (engine.genOpen = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="oi-modal" onclick={(e) => e.stopPropagation()}>
			<div class="oi-modal-header">
				<span class="oi-modal-label">INVITE CODE GENERATOR</span>
				<button class="oi-modal-close" onclick={() => (engine.genOpen = false)}>✕</button>
			</div>

			<div class="oi-modal-body">
				<div class="oi-role-selector">
					{#each (['coach', 'player', 'director'] as TenantRole[]) as r (r)}
						<button
							class="oi-role-chip"
							class:oi-role-chip--active={engine.genRole === r}
							style:--rc={engine.ROLE_COLORS[r] ?? '#64748b'}
							onclick={() => (engine.genRole = r)}
						>
							{r.toUpperCase()}
						</button>
					{/each}
				</div>

				<div class="oi-field">
					<label class="oi-label" for="gen-team">TEAM SCOPE (OPTIONAL)</label>
					<select id="gen-team" class="oi-select" bind:value={engine.genTeamId}>
						<option value="">— CLUB-WIDE —</option>
						{#each engine.org.teams as team (team.id)}
							<option value={team.id}>{team.name}</option>
						{/each}
					</select>
				</div>

				<div class="oi-field">
					<label class="oi-label" for="gen-limit">USAGE LIMIT</label>
					<div class="oi-limit-row">
						{#each [1, 5, 10, 25] as limit (limit)}
							<button
								class="oi-limit-chip"
								class:oi-limit-chip--active={engine.genLimit === limit}
								onclick={() => (engine.genLimit = limit)}
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
							bind:value={engine.genLimit}
						/>
					</div>
				</div>

				{#if engine.generatedCode}
					<div class="oi-generated">
						<div class="oi-gen-code-row">
							<span class="oi-gen-code">{engine.generatedCode}</span>
							<button class="oi-copy-btn" onclick={() => void engine.copyCode()}>{engine.copyLabel}</button>
						</div>
						<p class="oi-gen-expiry">Expires: {engine.generatedExpiry}</p>

						<div class="oi-url-failsafe">
							<span class="oi-url-label">⚡ DIRECT LINK FAILSAFE</span>
							<p class="oi-url-subtext">
								If the invite email is blocked or bounced, share this URL directly.
							</p>
							<div class="oi-url-row">
								<input
									type="text"
									readonly
									value={engine.generatedInviteUrl}
									class="oi-url-input"
									aria-label="Invite join URL"
									onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
								/>
								<button class="oi-copy-btn oi-copy-btn--url" onclick={() => void engine.copyInviteUrl()}>
									{engine.copyUrlLabel}
								</button>
							</div>
						</div>
					</div>
					<button
						class="oi-btn-primary oi-btn-primary--secondary"
						onclick={() => void engine.handleGenerate()}
						disabled={engine.genLoading}
					>
						{engine.genLoading ? '...' : '↺ REGENERATE'}
					</button>
				{:else}
					<button
						class="oi-btn-primary"
						onclick={() => void engine.handleGenerate()}
						disabled={engine.genLoading}
					>
						{engine.genLoading ? 'GENERATING...' : '⚡ GENERATE CODE'}
					</button>
				{/if}

				{#if engine.genError}
					<p class="oi-error">{engine.genError}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
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
		border: 1px solid rgba(20, 184, 166, 0.18);
		border-radius: 0px;
		width: min(440px, 94vw);
		box-shadow: 0 0 40px rgba(20, 184, 166, 0.07);
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
		color: #14b8a6;
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
		border-radius: 0px;
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
		border-radius: 0px;
		color: #e2e8f0;
		font-family: inherit;
		font-size: 12px;
		padding: clamp(4px, 1vw, 8px) 10px;
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
		border-radius: 0px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: transparent;
		color: #475569;
		cursor: pointer;
		transition: all 0.15s;
	}
	.oi-limit-chip--active {
		background: rgba(20, 184, 166, 0.08);
		border-color: rgba(20, 184, 166, 0.35);
		color: #14b8a6;
	}
	.oi-limit-input {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0px;
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
		background: rgba(20, 184, 166, 0.04);
		border: 1px solid rgba(20, 184, 166, 0.2);
		border-radius: 0px;
		padding: 0.75rem 1rem;
	}
	.oi-url-failsafe {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.5rem;
		padding-top: 0.6rem;
		border-top: 1px solid rgba(20, 184, 166, 0.1);
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
		color: rgba(20, 184, 166, 0.4);
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
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 10px;
		letter-spacing: 0.03em;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(20, 184, 166, 0.2);
		border-radius: 0px;
		color: rgba(20, 184, 166, 0.7);
		outline: none;
		cursor: text;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.oi-url-input:focus {
		border-color: rgba(20, 184, 166, 0.45);
		color: #14b8a6;
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
		color: #14b8a6;
		text-shadow: 0 0 20px rgba(20, 184, 166, 0.5);
	}
	.oi-copy-btn {
		font-family: inherit;
		font-size: 9px;
		letter-spacing: 0.18em;
		padding: 5px 12px;
		border: 1px solid rgba(20, 184, 166, 0.4);
		border-radius: 0px;
		background: rgba(20, 184, 166, 0.08);
		color: #14b8a6;
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}
	.oi-copy-btn:hover {
		background: rgba(20, 184, 166, 0.16);
	}
	.oi-gen-expiry {
		font-size: 10px;
		color: #475569;
		margin: 0;
		text-align: center;
	}
	.oi-btn-primary {
		font-family: inherit;
		font-size: 11px;
		letter-spacing: 0.18em;
		font-weight: 700;
		padding: 0.75rem;
		border-radius: 0px;
		width: 100%;
		cursor: pointer;
		transition: all 0.15s;
		background: rgba(20, 184, 166, 0.1);
		border: 1px solid rgba(20, 184, 166, 0.4);
		color: #14b8a6;
	}
	.oi-btn-primary:hover:not(:disabled) {
		background: rgba(20, 184, 166, 0.18);
		box-shadow: 0 0 16px rgba(20, 184, 166, 0.25);
	}
	.oi-btn-primary:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.oi-btn-primary--secondary {
		background: transparent;
		border-color: rgba(255, 255, 255, 0.1);
		color: #475569;
		font-size: 10px;
	}
	.oi-btn-primary--secondary:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.2);
		color: #94a3b8;
	}
	.oi-error {
		font-size: 11px;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 0px;
		padding: 6px 10px;
		margin: 0;
	}
</style>
