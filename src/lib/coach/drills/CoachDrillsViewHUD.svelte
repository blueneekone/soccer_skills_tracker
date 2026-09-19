<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import type { CoachDrillsViewEngine } from './CoachDrillsViewEngine.svelte.js';

	let { engine }: { engine: CoachDrillsViewEngine } = $props();
</script>

<header class="coach-drill-z4">
	<div>
		<h1 class="coach-drill-z4__title">Drill Library & Playbook</h1>
		<p class="coach-drill-z4__sub">
			Team &rsaquo; {engine.currentTeam?.name || engine.teamScope.selectedTeamId || '&mdash;'}
		</p>
		<nav class="coach-drill-z4-nav" aria-label="Coach section">
			<a href="/coach/forge?tab=intent" class="coach-drill-z4-nav__btn coach-drill-z4-nav__btn--link" title="Intent Engine">
				Intent Engine
			</a>
			<a href="/coach/forge?tab=designer" class="coach-drill-z4-nav__btn coach-drill-z4-nav__btn--link" title="Drill Designer">
				Drill Designer
			</a>
			<button
				type="button"
				class="coach-drill-z4-nav__btn coach-drill-z4-nav__btn--active"
			>
				Drill Library
			</button>
		</nav>
	</div>
	<div class="coach-drill-z4__actions">
		{#if engine.myTeams.length > 1}
			<label class="coach-drill-z4__team">
				<span class="sr-only">Team</span>
				<select bind:value={engine.teamScope.selectedTeamId}>
					{#each engine.myTeams as t (t.id)}
						<option value={t.id}>{t.name || t.id}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if engine.pageView === 'library'}
			<button type="button" class="coach-drill-z4-cta" onclick={() => engine.openAddDrill()}>
				<Icon name="status.circle-plus" />
				<span>NEW DRILL</span>
			</button>
		{/if}
	</div>
</header>

<Modal bind:open={engine.addOpen} maxWidth="520px">
	{#snippet titleSlot()}
		Add Custom Drill
	{/snippet}
	<form class="coach-drill-form" onsubmit={(e) => { e.preventDefault(); void engine.submitAddDrill(); }}>
		<label class="coach-drill-form__field">
			<span class="coach-drill-form__label">Title</span>
			<input
				type="text"
				bind:value={engine.formTitle}
				maxlength="200"
				required
				placeholder="e.g. 30-Touch Ladder Warmup"
			/>
		</label>

		<label class="coach-drill-form__field">
			<span class="coach-drill-form__label">Category</span>
			<select bind:value={engine.formCategory}>
				{#each engine.DRILL_CATEGORIES as c}
					<option value={c}>{c}</option>
				{/each}
			</select>
		</label>

		<label class="coach-drill-form__field">
			<span class="coach-drill-form__label">Metric Type</span>
			<select bind:value={engine.formMetricType}>
				{#each engine.METRIC_TYPES as m}
					<option value={m.value}>{m.label}</option>
				{/each}
			</select>
		</label>

		<label class="coach-drill-form__field">
			<span class="coach-drill-form__label">Duration (minutes)</span>
			<input type="number" min="1" max="240" bind:value={engine.formDuration} />
		</label>

		<label class="coach-drill-form__field">
			<span class="coach-drill-form__label">Video URL (optional)</span>
			<input
				type="url"
				bind:value={engine.formVideoUrl}
				placeholder="https://youtube.com/watch?v=…"
			/>
		</label>

		{#if engine.addErr}
			<p class="coach-drill-form__err" role="alert">{engine.addErr}</p>
		{/if}

		<div class="coach-drill-form__actions">
			<button type="button" class="coach-drill-z2-btn" onclick={() => (engine.addOpen = false)}>
				Cancel
			</button>
			<button
				type="submit"
				class="coach-drill-z4-cta"
				disabled={engine.addBusy}
			>
				{engine.addBusy ? 'Saving…' : 'Save Drill'}
			</button>
		</div>
	</form>
</Modal>

<Modal bind:open={engine.assignOpen} maxWidth="560px">
	{#snippet titleSlot()}
		Assign Homework
	{/snippet}
	{#if engine.assignDrill}
		<div class="coach-drill-form">
			<div class="coach-drill-assign__drill">
				<span class="coach-drill-form__label">Drill</span>
				<strong>{engine.assignDrill.title}</strong>
				<span class="coach-drill-z1-hint">{engine.assignDrill.category} · metric: {engine.assignDrill.metricType}</span>
			</div>

			<label class="coach-drill-form__field">
				<span class="coach-drill-form__label">Due date &amp; time</span>
				<input type="datetime-local" bind:value={engine.assignDue} required />
			</label>

			<div class="coach-drill-assign__roster">
				<div class="coach-drill-assign__roster-head">
					<span class="coach-drill-form__label">Roster</span>
					<button type="button" class="coach-drill-z2-btn" onclick={() => engine.toggleAllEmails()}>
						{engine.selectedEmails.size === engine.roster.length && engine.roster.length > 0 ? 'Clear all' : 'Select all'}
					</button>
				</div>
				{#if engine.loadingRoster}
					<p class="coach-drill-z1-hint">Loading roster…</p>
				{:else if engine.roster.length === 0}
					<p class="coach-drill-z1-hint">No player accounts on this team yet.</p>
				{:else}
					<ul class="coach-drill-assign__list">
						{#each engine.roster as p (p.email)}
							<li>
								<label class="coach-drill-assign__row">
									<input
										type="checkbox"
										checked={engine.selectedEmails.has(p.email)}
										onchange={() => engine.toggleEmail(p.email)}
									/>
									<span class="coach-drill-assign__name">{p.playerName}</span>
									<span class="coach-drill-assign__email">{p.email}</span>
								</label>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			{#if engine.assignErr}
				<p class="coach-drill-form__err" role="alert">{engine.assignErr}</p>
			{/if}
			{#if engine.assignOk}
				<p class="coach-drill-form__ok" role="status">{engine.assignOk}</p>
			{/if}

			<div class="coach-drill-form__actions">
				<button
					type="button"
					class="coach-drill-z2-btn"
					onclick={() => (engine.assignOpen = false)}
				>
					Close
				</button>
				<button
					type="button"
					class="coach-drill-z4-cta"
					disabled={engine.assignDisabled}
					onclick={() => void engine.submitAssign()}
				>
					{engine.assignBusy ? 'Dispatching…' : `Assign to ${engine.selectedEmails.size || 0}`}
				</button>
			</div>
		</div>
	{/if}
</Modal>
