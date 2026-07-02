<script lang="ts">
	import type { CoachClearanceEngine } from './CoachClearanceEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';

	let { engine, headerLabel, pageTitle }: { engine: CoachClearanceEngine, headerLabel: string, pageTitle: string } = $props();
</script>

{#if engine.toastMsg}
	<div class="dp-toast" role="status" aria-live="polite">{engine.toastMsg}</div>
{/if}

<header class="dp-header">
	<div class="dp-header__left">
		<div class="dp-label">{headerLabel}</div>
		<h1 class="dp-title">{pageTitle}</h1>
	</div>
	<div class="dp-stats-rail">
		<div class="dp-stat dp-stat--total">
			<span class="dp-stat__val">{engine.counts.total}</span>
			<span class="dp-stat__key">TOTAL</span>
		</div>
		<div class="dp-stat dp-stat--cleared">
			<span class="dp-stat__val">{engine.counts.cleared}</span>
			<span class="dp-stat__key">CLEARED</span>
		</div>
		<div class="dp-stat dp-stat--pending">
			<span class="dp-stat__val">{engine.counts.pending}</span>
			<span class="dp-stat__key">PENDING</span>
		</div>
		<div class="dp-stat dp-stat--flagged">
			<span class="dp-stat__val">{engine.counts.flagged}</span>
			<span class="dp-stat__key">FLAGGED</span>
		</div>
	</div>
</header>

<div class="dp-search-row">
	<div class="dp-search">
		<Icon name="action.search" />
		<input
			type="search"
			class="dp-search__input"
			placeholder="SEARCH STAFF…"
			bind:value={engine.search}
			aria-label="Search coaches"
		/>
	</div>
	<div class="dp-alpha-badge">
		<span class="dp-pulse-dot"></span>
		QA bypass available when live Checkr unavailable
	</div>
</div>
