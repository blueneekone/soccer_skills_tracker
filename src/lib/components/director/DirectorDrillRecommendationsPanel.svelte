<script lang="ts">
	import { browser } from '$app/environment';
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		dismissDrillRecommendation,
		publishDrillToClub,
	} from '$lib/coach/platformDrillLibrary.js';

	let { clubId = '' } = $props();

	type RecRow = {
		id: string;
		title: string;
		category: string;
		attributeId: string;
		durationMinutes: number;
		teamId: string;
		coachEmail: string;
		notes: string;
		status: string;
		createdAtMs: number;
	};

	let loading = $state(false);
	let actingId = $state('');
	let err = $state('');
	let ok = $state('');
	let rows = $state<RecRow[]>([]);

	const canManage = $derived(authStore.isDirector || authStore.isAdmin);
	const pending = $derived(rows.filter((r) => r.status === 'pending'));

	$effect(() => {
		if (!browser || !clubId || !canManage) return;
		void loadRecommendations();
	});

	async function loadRecommendations() {
		if (!clubId) return;
		loading = true;
		err = '';
		try {
			const snap = await getDocs(
				query(collection(db, 'drill_recommendations'), where('clubId', '==', clubId)),
			);
			rows = snap.docs
				.map((d) => {
					const x = d.data() as Record<string, unknown>;
					const created = x.createdAt as { toMillis?: () => number } | undefined;
					return {
						id: d.id,
						title: typeof x.title === 'string' ? x.title : 'Untitled drill',
						category: typeof x.category === 'string' ? x.category : 'General',
						attributeId: typeof x.attributeId === 'string' ? x.attributeId : '',
						durationMinutes:
							typeof x.durationMinutes === 'number' ? Math.floor(x.durationMinutes) : 10,
						teamId: typeof x.teamId === 'string' ? x.teamId : '',
						coachEmail: typeof x.coachEmail === 'string' ? x.coachEmail : '',
						notes: typeof x.notes === 'string' ? x.notes : '',
						status: typeof x.status === 'string' ? x.status : 'pending',
						createdAtMs: created?.toMillis?.() ?? 0,
					};
				})
				.sort((a, b) => b.createdAtMs - a.createdAtMs);
		} catch (e) {
			err = e instanceof Error ? e.message : 'Could not load drill recommendations.';
		} finally {
			loading = false;
		}
	}

	async function publish(rec: RecRow) {
		const uid = authStore.user?.uid;
		if (!uid || !clubId || actingId) return;
		actingId = rec.id;
		err = '';
		ok = '';
		try {
			const drillId = await publishDrillToClub(db, {
				recommendationId: rec.id,
				clubId,
				directorUid: uid,
			});
			ok = `"${rec.title}" published to club shared drills (${drillId}).`;
			await loadRecommendations();
		} catch (e) {
			err = e instanceof Error ? e.message : 'Publish failed.';
		} finally {
			actingId = '';
		}
	}

	async function dismiss(rec: RecRow) {
		const uid = authStore.user?.uid;
		if (!uid || !clubId || actingId) return;
		actingId = rec.id;
		err = '';
		ok = '';
		try {
			await dismissDrillRecommendation(db, {
				recommendationId: rec.id,
				clubId,
				directorUid: uid,
			});
			ok = `"${rec.title}" dismissed.`;
			await loadRecommendations();
		} catch (e) {
			err = e instanceof Error ? e.message : 'Dismiss failed.';
		} finally {
			actingId = '';
		}
	}

	function formatWhen(ms: number) {
		if (!ms) return '—';
		try {
			return new Date(ms).toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			});
		} catch {
			return '—';
		}
	}
</script>

