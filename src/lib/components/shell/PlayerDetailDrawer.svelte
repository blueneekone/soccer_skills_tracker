<script>
	import { enterprisePlayerDrawer } from '$lib/stores/enterprisePlayerDrawer.svelte.js';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		collection,
		doc,
		getDoc,
		getDocs,
		limit,
		onSnapshot,
		query,
		where,
	} from 'firebase/firestore';
	import '$lib/styles/enterprise-console.css';

	const row = $derived(enterprisePlayerDrawer.selected);
	const act = $derived(enterprisePlayerDrawer.actions);

	/** @type {import('firebase/firestore').Unsubscribe | null} */
	let unsubStats = null;

	let statsLive = $state(
		/** @type {Record<string, unknown> | null} */ (null)
	);
	let userSnap = $state(/** @type {Record<string, unknown> | null} */ (null));
	let passportSnap = $state(/** @type {Record<string, unknown> | null} */ (null));
	let householdSnap = $state(/** @type {Record<string, unknown> | null} */ (null));
	let householdBusy = $state(false);

	const role = $derived(authStore.role);
	const canReadPassport = $derived(
		role === 'super_admin' || role === 'director' || role === 'registrar'
	);
	const canReadHousehold = $derived(role === 'super_admin');

	const open = $derived(row != null);

	/**
	 * @param {unknown} v
	 */
	function fmtTs(v) {
		if (v == null) return '—';
		if (typeof v === 'object' && v !== null && 'toDate' in v && typeof v.toDate === 'function') {
			try {
				return v.toDate().toLocaleDateString();
			} catch {
				return '—';
			}
		}
		return '—';
	}

	$effect(() => {
		if (!row?.statsDocId) {
			statsLive = null;
			return;
		}
		unsubStats?.();
		unsubStats = onSnapshot(
			doc(db, 'player_stats', row.statsDocId),
			(snap) => {
				statsLive = snap.exists() ? snap.data() : null;
			},
			() => {
				statsLive = null;
			}
		);
		return () => {
			unsubStats?.();
			unsubStats = null;
		};
	});

	$effect(() => {
		const email = row?.playerEmail?.toLowerCase().trim() || '';
		userSnap = null;
		passportSnap = null;
		householdSnap = null;
		if (!email) return;

		(async () => {
			try {
				const u = await getDoc(doc(db, 'users', email));
				userSnap = u.exists() ? u.data() : null;
			} catch {
				userSnap = null;
			}

			if (canReadPassport) {
				try {
					const p = await getDoc(doc(db, 'passports', email));
					passportSnap = p.exists() ? p.data() : null;
				} catch {
					passportSnap = null;
				}
			} else {
				passportSnap = null;
			}

			if (canReadHousehold) {
				householdBusy = true;
				try {
					const hq = query(
						collection(db, 'households'),
						where('playerEmails', 'array-contains', email),
						limit(1)
					);
					const hs = await getDocs(hq);
					if (!hs.empty) {
						householdSnap = hs.docs[0].data();
					} else {
						householdSnap = null;
					}
				} catch {
					householdSnap = null;
				} finally {
					householdBusy = false;
				}
			}
		})();
	});

	const levelDisplay = $derived.by(() => {
		const d = statsLive;
		if (!d) return '—';
		const lv =
			typeof d.current_level === 'number' && !Number.isNaN(d.current_level) ?
				Math.floor(d.current_level) :
				null;
		if (lv != null) return String(lv);
		const leg = d.level;
		if (typeof leg === 'number' && !Number.isNaN(leg)) return String(Math.floor(leg));
		return '—';
	});

	const xpWeek = $derived.by(() => {
		const d = statsLive;
		if (!d) return '—';
		const x = d.xp_this_week;
		if (typeof x === 'number' && !Number.isNaN(x)) return Math.floor(x).toLocaleString();
		return '—';
	});

	const streakDays = $derived.by(() => {
		const d = statsLive;
		if (!d) return '—';
		const s = d.streak_days;
		if (typeof s === 'number' && !Number.isNaN(s)) return String(Math.floor(s));
		return '—';
	});

	const positionResolved = $derived.by(() => {
		if (row?.position?.trim()) return row.position.trim();
		const u = userSnap;
		if (u?.position) return String(u.position);
		if (u?.primaryPosition) return String(u.primaryPosition);
		return '—';
	});

	const parentLine = $derived.by(() => {
		if (householdSnap?.parentEmails && Array.isArray(householdSnap.parentEmails)) {
			return householdSnap.parentEmails.join(', ') || '—';
		}
		if (passportSnap?.emergencyName) {
			return String(passportSnap.emergencyName);
		}
		return '—';
	});

	const emergencyEmailLine = $derived.by(() => {
		if (passportSnap?.emergencyPhone) {
			return String(passportSnap.emergencyPhone);
		}
		return '—';
	});

	function closePanel() {
		enterprisePlayerDrawer.close();
	}

	function onBackdropClick() {
		closePanel();
	}

	/** @param {Event} e */
	function stop(e) {
		e.stopPropagation();
	}

	function initials(name) {
		const p = String(name || '').trim().split(/\s+/).filter(Boolean);
		if (p.length === 0) return '?';
		if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
		return (p[0][0] + p[p.length - 1][0]).toUpperCase();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="ec-pdrawer-backdrop"
	class:ec-pdrawer-backdrop--open={open}
	role="presentation"
	aria-hidden={!open}
	onclick={onBackdropClick}
></div>

<aside
	class="ec-pdrawer"
	class:ec-pdrawer--open={open}
	aria-hidden={!open}
	aria-label="Player details"
	onclick={stop}
>
	{#if row}
		<div class="ec-pdrawer__head">
			<div class="ec-pdrawer__identity">
				<div class="ec-pdrawer__avatar" aria-hidden="true">{initials(row.displayName)}</div>
				<div class="ec-pdrawer__titlewrap">
					<h2 class="ec-pdrawer__title">{row.displayName}</h2>
					{#if row.teamLabel}
						<p class="ec-pdrawer__subtitle">{row.teamLabel}</p>
					{/if}
				</div>
			</div>
			<button type="button" class="ec-pdrawer__close-x" onclick={closePanel} aria-label="Close">
				<i class="ph ph-x" style="font-size: 1.25rem;"></i>
			</button>
		</div>

		<div class="ec-pdrawer__scroll">
			<section class="ec-pdrawer__section">
				<h3 class="ec-pdrawer__section-label">Identity</h3>
				<dl class="ec-pdrawer__dl">
					<div>
						<dt>Primary position</dt>
						<dd>{positionResolved}</dd>
					</div>
					<div>
						<dt>Age group</dt>
						<dd>{row.ageGroup?.trim() ? row.ageGroup : '—'}</dd>
					</div>
					<div>
						<dt>Jersey</dt>
						<dd>{row.jersey?.trim() ? row.jersey : '—'}</dd>
					</div>
				</dl>
			</section>

			<section class="ec-pdrawer__section">
				<h3 class="ec-pdrawer__section-label">Accountability</h3>
				<dl class="ec-pdrawer__dl">
					<div>
						<dt>Level</dt>
						<dd>{levelDisplay}</dd>
					</div>
					<div>
						<dt>XP this week</dt>
						<dd>{xpWeek}</dd>
					</div>
					<div>
						<dt>Streak (days)</dt>
						<dd>{streakDays}</dd>
					</div>
				</dl>
				{#if statsLive && statsLive.updatedAt}
					<p class="ec-pdrawer__hint">Stats updated {fmtTs(statsLive.updatedAt)}</p>
				{/if}
			</section>

			<section class="ec-pdrawer__section">
				<h3 class="ec-pdrawer__section-label">Household</h3>
				{#if householdBusy}
					<p class="ec-pdrawer__hint">Loading…</p>
				{:else}
					<dl class="ec-pdrawer__dl">
						<div>
							<dt>Parent / guardian</dt>
							<dd>{parentLine}</dd>
						</div>
						<div>
							<dt>Emergency / contact</dt>
							<dd>{emergencyEmailLine}</dd>
						</div>
					</dl>
					{#if !canReadPassport && row.source === 'coach'}
						<p class="ec-pdrawer__hint">
							Full passport & household details require director or admin access.
						</p>
					{/if}
				{/if}
			</section>

			<section class="ec-pdrawer__section">
				<h3 class="ec-pdrawer__section-label">Actions</h3>
				<div class="ec-pdrawer__actions">
					{#if act?.assignDrill}
						<button type="button" class="ec-pdrawer__btn" onclick={() => act?.assignDrill?.()}>
							Assign drill
						</button>
					{/if}
					<button
						type="button"
						class="ec-pdrawer__btn"
						onclick={() => {
							if (act?.editProfile) {
								act.editProfile();
								return;
							}
							const em = row.playerEmail;
							if (em) window.location.href = `mailto:${em}`;
						}}
					>
						Edit profile
					</button>
					{#if act?.removeFromRoster}
						<button
							type="button"
							class="ec-pdrawer__btn ec-pdrawer__btn--danger"
							onclick={() => void act?.removeFromRoster?.()}
						>
							Remove from roster
						</button>
					{/if}
				</div>
			</section>
		</div>
	{/if}
</aside>

<style>
	/* Panel tweaks are in enterprise-console.css (.ec-pdrawer*) */
</style>
