<script lang="ts">
	import { browser } from '$app/environment';
	import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { alertsDrawer } from '$lib/stores/alertsDrawer.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import '$lib/styles/enterprise-console.css';

	// ── Alert types ───────────────────────────────────────────────────────────

	interface AlertDoc {
		alertId?: string;
		uid: string;
		title?: string;
		body?: string;
		type?: string;
		read?: boolean;
		createdAt?: { toMillis?: () => number } | null;
	}

	// ── State ─────────────────────────────────────────────────────────────────

	let alerts = $state<AlertDoc[]>([]);
	let loading = $state(false);
	let err = $state('');

	const open = $derived(alertsDrawer.open);
	const uid = $derived(authStore.user?.uid ?? '');

	// ── Real-time listener ────────────────────────────────────────────────────

	$effect(() => {
		if (!browser || !uid) {
			alerts = [];
			alertsDrawer.setUnread(0);
			return;
		}

		loading = true;
		err = '';

		const q = query(
			collection(db, 'reengagement_alerts'),
			where('uid', '==', uid),
			orderBy('createdAt', 'desc'),
			limit(20),
		);

		const unsub = onSnapshot(
			q,
			(snap) => {
				const rows: AlertDoc[] = [];
				let unread = 0;
				snap.forEach((d) => {
					const data = d.data() as AlertDoc;
					rows.push({ ...data, alertId: d.id });
					if (!data.read) unread++;
				});
				alerts = rows;
				alertsDrawer.setUnread(unread);
				loading = false;
			},
			(e) => {
				err = e.message;
				loading = false;
			},
		);

		return () => unsub();
	});

	// ── Helpers ───────────────────────────────────────────────────────────────

	function fmtDate(ts: AlertDoc['createdAt']): string {
		if (!ts) return '';
		try {
			const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : 0;
			if (!ms) return '';
			return new Date(ms).toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
			});
		} catch {
			return '';
		}
	}

	function alertIcon(type?: string): string {
		if (type === 'streak_at_risk') return 'game.flame';
		if (type === 'level_up') return 'game.star';
		if (type === 'mission') return 'data.target';
		return 'comm.bell';
	}

	function closeDrawer() {
		alertsDrawer.hide();
	}

	/** @param {Event} e */
	function stop(e: Event) {
		e.stopPropagation();
	}
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="ec-pdrawer-backdrop"
	class:ec-pdrawer-backdrop--open={open}
	role="presentation"
	aria-hidden={!open}
	onclick={closeDrawer}
></div>

<!-- Panel -->
<aside
	class="ec-pdrawer"
	class:ec-pdrawer--open={open}
	aria-hidden={!open}
	aria-label="Alerts"
	onclick={stop}
>
	<div class="ec-pdrawer__head">
		<div class="ec-pdrawer__identity">
			<div class="ec-pdrawer__avatar" aria-hidden="true">
				<Icon name="comm.bell" size={18} />
			</div>
			<div class="ec-pdrawer__titlewrap">
				<h2 class="ec-pdrawer__title">Alerts</h2>
				{#if alertsDrawer.unreadCount > 0}
					<p class="ec-pdrawer__subtitle">{alertsDrawer.unreadCount} unread</p>
				{/if}
			</div>
		</div>
		<button type="button" class="ec-pdrawer__close-x" onclick={closeDrawer} aria-label="Close alerts">
			<Icon name="sys.close" size={20} />
		</button>
	</div>

	<div class="ec-pdrawer__scroll">
		{#if loading}
			<p class="ec-pdrawer__hint">Loading alerts…</p>
		{:else if err}
			<p class="ec-pdrawer__hint" style="color: var(--danger-red);">{err}</p>
		{:else if alerts.length === 0}
			<div class="adrawer-empty">
				<Icon name="comm.bell" size={32} class="adrawer-empty__icon" />
				<p class="adrawer-empty__msg">No alerts right now.</p>
				<p class="adrawer-empty__sub">We'll notify you when something needs your attention.</p>
			</div>
		{:else}
			<section class="ec-pdrawer__section">
				<h3 class="ec-pdrawer__section-label">Recent</h3>
				<ul class="adrawer-list" aria-label="Alerts">
					{#each alerts as alert (alert.alertId ?? alert.uid + alert.type)}
						<li class="adrawer-item" class:adrawer-item--unread={!alert.read}>
							<div class="adrawer-item__icon" aria-hidden="true">
								<Icon name={alertIcon(alert.type) as any} size={16} />
							</div>
							<div class="adrawer-item__body">
								{#if alert.title}
									<p class="adrawer-item__title">{alert.title}</p>
								{/if}
								{#if alert.body}
									<p class="adrawer-item__desc">{alert.body}</p>
								{/if}
								{#if fmtDate(alert.createdAt)}
									<p class="adrawer-item__date">{fmtDate(alert.createdAt)}</p>
								{/if}
							</div>
							{#if !alert.read}
								<span class="adrawer-item__dot" aria-label="Unread"></span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</aside>

<style>
	.adrawer-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 3rem 1.5rem;
		text-align: center;
	}

	.adrawer-empty :global(svg) {
		color: var(--text-secondary, #64748b);
		opacity: 0.4;
	}

	.adrawer-empty__msg {
		margin: 0;
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--text-primary, #f8fafc);
	}

	.adrawer-empty__sub {
		margin: 0;
		font-size: 0.78rem;
		color: var(--text-secondary, #64748b);
		line-height: 1.5;
	}

	.adrawer-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.adrawer-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.875rem 0;
		border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
		position: relative;
	}

	.adrawer-item:last-child {
		border-bottom: none;
	}

	.adrawer-item--unread {
		background: rgba(20, 184, 166, 0.04);
	}

	.adrawer-item__icon {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-row-hover, rgba(255,255,255,0.04));
		color: #14b8a6;
		border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
	}

	.adrawer-item__body {
		flex: 1 1 auto;
		min-width: 0;
	}

	.adrawer-item__title {
		margin: 0 0 0.2rem;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary, #f8fafc);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.adrawer-item__desc {
		margin: 0 0 0.2rem;
		font-size: 0.78rem;
		color: var(--text-secondary, #94a3b8);
		line-height: 1.45;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.adrawer-item__date {
		margin: 0;
		font-size: 0.7rem;
		color: var(--text-secondary, #64748b);
		font-variant-numeric: tabular-nums;
	}

	.adrawer-item__dot {
		flex-shrink: 0;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #14b8a6;
		align-self: center;
		box-shadow: 0 0 6px rgba(20, 184, 166, 0.6);
	}
</style>