<section class="drill-inbox" aria-labelledby="drill-inbox-heading">
	<h3 id="drill-inbox-heading" class="drill-inbox__title">Coach drill recommendations</h3>
	<p class="drill-inbox__sub">
		Review team drills coaches shared from <code>/coach/drills</code>. Publish copies into
		<code>clubs/{clubId || '{clubId}'}/shared_drills</code> for Intent Engine pickup.
	</p>

	{#if !canManage}
		<p class="drill-inbox__muted">Director access required.</p>
	{:else if loading}
		<p class="drill-inbox__muted">Loading inbox…</p>
	{:else if pending.length === 0}
		<p class="drill-inbox__muted">No pending recommendations for this club.</p>
	{:else}
		<ul class="drill-inbox__list">
			{#each pending as rec (rec.id)}
				<li class="drill-inbox__card">
					<div class="drill-inbox__card-head">
						<strong>{rec.title}</strong>
						<span class="drill-inbox__chip">{rec.category}</span>
					</div>
					<dl class="drill-inbox__meta">
						<div><dt>Duration</dt><dd>{rec.durationMinutes} min</dd></div>
						<div><dt>Attribute</dt><dd>{rec.attributeId || '—'}</dd></div>
						<div><dt>Team</dt><dd><code>{rec.teamId || '—'}</code></dd></div>
						<div><dt>Coach</dt><dd>{rec.coachEmail || '—'}</dd></div>
						<div><dt>Submitted</dt><dd>{formatWhen(rec.createdAtMs)}</dd></div>
					</dl>
					{#if rec.notes}
						<p class="drill-inbox__notes">{rec.notes}</p>
					{/if}
					<div class="drill-inbox__actions">
						<button
							type="button"
							class="drill-inbox__btn drill-inbox__btn--primary"
							disabled={actingId === rec.id}
							onclick={() => void publish(rec)}
						>
							{actingId === rec.id ? 'Working…' : 'Publish to club'}
						</button>
						<button
							type="button"
							class="drill-inbox__btn"
							disabled={actingId === rec.id}
							onclick={() => void dismiss(rec)}
						>
							Dismiss
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	{#if err}<p class="drill-inbox__flash drill-inbox__flash--err" role="alert">{err}</p>{/if}
	{#if ok}<p class="drill-inbox__flash drill-inbox__flash--ok" role="status">{ok}</p>{/if}
</section>

<style>
	.drill-inbox {
		background: var(--glass-bg, #ffffff);
		border: 1px solid var(--border-muted, #e5e5e5);
		border-radius: 12px;
		padding: 16px;
		margin-bottom: 16px;
	}

	:global(html.dark) .drill-inbox {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.08);
	}

	.drill-inbox__title {
		margin: 0 0 4px;
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary, #09090b);
	}

	.drill-inbox__sub {
		margin: 0 0 12px;
		font-size: 13px;
		color: var(--text-secondary, #52525b);
		max-width: 72ch;
	}

	.drill-inbox__sub code {
		font-size: 12px;
	}

	.drill-inbox__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.drill-inbox__card {
		border: 1px solid var(--border-muted, #e5e5e5);
		border-radius: 10px;
		padding: 12px;
	}

	:global(html.dark) .drill-inbox__card {
		border-color: rgba(255, 255, 255, 0.08);
	}

	.drill-inbox__card-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.drill-inbox__chip {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(37, 99, 235, 0.12);
		color: #1d4ed8;
	}

	.drill-inbox__meta {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));
		gap: 8px;
		margin: 0 0 8px;
		font-size: 12px;
	}

	.drill-inbox__meta dt {
		margin: 0;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #52525b);
	}

	.drill-inbox__meta dd {
		margin: 2px 0 0;
		color: var(--text-primary, #09090b);
	}

	.drill-inbox__notes {
		margin: 0 0 10px;
		font-size: 13px;
		color: var(--text-secondary, #52525b);
		white-space: pre-wrap;
	}

	.drill-inbox__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.drill-inbox__btn {
		padding: 8px 14px;
		border-radius: 8px;
		border: 1px solid var(--border-muted, #e5e5e5);
		background: transparent;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		color: var(--text-primary, #09090b);
	}

	.drill-inbox__btn--primary {
		background: #2563eb;
		border-color: #2563eb;
		color: #fff;
	}

	.drill-inbox__btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.drill-inbox__flash {
		margin: 12px 0 0;
		padding: 9px 12px;
		border-radius: 8px;
		font-size: 13px;
	}

	.drill-inbox__flash--err {
		background: rgba(239, 68, 68, 0.08);
		color: #b91c1c;
	}

	.drill-inbox__flash--ok {
		background: rgba(16, 185, 129, 0.1);
		color: #047857;
	}

	.drill-inbox__muted {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary, #52525b);
	}
</style>
