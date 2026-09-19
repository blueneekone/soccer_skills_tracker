<script lang="ts">
	import type { SetupEngine } from './SetupEngine.svelte.js';

	let { engine }: { engine: SetupEngine } = $props();
</script>

{#if engine.wizardStep === 1}
	<p class="kind-label">I am registering as</p>
	<div
		class="tw-mb-5 tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-flex-nowrap sm:tw-gap-3"
		role="group"
		aria-label="Registration role"
	>
		<button
			type="button"
			class={engine.roleBtnClass('coach')}
			aria-pressed={engine.setupRole === 'coach'}
			onclick={() => engine.setSetupRole('coach')}
		>
			Coach<br /><span
				class="tw-text-[0.58rem] tw-font-bold tw-normal-case tw-tracking-normal tw-opacity-90"
				>(Team leader)</span
			>
		</button>
		<button
			type="button"
			class={engine.roleBtnClass('parent')}
			aria-pressed={engine.setupRole === 'parent'}
			onclick={() => engine.setSetupRole('parent')}
		>
			Parent<br /><span
				class="tw-text-[0.58rem] tw-font-bold tw-normal-case tw-tracking-normal tw-opacity-90"
				>(Household manager)</span
			>
		</button>
	</div>
	<p class="setup-helper-text tw-mb-5">
		Club directors are invited by your organization admin — use the link you received or contact support.
	</p>
{:else if engine.wizardStep === 2}
	{#if engine.setupRole === 'parent'}
		<div class="tw-grid tw-grid-cols-2 tw-gap-3">
			<div>
				<label for="setup-first-name" class="tw-block tw-font-mono tw-text-xs tw-text-slate-300 tw-mb-1">
					First name
				</label>
				<input
					id="setup-first-name"
					type="text"
					bind:value={engine.firstName}
					placeholder="e.g. Sarah"
					autocomplete="given-name"
					class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-slate-700 tw-rounded tw-px-3 tw-py-2 tw-text-[#fafafa] tw-font-mono tw-text-sm focus:tw-border-cyan-500 focus:tw-outline-none"
				/>
			</div>
			<div>
				<label for="setup-last-name" class="tw-block tw-font-mono tw-text-xs tw-text-slate-300 tw-mb-1">
					Last name
				</label>
				<input
					id="setup-last-name"
					type="text"
					bind:value={engine.lastName}
					placeholder="e.g. Vance"
					autocomplete="family-name"
					class="tw-w-full tw-bg-[#0f172a] tw-border tw-border-slate-700 tw-rounded tw-px-3 tw-py-2 tw-text-[#fafafa] tw-font-mono tw-text-sm focus:tw-border-cyan-500 focus:tw-outline-none"
				/>
			</div>
		</div>
		<p class="setup-helper-text tw-mt-2">
			Your first and last name will appear on your household roster and team clearance records.
		</p>
	{:else}
		<label for="setup-name">Your name (as coach)</label>
		<input
			id="setup-name"
			type="text"
			bind:value={engine.displayName}
			placeholder="e.g. Alex Morgan"
			autocomplete="name"
		/>
		<p class="setup-helper-text">
			Your director must send an invite to your email address first. You'll claim that invite on the final
			step.
		</p>
	{/if}
{:else if engine.setupRole === 'parent' && engine.wizardStep === 3}
	<p class="kind-label">Join your organization</p>
	<div class="setup-org-tabs" role="tablist" aria-label="Organization join method">
		<button
			type="button"
			role="tab"
			class="setup-org-tab"
			class:setup-org-tab--active={engine.orgTab === 'dispatch'}
			aria-selected={engine.orgTab === 'dispatch'}
			onclick={() => {
				engine.orgTab = 'dispatch';
				engine.errorMsg = '';
			}}
		>
			Dispatch code
		</button>
		<button
			type="button"
			role="tab"
			class="setup-org-tab"
			class:setup-org-tab--active={engine.orgTab === 'club'}
			aria-selected={engine.orgTab === 'club'}
			onclick={() => {
				engine.orgTab = 'club';
				engine.errorMsg = '';
			}}
		>
			Pick a club
		</button>
	</div>

	{#if engine.orgTab === 'dispatch'}
		<p class="setup-helper-text">
			Ask your coach for a dispatch code (e.g. <strong>QA-PP26</strong>). This links your household to the
			right team.
		</p>
		<label for="setup-dispatch">Team dispatch code</label>
		<div class="setup-dispatch-row">
			<input
				id="setup-dispatch"
				type="text"
				bind:value={engine.dispatchCode}
				placeholder="e.g. QA-PP26"
				autocomplete="off"
				spellcheck="false"
			/>
			<button
				type="button"
				class="secondary-btn setup-dispatch-btn"
				disabled={engine.resolvingDispatch || !engine.dispatchCode.trim()}
				onclick={() => void engine.resolveDispatch()}
			>
				{engine.resolvingDispatch ? 'Checking…' : 'Verify'}
			</button>
		</div>
		{#if engine.dispatchResolved}
			<p class="setup-resolved-msg" role="status">
				Linked to <strong>{engine.dispatchResolved.clubName}</strong> — {engine.dispatchResolved.teamName}
			</p>
		{/if}
	{:else}
		{#if engine.clubsLoading}
			<p class="setup-helper-text" role="status">Loading clubs…</p>
		{:else if engine.clubsLoadError}
			<div class="auth-error-msg" role="alert">{engine.clubsLoadError}</div>
		{:else}
			<label for="setup-club">Select your club / organization</label>
			<select
				id="setup-club"
				value={engine.selectedClubId}
				onchange={(e) => engine.selectClubFromList(e.currentTarget.value)}
			>
				<option value="">Select your club…</option>
				{#each engine.joinableClubs as club (club.id)}
					<option value={club.id}>{club.name || club.id}</option>
				{/each}
			</select>
		{/if}
	{/if}
{:else if engine.isTermsStep}
	<label class="setup-terms-label">
		<input
			type="checkbox"
			class="setup-terms-checkbox"
			bind:checked={engine.termsAccepted}
			disabled={engine.saving}
		/>
		<span>
			I acknowledge the
			<a href="/terms" target="_blank" rel="noopener noreferrer" class="setup-terms-link">
				Vanguard Protocol Terms
			</a>
			and
			<a href="/privacy" target="_blank" rel="noopener noreferrer" class="setup-terms-link">
				Privacy Policy
			</a>.
		</span>
	</label>
{:else if engine.isFinalStep}
	<p class="setup-helper-text">
		{#if engine.setupRole === 'parent'}
			You're joining <strong>{engine.joinableClubs.find((c) => c.id === engine.resolvedClubId())?.name || engine.dispatchResolved?.clubName || engine.resolvedClubId()}</strong>
			as <strong>{engine.displayName.trim()}</strong>.
		{:else}
			Ready to claim your coach invite as <strong>{engine.displayName.trim()}</strong>.
		{/if}
	</p>
{/if}

{#if engine.errorMsg}
	<div class="auth-error-msg" role="alert">{engine.errorMsg}</div>
{/if}

<div class="setup-wizard-nav">
	{#if engine.wizardStep > 1}
		<button class="tw-flex-1 tw-py-3 tw-rounded-lg tw-border tw-border-gray-700 tw-text-gray-300 hover:tw-bg-gray-800 tw-transition-colors tw-font-semibold tw-text-sm" type="button" disabled={engine.saving} onclick={() => engine.goBack()}>Back</button>
	{/if}
	{#if engine.isFinalStep}
		<button class:interactive={true}
			class="tw-flex-1 tw-py-3 tw-rounded-lg tw-bg-[#fbbf24] tw-text-[#000000] hover:tw-bg-[#f59e0b] tw-transition-colors tw-font-bold tw-text-sm"
			type="button"
			disabled={engine.saving}
			onclick={() => void engine.completeSetup()}
		>
			{#if engine.saving}
				{engine.setupRole === 'coach' ? 'Claiming invite…' : 'Saving profile…'}
			{:else}
				{engine.setupRole === 'coach' ? 'Claim invite' : 'Complete setup'}
			{/if}
		</button>
	{:else}
		<button class="tw-flex-1 tw-py-3 tw-rounded-lg tw-bg-[#0f172a] tw-text-[#000000] hover:tw-bg-gray-200 tw-transition-colors tw-font-bold tw-text-sm" type="button" onclick={() => engine.goNext()}>Continue</button>
	{/if}
</div>

<button class="tw-w-full tw-mt-3 tw-py-3 tw-text-sm tw-text-gray-500 hover:tw-text-[#fafafa] hover:tw-bg-gray-800/50 tw-rounded-lg tw-transition-colors" type="button" onclick={() => void engine.handleLogout()}>
	Cancel &amp; logout
</button>

<style>
	.kind-label {
		margin: 0 0 8px;
		font-size: 0.9rem;
		opacity: 0.9;
	}

	select,
	input {
		margin-bottom: 12px;
	}

	.setup-org-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.setup-org-tab {
		flex: 1;
		min-height: 2.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		background: transparent;
		color: #a1a1aa;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.setup-org-tab--active {
		border-color: #14b8a6;
		color: #14b8a6;
		background: rgba(20, 184, 166, 0.08);
	}

	.setup-dispatch-row {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
		margin-bottom: 12px;
	}

	.setup-dispatch-row input {
		flex: 1;
		margin-bottom: 0;
	}

	.setup-dispatch-btn {
		flex-shrink: 0;
		min-height: 2.75rem;
		padding: 0 0.85rem;
		white-space: nowrap;
	}

	.setup-resolved-msg {
		margin: 0 0 12px;
		padding: 0.65rem 0.85rem;
		border: 1px solid rgba(20, 184, 166, 0.25);
		border-radius: 0.5rem;
		background: rgba(20, 184, 166, 0.06);
		font-size: 0.82rem;
		line-height: 1.5;
		color: #d4d4d8;
	}

	.setup-helper-text {
		margin: 0 0 14px;
		font-size: 0.8rem;
		line-height: 1.45;
		color: var(--text-secondary, #a1a1aa);
	}

	.setup-terms-label {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		margin-bottom: 14px;
		cursor: pointer;
		font-size: 0.78rem;
		line-height: 1.55;
		color: var(--text-secondary, #a1a1aa);
	}

	.setup-terms-checkbox {
		margin-top: 2px;
		flex-shrink: 0;
		accent-color: #14b8a6;
		width: 15px;
		height: 15px;
		cursor: pointer;
	}

	.setup-terms-link {
		color: rgba(20, 184, 166, 0.75);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.15s;
	}

	.setup-terms-link:hover {
		color: #14b8a6;
	}

	.setup-wizard-nav {
		display: flex;
		gap: 0.5rem;
	}
</style>
