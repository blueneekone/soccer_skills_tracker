<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
	import { httpsCallable } from 'firebase/functions';
	import { db, functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const completeAssignmentStatus = httpsCallable(functions, 'completeAssignmentStatus');

	const uid = $derived(authStore.user?.uid || '');
	const profile = $derived(authStore.userProfile);

	/** @type {Array<{ id: string, drillId?: string, dueDate?: unknown, title?: string, baseXp?: number }>} */
	let items = $state([]);
	let loading = $state(true);
	let err = $state('');

	$effect(() => {
		if (!browser || !uid || authStore.role !== 'player') {
			items = [];
			loading = false;
			return;
		}
		loading = true;
		err = '';
		let cancelled = false;
		(async () => {
			try {
				const q = query(
					collection(db, 'assignments'),
					where('playerId', '==', uid),
					where('status', '==', 'pending'),
				);
				const snap = await getDocs(q);
				if (cancelled) return;
				const drillIds = new Set();
				const rows = [];
				for (const d of snap.docs) {
					const x = d.data();
					const title =
						typeof x.drillTitle === 'string' && x.drillTitle.trim() ?
							x.drillTitle.trim() :
							'Assigned drill';
					const did =
						typeof x.drillId === 'string' ? x.drillId.trim() : '';
					if (did) drillIds.add(did);
					rows.push({
						id: d.id,
						drillId: did || undefined,
						dueDate: x.dueDate,
						title,
						baseXp: 10,
					});
				}
				const baseById = {};
				await Promise.all(
					[...drillIds].map(async (id) => {
						try {
							const ds = await getDoc(doc(db, 'drills', id));
							if (ds.exists()) {
								const dr = ds.data();
								if (typeof dr.base_xp === 'number' && !Number.isNaN(dr.base_xp)) {
									baseById[id] = Math.floor(dr.base_xp);
								}
							}
						} catch {
							/* ignore */
						}
					}),
				);
				for (const r of rows) {
					if (r.drillId && baseById[r.drillId] != null) {
						r.baseXp = baseById[r.drillId];
					}
				}
				rows.sort((a, b) => {
					const ta =
						a.dueDate && typeof a.dueDate.toMillis === 'function' ?
							a.dueDate.toMillis() :
							0;
					const tb =
						b.dueDate && typeof b.dueDate.toMillis === 'function' ?
							b.dueDate.toMillis() :
							0;
					return ta - tb;
				});
				items = rows;
			} catch (e) {
				if (!cancelled) {
					err =
						e && typeof e === 'object' && 'message' in e ?
							String(e.message) :
							'Could not load assignments.';
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	function dueLabel(d) {
		if (!d) return '—';
		try {
			if (typeof d.toDate === 'function') {
				return d.toDate().toLocaleString();
			}
			if (d instanceof Date) return d.toLocaleString();
		} catch {
			/* ignore */
		}
		return String(d);
	}

	function logIt(row) {
		const q = new URLSearchParams();
		q.set('assignmentId', row.id);
		if (row.drillId) q.set('drillId', row.drillId);
		goto(`/tracker?${q.toString()}`);
	}

	async function markDoneQuick(id) {
		try {
			await completeAssignmentStatus({ assignmentId: id });
			items = items.filter((x) => x.id !== id);
		} catch (e) {
			alert(
				e && typeof e === 'object' && 'message' in e ?
					String(e.message) :
					'Could not update.',
			);
		}
	}
</script>

{#if authStore.role === 'player' && profile?.teamId && profile.teamId !== 'admin'}
	<div class="aa-inbox card player-portal-theme">
		<div class="card-header aa-inbox__head">Active assignments</div>
		<div class="card-body p-0">
			{#if loading}
				<p class="aa-inbox__hint">Loading…</p>
			{:else if err}
				<p class="aa-inbox__err" role="alert">{err}</p>
			{:else if items.length === 0}
				<p class="aa-inbox__hint">No pending homework. You’re all caught up.</p>
			{:else}
				<ul class="aa-inbox__list">
					{#each items as row (row.id)}
						<li class="aa-inbox__item">
							<div class="aa-inbox__text">
								<strong>{row.title}</strong>
								<span class="aa-inbox__due">Due {dueLabel(row.dueDate)}</span>
							</div>
							<div class="aa-inbox__actions">
								<button type="button" class="aa-btn aa-btn--primary" onclick={() => logIt(row)}>
									Log workout
								</button>
								<button
									type="button"
									class="aa-btn aa-btn--ghost"
									onclick={() => markDoneQuick(row.id)}
								>
									Mark done
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

<style>
	.aa-inbox {
		margin-bottom: clamp(14px, 2.5vw, 20px);
		border: 1px solid var(--pp-border, var(--glass-border));
		background: var(--pp-surface-elevated, var(--glass-bg));
	}

	.aa-inbox__head {
		font-weight: 900;
	}

	.aa-inbox__hint,
	.aa-inbox__err {
		margin: 0;
		padding: 16px;
		font-size: 0.9rem;
	}

	.aa-inbox__err {
		color: var(--danger-red);
		font-weight: 700;
	}

	.aa-inbox__list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.aa-inbox__item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--pp-border, var(--border-subtle));
	}

	.aa-inbox__item:last-child {
		border-bottom: none;
	}

	.aa-inbox__text {
		flex: 1 1 200px;
		min-width: 0;
	}

	.aa-inbox__text strong {
		display: block;
		font-size: 0.95rem;
		color: var(--pp-text, var(--text-primary));
	}

	.aa-inbox__due {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--pp-text-muted, var(--text-secondary));
	}

	.aa-inbox__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.aa-btn {
		border-radius: 12px;
		padding: 10px 14px;
		font-weight: 800;
		font-size: 0.82rem;
		cursor: pointer;
		border: none;
	}

	.aa-btn--primary {
		background: linear-gradient(
			135deg,
			var(--pp-accent, var(--brand-primary)),
			color-mix(in srgb, var(--pp-accent, var(--brand-primary)) 80%, #1e1b4b)
		);
		color: #fff;
	}

	.aa-btn--ghost {
		background: transparent;
		border: 1px solid var(--pp-border, var(--glass-border));
		color: var(--pp-text, var(--text-primary));
	}
</style>
