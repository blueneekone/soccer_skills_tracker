<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { fcmService } from '$lib/services/messaging.svelte.js';
	import {
		loadParentPushPreferences,
		saveParentPushPreferences,
		type ParentPushPreferences,
		PARENT_PUSH_DEFAULTS,
	} from '$lib/parent/parentNotificationPrefs.js';

	let prefs = $state<ParentPushPreferences>({ ...PARENT_PUSH_DEFAULTS });
	let loaded = $state(false);
	let syncMsg = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let syncTimer: ReturnType<typeof setTimeout> | null = null;

	const email = $derived(
		(authStore.user as { email?: string } | null)?.email?.toLowerCase() ?? '',
	);

	$effect(() => {
		fcmService.init();
		if (!email) return;
		void (async () => {
			prefs = await loadParentPushPreferences(email);
			loaded = true;
		})();
	});

	$effect(() => {
		const snapshot = { ...prefs };
		if (!loaded || !email) return;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			try {
				await saveParentPushPreferences(email, snapshot);
				syncMsg = 'Preferences saved';
				if (syncTimer) clearTimeout(syncTimer);
				syncTimer = setTimeout(() => (syncMsg = ''), 2200);
			} catch {
				/* silent */
			}
		}, 700);
	});

	async function enablePush() {
		await fcmService.requestAndRegister();
	}

	function setPref<K extends keyof ParentPushPreferences>(key: K, value: boolean) {
		prefs = { ...prefs, [key]: value };
	}
</script>

<section class="parent-push" aria-labelledby="parent-push-title">
	<div class="parent-push__head">
		<div>
			<h3 id="parent-push-title" class="parent-push__title">Notifications</h3>
			<p class="parent-push__sub">Push alerts for schedule, messages, and payments.</p>
		</div>
		{#if syncMsg}
			<span class="parent-push__sync" role="status">{syncMsg}</span>
		{/if}
	</div>

	{#if !fcmService.isGranted}
		<button
			type="button"
			class="parent-push__enable"
			disabled={fcmService.isRegistering || !fcmService.isSupported}
			onclick={enablePush}
		>
			{fcmService.isRegistering ? 'Enabling…' : 'Enable push notifications'}
		</button>
		{#if fcmService.error}
			<p class="parent-push__err" role="alert">{fcmService.error}</p>
		{/if}
	{:else}
		<p class="parent-push__status">Push enabled on this device.</p>
	{/if}

	<ul class="parent-push__matrix">
		<li>
			<label>
				<input
					type="checkbox"
					checked={prefs.push_gameReminders}
					onchange={(e) => setPref('push_gameReminders', e.currentTarget.checked)}
				/>
				Game &amp; practice reminders
			</label>
		</li>
		<li>
			<label>
				<input
					type="checkbox"
					checked={prefs.push_messages}
					onchange={(e) => setPref('push_messages', e.currentTarget.checked)}
				/>
				Coach messages
			</label>
		</li>
		<li>
			<label>
				<input
					type="checkbox"
					checked={prefs.push_announcements}
					onchange={(e) => setPref('push_announcements', e.currentTarget.checked)}
				/>
				Team announcements
			</label>
		</li>
		<li>
			<label>
				<input
					type="checkbox"
					checked={prefs.push_paymentReminders}
					onchange={(e) => setPref('push_paymentReminders', e.currentTarget.checked)}
				/>
				Payment reminders
			</label>
		</li>
	</ul>
</section>

<style>
	.parent-push {
		border: 1px solid rgba(51, 65, 85, 0.45);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		background: rgba(15, 23, 42, 0.4);
	}

	.parent-push__head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.parent-push__title {
		margin: 0 0 0.2rem;
		font-size: 0.95rem;
		font-weight: 700;
		color: #f8fafc;
	}

	.parent-push__sub {
		margin: 0;
		font-size: 0.8125rem;
		color: #94a3b8;
	}

	.parent-push__sync {
		font-size: 0.75rem;
		color: #5eead4;
	}

	.parent-push__enable {
		margin-bottom: 0.75rem;
		padding: 0.45rem 0.75rem;
		border-radius: 6px;
		border: 1px solid rgba(20, 184, 166, 0.45);
		background: rgba(20, 184, 166, 0.1);
		color: #5eead4;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
	}

	.parent-push__enable:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.parent-push__status {
		margin: 0 0 0.65rem;
		font-size: 0.75rem;
		color: #64748b;
	}

	.parent-push__matrix {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.parent-push__matrix label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: #cbd5e1;
		cursor: pointer;
	}

	.parent-push__err {
		margin: 0.35rem 0 0;
		font-size: 0.8125rem;
		color: #fca5a5;
	}
</style>
