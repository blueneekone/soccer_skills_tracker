<script lang="ts">
	import type { FacilityMapVaultEngine } from './FacilityMapVaultEngine.svelte.js';
	import FacilityDrawingMap from '$lib/components/field-ops/FacilityDrawingMap.svelte';
	import TacticalBuilder from '$lib/components/field-ops/TacticalBuilder.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';
	import Modal from '$lib/components/Modal.svelte';

	let { engine, embedded = false } = $props<{ engine: FacilityMapVaultEngine; embedded?: boolean }>();
</script>

<div class="fm-vault" class:fm-vault--embedded={embedded}>
	{#if engine.canManage && engine.clubId}
		<section class="fm-panel fm-panel--registry" aria-labelledby="fm-reg-h">
			<h4 id="fm-reg-h" class="fm-panel__title">Facility logistics registry</h4>
			<p class="fm-panel__hint">
				Add or edit facilities with precise coordinates for routing and automated weather defense.
				Firestore document IDs are shown in the vault table for webhook correlation.
			</p>
			<div class="fm-registry__grid">
				<div class="fm-registry__field">
					<label class="fm-label" for="fm-reg-name">Facility name</label>
					<input
						id="fm-reg-name"
						class="fm-input"
						type="text"
						bind:value={engine.regName}
						placeholder="e.g. North Training Pitch"
						autocomplete="off"
						disabled={engine.regSaving}
					/>
				</div>
				<div class="fm-registry__field fm-registry__field--wide">
					<label class="fm-label" for="fm-reg-addr">Address</label>
					<input
						id="fm-reg-addr"
						class="fm-input"
						type="text"
						bind:value={engine.regAddress}
						placeholder="Street, city, state"
						autocomplete="off"
						disabled={engine.regSaving}
					/>
				</div>
				<div class="fm-registry__coord">
					<label class="fm-label fm-label--coord" for="fm-reg-lat">Latitude</label>
					<input
						id="fm-reg-lat"
						class="fm-input fm-input--coord"
						type="number"
						step="any"
						bind:value={engine.regLat}
						placeholder="e.g. 40.7128"
						disabled={engine.regSaving}
					/>
				</div>
				<div class="fm-registry__coord">
					<label class="fm-label fm-label--coord" for="fm-reg-lng">Longitude</label>
					<input
						id="fm-reg-lng"
						class="fm-input fm-input--coord"
						type="number"
						step="any"
						bind:value={engine.regLng}
						placeholder="e.g. -74.0060"
						disabled={engine.regSaving}
					/>
				</div>
				<p class="fm-lightning-hint fm-registry__field--wide">
					<strong>Required for Tomorrow.io Automated Lightning Defense.</strong>
				</p>
				<div class="fm-registry__field">
					<label class="fm-label" for="fm-reg-status">Status</label>
					<select id="fm-reg-status" class="fm-input" bind:value={engine.regStatus} disabled={engine.regSaving}>
						<option value="Active">Active</option>
						<option value="Locked">Locked</option>
					</select>
				</div>
				<div class="fm-registry__actions">
					<button
						type="button"
						class="fm-btn fm-btn--primary"
						disabled={engine.regSaving || !engine.regName.trim()}
						onclick={() => void engine.saveRegistryFacility()}
					>
						{engine.regSaving ? 'Saving…' : 'Save facility'}
					</button>
				</div>
			</div>
			{#if engine.regErr}
				<p class="fm-err" role="alert">{engine.regErr}</p>
			{/if}
		</section>
	{/if}

	{#if engine.clubId}
		<section
			class="fm-panel fm-panel--embedded-map"
			class:fm-panel--hero-in-page={!embedded}
			aria-label="Facility satellite map"
		>
			<h4 class="fm-panel__title">Satellite map & field drawings</h4>
			<p class="fm-panel__hint">
				Select a facility, place the routing pin, and draw polygons. Save persists <code class="fm-inline-code"
					>mapData</code
				>
				and coordinates to Firestore.
			</p>
			{#if engine.rows.length > 0}
				<div class="fm-embedded-map-toolbar">
					<label class="fm-label fm-embedded-map-toolbar__label" for="fm-hero-fac">Facility</label>
					<select
						id="fm-hero-fac"
						class="fm-input fm-embedded-map-toolbar__select"
						bind:value={engine.heroFacilityId}
					>
						{#each engine.rows as r (r.id)}
							<option value={r.id}>{r.name}</option>
						{/each}
					</select>
				</div>
				<div class="fm-embedded-map-frame tw-flex tw-h-full tw-w-full tw-min-h-[600px] tw-flex-col">
					{#if engine.heroFacilityId}
						{#key engine.heroFacilityId}
							<FacilityDrawingMap
								bind:latitude={engine.heroLat}
								bind:longitude={engine.heroLng}
								bind:mapData={engine.heroMapData}
								readonly={!engine.canManage}
								coordRevision={engine.heroCoordRevision}
								lockRoutingPinSync={engine.heroSaving}
								onSaveMap={() => void engine.saveHeroFacility()}
								saveBusy={engine.heroSaving}
								saveDisabled={engine.heroSaving || !engine.heroFacilityId}
							/>
						{/key}
					{/if}
				</div>
				{#if engine.heroSaveErr}
					<p class="fm-err" role="alert">{engine.heroSaveErr}</p>
				{/if}
			{:else}
				<p class="fm-panel__hint">
					Add a facility via the registry above to enable the map and routing pin.
				</p>
			{/if}
		</section>
	{/if}
</div>

{#if engine.facilityEditOpen}
	<Modal>
		<div class="fm-modal-edit" role="dialog" aria-modal="true" aria-labelledby="fm-edit-modal-h">
			<h4 id="fm-edit-modal-h" class="fm-panel__title">Edit Facility Logistics</h4>
			<label class="fm-label" for="fm-edit-name">Facility Name</label>
			<input
				id="fm-edit-name"
				class="fm-input"
				type="text"
				bind:value={engine.facilityEditName}
				disabled={engine.facilityEditSaving}
			/>
			<label class="fm-label" for="fm-edit-address">Address</label>
			<input
				id="fm-edit-address"
				class="fm-input"
				type="text"
				bind:value={engine.facilityEditAddress}
				disabled={engine.facilityEditSaving}
			/>
			<label class="fm-label" for="fm-edit-lat">Latitude</label>
			<input
				id="fm-edit-lat"
				class="fm-input"
				type="text"
				bind:value={engine.facilityEditLatStr}
				disabled={engine.facilityEditSaving}
			/>
			<label class="fm-label" for="fm-edit-lng">Longitude</label>
			<input
				id="fm-edit-lng"
				class="fm-input"
				type="text"
				bind:value={engine.facilityEditLngStr}
				disabled={engine.facilityEditSaving}
			/>
			<label class="fm-label" for="fm-edit-status">Status</label>
			<select
				id="fm-edit-status"
				class="fm-input fm-input--status"
				bind:value={engine.facilityEditStatus}
				disabled={engine.facilityEditSaving}
			>
				<option value="Active">Active</option>
				<option value="Locked">Locked (Weather / Maintenance)</option>
				<option value="LOCKED">LOCKED (Legacy Code)</option>
			</select>
			{#if engine.facilityEditErr}
				<p class="fm-err">{engine.facilityEditErr}</p>
			{/if}
			<div class="fm-modal-edit__actions">
				<button
					type="button"
					class="fm-btn"
					onclick={() => {
						engine.facilityEditOpen = false;
					}}
					disabled={engine.facilityEditSaving}
				>
					Cancel
				</button>
				<button
					type="button"
					class="fm-btn fm-btn--primary"
					onclick={() => void engine.saveFacilityEditModal()}
					disabled={engine.facilityEditSaving}
				>
					{engine.facilityEditSaving ? 'Saving…' : 'Save Details'}
				</button>
			</div>
		</div>
	</Modal>
{/if}

{#if engine.previewOpen && engine.previewRow}
	<div class="ec-drawer-backdrop" onclick={() => engine.closePreview()} aria-hidden="true"></div>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<aside
		class="ec-drawer fm-preview-drawer"
		role="dialog"
		aria-modal="true"
		aria-label="Facility preview"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			if (e.key === 'Escape') engine.closePreview();
		}}
	>
		<div class="ec-drawer__head">
			<h2 class="ec-drawer__title">{engine.previewRow.name}</h2>
			<button type="button" class="ec-drawer__close" onclick={() => engine.closePreview()} aria-label="Close">
				<Icon name={"sys.close" as IconName} size={20} />
			</button>
		</div>
		<div class="ec-drawer__body fm-preview-body">
			<section class="fm-logistics-wrap" aria-labelledby="fm-logistics-h">
				<h3 id="fm-logistics-h" class="fm-logistics__title">Logistics & Routing</h3>
				{#if engine.canManage}
					<label class="fm-label" for="fm-logistics-name">Facility Name</label>
					<input
						id="fm-logistics-name"
						class="fm-input fm-logistics-input"
						type="text"
						bind:value={engine.draftName}
						placeholder="Facility Name"
						autocomplete="off"
					/>
					<label class="fm-label" for="fm-logistics-status">Status</label>
					<select
						id="fm-logistics-status"
						class="fm-input fm-logistics-input"
						bind:value={engine.draftStatus}
					>
						<option value="Active">Active</option>
						<option value="Locked">Locked (Weather / Maintenance)</option>
						<option value="LOCKED">LOCKED (Legacy Code)</option>
					</select>
				{/if}
				<p class="fm-logistics__hint">
					{#if engine.canManage}
						Drag the pin to set the exact routing destination for parents. Save to sync to the live field schedule.
					{:else}
						Routing destination pin.
					{/if}
				</p>
				<div class="fm-drawer-map-frame tw-flex tw-w-full tw-flex-col tw-min-h-[300px]">
					{#key engine.previewId}
						<FacilityDrawingMap
							bind:latitude={engine.draftLat}
							bind:longitude={engine.draftLng}
							bind:mapData={engine.draftMapData}
							readonly={!engine.canManage}
							lockRoutingPinSync={engine.logisticsSaving}
						/>
					{/key}
				</div>
				{#if engine.draftLat != null && engine.draftLng != null}
					<label class="fm-label" for="fm-routing-uri">Routing URI</label>
					<input
						id="fm-routing-uri"
						class="fm-input fm-logistics-input fm-routing-uri-input"
						type="text"
						readonly
						value={engine.routingDisplayUri}
					/>
				{/if}
				{#if engine.canManage}
					<label class="fm-label" for="fm-logistics-address">Address</label>
					<input
						id="fm-logistics-address"
						class="fm-input fm-logistics-input"
						type="text"
						bind:value={engine.draftAddress}
						placeholder="Street, city, state"
						autocomplete="off"
					/>
					<button
						type="button"
						class="fm-btn fm-btn--primary"
						disabled={engine.logisticsSaving}
						onclick={() => void engine.saveLogistics()}
					>
						{engine.logisticsSaving ? 'Saving…' : 'Save facility'}
					</button>
					{#if engine.logisticsSaveErr}
						<p class="fm-err" role="alert">{engine.logisticsSaveErr}</p>
					{/if}
				{:else if engine.previewRow.routingUrl}
					<a class="fm-logistics__route-link" href={engine.previewRow.routingUrl} target="_blank" rel="noopener noreferrer">
						Open in Maps
					</a>
				{:else if engine.draftLat == null || engine.draftLng == null}
					<p class="fm-logistics__hint">Directions are not configured for this facility yet.</p>
				{/if}
			</section>
			<section class="fm-tactical-wrap" aria-labelledby="fm-tactical-h">
				<h3 id="fm-tactical-h" class="fm-logistics__title">Tactical Builder</h3>
				{#key engine.previewId}
					<TacticalBuilder
						clubId={engine.clubId}
						facilityId={engine.previewRow.id}
						canManage={engine.canManage}
						initialJson={engine.previewRow.tacticalCanvasJson}
					/>
				{/key}
			</section>
			{#if engine.previewRow.address && !engine.canManage}
				<p class="fm-preview-meta">{engine.previewRow.address}</p>
			{/if}
			{#if engine.previewRow.mapDownloadUrl && engine.previewRow.type === 'image'}
				<img class="fm-preview-img" src={engine.previewRow.mapDownloadUrl} alt="" loading="lazy" />
			{:else if engine.previewRow.mapDownloadUrl && engine.previewRow.type === 'pdf'}
				{#if engine.pdfBusy}
					<p class="fm-preview-meta">Rendering PDF…</p>
				{/if}
				<canvas bind:this={engine.pdfCanvasEl} class="fm-preview-canvas"></canvas>
			{:else}
				<p class="fm-preview-meta fm-preview-meta--asset">No tactical map asset — logistics registry only.</p>
			{/if}
		</div>
	</aside>
{:else if engine.previewOpen}
	<div class="ec-drawer-backdrop" onclick={() => engine.closePreview()} aria-hidden="true"></div>
	<aside class="ec-drawer fm-preview-drawer" role="dialog" aria-modal="true" aria-label="Facility preview" onkeydown={(e) => { if (e.key === 'Escape') engine.closePreview(); }}>
		<div class="ec-drawer__head">
			<h2 class="ec-drawer__title">Facility</h2>
			<button type="button" class="ec-drawer__close" onclick={() => engine.closePreview()} aria-label="Close">
				<Icon name={"sys.close" as IconName} size={20} />
			</button>
		</div>
		<div class="ec-drawer__body fm-preview-body">
			<p class="fm-panel__empty">This facility is no longer available. Close and select another map.</p>
		</div>
	</aside>
{/if}

<style>
.fm-preview-drawer {
		width: 600px;
		max-width: 100%;
		display: flex;
		flex-direction: column;
		background: #0f172a;
	}
.fm-preview-body {
		padding: clamp(12px, 3vw, 24px);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
.fm-preview-meta {
		margin: 0;
		font-family: var(--font-switzer);
		font-size: 0.9rem;
		color: #cbd5e1;
		line-height: 1.5;
	}
.fm-preview-meta--asset {
		color: #94a3b8;
		font-style: italic;
	}
.fm-preview-img,
	.fm-preview-canvas {
		width: 100%;
		height: auto;
		border-radius: 4px;
		border: 1px solid #334155;
		background: #000;
		display: block;
	}
.fm-logistics-wrap,
	.fm-tactical-wrap {
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: clamp(8px, 2vw, 16px);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
.fm-logistics__title {
		margin: 0 0 4px 0;
		font-family: var(--font-switzer);
		font-weight: 700;
		font-size: 1.05rem;
		color: #f8fafc;
	}
.fm-logistics__hint {
		margin: 0 0 8px 0;
		font-family: var(--font-switzer);
		font-size: 0.85rem;
		color: #94a3b8;
		line-height: 1.4;
	}
.fm-logistics-input {
		background: #0f172a;
	}
.fm-routing-uri-input {
		font-family: var(--font-mono);
		font-size: 11px;
		padding: clamp(2px, 0.5vw, 6px);
		border-radius: 4px;
		background: rgba(15, 23, 42, 0.85);
		border: 1px solid rgba(52, 211, 153, 0.25);
		color: rgb(167 243 208);
	}
.fm-logistics__route-link {
		display: inline-block;
		font-family: var(--font-switzer);
		font-size: 0.85rem;
		font-weight: 600;
		color: #3b82f6;
		text-decoration: none;
	}
.fm-logistics__route-link:hover {
		text-decoration: underline;
		color: #60a5fa;
	}
.fm-embedded-map-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 10px 14px;
		margin-bottom: 12px;
	}
.fm-embedded-map-toolbar__label {
		margin-bottom: 0;
		flex: 0 0 auto;
	}
.fm-embedded-map-toolbar__select {
		flex: 1 1 18rem;
		max-width: min(36rem, 100%);
		min-width: 0;
		margin-bottom: 0;
	}
.fm-embedded-map-frame {
		flex: 1 1 auto;
		min-height: 600px;
		width: 100%;
		box-sizing: border-box;
		position: relative;
	}
.fm-embedded-map-frame > :global(*) {
		flex: 1 1 auto;
		min-height: 500px;
		align-self: stretch;
	}
.fm-modal-edit {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	}
.fm-modal-edit .fm-input--status {
		margin-bottom: 0;
	}
.fm-modal-edit__actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		margin-top: 14px;
		flex-wrap: wrap;
	}
</style>
