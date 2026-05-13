<script lang="ts">
	import { browser } from '$app/environment';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import {
		collection,
		query,
		where,
		limit,
		getDocs,
		addDoc,
		serverTimestamp,
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';

	/**
	 * @typedef {{ email: string; role: string; label: string }} CandidateUser
	 */

	let {
		open = false,
		onClose = () => {},
		clubId = '',
		teamId = '',
		myEmail = '',
		myUid = '',
		myRole = 'player',
		onChannelCreated = /** @param {string} _id */ (_id) => {},
	} = $props();

	const myKey = $derived((myEmail || '').toLowerCase());

	const isStaffShadow = $derived(
		myRole === 'coach' || myRole === 'director' || myRole === 'super_admin' || myRole === 'global_admin',
	);

	/** @type {CandidateUser[]} */
	let candidates = $state([]);
	let loadErr = $state('');
	let loading = $state(false);

	/** @type {Set<string>} */
	let selected = $state(new Set());

	let search = $state('');
	let groupName = $state('');
	let creating = $state(false);
	let createErr = $state('');

	/** When staff selects a player, parents are auto-added for SafeSport. */
	let shadowCc = $state(false);

	/** @type {Map<string, string[] | null>} playerEmail -> parents (null = lookup in flight) */
	let shadowParentsByPlayer = $state(new Map());

	$effect(() => {
		if (!browser || !open || !clubId) return;
		void loadCandidates();
	});

	$effect(() => {
		if (!open) {
			search = '';
			groupName = '';
			createErr = '';
			selected = new Set();
			shadowCc = false;
			shadowParentsByPlayer = new Map();
		}
	});

	async function loadCandidates() {
		if (!clubId) return;
		loading = true;
		loadErr = '';
		try {
			const byEmail = new Map();

			const pushDoc = (d) => {
				const email = d.id.toLowerCase();
				if (!email || email === myKey) return;
				const data = d.data();
				const role = typeof data.role === 'string' ? data.role : 'player';
				const label =
					(typeof data.playerName === 'string' && data.playerName.trim()) ||
					(typeof data.displayName === 'string' && data.displayName.trim()) ||
					email.split('@')[0];
				byEmail.set(email, { email, role, label });
			};

			if (myRole === 'director' || myRole === 'super_admin' || myRole === 'global_admin') {
				const uq = query(
					collection(db, 'users'),
					where('clubId', '==', clubId),
					limit(400),
				);
				const snap = await getDocs(uq);
				snap.forEach((d) => pushDoc(d));
			}

			if (teamId && (myRole === 'coach' || myRole === 'super_admin' || myRole === 'global_admin')) {
				const tq = query(collection(db, 'users'), where('teamId', '==', teamId), limit(400));
				const ts = await getDocs(tq);
				ts.forEach((d) => pushDoc(d));
			}

			candidates = Array.from(byEmail.values()).sort((a, b) =>
				a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
			);
		} catch (e) {
			console.error('[NewMessageModal] loadCandidates', e);
			loadErr = e instanceof Error ? e.message : 'Could not load people.';
			candidates = [];
		} finally {
			loading = false;
		}
	}

	/**
	 * @param {string} playerEmailKey
	 * @returns {Promise<string[]>}
	 */
	async function fetchParentEmailsForPlayer(playerEmailKey) {
		const hq = query(
			collection(db, 'households'),
			where('playerEmails', 'array-contains', playerEmailKey),
			limit(8),
		);
		const snap = await getDocs(hq);
		const parents = [];
		for (const d of snap.docs) {
			const data = d.data();
			if (data.clubId !== clubId) continue;
			const pe = data.parentEmails;
			if (Array.isArray(pe)) {
				for (const p of pe) {
					const k = String(p).toLowerCase();
					if (k) parents.push(k);
				}
			}
		}
		return [...new Set(parents)];
	}

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return candidates;
		return candidates.filter(
			(c) =>
				c.email.toLowerCase().includes(q) ||
				c.label.toLowerCase().includes(q) ||
				c.role.toLowerCase().includes(q),
		);
	});

	const selectedList = $derived.by(() => {
		const map = new Map(candidates.map((c) => [c.email, c]));
		return [...selected].map((e) => map.get(e)).filter(Boolean);
	});

	/**
	 * Resolve Shadow CC parents whenever staff selects a player (pending = null until loaded).
	 */
	$effect(() => {
		if (!browser || !open || !isStaffShadow || !clubId) {
			shadowCc = false;
			shadowParentsByPlayer = new Map();
			return;
		}
		const players = [...selected].filter((e) => {
			const c = candidates.find((x) => x.email === e);
			return c?.role === 'player';
		});
		if (players.length === 0) {
			shadowCc = false;
			shadowParentsByPlayer = new Map();
			return;
		}
		const pending = new Map();
		for (const p of players) {
			pending.set(p, null);
		}
		shadowParentsByPlayer = pending;

		let cancelled = false;
		(async () => {
			const next = new Map(pending);
			for (const p of players) {
				if (cancelled) return;
				try {
					const par = await fetchParentEmailsForPlayer(p);
					if (cancelled) return;
					next.set(p, par);
					shadowParentsByPlayer = new Map(next);
				} catch (e) {
					console.error('[NewMessageModal] shadow', e);
					if (cancelled) return;
					next.set(p, []);
					shadowParentsByPlayer = new Map(next);
				}
			}
			if (!cancelled) {
				shadowCc = [...next.values()].some((arr) => Array.isArray(arr) && arr.length > 0);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	/**
	 * @param {string} email
	 */
	function toggle(email) {
		const next = new Set(selected);
		const k = email.toLowerCase();
		if (next.has(k)) next.delete(k);
		else next.add(k);
		selected = next;
	}

	/**
	 * @param {string} email
	 */
	function removeChip(email) {
		const next = new Set(selected);
		next.delete(email.toLowerCase());
		selected = next;
	}

	const plan = $derived.by(() => {
		const memberSet = new Set();
		if (myKey) memberSet.add(myKey);
		for (const e of selected) {
			memberSet.add(e.toLowerCase());
		}

		let shadowPending = false;
		let playerMissingGuardian = false;
		// ccParentSet tracks which emails are being added specifically as SafeSport CC'd parents
		// (distinct from being a regular channel member).
		const ccParentSet = new Set();
		if (isStaffShadow) {
			for (const e of selected) {
				const c = candidates.find((x) => x.email === e);
				if (c?.role === 'player') {
					const pars = shadowParentsByPlayer.get(e);
					if (pars === undefined || pars === null) {
						shadowPending = true;
					} else if (pars.length === 0) {
						playerMissingGuardian = true;
					} else {
						for (const p of pars) {
							memberSet.add(p);
							ccParentSet.add(p);
						}
					}
				}
			}
		}

		const memberIds = [...memberSet].sort();
		// ccParentEmails is the authoritative CC list written to the channel doc.
		const ccParentEmails = [...ccParentSet].sort();
		// safesportMonitored: true when at least one parent was auto-CC'd.
		const safesportMonitored = ccParentEmails.length > 0;

		let type = 'group';
		if (
			!shadowPending &&
			!playerMissingGuardian &&
			memberIds.length === 2
		) {
			const peer = memberIds.find((m) => m !== myKey) || '';
			const peerUser = candidates.find((c) => c.email === peer);
			const peerIsPlayer = peerUser?.role === 'player';
			if (!peerIsPlayer) type = 'dm';
		}

		const defaultName =
			type === 'dm'
				? (() => {
						const peer = memberIds.find((m) => m !== myKey) || '';
						const peerUser = candidates.find((c) => c.email === peer);
						return peerUser?.label || peer || 'Direct message';
					})()
				: (() => {
						const gn = groupName.trim();
						if (gn) return gn.slice(0, 200);
						const others = memberIds.filter((m) => m !== myKey);
						const labels = others.map((m) => {
							const u = candidates.find((c) => c.email === m);
							return u?.label || m;
						});
						return labels.slice(0, 5).join(', ') || 'Group chat';
					})();

		return {
			memberIds,
			type,
			defaultName,
			playerMissingGuardian,
			shadowPending,
			ccParentEmails,
			safesportMonitored,
		};
	});

	const showGroupName = $derived(plan.type === 'group' || plan.shadowPending);

	async function startChat() {
		if (!clubId || !teamId || !myUid || creating) return;
		if (selected.size === 0) {
			createErr = 'Select at least one person.';
			return;
		}
		const {
			memberIds,
			type,
			defaultName,
			playerMissingGuardian,
			shadowPending,
			ccParentEmails,
			safesportMonitored,
		} = plan;
		if (shadowPending) return;
		if (playerMissingGuardian) {
			createErr =
				'Link a parent/guardian to this player (household) before starting a chat.';
			return;
		}
		creating = true;
		createErr = '';
		try {
			const name =
				type === 'group' && groupName.trim() ? groupName.trim().slice(0, 200) : defaultName;
			const col = collection(db, 'clubs', clubId, 'channels');
			const ref = await addDoc(col, {
				name,
				type,
				memberIds,
				// Durable SafeSport fields written at creation time.
				safesportMonitored,
				ccParentEmails,
				teamId,
				createdBy: myUid,
				createdAt: serverTimestamp(),
			});
			onChannelCreated(ref.id);
			onClose();
		} catch (e) {
			console.error('[NewMessageModal] create', e);
			createErr = e instanceof Error ? e.message : String(e);
		} finally {
			creating = false;
		}
	}

	function onBackdropKeydown(e) {
		if (e.key === 'Escape') onClose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="nm-backdrop"
		role="presentation"
		transition:fade={{ duration: 180 }}
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		onkeydown={onBackdropKeydown}
	>
		<div
			class="nm-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="nm-title"
			tabindex="-1"
			transition:fly={{ y: 20, duration: 400, easing: cubicOut }}
		>
			<div class="nm-head">
				<h2 id="nm-title" class="nm-title">New chat</h2>
				<button type="button" class="nm-close" onclick={() => onClose()} aria-label="Close">
					<i class="ph ph-x" aria-hidden="true"></i>
				</button>
			</div>

			{#if loading}
				<p class="nm-muted">Loading people…</p>
			{:else if loadErr}
				<p class="nm-err" role="alert">{loadErr}</p>
			{:else}
				<label class="nm-label" for="nm-search">To</label>
				<div class="nm-search-wrap">
					<i class="ph ph-magnifying-glass nm-search-ico" aria-hidden="true"></i>
					<input
						id="nm-search"
						class="nm-search"
						type="search"
						placeholder="Search coaches, parents, players…"
						autocomplete="off"
						bind:value={search}
					/>
				</div>

				{#if selectedList.length > 0}
					<ul class="nm-chips">
						{#each selectedList as s (s.email)}
							<li class="nm-chip">
								<span class="nm-chip-text">{s.label}</span>
								<span class="nm-chip-role">{s.role}</span>
								<button
									type="button"
									class="nm-chip-x"
									aria-label="Remove {s.label}"
									onclick={() => removeChip(s.email)}
								>
									<i class="ph ph-x" aria-hidden="true"></i>
								</button>
							</li>
						{/each}
					</ul>
				{/if}

				{#if plan.shadowPending && isStaffShadow && selectedList.some((s) => s.role === 'player')}
					<p class="nm-muted nm-pending">Looking up linked guardian…</p>
				{/if}
			{#if shadowCc && isStaffShadow && !plan.shadowPending}
				<div class="nm-safesport">
					<i class="ph ph-shield-check nm-safesport-icon" aria-hidden="true"></i>
					<div class="nm-safesport-body">
						<strong>SafeSport Protocol: Parent automatically CC'd.</strong>
						{#if plan.ccParentEmails.length > 0}
							<ul class="nm-safesport-parents" aria-label="CC'd parents">
								{#each plan.ccParentEmails as email (email)}
									<li>{email}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			{/if}

				<div class="nm-list" role="listbox" aria-label="Recipients">
					{#each filtered as c (c.email)}
						<button
							type="button"
							class="nm-row"
							class:nm-row--on={selected.has(c.email)}
							onclick={() => toggle(c.email)}
						>
							<span class="nm-row-label">{c.label}</span>
							<span class="nm-row-role">{c.role}</span>
							<span class="nm-row-email">{c.email}</span>
						</button>
					{:else}
						<p class="nm-muted">No matches.</p>
					{/each}
				</div>

				{#if showGroupName}
					<label class="nm-label" for="nm-group">Group name <span class="nm-opt">(optional)</span></label
					>
					<input
						id="nm-group"
						class="nm-input"
						type="text"
						maxlength="200"
						placeholder={plan.defaultName}
						bind:value={groupName}
					/>
				{/if}

				{#if createErr}
					<p class="nm-err" role="alert">{createErr}</p>
				{/if}

				<div class="nm-actions">
					<button type="button" class="nm-btn nm-btn--ghost" onclick={() => onClose()}>Cancel</button>
					<button
						type="button"
						class="nm-btn nm-btn--primary"
						disabled={creating ||
							selected.size === 0 ||
							plan.playerMissingGuardian ||
							plan.shadowPending}
						onclick={() => void startChat()}
					>
						{creating ? 'Starting…' : 'Start Chat'}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.nm-backdrop {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(12px, 3vw, 24px);
		background: rgba(15, 23, 42, 0.45);
		box-sizing: border-box;
	}

	.nm-modal {
		width: min(100%, 440px);
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 20px 20px 18px;
		background: rgba(2, 2, 2, 0.82);
		border: 1px solid var(--vanguard-border);
		border-radius: var(--vanguard-radius);
		box-shadow: var(--vanguard-elev-3);
		overflow: visible;
		backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur)) saturate(180%);
	}

	:global(html.dark) .nm-modal {
		background: rgba(2, 2, 2, 0.82);
		border-color: var(--vanguard-border);
		box-shadow: var(--vanguard-elev-3);
	}

	.nm-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.nm-title {
		margin: 0;
		font-size: 15px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--text-primary);
	}

	.nm-close {
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 8px;
		border-radius: 9999px;
		color: var(--text-secondary);
		font-size: 18px;
		line-height: 1;
	}

	.nm-close:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	:global(html.dark) .nm-close:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.nm-muted {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.nm-err {
		margin: 0;
		font-size: 13px;
		color: #b91c1c;
	}

	.nm-label {
		display: block;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		margin-top: 4px;
	}

	.nm-opt {
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0;
	}

	.nm-search-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 9999px;
		padding: 8px 12px;
		background: #fafafa;
	}

	:global(html.dark) .nm-search-wrap {
		border-color: rgba(255, 255, 255, 0.12);
		background: #09090b;
	}

	.nm-search-ico {
		font-size: 18px;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.nm-search {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		font: inherit;
		font-size: 13px;
		color: var(--text-primary);
		outline: none;
	}

	.nm-chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.nm-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px 4px 10px;
		border-radius: 999px;
		border: 1px solid #e5e5e5;
		background: #ffffff;
		font-size: 12px;
	}

	:global(html.dark) .nm-chip {
		border-color: rgba(255, 255, 255, 0.12);
		background: #18181b;
	}

	.nm-chip-text {
		font-weight: 600;
		color: var(--text-primary);
	}

	.nm-chip-role {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.nm-chip-x {
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 2px;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
	}

	.nm-pending {
		font-style: italic;
	}

	.nm-safesport {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 10px;
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.3);
		font-size: 12px;
		font-weight: 600;
		color: #047857;
	}
	.nm-safesport-icon {
		flex-shrink: 0;
		margin-top: 1px;
		font-size: 14px;
	}
	.nm-safesport-body {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.nm-safesport-parents {
		list-style: none;
		margin: 2px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.nm-safesport-parents li {
		font-size: 11px;
		font-weight: 500;
		color: #059669;
		word-break: break-all;
	}

	.nm-list {
		flex: 1;
		min-height: 120px;
		overflow-y: visible;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1.25rem;
		background: #fafafa;
	}

	:global(html.dark) .nm-list {
		border-color: rgba(255, 255, 255, 0.12);
		background: #09090b;
	}

	.nm-row {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		gap: 0 10px;
		padding: 10px 12px;
		border: none;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		background: transparent;
		cursor: pointer;
		text-align: left;
		font: inherit;
	}

	:global(html.dark) .nm-row {
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	.nm-row:last-child {
		border-bottom: none;
	}

	.nm-row:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.nm-row--on {
		background: rgba(245, 158, 11, 0.12);
	}

	:global(html.dark) .nm-row--on {
		background: rgba(245, 158, 11, 0.15);
	}

	.nm-row-label {
		grid-column: 1;
		grid-row: 1;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.nm-row-role {
		grid-column: 2;
		grid-row: 1;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--text-secondary);
		align-self: start;
	}

	.nm-row-email {
		grid-column: 1 / -1;
		grid-row: 2;
		font-size: 11px;
		color: var(--text-secondary);
		word-break: break-all;
	}

	.nm-input {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		padding: 10px 12px;
		font: inherit;
		font-size: 13px;
		background: #ffffff;
		color: var(--text-primary);
	}

	:global(html.dark) .nm-input {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.nm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 4px;
	}

	.nm-btn {
		border-radius: 14px;
		padding: 10px 18px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid #e5e5e5;
	}

	.nm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nm-btn--ghost {
		background: #ffffff;
		color: var(--text-primary);
	}

	:global(html.dark) .nm-btn--ghost {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.nm-btn--primary {
		background: var(--brand-primary, #f59e0b);
		color: #0f172a;
		border-color: transparent;
	}
</style>
