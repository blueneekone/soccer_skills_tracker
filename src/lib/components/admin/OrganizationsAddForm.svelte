<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import type { AddClubFormState } from '$lib/admin/organizationsActions.js';

	interface Props {
		form: AddClubFormState;
		newSportMode: boolean;
		saving: boolean;
		err: string;
		onSubmit: () => void;
	}

	let {
		form = $bindable(),
		newSportMode,
		saving,
		err,
		onSubmit,
	}: Props = $props();
</script>

<div class="orgs3-add-form">
	{#if err}
		<p class="orgs3-flash orgs3-flash--err" role="alert">{err}</p>
	{/if}
	<div class="orgs3-add-grid">
		<div class="orgs3-field">
			<label class="orgs3-field-label" for="add-club-id">
				Club ID <span class="orgs3-req" aria-hidden="true">*</span>
			</label>
			<input
				id="add-club-id"
				type="text"
				class="orgs3-input"
				bind:value={form.clubId}
				placeholder="e.g. aggiesfc"
				disabled={saving}
			/>
		</div>
		<div class="orgs3-field">
			<label class="orgs3-field-label" for="add-club-name">
				Club Name <span class="orgs3-req" aria-hidden="true">*</span>
			</label>
			<input
				id="add-club-name"
				type="text"
				class="orgs3-input"
				bind:value={form.clubName}
				placeholder="e.g. Aggie FC"
				disabled={saving}
			/>
		</div>
		<div class="orgs3-field">
			<label class="orgs3-field-label" for="add-club-sport">Sport</label>
			<select id="add-club-sport" class="orgs3-input" bind:value={form.sport} disabled={saving}>
				<option value="soccer">Soccer</option>
				<option value="basketball">Basketball</option>
				<option value="baseball">Baseball</option>
				<option value="football">Football</option>
				<option value="volleyball">Volleyball</option>
				<option value="hockey">Hockey</option>
				<option value="lacrosse">Lacrosse</option>
				<option value="generic">Generic</option>
				<option disabled>──────────</option>
				<option value="__new__">+ Create new sport…</option>
			</select>
		</div>
		<div class="orgs3-field">
			<label class="orgs3-field-label" for="add-club-dir">Director Email</label>
			<input
				id="add-club-dir"
				type="email"
				class="orgs3-input"
				bind:value={form.directorEmail}
				placeholder="director@example.com"
				disabled={saving}
			/>
		</div>
		<div class="orgs3-field">
			<label class="orgs3-field-label" for="add-club-phone">Phone Number</label>
			<input
				id="add-club-phone"
				type="tel"
				class="orgs3-input"
				bind:value={form.phoneNumber}
				placeholder="+1 (512) 555-0100"
				inputmode="tel"
				autocomplete="tel"
				disabled={saving}
			/>
		</div>
		<div class="orgs3-field orgs3-field--wide">
			<label class="orgs3-field-label" for="add-club-address">
				Verified Address
				<span class="orgs3-places-chip">
					<Icon name={'sys.map-pin' as IconName} aria-hidden="true" />
					Google Places Autocomplete active
				</span>
			</label>
			<input
				id="add-club-address"
				type="text"
				class="orgs3-input"
				bind:value={form.verifiedAddress}
				placeholder="Start typing a verified street address…"
				autocomplete="street-address"
				disabled={saving}
				data-places-autocomplete="address"
			/>
		</div>
		<div class="orgs3-field orgs3-field--wide">
			<label class="orgs3-field-label" for="add-club-facility">
				Primary Facility
				<span class="orgs3-places-chip">
					<Icon name={'org.building' as IconName} aria-hidden="true" />
					Google Places Autocomplete active
				</span>
			</label>
			<input
				id="add-club-facility"
				type="text"
				class="orgs3-input"
				bind:value={form.primaryFacility}
				placeholder="e.g. Mueller Athletic Complex, Austin TX"
				disabled={saving}
				data-places-autocomplete="establishment"
			/>
		</div>
	</div>

	{#if newSportMode}
		<div class="orgs3-new-sport-panel">
			<div class="orgs3-new-sport-panel__label">
				<Icon name={'game.trophy' as IconName} aria-hidden="true" />
				New Sport Module
				<span class="orgs3-new-sport-panel__sub">
					Provisioned via Cloud Function before the club is saved. If this step fails, the club
					will NOT be created.
				</span>
			</div>
			<div class="orgs3-add-grid orgs3-add-grid--compact">
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-sport-name">
						Sport Name <span class="orgs3-req" aria-hidden="true">*</span>
					</label>
					<input
						id="add-sport-name"
						type="text"
						class="orgs3-input"
						bind:value={form.newSportName}
						placeholder="e.g. Volleyball"
						disabled={saving}
					/>
				</div>
				<div class="orgs3-field">
					<label class="orgs3-field-label" for="add-sport-icon">
						Icon <span class="orgs3-field-label__hint">(Phosphor class)</span>
					</label>
					<input
						id="add-sport-icon"
						type="text"
						class="orgs3-input"
						bind:value={form.newSportIcon}
						placeholder="ph-volleyball"
						disabled={saving}
					/>
				</div>
			</div>
		</div>
	{/if}

	<button type="button" class="orgs3-submit-btn" onclick={onSubmit} disabled={saving}>
		{#if saving}
			{newSportMode ? 'Provisioning sport & creating club…' : 'Creating…'}
		{:else}
			+ Register Organization
		{/if}
	</button>
</div>
