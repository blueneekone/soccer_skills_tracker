<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import type { AddClubFormState } from '$lib/admin/organizationsActions.js';
	import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

	interface Props {
		form: AddClubFormState;
		newSportMode: boolean;
		saving: boolean;
		err: string;
		isOpen: boolean;
		onClose: () => void;
		onSubmit: () => void;
	}

	let {
		form = $bindable(),
		newSportMode,
		saving,
		err,
		isOpen,
		onClose,
		onSubmit,
	}: Props = $props();

	let addressInput: HTMLInputElement | null = $state(null);
	let facilityInput: HTMLInputElement | null = $state(null);

	$effect(() => {
		if (isOpen && (addressInput || facilityInput)) {
			let addressAutocomplete: any = null;
			let facilityAutocomplete: any = null;
			let addressObserver: MutationObserver | null = null;
			let facilityObserver: MutationObserver | null = null;

			setOptions({
				key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
				v: 'weekly',
				libraries: ['places']
			});

			importLibrary('places').then(() => {
				if (addressInput) {
					addressAutocomplete = new globalThis.google.maps.places.Autocomplete(addressInput, { 
						fields: ['formatted_address', 'formatted_phone_number', 'name', 'geometry'] 
					});
					addressAutocomplete.addListener('place_changed', () => {
						const place = addressAutocomplete!.getPlace();
						if (place.formatted_address) {
							form.verifiedAddress = place.formatted_address;
						}
						if (place.formatted_phone_number && !form.phoneNumber) {
							form.phoneNumber = place.formatted_phone_number;
						}
					});

					// Prevent Google Maps from ruining the UI on API failure
					addressObserver = new MutationObserver(() => {
						if (addressInput?.hasAttribute('disabled') && !saving) addressInput.removeAttribute('disabled');
						if (addressInput?.placeholder === 'Oops! Something went wrong.') addressInput.placeholder = 'Start typing a verified street address…';
						if (addressInput?.style.backgroundImage) addressInput.style.backgroundImage = '';
					});
					addressObserver.observe(addressInput, { attributes: true, attributeFilter: ['disabled', 'placeholder', 'style'] });
				}
				if (facilityInput) {
					facilityAutocomplete = new globalThis.google.maps.places.Autocomplete(facilityInput, { 
						fields: ['formatted_address', 'formatted_phone_number', 'name', 'geometry'] 
					});
					facilityAutocomplete.addListener('place_changed', () => {
						const place = facilityAutocomplete!.getPlace();
						if (place.formatted_address) {
							form.primaryFacility = place.name ? `${place.name}, ${place.formatted_address}` : place.formatted_address || '';
						}
						if (place.formatted_phone_number && !form.phoneNumber) {
							form.phoneNumber = place.formatted_phone_number;
						}
					});

					// Prevent Google Maps from ruining the UI on API failure
					facilityObserver = new MutationObserver(() => {
						if (facilityInput?.hasAttribute('disabled') && !saving) facilityInput.removeAttribute('disabled');
						if (facilityInput?.placeholder === 'Oops! Something went wrong.') facilityInput.placeholder = 'e.g. Mueller Athletic Complex, Austin TX';
						if (facilityInput?.style.backgroundImage) facilityInput.style.backgroundImage = '';
					});
					facilityObserver.observe(facilityInput, { attributes: true, attributeFilter: ['disabled', 'placeholder', 'style'] });
				}
			}).catch(e => console.error('Failed to load places autocomplete', e));

			return () => {
				if (addressAutocomplete && typeof globalThis.google !== 'undefined') {
					globalThis.google.maps.event.clearInstanceListeners(addressAutocomplete);
				}
				if (facilityAutocomplete && typeof globalThis.google !== 'undefined') {
					globalThis.google.maps.event.clearInstanceListeners(facilityAutocomplete);
				}
				if (addressObserver) addressObserver.disconnect();
				if (facilityObserver) facilityObserver.disconnect();
				
				// Clean up orphaned pac-containers
				document.querySelectorAll('.pac-container').forEach(el => el.remove());
			};
		}
	});
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div 
		class="tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-items-center tw-justify-center tw-bg-[#0B0F19]/80 tw-backdrop-blur-md"
		onclick={onClose}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div 
			class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-2xl tw-p-8 tw-max-w-2xl tw-w-full tw-max-h-[90vh] tw-overflow-y-auto tw-shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="tw-flex tw-justify-between tw-items-center tw-mb-8">
				<h2 class="tw-text-[#FAFAFA] tw-text-2xl tw-font-bold tw-m-0">Add Organization</h2>
				<button type="button" class="tw-bg-transparent tw-border-none tw-outline-none tw-p-2 hover:tw-bg-white/10 tw-rounded-md tw-text-[#A1A1AA] hover:tw-text-[#FAFAFA] tw-transition-colors tw-flex tw-items-center tw-justify-center" onclick={onClose} aria-label="Close add organization modal">
					<Icon name={'sys.close' as IconName} />
				</button>
			</div>

			<div class="tw-flex tw-flex-col tw-gap-6">
				{#if err}
					<div class="tw-bg-red-500/10 tw-border tw-border-red-500/30 tw-text-red-400 tw-px-4 tw-py-3 tw-rounded-md" role="alert">
						{err}
					</div>
				{/if}

				<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
					<div class="tw-flex tw-flex-col tw-gap-2">
						<label class="tw-text-[#A1A1AA] tw-text-sm tw-font-semibold" for="add-club-id">
							Club ID <span class="tw-text-red-400" aria-hidden="true">*</span>
						</label>
						<input
							id="add-club-id"
							type="text"
							class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-md tw-px-4 tw-py-3 tw-text-[#FAFAFA] placeholder:tw-text-[#71717A] focus:tw-outline-none focus:tw-border-[#fbbf24] tw-transition-colors disabled:tw-opacity-50"
							bind:value={form.clubId}
							placeholder="e.g. aggiesfc"
							disabled={saving}
						/>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-2">
						<label class="tw-text-[#A1A1AA] tw-text-sm tw-font-semibold" for="add-club-name">
							Club Name <span class="tw-text-red-400" aria-hidden="true">*</span>
						</label>
						<input
							id="add-club-name"
							type="text"
							class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-md tw-px-4 tw-py-3 tw-text-[#FAFAFA] placeholder:tw-text-[#71717A] focus:tw-outline-none focus:tw-border-[#fbbf24] tw-transition-colors disabled:tw-opacity-50"
							bind:value={form.clubName}
							placeholder="e.g. Aggie FC"
							disabled={saving}
						/>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-2">
						<label class="tw-text-[#A1A1AA] tw-text-sm tw-font-semibold" for="add-club-sport">Sport</label>
						<select id="add-club-sport" class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-md tw-px-4 tw-py-3 tw-text-[#FAFAFA] focus:tw-outline-none focus:tw-border-[#fbbf24] tw-transition-colors disabled:tw-opacity-50" bind:value={form.sport} disabled={saving}>
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
					<div class="tw-flex tw-flex-col tw-gap-2">
						<label class="tw-text-[#A1A1AA] tw-text-sm tw-font-semibold" for="add-club-dir">Director Email</label>
						<input
							id="add-club-dir"
							type="email"
							class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-md tw-px-4 tw-py-3 tw-text-[#FAFAFA] placeholder:tw-text-[#71717A] focus:tw-outline-none focus:tw-border-[#fbbf24] tw-transition-colors disabled:tw-opacity-50"
							bind:value={form.directorEmail}
							placeholder="director@example.com"
							disabled={saving}
						/>
					</div>
					<div class="tw-flex tw-flex-col tw-gap-2">
						<label class="tw-text-[#A1A1AA] tw-text-sm tw-font-semibold" for="add-club-phone">Phone Number</label>
						<input
							id="add-club-phone"
							type="tel"
							class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-md tw-px-4 tw-py-3 tw-text-[#FAFAFA] placeholder:tw-text-[#71717A] focus:tw-outline-none focus:tw-border-[#fbbf24] tw-transition-colors disabled:tw-opacity-50"
							bind:value={form.phoneNumber}
							placeholder="+1 (512) 555-0100"
							inputmode="tel"
							autocomplete="tel"
							disabled={saving}
						/>
					</div>
				</div>

				<div class="tw-flex tw-flex-col tw-gap-2">
					<label class="tw-text-[#A1A1AA] tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-between" for="add-club-address">
						<span>Verified Address</span>
						<span class="tw-text-xs tw-text-[#fbbf24] tw-flex tw-items-center tw-gap-1 tw-font-normal">
							<Icon name={'sys.map-pin' as IconName} aria-hidden="true" />
							Google Places Autocomplete
						</span>
					</label>
					<input
						id="add-club-address"
						type="text"
						bind:this={addressInput}
						style="background-image: none !important;"
						class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-md tw-px-4 tw-py-3 tw-text-[#FAFAFA] placeholder:tw-text-[#71717A] focus:tw-outline-none focus:tw-border-[#fbbf24] tw-transition-colors disabled:tw-opacity-50"
						bind:value={form.verifiedAddress}
						placeholder="Start typing a verified street address…"
						autocomplete="street-address"
						disabled={saving}
					/>
				</div>

				<div class="tw-flex tw-flex-col tw-gap-2">
					<label class="tw-text-[#A1A1AA] tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-between" for="add-club-facility">
						<span>Primary Facility</span>
						<span class="tw-text-xs tw-text-[#fbbf24] tw-flex tw-items-center tw-gap-1 tw-font-normal">
							<Icon name={'org.building' as IconName} aria-hidden="true" />
							Google Places Autocomplete
						</span>
					</label>
					<input
						id="add-club-facility"
						type="text"
						bind:this={facilityInput}
						style="background-image: none !important;"
						class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-md tw-px-4 tw-py-3 tw-text-[#FAFAFA] placeholder:tw-text-[#71717A] focus:tw-outline-none focus:tw-border-[#fbbf24] tw-transition-colors disabled:tw-opacity-50"
						bind:value={form.primaryFacility}
						placeholder="e.g. Mueller Athletic Complex, Austin TX"
						disabled={saving}
					/>
				</div>

				{#if newSportMode}
					<div class="tw-bg-[#0B0F19] tw-border tw-border-[#334155] tw-rounded-xl tw-p-6 tw-mt-2">
						<div class="tw-flex tw-items-center tw-gap-2 tw-text-[#FAFAFA] tw-font-bold tw-mb-2">
							<Icon name={'game.trophy' as IconName} aria-hidden="true" class="tw-text-[#fbbf24]" />
							New Sport Module
						</div>
						<p class="tw-text-sm tw-text-[#A1A1AA] tw-mb-6">
							Provisioned via Cloud Function before the club is saved. If this step fails, the club will NOT be created.
						</p>
						<div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
							<div class="tw-flex tw-flex-col tw-gap-2">
								<label class="tw-text-[#A1A1AA] tw-text-sm tw-font-semibold" for="add-sport-name">
									Sport Name <span class="tw-text-red-400" aria-hidden="true">*</span>
								</label>
								<input
									id="add-sport-name"
									type="text"
									class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-md tw-px-4 tw-py-3 tw-text-[#FAFAFA] placeholder:tw-text-[#71717A] focus:tw-outline-none focus:tw-border-[#fbbf24] tw-transition-colors disabled:tw-opacity-50"
									bind:value={form.newSportName}
									placeholder="e.g. Volleyball"
									disabled={saving}
								/>
							</div>
							<div class="tw-flex tw-flex-col tw-gap-2">
								<label class="tw-text-[#A1A1AA] tw-text-sm tw-font-semibold" for="add-sport-icon">
									Icon <span class="tw-text-[#71717A] tw-font-normal">(Phosphor class)</span>
								</label>
								<input
									id="add-sport-icon"
									type="text"
									class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-rounded-md tw-px-4 tw-py-3 tw-text-[#FAFAFA] placeholder:tw-text-[#71717A] focus:tw-outline-none focus:tw-border-[#fbbf24] tw-transition-colors disabled:tw-opacity-50"
									bind:value={form.newSportIcon}
									placeholder="ph-volleyball"
									disabled={saving}
								/>
							</div>
						</div>
					</div>
				{/if}

				<div class="tw-flex tw-justify-end tw-items-center tw-gap-4 tw-mt-4 tw-pt-6 tw-border-t tw-border-[#334155]">
					<button 
						type="button" 
						class="tw-text-[#A1A1AA] hover:tw-text-white tw-font-bold tw-px-5 tw-py-2.5 tw-bg-transparent hover:tw-bg-white/10 tw-border tw-border-transparent tw-rounded-md tw-transition-colors tw-cursor-pointer" 
						onclick={onClose} 
						disabled={saving}
					>
						Cancel
					</button>
					<button 
						type="button" 
						class="tw-bg-[#fbbf24] hover:tw-bg-[#f59e0b] tw-text-[#0f172a] tw-font-bold tw-px-6 tw-py-2.5 tw-rounded-md tw-transition-colors tw-cursor-pointer tw-border-none disabled:tw-opacity-50" 
						onclick={onSubmit} 
						disabled={saving}
					>
						{#if saving}
							{newSportMode ? 'Provisioning & creating…' : 'Creating…'}
						{:else}
							+ Register Organization
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.pac-container) {
		background-color: #0f172a;
		border: 1px solid #334155;
		border-radius: 8px;
		font-family: inherit;
		color: #fafafa;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
		margin-top: 4px;
	}
	:global(.pac-item) {
		padding: 10px 12px;
		color: #d4d4d8;
		border-top: 1px solid #1e293b;
		cursor: pointer;
	}
	:global(.pac-item:hover) {
		background-color: #1e293b;
	}
	:global(.pac-item-query) {
		color: #fafafa;
		font-size: 14px;
	}
	:global(.pac-matched) {
		font-weight: bold;
		color: #fbbf24;
	}
	:global(.pac-icon) {
		filter: invert(0.8);
	}
</style>
