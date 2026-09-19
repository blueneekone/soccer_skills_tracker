<script lang="ts">
	import type { ComplianceHubEngine } from './ComplianceHubEngine.svelte.js';

	let { engine }: { engine: ComplianceHubEngine } = $props();
</script>

{#if engine.overrideOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="ch-modal-backdrop" onclick={() => !engine.overrideBusy && (engine.overrideOpen = false)}>
		<div
			class="ch-modal vanguard-card"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="override-title"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="ch-modal__title" id="override-title">REQUEST MANUAL OVERRIDE</h3>
			<p class="ch-modal__sub">
				Granting manual clearance for: <strong class="ch-modal__email">{engine.overrideEmail}</strong>
			</p>

			{#if engine.overrideSuccess}
				<div class="ch-modal__success">{engine.overrideSuccess}</div>
			{:else}
				<label class="ch-modal__field">
					<span>DOCUMENT REFERENCE (PDF path or external ID)</span>
					<input
						class="ch-modal__input"
						type="text"
						placeholder="e.g. clearances/2026/coach_smith.pdf"
						bind:value={engine.overrideDocRef}
					/>
				</label>
				<label class="ch-modal__field">
					<span>CLEARANCE EXPIRY DATE (leave blank = 1 year)</span>
					<input
						class="ch-modal__input"
						type="date"
						bind:value={engine.overrideExpiry}
					/>
				</label>

				{#if engine.overrideError}
					<div class="ch-modal__error" role="alert">{engine.overrideError}</div>
				{/if}

				<div class="ch-modal__actions">
					<button
						class="btn-primary"
						onclick={() => void engine.submitOverride()}
						disabled={engine.overrideBusy}
					>
						{engine.overrideBusy ? 'APPLYING…' : '[ APPLY CLEARANCE ]'}
					</button>
					<button
						class="ch-modal__cancel"
						onclick={() => (engine.overrideOpen = false)}
						disabled={engine.overrideBusy}
					>
						CANCEL
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

{#if engine.revokeOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="ch-modal-backdrop" onclick={() => !engine.revokeBusy && (engine.revokeOpen = false)}>
		<div
			class="ch-modal ch-modal--danger vanguard-card"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="revoke-title"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="ch-modal__title ch-modal__title--danger" id="revoke-title">
				⚑ REVOKE CLEARANCE
			</h3>
			<p class="ch-modal__sub">
				Revoking clearance for: <strong class="ch-modal__email">{engine.revokeEmail}</strong><br />
				This will immediately block their access to player data.
			</p>

			<label class="ch-modal__field">
				<span>REASON (optional)</span>
				<input
					class="ch-modal__input ch-modal__input--danger"
					type="text"
					placeholder="e.g. Expired clearance, policy violation…"
					bind:value={engine.revokeReason}
				/>
			</label>

			<div class="ch-modal__actions">
				<button
					class="vanguard-btn-danger"
					onclick={() => void engine.submitRevoke()}
					disabled={engine.revokeBusy}
				>
					{engine.revokeBusy ? 'REVOKING…' : '[ CONFIRM REVOKE ]'}
				</button>
				<button
					class="ch-modal__cancel"
					onclick={() => (engine.revokeOpen = false)}
					disabled={engine.revokeBusy}
				>
					CANCEL
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.ch-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9000;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
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
		background: rgba(20, 184, 166, 0.1);
		border: 1px solid rgba(20, 184, 166, 0.3);
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
</style>
