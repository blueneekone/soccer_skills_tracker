<script>
	import { goto } from '$app/navigation';

	let { open = $bindable(false) } = $props();

	function close() {
		open = false;
	}

	function upgrade() {
		open = false;
		goto('/upgrade');
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="romodal-backdrop" onclick={close}>
		<div
			class="romodal glass-panel"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="romodal-title"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="romodal-title" class="romodal-title">Subscription inactive</h2>
			<p class="romodal-body">
				Your account is in read-only mode. Upgrade your plan to invite staff, manage seats, and book
				fields again.
			</p>
			<div class="romodal-actions">
				<button type="button" class="romodal-btn romodal-btn--ghost" onclick={close}>Not now</button>
				<button type="button" class="romodal-btn romodal-btn--primary" onclick={upgrade}>
					View pricing
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.romodal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background: rgba(15, 23, 42, 0.55);
		backdrop-filter: blur(6px);
	}

	.romodal {
		width: 100%;
		max-width: 420px;
		padding: 1.5rem;
		border-radius: 20px;
	}

	.romodal-title {
		margin: 0 0 0.5rem;
		font-size: 1.2rem;
		font-weight: 900;
		color: var(--text-primary);
	}

	.romodal-body {
		margin: 0 0 1.25rem;
		font-size: 0.95rem;
		line-height: 1.45;
		color: var(--muted-slate);
	}

	.romodal-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		justify-content: flex-end;
	}

	.romodal-btn {
		border-radius: 12px;
		padding: 0.55rem 1rem;
		font-weight: 800;
		font-size: 0.88rem;
		cursor: pointer;
		border: 1px solid var(--glass-border);
	}

	.romodal-btn--ghost {
		background: transparent;
		color: var(--text-primary);
	}

	.romodal-btn--primary {
		border-color: color-mix(in srgb, var(--brand-primary) 45%, transparent);
		background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent, #8b5cf6));
		color: #fff;
	}
</style>
