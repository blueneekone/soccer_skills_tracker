<script>
	/**
	 * Sprint 2.7 — Impersonation Mode Active banner.
	 *
	 * Rendered by (app)/+layout.svelte at the very top of the viewport whenever
	 * `impersonationStore.active` is true. High-contrast amber gradient with a
	 * pulsing dot makes it impossible for an admin to forget they are acting as
	 * another account.
	 */

	import { impersonationStore } from '$lib/stores/impersonation.svelte.js';

	let ending = $state(false);
	const handleExit = async () => {
		if (ending) return;
		ending = true;
		try {
			await impersonationStore.exit();
		} finally {
			ending = false;
		}
	};

	const startedLabel = $derived.by(() => {
		const ts = impersonationStore.startedAt;
		if (!ts) return '';
		try {
			const d = new Date(ts);
			const h = String(d.getHours()).padStart(2, '0');
			const m = String(d.getMinutes()).padStart(2, '0');
			return `${h}:${m}`;
		} catch {
			return '';
		}
	});
</script>

<div class="imp-banner" role="status" aria-live="polite">
	<span class="imp-banner__dot" aria-hidden="true"></span>

	<div class="imp-banner__body">
		<strong class="imp-banner__title">Impersonation Mode Active</strong>
		<span class="imp-banner__sep" aria-hidden="true">•</span>
		<span class="imp-banner__meta">
			Signed in as
			<span class="imp-banner__target">{impersonationStore.targetEmail || impersonationStore.targetUid}</span>
			{#if impersonationStore.targetRole}
				<span class="imp-banner__role">{impersonationStore.targetRole}</span>
			{/if}
		</span>
		<span class="imp-banner__sep imp-banner__sep--dim" aria-hidden="true">•</span>
		<span class="imp-banner__meta-dim">
			by {impersonationStore.originalAdminEmail || 'super_admin'}
			{#if startedLabel}
				<span class="imp-banner__when"> since {startedLabel}</span>
			{/if}
		</span>
	</div>

	<button
		type="button"
		class="imp-banner__exit"
		onclick={handleExit}
		disabled={ending}
		aria-label="Exit impersonation session"
	>
		<i class="ph ph-sign-out" aria-hidden="true"></i>
		<span>{ending ? 'Exiting…' : 'Exit impersonation'}</span>
	</button>
</div>

<style>
	.imp-banner {
		position: sticky;
		top: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		min-height: 40px;
		background: linear-gradient(90deg, #b45309 0%, #d97706 50%, #b45309 100%);
		color: #fef3c7;
		border-bottom: 1px solid rgba(0, 0, 0, 0.25);
		box-shadow: 0 2px 10px rgba(180, 83, 9, 0.35);
		font-size: 0.8125rem;
		line-height: 1.2;
	}

	.imp-banner__dot {
		flex-shrink: 0;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #fef3c7;
		box-shadow: 0 0 0 4px rgba(254, 243, 199, 0.25);
		animation: imp-pulse 1.4s ease-in-out infinite;
	}

	@keyframes imp-pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(0.85); }
	}

	.imp-banner__body {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		flex: 1 1 auto;
		min-width: 0;
	}

	.imp-banner__title {
		font-weight: 800;
		letter-spacing: 0.01em;
		color: #fffbeb;
	}

	.imp-banner__sep {
		color: #fcd34d;
	}

	.imp-banner__sep--dim {
		color: rgba(254, 243, 199, 0.5);
	}

	.imp-banner__meta {
		color: #fef3c7;
	}

	.imp-banner__meta-dim {
		color: rgba(254, 243, 199, 0.82);
		font-size: 0.75rem;
	}

	.imp-banner__target {
		font-weight: 700;
		color: #fffbeb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	.imp-banner__role {
		display: inline-block;
		margin-left: 6px;
		padding: 1px 8px;
		border-radius: 999px;
		border: 1px solid rgba(255, 251, 235, 0.45);
		background: rgba(0, 0, 0, 0.2);
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.imp-banner__when {
		color: rgba(254, 243, 199, 0.65);
	}

	.imp-banner__exit {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		appearance: none;
		padding: 6px 14px;
		border-radius: 6px;
		border: 1px solid rgba(255, 251, 235, 0.5);
		background: rgba(0, 0, 0, 0.28);
		color: #fffbeb;
		font: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease;
	}

	.imp-banner__exit:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.45);
		border-color: #fffbeb;
	}

	.imp-banner__exit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.imp-banner {
			gap: 8px;
			padding: 8px 12px;
			font-size: 0.75rem;
		}
		.imp-banner__meta-dim {
			display: none;
		}
	}
</style>
