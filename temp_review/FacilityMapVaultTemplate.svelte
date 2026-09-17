
<div class="fm-vault" class:fm-vault--embedded={embedded}>
	{#if canManage && clubId}
		<section
			class="fm-panel fm-panel--registry"
			aria-labelledby="fm-reg-h"
		>
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
						bind:value={regName}
						placeholder="e.g. North Training Pitch"
						autocomplete="off"
						disabled={regSaving}
					/>
				</div>
				<div class="fm-registry__field fm-registry__field--wide">
					<label class="fm-label" for="fm-reg-addr">Address</label>
					<input
						id="fm-reg-addr"
						class="fm-input"
						type="text"
						bind:value={regAddress}
						placeholder="Street, city, state"
						autocomplete="off"
						disabled={regSaving}
					/>
				</div>
				<div class="fm-registry__coord">
					<label class="fm-label fm-label--coord" for="fm-reg-lat">Latitude</label>
					<input
						id="fm-reg-lat"
						class="fm-input fm-input--coord"
						type="number"
						step="any"
						bind:value={regLat}
						placeholder="e.g. 40.7128"
						disabled={regSaving}
					/>
				</div>
				<div class="fm-registry__coord">
					<label class="fm-label fm-label--coord" for="fm-reg-lng">Longitude</label>
					<input
						id="fm-reg-lng"
						class="fm-input fm-input--coord"
						type="number"
						step="any"
						bind:value={regLng}
						placeholder="e.g. -74.0060"
						disabled={regSaving}
					/>
				</div>
				<p class="fm-lightning-hint fm-registry__field--wide">
					<strong>Required for Tomorrow.io Automated Lightning Defense.</strong>
				</p>
				<div class="fm-registry__field">
					<label class="fm-label" for="fm-reg-status">Status</label>
					<select id="fm-reg-status" class="fm-input" bind:value={regStatus} disabled={regSaving}>
						<option value="Active">Active</option>
						<option value="Locked">Locked</option>
					</select>
				</div>
				<div class="fm-registry__actions">
					<button
						type="button"
						class="fm-btn fm-btn--primary"
						disabled={regSaving || !regName.trim()}
						onclick={() => void saveRegistryFacility()}
					>
						{regSaving ? 'Saving…' : 'Save facility'}
					</button>
				</div>
			</div>
			{#if regErr}
				<p class="fm-err" role="alert">{regErr}</p>
			{/if}
		</section>
	{/if}

	{#if clubId}
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
			{#if rows.length > 0}
				<div class="fm-embedded-map-toolbar">
					<label class="fm-label fm-embedded-map-toolbar__label" for="fm-hero-fac">Facility</label>
					<select
						id="fm-hero-fac"
						class="fm-input fm-embedded-map-toolbar__select"
						bind:value={heroFacilityId}
					>
						{#each rows as r (r.id)}
							<option value={r.id}>{r.name}</option>
						{/each}
					</select>
				</div>
				<div
					class="fm-embedded-map-frame tw-flex tw-h-full tw-w-full tw-min-h-[600px] tw-flex-col"
				>
					{#if heroFacilityId}
						{#key heroFacilityId}
							<FacilityDrawingMap
								bind:latitude={heroLat}
								bind:longitude={heroLng}
								bind:mapData={heroMapData}
								readonly={!canManage}
								coordRevision={heroCoordRevision}
								lockRoutingPinSync={heroSaving}
								onSaveMap={() => void saveHeroFacility()}
								saveBusy={heroSaving}
								saveDisabled={heroSaving || !heroFacilityId}
							/>
						{/key}
					{/if}
				</div>
				{#if heroSaveErr}
					<p class="fm-err" role="alert">{heroSaveErr}</p>
				{/if}
			{:else}
				<p class="fm-panel__hint">
					Add a facility via the registry above to enable the map and routing pin.
				</p>
			{/if}
		</section>
	{/if}

	<section class="fm-panel fm-panel--vault-wide" aria-label="Facility map vault">
			<h4 class="fm-panel__title">Vault</h4>
			<p class="fm-panel__hint fm-panel__hint--vault">
				Facilities for routing, drawings, and logistics. Use Edit to change name, address, coordinates, or status.
			</p>
			{#if rows.length === 0}
				<p class="fm-panel__empty">No facilities yet.</p>
			{:else}
				<div class="ec-table-wrap fm-table-wrap fm-table-wrap--vault">
					<div class="tw-border tw-border-[#334155] tw-bg-[#0f172a] tw-p-4 tw-min-w-0 tw-overflow-x-auto">
						<table class="tw-w-full tw-font-mono tw-text-sm ec-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Type</th>
								<th>Lat</th>
								<th>Lng</th>
								<th>Status</th>
								<th>Doc ID</th>
								<th>Uploaded</th>
								{#if canManage}
									<th class="fm-table-actions-col">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each rows as row (row.id)}
								<tr
									class="ec-table__row-click"
									onclick={() => openPreview(row)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											openPreview(row);
										}
									}}
									role="button"
									tabindex="0"
								>
									<td class="ec-table__strong">{row.name}</td>
									<td class="ec-muted">
										{#if row.type}
											{row.type === 'pdf' ? 'PDF' : 'Image'}
										{:else}
											<span class="fm-badge fm-badge--logistics">Logistics</span>
										{/if}
									</td>
									<td class="ec-muted fm-mono">
										{typeof row.latitude === 'number' ? row.latitude.toFixed(5) : '—'}
									</td>
									<td class="ec-muted fm-mono">
										{typeof row.longitude === 'number' ? row.longitude.toFixed(5) : '—'}
									</td>
									<td>
										{#if statusTone(row) === 'locked'}
											<span class="fm-status fm-status--locked">Locked</span>
										{:else}
											<span class="fm-status fm-status--active">Active</span>
										{/if}
										{#if row.status === 'LOCKED'}
											<span class="fm-status fm-status--strike" title={row.lockReason || ''}>AUTO</span>
										{/if}
									</td>
									<td class="fm-docid" title={row.id}>{row.id}</td>
									<td class="ec-muted">{fmtTime(row.uploadedAt)}</td>
									{#if canManage}
										<td class="fm-table-actions">
											<button
												type="button"
												class="fm-btn fm-btn--secondary"
												onclick={(e) => {
													e.stopPropagation();
													openFacilityEditModal(row);
												}}
											>
												Edit
											</button>
											<button
												type="button"
												class="fm-btn fm-btn--danger"
												onclick={(e) => {
													e.stopPropagation();
													void removeRow(row);
												}}
											>
												Delete
											</button>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
					</div>
				</div>
			{/if}
		</section>
</div>

<Modal bind:open={facilityEditOpen} title="Edit facility" maxWidth="560px">
	<form
		class="fm-modal-edit"
		onsubmit={(e) => {
			e.preventDefault();
			void saveFacilityEditModal();
		}}
	>
		<label class="fm-label" for="fm-edit-name">Facility name</label>
		<input
			id="fm-edit-name"
			class="fm-input"
			type="text"
			bind:value={facilityEditName}
			maxlength={200}
			autocomplete="off"
			disabled={facilityEditSaving}
		/>
		<label class="fm-label" for="fm-edit-addr">Address</label>
		<input
			id="fm-edit-addr"
			class="fm-input"
			type="text"
			bind:value={facilityEditAddress}
			autocomplete="off"
			disabled={facilityEditSaving}
		/>
		<div class="fm-coord-grid">
			<div>
				<label class="fm-label fm-label--coord" for="fm-edit-lat">Latitude</label>
				<input
					id="fm-edit-lat"
					class="fm-input fm-input--coord"
					type="text"
					inputmode="decimal"
					bind:value={facilityEditLatStr}
					disabled={facilityEditSaving}
				/>
			</div>
			<div>
				<label class="fm-label fm-label--coord" for="fm-edit-lng">Longitude</label>
				<input
					id="fm-edit-lng"
					class="fm-input fm-input--coord"
					type="text"
					inputmode="decimal"
					bind:value={facilityEditLngStr}
					disabled={facilityEditSaving}
				/>
			</div>
		</div>
		<label class="fm-label" for="fm-edit-status">Operational status</label>
		<select
			id="fm-edit-status"
			class="fm-input fm-input--status"
			bind:value={facilityEditStatus}
			disabled={facilityEditSaving}
		>
			<option value="Active">Active</option>
			<option value="Locked">Locked (manual)</option>
			<option value="LOCKED">LOCKED (automated)</option>
		</select>
		{#if facilityEditErr}
			<p class="fm-err" role="alert">{facilityEditErr}</p>
		{/if}
		<div class="fm-modal-edit__actions">
			<button
				type="button"
				class="fm-btn fm-btn--secondary"
				disabled={facilityEditSaving}
				onclick={() => (facilityEditOpen = false)}
			>
				Cancel
			</button>
			<button type="submit" class="fm-btn fm-btn--primary" disabled={facilityEditSaving}>
				{facilityEditSaving ? 'Saving…' : 'Save changes'}
			</button>
		</div>
	</form>
</Modal>

<!-- Preview drawer (enterprise panel) -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="ec-drawer-backdrop"
	class:ec-drawer-backdrop--open={previewOpen}
	role="presentation"
	aria-hidden={!previewOpen}
	onclick={closePreview}
></div>
<aside
	class="ec-drawer fm-preview-drawer"
	class:ec-drawer--open={previewOpen}
	aria-hidden={!previewOpen}
	aria-label="Facility details"
>
	{#if previewRow}
		<div class="ec-drawer__head">
			<h2 class="ec-drawer__title">{previewRow.name}</h2>
		<button type="button" class="ec-drawer__close" onclick={closePreview} aria-label="Close">
			<Icon name={"sys.close" as IconName} size={20} />
		</button>
	</div>
	<div class="ec-drawer__body fm-preview-body">
		<!-- Location and logistics: always rendered for a selected facility (map handles missing API key). -->
			<section class="fm-logistics-bento" aria-labelledby="fm-location-h">
				<h3 id="fm-location-h" class="fm-logistics__title">Location & routing matrix</h3>
				{#if previewRow.lockReason || previewRow.status === 'LOCKED'}
					<p class="fm-lock-banner" role="status">
						<strong>Lock:</strong>
						{previewRow.lockReason || 'Automated lightning hold — facility CLOSED.'}
					</p>
				{/if}
				{#if canManage}
					<div class="fm-logistics-name-field">
						<label class="fm-label" for="fm-draft-name">Facility name</label>
						<input
							id="fm-draft-name"
							class="fm-input fm-logistics-input"
							type="text"
							bind:value={draftName}
							placeholder="e.g. North Training Pitch"
							autocomplete="off"
							disabled={logisticsSaving}
						/>
					</div>
					<div class="fm-coord-grid">
						<div>
							<label class="fm-label fm-label--coord" for="fm-draft-lat">Latitude</label>
							<input
								id="fm-draft-lat"
								class="fm-input fm-input--coord"
								type="number"
								step="any"
								value={draftLat ?? ''}
								oninput={(e) => {
									const v = parseFloat(e.currentTarget.value);
									draftLat = Number.isFinite(v) ? v : null;
								}}
								placeholder="Latitude"
							/>
						</div>
						<div>
							<label class="fm-label fm-label--coord" for="fm-draft-lng">Longitude</label>
							<input
								id="fm-draft-lng"
								class="fm-input fm-input--coord"
								type="number"
								step="any"
								value={draftLng ?? ''}
								oninput={(e) => {
									const v = parseFloat(e.currentTarget.value);
									draftLng = Number.isFinite(v) ? v : null;
								}}
								placeholder="Longitude"
							/>
						</div>
					</div>
					<p class="fm-lightning-hint">
						<strong>Required for Tomorrow.io Automated Lightning Defense.</strong>
					</p>
					<label class="fm-label" for="fm-draft-status">Operational status</label>
					<select id="fm-draft-status" class="fm-input fm-input--status" bind:value={draftStatus}>
						<option value="Active">Active</option>
						<option value="Locked">Locked (manual)</option>
						<option value="LOCKED" disabled={draftStatus !== 'LOCKED'}>
							LOCKED (automated strike — select Active to clear)
						</option>
					</select>
				{/if}
				<div class="fm-logistics-map-slot fm-logistics-map-slot--drawing">
					{#key previewId}
						<FacilityDrawingMap
							bind:latitude={draftLat}
							bind:longitude={draftLng}
							bind:mapData={draftMapData}
							readonly={!canManage}
							lockRoutingPinSync={logisticsSaving}
						/>
					{/key}
				</div>
				{#if draftLat != null && draftLng != null}
					<label class="fm-label" for="fm-routing-uri">Routing URI</label>
					<input
						id="fm-routing-uri"
						class="fm-input fm-logistics-input fm-routing-uri-input"
						type="text"
						readonly
						value={routingDisplayUri}
					/>
				{/if}
				{#if canManage}
					<label class="fm-label" for="fm-logistics-address">Address</label>
					<input
						id="fm-logistics-address"
						class="fm-input fm-logistics-input"
						type="text"
						bind:value={draftAddress}
						placeholder="Street, city, state"
						autocomplete="off"
					/>
					<button
						type="button"
						class="fm-btn fm-btn--primary"
						disabled={logisticsSaving}
						onclick={() => void saveLogistics()}
					>
						{logisticsSaving ? 'Saving…' : 'Save facility'}
					</button>
					{#if logisticsSaveErr}
						<p class="fm-err" role="alert">{logisticsSaveErr}</p>
					{/if}
				{:else if previewRow.routingUrl}
					<a
						class="fm-logistics__route-link"
						href={previewRow.routingUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						Open in Maps
					</a>
				{:else if draftLat == null || draftLng == null}
					<p class="fm-logistics__hint">Directions are not configured for this facility yet.</p>
				{/if}
			</section>

			<section class="fm-tactical-wrap" aria-labelledby="fm-tactical-h">
				<h3 id="fm-tactical-h" class="fm-logistics__title">Tactical Builder</h3>
				{#key previewId}
					<TacticalBuilder
						{clubId}
						facilityId={previewRow.id}
						{canManage}
						initialJson={previewRow.tacticalCanvasJson}
					/>
				{/key}
			</section>

			{#if previewRow.address && !canManage}
				<p class="fm-preview-meta">{previewRow.address}</p>
			{/if}

			{#if previewRow.mapDownloadUrl && previewRow.type === 'image'}
				<img
					class="fm-preview-img"
					src={previewRow.mapDownloadUrl}
					alt=""
					loading="lazy"
				/>
			{:else if previewRow.mapDownloadUrl && previewRow.type === 'pdf'}
				{#if pdfBusy}
					<p class="fm-preview-meta">Rendering PDF…</p>
				{/if}
				<canvas bind:this={pdfCanvasEl} class="fm-preview-canvas"></canvas>
			{:else}
				<p class="fm-preview-meta fm-preview-meta--asset">
					No tactical map asset — logistics registry only.
				</p>
			{/if}
		</div>
	{:else if previewOpen}
		<div class="ec-drawer__head">
			<h2 class="ec-drawer__title">Facility</h2>
		<button type="button" class="ec-drawer__close" onclick={closePreview} aria-label="Close">
			<Icon name={"sys.close" as IconName} size={20} />
		</button>
	</div>
	<div class="ec-drawer__body fm-preview-body">
		<p class="fm-panel__empty">This facility is no longer available. Close and select another map.</p>
		</div>
	{/if}
</aside>

