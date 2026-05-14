<script lang="ts">
	/**
	 * Sprint 2.7 — Maintenance Mode full-screen gate.
	 *
	 * Rendered by (app)/+layout.svelte in place of all shells/children when:
	 *   • config/feature_flags.maintenanceMode === true AND
	 *   • authStore.role !== 'super_admin' && authStore.role !== 'global_admin'
	 *
	 * Global Admins always pass through so they can disable the flag without
	 * being locked out of their own kill switch.
	 */

	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { featureFlagsStore } from '$lib/stores/featureFlags.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	/** @type {{ message?: string }} */
	let { message = '' } = $props();

	const displayMessage = $derived(
		(message && message.trim()) ||
			featureFlagsStore.maintenanceMessage ||
			'The SSTracker platform is currently offline for scheduled maintenance. Your data is safe. Please check back in a few minutes.'
	);

	let signingOut = $state(false);
	const onSignOut = async () => {
		if (signingOut) return;
		signingOut = true;
		try {
			await handleSignOut();
		} catch (err) {
			console.error('[maintenance] sign out', err);
		} finally {
			signingOut = false;
		}
	};
</script>

<div class="mnt-root" role="alertdialog" aria-modal="true" aria-labelledby="mnt-title">
	<div class="mnt-card">
		<div class="mnt-logo" aria-hidden="true">
			<Icon name={"status.shield-alert" as IconName} size={28} />
		</div>

		<div class="mnt-kicker">SSTracker</div>

		<h1 id="mnt-title" class="mnt-title">Platform Under Maintenance</h1>

		<p class="mnt-body">{displayMessage}</p>

		<div class="mnt-meta">
			<span class="mnt-dot" aria-hidden="true"></span>
			<span>System status: maintenance</span>
		</div>

		<div class="mnt-actions">
			<button
				type="button"
				class="mnt-btn-secondary"
				onclick={() => void onSignOut()}
				disabled={signingOut}
			>
				{signingOut ? 'Signing out…' : 'Sign out'}
			</button>
		</div>

		<p class="mnt-foot">
			If you're a system administrator, sign in with a super admin account to
			bypass this screen.
		</p>
	</div>
</div>

<style>
	.mnt-root {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: grid;
		place-items: center;
		padding: 24px;
		background: radial-gradient(
			ellipse at 50% 40%,
			#18181b 0%,
			#09090b 70%
		);
		background-color: #09090b;
		color: #fafafa;
		font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto,
			'Helvetica Neue', Arial, sans-serif;
	}

	:global(html.dark) .mnt-root {
		background: radial-gradient(
			ellipse at 50% 40%,
			#1c1917 0%,
			#09090b 70%
		);
		background-color: #09090b;
	}

	.mnt-card {
		width: 100%;
		max-width: 520px;
		padding: 40px 32px 32px;
		border-radius: var(--vanguard-radius);
		background: rgba(24, 24, 27, 0.85);
		border: 1px solid var(--vanguard-border);
		box-shadow: var(--vanguard-elev-3);
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		text-align: center;
	}

	.mnt-logo {
		width: 56px;
		height: 56px;
		margin: 0 auto 20px;
		display: grid;
		place-items: center;
		border-radius: 14px;
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
		color: #0c0a09;
		font-size: 28px;
		box-shadow: 0 12px 28px rgba(245, 158, 11, 0.35);
	}

	.mnt-kicker {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #a1a1aa;
		margin-bottom: 10px;
	}

	.mnt-title {
		margin: 0 0 14px;
		font-size: 1.625rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: #fafafa;
		line-height: 1.2;
	}

	.mnt-body {
		margin: 0 auto 24px;
		max-width: 420px;
		font-size: 0.9375rem;
		line-height: 1.6;
		color: #d4d4d8;
	}

	.mnt-meta {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		border-radius: 999px;
		border: 1px solid rgba(245, 158, 11, 0.35);
		background: rgba(245, 158, 11, 0.08);
		color: #fcd34d;
		font-size: 0.75rem;
		font-weight: 600;
		margin-bottom: 28px;
	}

	.mnt-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #f59e0b;
		box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.18);
		animation: pulse 1.6s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.55; transform: scale(0.9); }
	}

	.mnt-actions {
		display: flex;
		justify-content: center;
		gap: 12px;
		margin-bottom: 24px;
	}

	.mnt-btn-secondary {
		appearance: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 40px;
		padding: 0 20px;
		border-radius: 8px;
		border: 1px solid rgba(250, 250, 250, 0.16);
		background: rgba(250, 250, 250, 0.04);
		color: #fafafa;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease;
	}

	.mnt-btn-secondary:hover:not(:disabled) {
		background: rgba(250, 250, 250, 0.08);
		border-color: rgba(250, 250, 250, 0.28);
	}

	.mnt-btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.mnt-foot {
		margin: 0;
		font-size: 0.75rem;
		color: #a1a1aa;
		line-height: 1.5;
	}
</style>
