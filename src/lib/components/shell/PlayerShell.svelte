<script>
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { collection, onSnapshot, query, where } from 'firebase/firestore';
	import { handleSignOut } from '$lib/auth/signOutFlow.js';
	import { db } from '$lib/firebase.js';
	import RedAlertModal from '$lib/components/notifications/RedAlertModal.svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import ActiveAssignmentsInbox from '$lib/components/shell/PlayerActionInbox.svelte';
	import '$lib/styles/player-shell.css';

	/** Dismiss red alert for this browser tab session (defer or accept). */
	const RED_ALERT_SESSION_KEY = 'ss-player-red-alert-dismissed';

	let disconnectBusy = $state(false);
	let isInboxOpen = $state(false);
	let pendingAssignmentCount = $state(0);
	/** @type {{ id: string, drillId?: string } | null} */
	let firstPendingAssignment = $state(null);
	/** Firestore `pending` rows not explicitly acknowledged (opt-in fields). */
	let hasUnacknowledgedPending = $state(false);
	let showRedAlert = $state(false);

	async function disconnect() {
		if (disconnectBusy) return;
		disconnectBusy = true;
		try {
			await handleSignOut();
		} catch (e) {
			console.error('[PlayerShell] sign out', e);
		} finally {
			disconnectBusy = false;
		}
	}

	/** @type {{ children?: import('svelte').Snippet }} */
	let { children } = $props();

	const playerName = $derived(
		authStore.userProfile?.playerName || authStore.user?.email?.split('@')[0] || 'Athlete',
	);

	const firstName = $derived(
		String(playerName)
			.trim()
			.split(/\s+/)[0] || playerName,
	);

	const playerUid = $derived(authStore.user?.uid || '');
	const role = $derived(authStore.role);
	const email = $derived((authStore.user?.email || '').toLowerCase());
	const isOperativeProxy = $derived(
		email.endsWith('@operative.local') && role === 'player',
	);

	$effect(() => {
		if (!browser || !playerUid || role !== 'player') {
			pendingAssignmentCount = 0;
			firstPendingAssignment = null;
			hasUnacknowledgedPending = false;
			return;
		}
		const q = query(
			collection(db, 'assignments'),
			where('playerId', '==', playerUid),
			where('status', '==', 'pending'),
		);
		const unsub = onSnapshot(
			q,
			(snap) => {
				pendingAssignmentCount = snap.size;
				if (snap.empty) {
					firstPendingAssignment = null;
					hasUnacknowledgedPending = false;
					return;
				}
				/** @param {import('firebase/firestore').DocumentData} x */
				function isUnack(x) {
					if (x.alertAcknowledged === true) return false;
					if (x.playerAlertAcknowledged === true) return false;
					if (x.acknowledgedByPlayer === true) return false;
					return true;
				}
				hasUnacknowledgedPending = snap.docs.some((d) => isUnack(d.data()));
				const rows = snap.docs
					.filter((d) => isUnack(d.data()))
					.map((d) => {
						const x = d.data();
						return {
							id: d.id,
							dueMs:
								x.dueDate && typeof x.dueDate.toMillis === 'function' ?
									x.dueDate.toMillis()
								:	0,
							drillId: typeof x.drillId === 'string' ? x.drillId.trim() : undefined,
						};
					});
				if (rows.length === 0) {
					firstPendingAssignment = null;
					return;
				}
				rows.sort((a, b) => a.dueMs - b.dueMs);
				const top = rows[0];
				firstPendingAssignment = top ? { id: top.id, drillId: top.drillId } : null;
			},
			(e) => {
				console.error('[PlayerShell] assignments snapshot', e);
				pendingAssignmentCount = 0;
				firstPendingAssignment = null;
				hasUnacknowledgedPending = false;
			},
		);
		return () => unsub();
	});

	$effect(() => {
		if (!browser || !playerUid || role !== 'player') {
			showRedAlert = false;
			return;
		}
		if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(RED_ALERT_SESSION_KEY) === '1') {
			showRedAlert = false;
			return;
		}
		showRedAlert = hasUnacknowledgedPending;
	});

	function suppressRedAlertForSession() {
		if (browser) {
			try {
				sessionStorage.setItem(RED_ALERT_SESSION_KEY, '1');
			} catch {
				/* private mode, etc. */
			}
		}
		showRedAlert = false;
	}

	function onRedAlertAccept() {
		suppressRedAlertForSession();
		const a = firstPendingAssignment;
		if (a?.id) {
			const q = new URLSearchParams();
			q.set('assignmentId', a.id);
			if (a.drillId) q.set('drillId', a.drillId);
			void goto(`/tracker?${q.toString()}`);
			return;
		}
		void goto('/player/workout');
	}

	function onRedAlertDefer() {
		suppressRedAlertForSession();
	}

	/** Bottom / rail nav — HQ first, then core athlete loops. */
	const NAV_LINKS = [
		{ href: '/player/dashboard', icon: 'ph-squares-four', label: 'HQ' },
		{ href: '/stats', icon: 'ph-chart-bar', label: 'Stats' },
		{ href: '/player/workout', icon: 'ph-list-checks', label: 'Train' },
		{ href: '/trophies', icon: 'ph-trophy', label: 'Trophies' },
		{ href: '/player/armory', icon: 'ph-shield-check', label: 'Armory' },
		{ href: '/settings', icon: 'ph-gear', label: 'Settings' },
	];

	/**
	 * @param {string} href
	 */
	function isActive(href) {
		const path = page.url.pathname;
		if (path === href) return true;
		/* Avoid treating every /player/* route as HQ */
		if (href === '/player/dashboard') return false;
		if (href === '/operative/profile') {
			return path === '/operative/profile' || path.startsWith('/operative/');
		}
		return path.startsWith(href + '/');
	}
