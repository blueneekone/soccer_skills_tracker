<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { collection, query, where, getDocs } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	const uid = $derived(authStore.user?.uid || '');
	const role = $derived(authStore.role);

	let loading = $state(true);
	let drillCount = $state(0);
	/** @type {Array<{ id: string; title: string }>} */
	let assignmentRows = $state([]);

	$effect(() => {
		if (!browser || !uid || role !== 'player') {
			loading = false;
			drillCount = 0;
			assignmentRows = [];
			return;
		}
		let cancelled = false;
		loading = true;
		(async () => {
			try {
				const aSnap = await getDocs(
					query(
						collection(db, 'assignments'),
						where('playerId', '==', uid),
						where('status', '==', 'pending'),
					),
				);
				if (cancelled) return;
				drillCount = aSnap.size;
				/** @type {Array<{ id: string; title: string }>} */
				const rows = [];
				aSnap.forEach((d) => {
					const x = d.data() || {};
					const title =
						typeof x.drillTitle === 'string' && x.drillTitle.trim() ?
							x.drillTitle.trim()
						: typeof x.title === 'string' && x.title.trim() ?
							x.title.trim()
						: 'Assignment';
					rows.push({ id: d.id, title });
				});
				rows.sort((a, b) => a.title.localeCompare(b.title));
				assignmentRows = rows;
			} catch (e) {
				console.error('[PlayerActionInbox]', e);
				if (!cancelled) {
					drillCount = 0;
					assignmentRows = [];
				}
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});
</script>

<div class="pai" aria-label="Alerts and assignments">
	<div class="pai__head">
		<Icon name="game.zap" size={18} />
		<span>Alerts</span>
	</div>

	{#if loading}
		<p class="pai__muted">Loading your assignments…</p>
	{:else}
		<div class="pai__grid">
			<div class="pai__card">
				<div class="pai__card-top">
					<span class="pai__kicker">Homework & drills</span>
					<h3 class="pai__title">
						{#if drillCount === 0}
							You’re clear — no drills due right now.
						{:else if drillCount === 1}
							You have 1 drill assigned for this week. Let’s get it done.
						{:else}
							You have {drillCount} drills assigned for this week. Stay sharp.
						{/if}
					</h3>
				</div>
				{#if assignmentRows.length > 0}
					<details class="pai__details">
						<summary class="pai__summary">Assignment details</summary>
						<ul class="pai__list">
							{#each assignmentRows as row (row.id)}
								<li class="pai__li">
									<a
										class="pai__li-link"
										href={resolve('/player/workout')}
										data-sveltekit-preload-data="hover"
									>
										{row.title}
									</a>
								</li>
							{/each}
						</ul>
					</details>
				{/if}
				<div class="pai__actions">
					<a
						href={resolve('/player/armory')}
						class="pai__btn pai__btn--primary"
						data-sveltekit-preload-data="hover"
					>
						Open Armory
					</a>
					<a
						href={resolve('/player/workout')}
						class="pai__btn pai__btn--ghost"
						data-sveltekit-preload-data="hover"
					>
						Log workout
					</a>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.pai {
		position: relative;
		z-index: 50;
		min-width: 0;
		overflow: hidden;
		border: 1px solid #e5e5e5;
		border-radius: 14px;
		background: #ffffff;
		padding: 14px 14px 16px;
		box-sizing: border-box;
	}

	:global(html.dark) .pai {
		border-color: rgba(255, 255, 255, 0.1);
		background: #09090b;
	}

	.pai__head {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-secondary);
		margin-bottom: 12px;
	}

	.pai__head .ph-lightning {
		font-size: 1.1rem;
		color: var(--brand-primary, #6366f1);
	}

	.pai__muted {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.pai__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 10px;
		min-width: 0;
	}

	.pai__card {
		position: relative;
		z-index: 50;
		display: flex;
		min-width: 0;
		overflow: hidden;
		flex-direction: column;
		justify-content: space-between;
		gap: 12px;
		min-height: 7rem;
		padding: 12px 12px 12px;
		border-radius: 12px;
		border: 1px solid #e5e5e5;
		background: #fafafa;
		box-sizing: border-box;
	}

	:global(html.dark) .pai__card {
		background: #0f0f11;
		border-color: rgba(255, 255, 255, 0.1);
	}

	.pai__card-top {
		min-width: 0;
	}

	.pai__kicker {
		display: block;
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--brand-primary, #6366f1);
		margin-bottom: 6px;
	}

	.pai__title {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 700;
		line-height: 1.45;
		color: var(--text-primary);
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}

	.pai__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		position: relative;
		z-index: 50;
	}

	.pai__btn {
		position: relative;
		z-index: 50;
		align-self: flex-start;
		font: inherit;
		font-size: 12px;
		font-weight: 800;
		padding: 8px 14px;
		border-radius: 10px;
		border: 1px solid transparent;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			filter 0.18s ease,
			border-color 0.18s ease,
			background 0.18s ease;
	}

	.pai__btn--primary {
		background: var(--brand-primary, #6366f1);
		color: #0f172a;
		border-color: color-mix(in srgb, var(--brand-primary, #6366f1) 55%, #0f172a);
	}

	.pai__btn--ghost {
		background: transparent;
		color: var(--text-primary, #0f172a);
		border-color: rgba(100, 116, 139, 0.45);
	}

	:global(html.dark) .pai__btn--ghost {
		color: #e2e8f0;
		border-color: rgba(148, 163, 184, 0.35);
	}

	.pai__btn:hover {
		filter: brightness(1.05);
		transform: scale(1.02);
	}

	a.pai__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		box-sizing: border-box;
	}

	.pai__details {
		position: relative;
		z-index: 50;
		width: 100%;
		min-width: 0;
		border-radius: 10px;
		border: 1px solid #e5e5e5;
		padding: 8px 10px;
		background: rgba(0, 0, 0, 0.02);
		box-sizing: border-box;
	}

	:global(html.dark) .pai__details {
		border-color: rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.2);
	}

	.pai__summary {
		position: relative;
		z-index: 50;
		cursor: pointer;
		font-size: 12px;
		font-weight: 800;
		color: var(--text-secondary);
		list-style-position: outside;
		transition: color 0.15s ease, transform 0.15s ease;
	}

	.pai__summary:hover {
		color: var(--text-primary, #0f172a);
		transform: translateX(2px);
	}

	:global(html.dark) .pai__summary:hover {
		color: #f1f5f9;
	}

	.pai__list {
		margin: 8px 0 0;
		padding-left: 1.15rem;
		font-size: 13px;
		line-height: 1.45;
		color: var(--text-primary);
	}

	.pai__li {
		margin-bottom: 4px;
		min-width: 0;
	}

	.pai__li-link {
		position: relative;
		z-index: 50;
		display: block;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: inherit;
		text-decoration: underline;
		text-decoration-color: rgba(99, 102, 241, 0.45);
		text-underline-offset: 3px;
		cursor: pointer;
		transition:
			color 0.15s ease,
			text-decoration-color 0.15s ease;
	}

	.pai__li-link:hover {
		color: var(--brand-primary, #6366f1);
		text-decoration-color: rgba(99, 102, 241, 0.85);
	}

	:global(html.dark) .pai__li-link {
		color: #e2e8f0;
	}

	:global(html.dark) .pai__li-link:hover {
		color: #67e8f9;
		text-decoration-color: rgba(0, 240, 255, 0.7);
	}
</style>