</script>

<div class="ps-root tw-w-full tw-max-w-[100vw] tw-overflow-x-hidden">
	<RedAlertModal open={showRedAlert} onAccept={onRedAlertAccept} onDefer={onRedAlertDefer} />
	<div class="ps-ambient" aria-hidden="true">
		<div class="ps-ambient__grid"></div>
		<div class="ps-ambient__glow ps-ambient__glow--a"></div>
		<div class="ps-ambient__glow ps-ambient__glow--b"></div>
	</div>

	<nav class="ps-bottom-nav" aria-label="Player navigation">
		{#each NAV_LINKS as link (link.href)}
			<a
				class="ps-bottom-nav__link"
				class:ps-bottom-nav__link--active={isActive(link.href)}
				href={link.href}
				aria-current={isActive(link.href) ? 'page' : undefined}
				data-sveltekit-preload-data="hover"
			>
				<i class="ph {link.icon} ps-bottom-nav__icon" aria-hidden="true"></i>
				<span class="ps-bottom-nav__label">{link.label}</span>
			</a>
		{/each}
	</nav>

	<div class="ps-stack">
		<header class="ps-topbar">
			<div class="ps-topbar__brand">
				<span class="ps-topbar__mark" aria-hidden="true">
					<i class="ph ph-polygon"></i>
				</span>
				<div class="ps-topbar__hello">
					<span class="ps-topbar__greet">Player OS</span>
					<span class="ps-topbar__name">{firstName}</span>
				</div>
			</div>
			<div class="ps-topbar__actions tw-flex tw-min-w-0 tw-shrink-0 tw-items-center tw-gap-2">
				<div class="tw-relative">
					<button
						type="button"
						class="tw-relative tw-flex tw-h-11 tw-w-11 tw-touch-manipulation tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-cyan-500/25 tw-bg-black/50 tw-text-cyan-200 tw-transition hover:tw-border-cyan-400/50 hover:tw-bg-cyan-950/30 hover:tw-text-cyan-100"
						aria-expanded={isInboxOpen}
						aria-controls="ps-action-inbox-panel"
						aria-label="Action inbox, assignments and drills"
						onclick={() => (isInboxOpen = !isInboxOpen)}
					>
						<i class="ph ph-bell tw-text-lg" aria-hidden="true"></i>
						{#if pendingAssignmentCount > 0}
							<span
								class="tw-pointer-events-none tw-absolute tw-right-1.5 tw-top-1.5 tw-h-2 tw-w-2 tw-rounded-full tw-bg-red-500 tw-ring-2 tw-ring-black/80"
								aria-hidden="true"
							></span>
						{/if}
					</button>
				</div>
				<button
					type="button"
					class="tw-min-h-11 tw-min-w-[5.5rem] tw-shrink-0 tw-touch-manipulation tw-border tw-border-red-500/30 tw-bg-black/40 tw-px-3 tw-py-2.5 tw-font-mono tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-widest tw-text-red-500 tw-transition-colors hover:tw-border-red-500/60 hover:tw-bg-red-950/50 hover:tw-text-red-400 active:tw-bg-red-950/70 disabled:tw-opacity-50"
					disabled={disconnectBusy}
					onclick={disconnect}
				>
					{disconnectBusy ? '…' : 'DISCONNECT'}
				</button>
			</div>
		</header>

		{#if isInboxOpen}
			<div
				id="ps-action-inbox-panel"
				class="ps-inbox-dropdown tw-absolute tw-left-2 tw-right-2 tw-z-[80] tw-max-h-[min(70vh,28rem)] tw-overflow-y-auto tw-overflow-x-hidden tw-rounded-xl tw-border tw-border-cyan-500/20 tw-bg-zinc-950/85 tw-px-3 tw-py-3 tw-shadow-[0_20px_50px_rgba(0,0,0,0.65)] [backdrop-filter:blur(18px) saturate(1.2)] [webkit-backdrop-filter:blur(18px) saturate(1.2)]"
				style="top: var(--pp-topbar-height);"
				role="region"
				aria-label="Action inbox"
			>
				<ActiveAssignmentsInbox />
			</div>
		{/if}

		<main class="ps-canvas">
			{@render children?.()}
		</main>
	</div>
</div>
